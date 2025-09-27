'use client';

import type { Frame, Player } from "@/lib/rooms";

interface FrameQueueProps {
  frameQueue: Frame[];
  playersById: Map<string, Player>;
  currentPlayerId?: string | null;
}

export default function FrameQueue({ frameQueue, playersById, currentPlayerId }: FrameQueueProps) {
  return (
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
              const youSolved = currentPlayerId ? frame.solvedPlayerIds.includes(currentPlayerId) : false;
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
  );
}
