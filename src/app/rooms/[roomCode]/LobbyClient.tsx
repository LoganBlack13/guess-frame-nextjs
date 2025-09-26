'use client';

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import type { Frame, Player, Room, RoomStatus, GameDifficulty } from "@/lib/rooms";

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

const DIFFICULTY_LABELS: Record<GameDifficulty, string> = {
  easy: "Easy (30s per frame)",
  normal: "Normal (20s per frame)",
  hard: "Hard (10s per frame)",
};

function formatSecondsDisplay(value: number): string {
  const clamped = Math.max(0, Math.ceil(value));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

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
  const [difficultyChoice, setDifficultyChoice] = useState<GameDifficulty>(initialRoom.difficulty);
  const [durationChoice, setDurationChoice] = useState<number>(initialRoom.durationMinutes);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSavedAt, setSettingsSavedAt] = useState<number | null>(null);
  const [isAdvancingFrame, setIsAdvancingFrame] = useState(false);
  const [guessValue, setGuessValue] = useState("");
  const [guessFeedback, setGuessFeedback] = useState<string | null>(null);
  const [isSubmittingGuess, setIsSubmittingGuess] = useState(false);

  const autoAdvanceTriggeredRef = useRef(false);

  useEffect(() => {
    setRoom(initialRoom);
  }, [initialRoom]);

  useEffect(() => {
    setDifficultyChoice(initialRoom.difficulty);
    setDurationChoice(initialRoom.durationMinutes);
    setSettingsSavedAt(null);
    setSettingsError(null);
  }, [initialRoom.difficulty, initialRoom.durationMinutes]);

  useEffect(() => {
    if (!settingsSavedAt) return;
    const timeout = window.setTimeout(() => setSettingsSavedAt(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [settingsSavedAt]);

  useEffect(() => {
    setGuessFeedback(null);
    setGuessValue("");
    autoAdvanceTriggeredRef.current = false;
  }, [room.currentFrameIndex, room.frameStartedAt]);

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

  const sortedByScore: Player[] = useMemo(() => {
    return [...players].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.joinedAt - b.joinedAt;
    });
  }, [players]);

  const frameQueue: Frame[] = useMemo(() => [...room.frames], [room.frames]);
  const framesMissing = Math.max(0, room.targetFrameCount - frameQueue.length);


  const isHostView = Boolean(hostSessionActive);
  const canManage = isHostView;

  const frameStartTimestamp = room.frameStartedAt ?? null;
  const computeCountdowns = useCallback(() => {
    if (room.status !== "in-progress" || !frameStartTimestamp) {
      return {
        preRoll: 0,
        guess: room.guessWindowSeconds,
      };
    }

    const now = Date.now();
    const preRoll = Math.max(0, Math.ceil((frameStartTimestamp - now) / 1000));
    const elapsed = Math.max(0, (now - frameStartTimestamp) / 1000);
    const guess = Math.max(0, room.guessWindowSeconds - elapsed);

    return {
      preRoll,
      guess,
    };
  }, [frameStartTimestamp, room.guessWindowSeconds, room.status]);

  const [countdown, setCountdown] = useState(() => computeCountdowns());

  useEffect(() => {
    setCountdown(computeCountdowns());
  }, [computeCountdowns]);

  useEffect(() => {
    if (room.status !== "in-progress" || !frameStartTimestamp) {
      return;
    }
    const interval = window.setInterval(() => {
      setCountdown(computeCountdowns());
    }, 250);
    return () => window.clearInterval(interval);
  }, [computeCountdowns, frameStartTimestamp, room.status]);

  const preRollRemaining = countdown.preRoll;
  const guessRemaining = countdown.guess;
  const isPreRoll = room.status === "in-progress" && preRollRemaining > 0;
  const timerDisplay = formatSecondsDisplay(isPreRoll ? preRollRemaining : guessRemaining);

  const currentFrameIndex = useMemo(() => {
    if (!room.frames.length) return 0;
    return Math.min(room.currentFrameIndex, room.frames.length - 1);
  }, [room.frames.length, room.currentFrameIndex]);

  const currentFrame = room.frames.length ? room.frames[currentFrameIndex] : null;
  const alreadySolvedByYou = Boolean(
    currentFrame && playerId && currentFrame.solvedPlayerIds.includes(playerId),
  );

  const canGuess = Boolean(
    playerId &&
      room.status === "in-progress" &&
      !isPreRoll &&
      guessRemaining > 0 &&
      !alreadySolvedByYou,
  );

  const canAdvanceFrame = canManage && room.status === "in-progress";
  const isFinalFrameActive =
    room.status === "in-progress" && room.currentFrameIndex >= Math.max(0, room.targetFrameCount - 1);
  const totalFrames = room.targetFrameCount;
  const currentFrameDisplay =
    room.status === "in-progress" || room.status === "completed"
      ? Math.min(totalFrames, room.currentFrameIndex + 1)
      : 0;
  const nextFrameNumber = Math.min(totalFrames, room.currentFrameIndex + 2);

  const advanceButtonLabel = room.status === "in-progress"
    ? isFinalFrameActive
      ? "Finish match"
      : `Next frame (${nextFrameNumber}/${totalFrames})`
    : "Advance frame";

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

  const handleSaveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canManage) {
      setSettingsError("Only the host can update game settings.");
      return;
    }

    setIsSavingSettings(true);
    setSettingsError(null);
    setSettingsSavedAt(null);

    try {
      const response = await fetch(`/api/rooms/${roomCode}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          settings: {
            difficulty: difficultyChoice,
            durationMinutes: durationChoice,
          },
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message =
          payload && typeof payload.error === "string"
            ? payload.error
            : "Could not update the game settings.";
        throw new Error(message);
      }

      setSettingsSavedAt(Date.now());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update the game settings.";
      setSettingsError(message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const mutateStatus = useCallback(async (nextStatus: RoomStatus) => {
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
            : "Could not update the match status.";
        throw new Error(message);
      }

      const payload = await response.json();
      if (payload?.room) {
        setRoom(payload.room as Room);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update the match status.";
      setStatusError(message);
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [canManage, roomCode]);

  const handleAdvanceFrame = useCallback(async () => {
    if (!canManage) {
      setStatusError("Only the host can advance frames.");
      return;
    }

    if (framesMissing > 0) {
      setStatusError("Add more frames before advancing.");
      return;
    }

    setIsAdvancingFrame(true);
    setStatusError(null);

    try {
      const response = await fetch(`/api/rooms/${roomCode}/advance`, {
        method: "POST",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message =
          payload && typeof payload.error === "string"
            ? payload.error
            : "Could not advance the frame.";
        throw new Error(message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not advance the frame.";
      setStatusError(message);
    } finally {
      setIsAdvancingFrame(false);
    }
  }, [canManage, framesMissing, roomCode]);

  useEffect(() => {
    if (!canAdvanceFrame) return;
    if (framesMissing > 0) return;
    if (room.status !== "in-progress") return;
    if (!room.frameStartedAt) return;
    if (preRollRemaining > 0) return;
    if (guessRemaining > 0) return;
    if (autoAdvanceTriggeredRef.current) return;

    autoAdvanceTriggeredRef.current = true;
    void handleAdvanceFrame();
  }, [canAdvanceFrame, framesMissing, guessRemaining, preRollRemaining, room.frameStartedAt, room.status, handleAdvanceFrame]);

  const handleGuessSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!playerId) {
      setGuessFeedback("Join the lobby as a player before guessing.");
      return;
    }

    if (!guessValue.trim()) {
      setGuessFeedback("Type your guess first.");
      return;
    }

    setIsSubmittingGuess(true);
    setGuessFeedback(null);

    try {
      const response = await fetch(`/api/rooms/${roomCode}/guess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, answer: guessValue }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message =
          payload && typeof payload.error === "string" ? payload.error : "Could not submit guess.";
        throw new Error(message);
      }

      const payload = await response.json();
      if (payload?.room) {
        setRoom(payload.room as Room);
      }

      if (payload?.outcome?.isCorrect) {
        if (payload.outcome.alreadySolved) {
          setGuessFeedback("You already solved this frame.");
        } else {
          setGuessFeedback("Correct! Nice work.");
        }
        setGuessValue("");
      } else {
        setGuessFeedback("Not quite—try again before the timer hits zero.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not submit guess.";
      setGuessFeedback(message);
    } finally {
      setIsSubmittingGuess(false);
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
                The host has ended this lobby or everyone left. Head back home to spin up a new party.
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

  const sortedPlayersWithFlags = sortedByScore.map((player) => ({
    ...player,
    isYou: player.id === (playerId ?? ""),
    isHost: player.role === "host",
  }));

  const currentFrameSolvedCount = currentFrame ? currentFrame.solvedPlayerIds.length : 0;
  const scoreboardVisible = room.status === "completed";

  const guessDisabled = !canGuess || isSubmittingGuess;

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
              onClick={() => refreshRoom({ silent: false })}
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
              Send the code to anyone who should join. Once everyone is in, start the match to reveal frames.
            </p>
            {copyState === "error" ? (
              <p className="text-sm text-error">Could not copy the code. Copy it manually instead.</p>
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
                    <div className="flex items-center gap-2 text-xs">
                      <span className="badge badge-outline">{player.score} pt{player.score === 1 ? "" : "s"}</span>
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
              <h2 className="card-title text-2xl text-base-content">Game setup</h2>
              <span className="badge badge-outline">{room.targetFrameCount}&nbsp;frames</span>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-base-300 bg-base-100 p-4">
                <p className="text-sm uppercase tracking-wide text-base-content/60">Difficulty</p>
                <p className="text-lg font-semibold text-base-content">{DIFFICULTY_LABELS[room.difficulty]}</p>
                <p className="mt-1 text-sm text-base-content/60">
                  Players get {room.guessWindowSeconds} seconds per frame to lock in their guess.
                </p>
              </div>
              <div className="rounded-lg border border-base-300 bg-base-100 p-4">
                <p className="text-sm uppercase tracking-wide text-base-content/60">Duration</p>
                <p className="text-lg font-semibold text-base-content">{room.durationMinutes} minute party</p>
                <p className="mt-1 text-sm text-base-content/60">
                  Expect roughly {room.targetFrameCount} frames this round.
                </p>
              </div>
              <div className="rounded-lg border border-base-300 bg-base-100 p-4">
                <p className="text-sm uppercase tracking-wide text-base-content/60">Match progress</p>
                <p className="text-lg font-semibold text-base-content">{currentFrameDisplay}/{totalFrames}</p>
                <p className="mt-1 text-sm text-base-content/60">Timer left: {timerDisplay}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="card border border-base-300 bg-base-200 shadow-md">
          <div className="card-body gap-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
                <h2 className="card-title text-2xl text-base-content">Current frame</h2>
                {room.status === "lobby" ? (
                  <p className="text-sm text-base-content/60">
                    Start the party to reveal frames. While you are waiting, make sure you have added enough frames for the
                    full match.
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-1 text-sm text-base-content/60 md:items-end">
                <span>{currentFrameSolvedCount} player{currentFrameSolvedCount === 1 ? "" : "s"} solved</span>
                <span>Queue: {frameQueue.length} frame{frameQueue.length === 1 ? "" : "s"}</span>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-3">
                <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-base-300 bg-base-100">
                  {currentFrame?.url ? (
                    <Image
                      src={currentFrame.url}
                      alt="Current frame"
                      fill
                      className={`object-cover transition-opacity ${isPreRoll ? "opacity-40 blur-sm" : "opacity-100"}`}
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      unoptimized
                      priority={room.status === "in-progress"}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-base-content/60">
                      Host will add frames here shortly.
                    </div>
                  )}
                  {room.status === "in-progress" ? (
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-base-100/80 px-4 py-2 text-sm text-base-content">
                      {isPreRoll ? (
                        <span>Frame reveals in {timerDisplay}</span>
                      ) : (
                        <span>Time remaining: {timerDisplay}</span>
                      )}
                      <span>Frame {currentFrameDisplay}/{totalFrames}</span>
                    </div>
                  ) : null}
                </div>
                {room.status === "in-progress" ? (
                  <form className="flex flex-col gap-3" onSubmit={handleGuessSubmit}>
                    <label className="form-control" htmlFor="guess-input">
                      <span className="label-text">Your guess</span>
                      <input
                        id="guess-input"
                        type="text"
                        value={guessValue}
                        onChange={(event) => setGuessValue(event.target.value)}
                        className="input input-bordered"
                        placeholder="Movie title"
                        disabled={guessDisabled}
                      />
                    </label>
                    <button
                      type="submit"
                      className="btn btn-secondary"
                      disabled={guessDisabled}
                    >
                      {alreadySolvedByYou
                        ? "Solved"
                        : isSubmittingGuess
                          ? "Submitting…"
                          : "Submit guess"}
                    </button>
                    {guessFeedback ? (
                      <p className="text-sm text-base-content/70" role="status">
                        {guessFeedback}
                      </p>
                    ) : null}
                  </form>
                ) : room.status === "completed" ? (
                  <p className="text-sm text-base-content/70">
                    Match complete! Check out the scoreboard below to see who crowned themselves cinephile-in-chief.
                  </p>
                ) : (
                  <p className="text-sm text-base-content/70">
                    Waiting for the host to start the match. Once the countdown ends, the first frame will drop here.
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="text-lg font-semibold text-base-content">How it works</h3>
                <ol className="list-decimal space-y-2 pl-5 text-sm text-base-content/70">
                  <li>Hosts have a 5 second pre-roll before the first frame appears.</li>
                  <li>Each frame runs for {room.guessWindowSeconds} seconds based on the selected difficulty.</li>
                  <li>Guests lock in answers; every correct guess awards 1 point and your input locks once you solve it.</li>
                  <li>When the timer expires, the lobby auto-advances to the next frame until the match wraps.</li>
                </ol>
              </div>
            </div>
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
                  const solvedCount = frame.solvedPlayerIds.length;
                  const youSolved = playerId ? frame.solvedPlayerIds.includes(playerId) : false;
                  const contributorName = contributor
                    ? contributor.name
                    : frame.addedBy === "quiz-generator"
                      ? "Quiz generator"
                      : "Auto seeded";
                  return (
                    <li key={frame.id} className="rounded-lg border border-base-300 bg-base-100 p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-base-content">Frame #{frame.order}</p>
                        <div className="flex items-center gap-2 text-xs text-base-content/70">
                          <span className="badge badge-outline">{solvedCount} solved</span>
                          {youSolved ? <span className="badge badge-success badge-sm">Solved by you</span> : null}
                        </div>
                      </div>
                      <a
                        href={frame.url}
                        target="_blank"
                        rel="noreferrer"
                        className="link link-primary mt-2 block break-words text-sm"
                      >
                        {frame.url}
                      </a>
                      <p className="mt-2 text-xs text-base-content/60">
                        Added by {contributorName}
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-base-content/60">
                Quiz stills are ready to go once the host starts the match.
              </p>
            )}
          </div>
        </section>

        {canManage ? (
          <section className="card border border-dashed border-primary bg-base-200/70 shadow-sm">
            <div className="card-body gap-4">
              <h2 className="card-title text-xl text-base-content">Host controls</h2>
              <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSaveSettings}>
                <label className="form-control" htmlFor="difficulty">
                  <span className="label-text">Difficulty</span>
                  <select
                    id="difficulty"
                    className="select select-bordered"
                    value={difficultyChoice}
                    onChange={(event) => setDifficultyChoice(event.target.value as GameDifficulty)}
                  >
                    <option value="easy">Easy (30s per frame)</option>
                    <option value="normal">Normal (20s per frame)</option>
                    <option value="hard">Hard (10s per frame)</option>
                  </select>
                </label>
                <label className="form-control" htmlFor="duration">
                  <span className="label-text">Party duration</span>
                  <select
                    id="duration"
                    className="select select-bordered"
                    value={durationChoice}
                    onChange={(event) => setDurationChoice(Number(event.target.value))}
                  >
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                  </select>
                </label>
                <button type="submit" className="btn btn-primary md:col-span-2" disabled={isSavingSettings}>
                  {isSavingSettings ? "Saving…" : "Save game settings"}
                </button>
                {settingsError ? (
                  <p className="rounded-md bg-error/10 px-3 py-2 text-sm text-error md:col-span-2" role="alert">
                    {settingsError}
                  </p>
                ) : null}
                {settingsSavedAt ? (
                  <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success md:col-span-2" role="status">
                    Game settings updated.
                  </p>
                ) : null}
              </form>
              <div className="flex flex-wrap items-center gap-3 text-sm text-base-content/70">
                <span className="badge badge-outline">Frame {currentFrameDisplay}/{totalFrames}</span>
                <span className="badge badge-outline">Timer {timerDisplay}</span>
                {framesMissing > 0 ? (
                  <span className="badge badge-warning badge-outline">
                    Add {framesMissing} frame{framesMissing === 1 ? "" : "s"} to cover the full match
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="btn btn-accent"
                  onClick={handleAdvanceFrame}
                  disabled={isAdvancingFrame || !canAdvanceFrame || framesMissing > 0}
                >
                  {isAdvancingFrame ? "Advancing…" : advanceButtonLabel}
                </button>
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
              <p className="text-sm text-base-content/60">
                Quiz stills are preloaded from the movie library. Adjust the settings above or start the match when everyone is ready.
              </p>
            </div>
          </section>
        ) : null}

        {scoreboardVisible ? (
          <section className="card border border-base-300 bg-base-200 shadow-md">
            <div className="card-body gap-3">
              <div className="flex items-center justify-between">
                <h2 className="card-title text-2xl text-base-content">Final scoreboard</h2>
                <span className="badge badge-outline">{room.targetFrameCount} frame party</span>
              </div>
              <ol className="space-y-2">
                {sortedPlayersWithFlags.map((player, index) => (
                  <li
                    key={player.id}
                    className={`flex items-center justify-between rounded-lg border border-base-300 bg-base-100 px-4 py-3 ${
                      index === 0 ? "shadow-md" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-base-content/60">#{index + 1}</span>
                      <span className="text-base font-semibold text-base-content">
                        {player.name}
                        {player.isYou ? " (You)" : ""}
                        {player.isHost ? " • Host" : ""}
                      </span>
                    </div>
                    <span className="badge badge-primary badge-lg font-semibold">
                      {player.score} pt{player.score === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
              </ol>
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
