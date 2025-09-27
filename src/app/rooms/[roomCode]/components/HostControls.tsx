'use client';

import type { GameDifficulty, RoomStatus } from "@/lib/rooms";

interface HostControlsProps {
  canManage: boolean;
  difficultyChoice: GameDifficulty;
  setDifficultyChoice: (difficulty: GameDifficulty) => void;
  durationChoice: number;
  setDurationChoice: (duration: number) => void;
  onSaveSettings: (event: React.FormEvent<HTMLFormElement>) => void;
  isSavingSettings: boolean;
  settingsError: string | null;
  settingsSavedAt: number | null;
  currentFrameDisplay: number;
  totalFrames: number;
  timerDisplay: string;
  framesMissing: number;
  onAdvanceFrame: () => void;
  isAdvancingFrame: boolean;
  canAdvanceFrame: boolean;
  advanceButtonLabel: string;
  onMutateStatus: (status: RoomStatus) => void;
  isUpdatingStatus: boolean;
  statusError: string | null;
  roomStatus: RoomStatus;
}

export default function HostControls({
  canManage,
  difficultyChoice,
  setDifficultyChoice,
  durationChoice,
  setDurationChoice,
  onSaveSettings,
  isSavingSettings,
  settingsError,
  settingsSavedAt,
  currentFrameDisplay,
  totalFrames,
  timerDisplay,
  framesMissing,
  onAdvanceFrame,
  isAdvancingFrame,
  canAdvanceFrame,
  advanceButtonLabel,
  onMutateStatus,
  isUpdatingStatus,
  statusError,
  roomStatus,
}: HostControlsProps) {
  if (!canManage) return null;

  return (
    <section className="card border border-dashed border-primary bg-base-200/70 shadow-sm">
      <div className="card-body gap-4">
        <h2 className="card-title text-xl text-base-content">Host controls</h2>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={onSaveSettings}>
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
            onClick={onAdvanceFrame}
            disabled={isAdvancingFrame || !canAdvanceFrame || framesMissing > 0}
          >
            {isAdvancingFrame ? "Advancing…" : advanceButtonLabel}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onMutateStatus("in-progress")}
            disabled={isUpdatingStatus}
          >
            Start match
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onMutateStatus("lobby")}
            disabled={isUpdatingStatus}
          >
            Reset to lobby
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onMutateStatus("completed")}
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
  );
}
