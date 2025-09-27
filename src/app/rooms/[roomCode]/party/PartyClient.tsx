'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameDifficulty, Room, RoomStatus } from "@/lib/rooms";

interface PartyClientProps {
  initialRoom: Room;
  roomCode: string;
  playerId?: string | null;
  hostSessionActive?: boolean;
}

export default function PartyClient({
  initialRoom,
  roomCode,
  playerId,
  hostSessionActive = false,
}: PartyClientProps) {
  const [room, setRoom] = useState<Room | null>(initialRoom || null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [roomMissing, setRoomMissing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [eventsConnected, setEventsConnected] = useState(true);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [difficultyChoice, setDifficultyChoice] = useState<GameDifficulty>(initialRoom.difficulty);
  const [durationChoice, setDurationChoice] = useState<number>(initialRoom.durationMinutes);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSavedAt, setSettingsSavedAt] = useState<number | null>(null);

  const [guessValue, setGuessValue] = useState("");
  const [guessFeedback, setGuessFeedback] = useState<string | null>(null);
  const [isSubmittingGuess, setIsSubmittingGuess] = useState(false);

  const [isAdvancingFrame, setIsAdvancingFrame] = useState(false);

  const [shareUrl, setShareUrl] = useState<string>("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  const autoAdvanceTriggeredRef = useRef(false);

  const canManage = Boolean(hostSessionActive);
  const effectivePlayerId = playerId ?? null;

  const refreshRoom = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
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
    // Reset the auto-advance trigger only when the frame index changes, not when frameStartedAt changes
    autoAdvanceTriggeredRef.current = false;
  }, [room?.currentFrameIndex]);

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
    if (typeof window !== "undefined") {
      setShareUrl(`${window.location.origin}/rooms/${roomCode}`);
    }
  }, [roomCode]);

  // NO REDIRECTION LOGIC HERE - This is the key difference from LobbyClient

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

    // We don't listen to party:redirect or party:countdown events here
    // This prevents the infinite redirect loop

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

  const players = useMemo(() => {
    return room ? [...room.players].sort((a, b) => a.joinedAt - b.joinedAt) : [];
  }, [room?.players]);

  const playersById = useMemo(() => {
    return players.reduce<Map<string, Player>>((map, player) => {
      map.set(player.id, player);
      return map;
    }, new Map());
  }, [players]);

  const sortedByScore = useMemo(() => {
    return [...players].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.joinedAt - b.joinedAt;
    });
  }, [players]);

  const frameQueue = useMemo(() => room ? [...room.frames] : [], [room?.frames]);
  const framesMissing = room ? Math.max(0, room.targetFrameCount - frameQueue.length) : 0;

  const frameStartTimestamp = room?.frameStartedAt ?? null;
  const computeCountdown = useCallback((): CountdownState => {
    if (!room || room.status !== "in-progress" || !frameStartTimestamp) {
      return {
        preRoll: 0,
        guess: room?.guessWindowSeconds ?? 20,
        timerDisplay: formatSecondsDisplay(room?.guessWindowSeconds ?? 20),
        isPreRoll: false,
      };
    }

    const now = Date.now();
    const preRoll = Math.max(0, Math.ceil((frameStartTimestamp - now) / 1000));
    const elapsed = Math.max(0, (now - frameStartTimestamp) / 1000);
    const guess = Math.max(0, room.guessWindowSeconds - elapsed);
    const isPreRoll = preRoll > 0;
    const timerDisplay = formatSecondsDisplay(isPreRoll ? preRoll : guess);

    return { preRoll, guess, timerDisplay, isPreRoll };
  }, [frameStartTimestamp, room?.guessWindowSeconds, room?.status]);

  const [countdown, setCountdown] = useState<CountdownState>(() => computeCountdown());

  useEffect(() => {
    setCountdown(computeCountdown());
  }, [computeCountdown]);

  useEffect(() => {
    if (!room || room.status !== "in-progress" || !frameStartTimestamp) {
      return;
    }
    const interval = window.setInterval(() => {
      setCountdown(computeCountdown());
    }, 250);
    return () => window.clearInterval(interval);
  }, [computeCountdown, frameStartTimestamp, room?.status]);

  const currentFrameIndex = useMemo(() => {
    if (!room || !room.frames.length) return 0;
    return room.currentFrameIndex;
  }, [room?.currentFrameIndex]);

  const currentFrame = room?.frames.length ? room.frames[currentFrameIndex] : null;
  const alreadySolvedByYou = Boolean(
    currentFrame && effectivePlayerId && currentFrame.solvedPlayerIds.includes(effectivePlayerId),
  );

  const canGuess = Boolean(
    effectivePlayerId &&
      room?.status === "in-progress" &&
      !countdown.isPreRoll &&
      countdown.guess > 0 &&
      !alreadySolvedByYou,
  );

  const totalFrames = room?.targetFrameCount ?? 0;
  const currentFrameDisplay =
    room?.status === "in-progress" || room?.status === "completed"
      ? Math.min(totalFrames, (room?.currentFrameIndex ?? 0) + 1)
      : 0;

  const isFinalFrameActive =
    room?.status === "in-progress" && (room?.currentFrameIndex ?? 0) >= Math.max(0, (room?.targetFrameCount ?? 0) - 1);
  const nextFrameNumber = Math.min(totalFrames, (room?.currentFrameIndex ?? 0) + 2);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(room?.code ?? "");
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2500);
    } catch (error) {
      console.error("Failed to copy room code", error);
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 2500);
    }
  }, [room?.code]);

  const mutateStatus = useCallback(
    async (nextStatus: RoomStatus) => {
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
    },
    [canManage, roomCode],
  );

  const handleSaveSettings = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
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
    },
    [canManage, difficultyChoice, durationChoice, roomCode],
  );

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
    if (!canManage) return;
    if (framesMissing > 0) return;
    if (room?.status !== "in-progress") return;
    if (!room?.frameStartedAt) return;
    if (countdown.isPreRoll) return;
    if (countdown.guess > 0) return;
    if (autoAdvanceTriggeredRef.current) return;

    autoAdvanceTriggeredRef.current = true;
    void handleAdvanceFrame();
  }, [canManage, countdown.guess, countdown.isPreRoll, framesMissing, room?.status]);

  const handleGuessSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!effectivePlayerId) {
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
          body: JSON.stringify({ playerId: effectivePlayerId, answer: guessValue }),
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
    },
    [effectivePlayerId, guessValue, roomCode],
  );

  const handleShareCopy = useCallback(() => {
    void handleCopyCode();
  }, [handleCopyCode]);

  // Import the necessary components and types
  const advanceButtonLabel = room?.status === "in-progress"
    ? isFinalFrameActive
      ? "Finish match"
      : `Next frame (${nextFrameNumber}/${totalFrames})`
    : "Advance frame";

  const currentFrameSolvedCount = currentFrame ? currentFrame.solvedPlayerIds.length : 0;
  const scoreboardVisible = room?.status === "completed";

  if (roomMissing || !room) {
    return (
      <div className="flex min-h-screen flex-col bg-base-100">
        <header className="border-b border-base-300 bg-base-100">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
            <span className="text-lg font-semibold text-primary">Guess the Frame</span>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="alert alert-warning">
            <span>This lobby has wrapped. Ask the host for a fresh code.</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-base-100">
      <header className="border-b border-base-300 bg-base-100">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
          <span className="text-lg font-semibold text-primary">Guess the Frame</span>
          <div className="flex items-center gap-3">
            <span className={`badge ${eventsConnected ? "badge-success" : "badge-warning"}`}>
              {eventsConnected ? "Connected" : "Reconnecting..."}
            </span>
            {isRefreshing && <span className="loading loading-spinner loading-sm" />}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
        {/* Game Status */}
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-2xl">
              {room.status === "lobby" && "Waiting to start"}
              {room.status === "in-progress" && "Game in progress"}
              {room.status === "completed" && "Game completed"}
            </h2>
            <p className="text-base-content/70">
              {room.status === "lobby" && "The host will start the game when ready."}
              {room.status === "in-progress" && `Frame ${currentFrameDisplay} of ${totalFrames}`}
              {room.status === "completed" && "The game has ended. Check the final scores below."}
            </p>
          </div>
        </div>

        {/* Current Frame (if game is active) */}
        {room.status === "in-progress" && currentFrame && (
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Current Frame</h3>
                <div className="text-2xl font-bold text-primary">{countdown.timerDisplay}</div>
              </div>
              
              <div className="aspect-video bg-base-300 rounded-lg flex items-center justify-center mb-4">
                <img 
                  src={currentFrame.url} 
                  alt="Movie frame" 
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              </div>

              {canGuess && (
                <form onSubmit={handleGuessSubmit} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Your guess..."
                    value={guessValue}
                    onChange={(e) => setGuessValue(e.target.value)}
                    className="input input-bordered flex-1"
                    disabled={isSubmittingGuess}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmittingGuess || !guessValue.trim()}
                  >
                    {isSubmittingGuess ? "Submitting..." : "Submit"}
                  </button>
                </form>
              )}

              {guessFeedback && (
                <div className={`alert ${guessFeedback.includes("Correct") ? "alert-success" : "alert-warning"}`}>
                  <span>{guessFeedback}</span>
                </div>
              )}

              <div className="text-sm text-base-content/70">
                {currentFrameSolvedCount} player{currentFrameSolvedCount !== 1 ? 's' : ''} solved this frame
              </div>
            </div>
          </div>
        )}

        {/* Host Controls */}
        {canManage && (
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h3 className="text-xl font-semibold mb-4">Host Controls</h3>
              
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="btn btn-accent"
                  onClick={handleAdvanceFrame}
                  disabled={isAdvancingFrame || framesMissing > 0}
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
              
              {statusError && (
                <p className="rounded-md bg-error/10 px-3 py-2 text-sm text-error" role="alert">
                  {statusError}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Players List */}
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h3 className="text-xl font-semibold mb-4">Players ({players.length})</h3>
            <div className="space-y-2">
              {sortedByScore.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-3 bg-base-100 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{player.name}</span>
                    <span className="badge badge-outline">{player.role}</span>
                  </div>
                  <span className="text-lg font-bold text-primary">{player.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Error Messages */}
        {errorMessage && (
          <div className="alert alert-warning">
            <span>{errorMessage}</span>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => setErrorMessage(null)}
            >
              Clear
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// Helper types and functions
interface CountdownState {
  preRoll: number;
  guess: number;
  timerDisplay: string;
  isPreRoll: boolean;
}

interface Player {
  id: string;
  name: string;
  role: string;
  joinedAt: number;
  score: number;
}

function formatSecondsDisplay(value: number): string {
  const clamped = Math.max(0, Math.ceil(value));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
