'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Frame, Player, Room, RoomStatus } from "@/lib/rooms";

interface LobbyClientProps {
  initialRoom: Room;
  roomCode: string;
  playerId?: string | null;
  hostSessionActive?: boolean;
}

type RefreshOptions = {
  silent?: boolean;
};

const statusLabel: Record<RoomStatus, string> = {
  lobby: "Lobby open",
  "in-progress": "Match in progress",
  completed: "Match complete",
};

export default function LobbyClient({
  initialRoom,
  roomCode,
  playerId,
  hostSessionActive = false,
}: LobbyClientProps) {
  const [room, setRoom] = useState<Room>(initialRoom);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [roomMissing, setRoomMissing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [eventsConnected, setEventsConnected] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [frameUrl, setFrameUrl] = useState("");
  const [isAddingFrame, setIsAddingFrame] = useState(false);
  const [frameError, setFrameError] = useState<string | null>(null);

  useEffect(() => {
    setRoom(initialRoom);
  }, [initialRoom]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(`${window.location.origin}/rooms/${roomCode}`);
    }
  }, [roomCode]);

  const refreshRoom = useCallback(
    async ({ silent = false }: RefreshOptions = {}) => {
      if (roomMissing) return;
      if (!silent) {
        setIsRefreshing(true);
      }

      try {
        const response = await fetch(`/api/rooms/${roomCode}`, {
          method: "GET",
          cache: "no-store",
        });

        if (response.status === 404) {
          setRoomMissing(true);
          setErrorMessage("This lobby has wrapped. Ask the host for a fresh code.");
          return;
        }

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          const message =
            payload && typeof payload.error === "string"
              ? payload.error
              : "We couldn't refresh the lobby.";
          throw new Error(message);
        }

        const payload = await response.json();
        if (payload?.room) {
          setRoom(payload.room as Room);
          setErrorMessage(null);
          setRoomMissing(false);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "We couldn't refresh the lobby.";
        setErrorMessage(message);
      } finally {
        if (!silent) {
          setIsRefreshing(false);
        }
      }
    },
    [roomCode, roomMissing],
  );

  useEffect(() => {
    if (typeof window === "undefined" || roomMissing) {
      return;
    }

    const source = new EventSource(`/api/rooms/${roomCode}/events`);

    const handleUpdate: EventListener = (event) => {
      const message = event as MessageEvent<string>;
      try {
        const data = JSON.parse(message.data) as Room;
        setRoom(data);
        setRoomMissing(false);
        setErrorMessage(null);
        setEventsConnected(true);
      } catch (error) {
        console.error("Failed to parse lobby update", error);
      }
    };

    source.addEventListener("room:update", handleUpdate);
    source.onopen = () => {
      setEventsConnected(true);
    };
    source.onerror = () => {
      setEventsConnected(false);
      setErrorMessage((previous) => previous ?? "Live updates interrupted. Use refresh while we reconnect.");
    };

    return () => {
      source.removeEventListener("room:update", handleUpdate);
      source.close();
    };
  }, [roomCode, roomMissing]);

  const players: Player[] = useMemo(() => {
    return [...room.players].sort((a, b) => a.joinedAt - b.joinedAt);
  }, [room.players]);

  const playersById = useMemo(() => {
    return players.reduce<Map<string, Player>>((map, player) => {
      map.set(player.id, player);
      return map;
    }, new Map());
  }, [players]);

  const canManage = Boolean(hostSessionActive);

  const frameQueue: Frame[] = useMemo(() => [...room.frames], [room.frames]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2500);
    } catch (error) {
      console.error("Failed to copy room code", error);
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 2500);
    }
  };

  const mutateStatus = async (nextStatus: RoomStatus) => {
    if (!canManage) {
      setStatusError("Only the host can manage the match state.");
      return;
    }

    setIsUpdatingStatus(true);
    setStatusError(null);

    try {
      const response = await fetch(`/api/rooms/${roomCode}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message =
          payload && typeof payload.error === "string"
            ? payload.error
            : "Couldn't update the match status.";
        throw new Error(message);
      }

      const payload = await response.json();
      if (payload?.room) {
        setRoom(payload.room as Room);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Couldn't update the match status.";
      setStatusError(message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddFrame = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canManage) {
      setFrameError("Only the host can add frames.");
      return;
    }

    if (!frameUrl.trim()) {
      setFrameError("Paste an image URL before adding.");
      return;
    }

    setIsAddingFrame(true);
    setFrameError(null);

    try {
      const response = await fetch(`/api/rooms/${roomCode}/frames`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: frameUrl }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message =
          payload && typeof payload.error === "string" ? payload.error : "Couldn't add that frame.";
        throw new Error(message);
      }

      setFrameUrl("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Couldn't add that frame.";
      setFrameError(message);
    } finally {
      setIsAddingFrame(false);
    }
  };

  if (roomMissing) {
    return (
      <div className="flex min-h-screen flex-col bg-base-100">
        <header className="border-b border-base-300 bg-base-100">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
            <Link href="/" className="text-lg font-semibold text-primary">
              Guess the Frame
            </Link>
            <Link href="/" className="link link-hover text-sm">
              Start a new room
            </Link>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="card border border-base-300 bg-base-200 shadow-xl">
            <div className="card-body items-center text-center gap-3">
              <h1 className="text-3xl font-semibold text-base-content">Room closed</h1>
              <p className="text-base text-base-content/70">
                The host has ended this lobby or everyone left. Head back to the homepage to create a new
                room.
              </p>
              <Link href="/" className="btn btn-primary">
                Return home
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-base-100">
      <header className="border-b border-base-300 bg-base-100">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-5 sm:flex-nowrap">
          <Link href="/" className="text-lg font-semibold text-primary">
            Guess the Frame
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span
        className={`badge ${eventsConnected ? "badge-success" : "badge-warning"} badge-outline uppercase`}
            >
              {eventsConnected ? "Live" : "Reconnecting"}
            </span>
            <button
              type="button"
              onClick={() => refreshRoom()}
              className="btn btn-ghost btn-sm"
              disabled={isRefreshing}
            >
              {isRefreshing ? "Refreshing…" : "Refresh lobby"}
            </button>
            <Link href="/" className="link link-hover">
              Leave lobby
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
        <section className="card border border-base-300 bg-base-200 shadow-xl">
          <div className="card-body gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-base-content/60">Room code</p>
                <p className="font-mono text-4xl font-semibold text-base-content">{room.code}</p>
                <p className="mt-2 text-sm text-base-content/70">{statusLabel[room.status]}</p>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <button type="button" className="btn btn-primary" onClick={handleCopyCode}>
                  {copyState === "copied" ? "Copied" : "Copy code"}
                </button>
                {shareUrl ? (
                  <span className="text-xs text-base-content/60">
                    Share the link:
                    <br />
                    <span className="font-mono">{shareUrl}</span>
                  </span>
                ) : null}
              </div>
            </div>
            <p className="text-base text-base-content/70">
              Send the code to anyone who should join. Once everyone is in, the host can start dropping frames.
            </p>
            {copyState === "error" ? (
              <p className="text-sm text-error">Couldn&apos;t copy the code. Copy it manually instead.</p>
            ) : null}
          </div>
        </section>

        <section className="card border border-base-300 bg-base-200 shadow-md">
          <div className="card-body gap-3">
            <div className="flex items-center justify-between">
              <h2 className="card-title text-2xl text-base-content">Players in lobby</h2>
              <span className="badge badge-outline">{players.length}&nbsp;joined</span>
            </div>
            <ul className="grid gap-3 md:grid-cols-2">
              {players.map((player) => (
                <li key={player.id} className="rounded-lg border border-base-300 bg-base-100 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-base-content">{player.name}</span>
                    <div className="flex items-center gap-2">
                      {player.role === "host" ? (
                        <span className="badge badge-primary badge-sm">Host</span>
                      ) : null}
                      {player.id === playerId ? (
                        <span className="badge badge-outline badge-sm">You</span>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-base-content/60">
                    Joined {new Date(player.joinedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </li>
              ))}
            </ul>
            {players.length === 1 ? (
              <p className="text-sm text-base-content/60">
                Waiting for friends to join. Share the code above to bring them into the lobby.
              </p>
            ) : null}
          </div>
        </section>

        <section className="card border border-base-300 bg-base-200 shadow-md">
          <div className="card-body gap-3">
            <div className="flex items-center justify-between">
              <h2 className="card-title text-2xl text-base-content">Frame queue</h2>
              <span className="badge badge-outline">{frameQueue.length}&nbsp;saved</span>
            </div>
            {frameQueue.length ? (
              <ul className="grid gap-3 md:grid-cols-2">
                {frameQueue.map((frame) => {
                  const contributor = playersById.get(frame.addedBy);
                  return (
                    <li key={frame.id} className="rounded-lg border border-base-300 bg-base-100 p-4">
                      <p className="font-semibold text-base-content">Frame #{frame.order}</p>
                      <a
                        href={frame.url}
                        target="_blank"
                        rel="noreferrer"
                        className="link link-primary text-sm break-words"
                      >
                        {frame.url}
                      </a>
                      <p className="mt-2 text-xs text-base-content/60">
                        Added by {contributor ? contributor.name : "unknown"} ·
                        &nbsp;
                        {new Date(frame.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-base-content/60">
                No frames yet. Hosts can drop image URLs below to build the first trivia pack.
              </p>
            )}
          </div>
        </section>

        {canManage ? (
          <section className="card border border-dashed border-primary bg-base-200/70 shadow-sm">
            <div className="card-body gap-4">
              <h2 className="card-title text-xl text-base-content">Host controls</h2>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => mutateStatus("in-progress")}
                  disabled={isUpdatingStatus}
                >
                  Start match
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => mutateStatus("lobby")}
                  disabled={isUpdatingStatus}
                >
                  Reset to lobby
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => mutateStatus("completed")}
                  disabled={isUpdatingStatus}
                >
                  Mark complete
                </button>
              </div>
              {statusError ? (
                <p className="rounded-md bg-error/10 px-3 py-2 text-sm text-error" role="alert">
                  {statusError}
                </p>
              ) : null}
              <form className="flex flex-col gap-3" onSubmit={handleAddFrame}>
                <label className="form-control" htmlFor="frame-url">
                  <span className="label-text">Frame image URL</span>
                  <input
                    id="frame-url"
                    type="url"
                    placeholder="https://cdn.example/frame.jpg"
                    value={frameUrl}
                    onChange={(event) => setFrameUrl(event.target.value)}
                    className="input input-bordered"
                    required
                  />
                </label>
                <button type="submit" className="btn btn-primary" disabled={isAddingFrame}>
                  {isAddingFrame ? "Saving…" : "Add frame"}
                </button>
                {frameError ? (
                  <p className="rounded-md bg-error/10 px-3 py-2 text-sm text-error" role="alert">
                    {frameError}
                  </p>
                ) : null}
              </form>
              <p className="text-sm text-base-content/60">
                Coming soon: upload stills directly, set reveal timers, and script dramatic hint drops.
              </p>
            </div>
          </section>
        ) : null}

        {errorMessage ? (
          <div className="alert alert-warning">
            <span className="font-medium">Heads up:</span>
            <span>{errorMessage}</span>
          </div>
        ) : null}
      </main>
    </div>
  );
}
