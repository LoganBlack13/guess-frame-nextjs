import { useState, useCallback, useEffect, useMemo } from 'react';
import type { Room } from '@/lib/rooms';

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
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

interface UseCountdownProps {
  room: Room | null;
  frameStartTimestamp: Date | null;
}

export function useCountdown({ room, frameStartTimestamp }: UseCountdownProps) {
  const computeCountdown = useCallback((): CountdownState => {
    if (!room || room.status !== 'in-progress' || !frameStartTimestamp) {
      return {
        preRoll: 0,
        guess: 0,
        timerDisplay: '0:00',
        isPreRoll: false,
      };
    }

    const now = Date.now();
    const elapsed = (now - frameStartTimestamp.getTime()) / 1000;
    const preRoll = Math.max(0, room.preRollSeconds - elapsed);
    const guess = Math.max(0, room.guessWindowSeconds - elapsed);
    const isPreRoll = preRoll > 0;
    const timerDisplay = formatSecondsDisplay(isPreRoll ? preRoll : guess);

    return { preRoll, guess, timerDisplay, isPreRoll };
  }, [room, frameStartTimestamp]);

  const [countdown, setCountdown] = useState<CountdownState>(() =>
    computeCountdown()
  );

  useEffect(() => {
    setCountdown(computeCountdown());
  }, [computeCountdown]);

  useEffect(() => {
    if (!room || room.status !== 'in-progress' || !frameStartTimestamp) {
      return;
    }
    const interval = window.setInterval(() => {
      setCountdown(computeCountdown());
    }, 250);
    return () => window.clearInterval(interval);
  }, [computeCountdown, frameStartTimestamp, room?.status]);

  return {
    countdown,
    computeCountdown,
  };
}
