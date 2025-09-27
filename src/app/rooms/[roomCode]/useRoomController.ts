'use client';

import { useCallback, useEffect, useMemo, useRef, useState, FormEvent } from "react";
import type { GameDifficulty, Room, RoomStatus } from "@/lib/rooms";

export interface UseRoomControllerOptions {
  initialRoom: Room | null;
  roomCode: string;
  playerId?: string | null;
  hostSessionActive?: boolean;
}

export interface CountdownState {
  preRoll: number;
  guess: number;
  timerDisplay: string;
  isPreRoll: boolean;
}

function formatSecondsDisplay(value: number): string {
  const clamped = Math.max(0, Math.ceil(value));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function useRoomController({
  initialRoom,
  roomCode,
  playerId,
  hostSessionActive,
}: UseRoomControllerOptions) {
  const [room, setRoom] = useState<Room | null>(initialRoom || null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [roomMissing, setRoomMissing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [eventsConnected, setEventsConnected] = useState(true);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [difficultyChoice, setDifficultyChoice] = useState<GameDifficulty>(initialRoom?.difficulty || 'normal');
  const [durationChoice, setDurationChoice] = useState<number>(initialRoom?.durationMinutes || 10);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSavedAt, setSettingsSavedAt] = useState<number | null>(null);

  const [guessValue, setGuessValue] = useState("");
  const [guessFeedback, setGuessFeedback] = useState<string | null>(null);
  const [isSubmittingGuess, setIsSubmittingGuess] = useState(false);

  // Nouvelle logique pour la génération de partie
  const [isGeneratingGame, setIsGeneratingGame] = useState(false);
  const [gameGenerationError, setGameGenerationError] = useState<string | null>(null);

  const [isAdvancingFrame, setIsAdvancingFrame] = useState(false);

  const [shareUrl, setShareUrl] = useState<string>("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [partyCountdown, setPartyCountdown] = useState<number | null>(null);
  const [shouldRedirectToParty, setShouldRedirectToParty] = useState(false);

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
    setDifficultyChoice(initialRoom?.difficulty || 'normal');
    setDurationChoice(initialRoom?.durationMinutes || 10);
    setSettingsSavedAt(null);
    setSettingsError(null);
  }, [initialRoom?.difficulty, initialRoom?.durationMinutes]);

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

  // Effect for automatic redirection to the party page
  useEffect(() => {
    if (shouldRedirectToParty && typeof window !== "undefined") {
      const redirectTimer = setTimeout(() => {
        window.location.href = `/rooms/${roomCode}/party?playerId=${effectivePlayerId}&role=${hostSessionActive ? 'host' : 'guest'}`;
      }, 100); // Small delay to ensure state is updated
      
      return () => clearTimeout(redirectTimer);
    }
  }, [shouldRedirectToParty, roomCode, effectivePlayerId, hostSessionActive]);

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

    const handlePartyRedirect: EventListener = (event) => {
      const message = event as MessageEvent<string>;
      try {
        const data = JSON.parse(message.data) as Room;
        setRoom(data);
        setShouldRedirectToParty(true);
      } catch (error) {
        console.error("Failed to parse party redirect", error);
      }
    };

    const handlePartyCountdown: EventListener = (event) => {
      const message = event as MessageEvent<string>;
      try {
        const data = JSON.parse(message.data) as { room: Room; countdown: number };
        setRoom(data.room);
        setPartyCountdown(data.countdown);
      } catch (error) {
        console.error("Failed to parse party countdown", error);
      }
    };

    source.addEventListener("room:update", handleUpdate);
    source.addEventListener("party:redirect", handlePartyRedirect);
    source.addEventListener("party:countdown", handlePartyCountdown);
    source.onopen = () => {
      setEventsConnected(true);
    };
    source.onerror = () => {
      setEventsConnected(false);
      setErrorMessage((previous) => previous ?? "Live updates interrupted. Use refresh while we reconnect.");
    };

    return () => {
      source.removeEventListener("room:update", handleUpdate);
      source.removeEventListener("party:redirect", handlePartyRedirect);
      source.removeEventListener("party:countdown", handlePartyCountdown);
      source.close();
    };
  }, [roomCode, roomMissing]);

  const players = useMemo(() => {
    return room ? [...room.players].sort((a, b) => a.joinedAt - b.joinedAt) : [];
  }, [room?.players]);

  const playersById = useMemo(() => {
    return players.reduce<Map<string, any>>((map, player) => {
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

  // Fonction pour générer la partie
  const handleStartGame = useCallback(async (settings: {
    difficulty: 'easy' | 'normal' | 'hard';
    durationMinutes: number;
    genres?: string[];
    yearRange?: { min: number; max: number };
  }) => {
    if (!hostSessionActive) {
      setGameGenerationError('Seul l\'hôte peut démarrer la partie');
      return;
    }

    setIsGeneratingGame(true);
    setGameGenerationError(null);

    try {
      const response = await fetch(`/api/rooms/${roomCode}/start-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start game');
      }

      const result = await response.json();
      console.log('Game started successfully:', result);
      
      // Si la réponse contient la room mise à jour, l'utiliser directement
      if (result.room) {
        setRoom(result.room as Room);
      } else {
        // Sinon, rafraîchir la room pour voir les changements
        await refreshRoom({ silent: false });
      }
      
    } catch (error) {
      console.error('Failed to start game:', error);
      setGameGenerationError(error instanceof Error ? error.message : 'Erreur inconnue');
    } finally {
      setIsGeneratingGame(false);
    }
  }, [hostSessionActive, roomCode, refreshRoom]);

  return {
    room,
    roomMissing,
    errorMessage,
    setErrorMessage,
    eventsConnected,
    isRefreshing,
    refreshRoom,
    countdown,
    currentFrame,
    currentFrameIndex,
    currentFrameDisplay,
    totalFrames,
    nextFrameNumber,
    isFinalFrameActive,
    players,
    playersById,
    sortedByScore,
    frameQueue,
    framesMissing,
    alreadySolvedByYou,
    canGuess,
    guessValue,
    setGuessValue,
    guessFeedback,
    isSubmittingGuess,
    handleGuessSubmit,
    canManage,
    hostSessionActive: Boolean(hostSessionActive),
    mutateStatus,
    isUpdatingStatus,
    statusError,
    setStatusError,
    handleAdvanceFrame,
    isAdvancingFrame,
    difficultyChoice,
    setDifficultyChoice,
    durationChoice,
    setDurationChoice,
    handleSaveSettings,
    isSavingSettings,
    settingsError,
    settingsSavedAt,
    copyState,
    shareUrl,
    handleShareCopy,
    partyCountdown,
    shouldRedirectToParty,
    // Nouvelles propriétés pour la génération de partie
    handleStartGame,
    isGeneratingGame,
    gameGenerationError,
  };
}
