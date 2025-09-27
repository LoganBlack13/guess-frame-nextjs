'use client';

import type { GameDifficulty } from "@/lib/rooms";

interface GameSettingsProps {
  difficulty: GameDifficulty;
  durationMinutes: number;
  targetFrameCount: number;
  currentFrameDisplay: number;
  totalFrames: number;
  timerDisplay: string;
  framesMissing: number;
}

const DIFFICULTY_LABELS: Record<GameDifficulty, string> = {
  easy: "Easy (30s per frame)",
  normal: "Normal (20s per frame)",
  hard: "Hard (10s per frame)",
};

export default function GameSettings({
  difficulty,
  durationMinutes,
  targetFrameCount,
  currentFrameDisplay,
  totalFrames,
  timerDisplay,
  framesMissing,
}: GameSettingsProps) {
  return (
    <section className="card border border-base-300 bg-base-200 shadow-md">
      <div className="card-body gap-3">
        <div className="flex items-center justify-between">
          <h2 className="card-title text-2xl text-base-content">Game setup</h2>
          <span className="badge badge-outline">{targetFrameCount}&nbsp;frames</span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-base-300 bg-base-100 p-4">
            <p className="text-sm uppercase tracking-wide text-base-content/60">Difficulty</p>
            <p className="text-lg font-semibold text-base-content">{DIFFICULTY_LABELS[difficulty]}</p>
            <p className="mt-1 text-sm text-base-content/60">
              Players get {difficulty === "easy" ? 30 : difficulty === "normal" ? 20 : 10} seconds per frame to lock in their guess.
            </p>
          </div>
          <div className="rounded-lg border border-base-300 bg-base-100 p-4">
            <p className="text-sm uppercase tracking-wide text-base-content/60">Duration</p>
            <p className="text-lg font-semibold text-base-content">{durationMinutes} minute party</p>
            <p className="mt-1 text-sm text-base-content/60">
              Expect roughly {targetFrameCount} frames this round.
            </p>
          </div>
          <div className="rounded-lg border border-base-300 bg-base-100 p-4">
            <p className="text-sm uppercase tracking-wide text-base-content/60">Match progress</p>
            <p className="text-lg font-semibold text-base-content">{currentFrameDisplay}/{totalFrames}</p>
            <p className="mt-1 text-sm text-base-content/60">Timer left: {timerDisplay}</p>
          </div>
        </div>
        {framesMissing > 0 && (
          <div className="alert alert-warning">
            <span className="font-medium">Missing frames:</span>
            <span>Add {framesMissing} more frame{framesMissing === 1 ? "" : "s"} to cover the full match.</span>
          </div>
        )}
      </div>
    </section>
  );
}
