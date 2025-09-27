'use client';

import Image from "next/image";
import type { Frame, RoomStatus } from "@/lib/rooms";

interface CurrentFrameProps {
  roomStatus: RoomStatus;
  currentFrame: Frame | null;
  isPreRoll: boolean;
  timerDisplay: string;
  currentFrameDisplay: number;
  totalFrames: number;
  currentFrameSolvedCount: number;
  frameQueueLength: number;
  canGuess: boolean;
  alreadySolvedByYou: boolean;
  guessValue: string;
  setGuessValue: (value: string) => void;
  onGuessSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  isSubmittingGuess: boolean;
  guessFeedback: string | null;
}

export default function CurrentFrame({
  roomStatus,
  currentFrame,
  isPreRoll,
  timerDisplay,
  currentFrameDisplay,
  totalFrames,
  currentFrameSolvedCount,
  frameQueueLength,
  canGuess,
  alreadySolvedByYou,
  guessValue,
  setGuessValue,
  onGuessSubmit,
  isSubmittingGuess,
  guessFeedback,
}: CurrentFrameProps) {
  const guessDisabled = !canGuess || isSubmittingGuess;

  return (
    <section className="card border border-base-300 bg-base-200 shadow-md">
      <div className="card-body gap-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="flex-1">
            <h2 className="card-title text-2xl text-base-content">Current frame</h2>
            {roomStatus === "lobby" ? (
              <p className="text-sm text-base-content/60">
                Start the party to reveal frames. While you are waiting, make sure you have added enough frames for the
                full match.
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1 text-sm text-base-content/60 md:items-end">
            <span>{currentFrameSolvedCount} player{currentFrameSolvedCount === 1 ? "" : "s"} solved</span>
            <span>Queue: {frameQueueLength} frame{frameQueueLength === 1 ? "" : "s"}</span>
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
                  priority={roomStatus === "in-progress"}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-base-content/60">
                  Host will add frames here shortly.
                </div>
              )}
              {roomStatus === "in-progress" ? (
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
            {roomStatus === "in-progress" ? (
              <form className="flex flex-col gap-3" onSubmit={onGuessSubmit}>
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
            ) : roomStatus === "completed" ? (
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
              <li>Each frame runs for a set time based on the selected difficulty.</li>
              <li>Guests lock in answers; every correct guess awards 1 point and your input locks once you solve it.</li>
              <li>When the timer expires, the lobby auto-advances to the next frame until the match wraps.</li>
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
