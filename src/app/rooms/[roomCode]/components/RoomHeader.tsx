'use client';

import Link from 'next/link';

interface RoomHeaderProps {
  roomCode: string;
  status: string;
  eventsConnected: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onCopyCode: () => void;
  copyState: 'idle' | 'copied' | 'error';
  shareUrl: string;
}

const statusLabel: Record<string, string> = {
  lobby: 'Lobby open',
  'in-progress': 'Match in progress',
  completed: 'Match complete',
};

export default function RoomHeader({
  roomCode,
  status,
  eventsConnected,
  isRefreshing,
  onRefresh,
  onCopyCode,
  copyState,
  shareUrl,
}: RoomHeaderProps) {
  return (
    <div className="flex min-h-screen flex-col bg-base-100">
      <header className="border-b border-base-300 bg-base-100">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-5 sm:flex-nowrap">
          <Link href="/" className="text-lg font-semibold text-primary">
            Guess the Frame
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span
              className={`badge ${eventsConnected ? 'badge-success' : 'badge-warning'} badge-outline uppercase`}
            >
              {eventsConnected ? 'Live' : 'Reconnecting'}
            </span>
            <button
              type="button"
              onClick={onRefresh}
              className="btn btn-ghost btn-sm"
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Refreshing…' : 'Refresh lobby'}
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
                <p className="text-sm font-medium uppercase tracking-wide text-base-content/60">
                  Room code
                </p>
                <p className="font-mono text-4xl font-semibold text-base-content">
                  {roomCode}
                </p>
                <p className="mt-2 text-sm text-base-content/70">
                  {statusLabel[status]}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onCopyCode}
                >
                  {copyState === 'copied' ? 'Copied' : 'Copy code'}
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
              Send the code to anyone who should join. Once everyone is in,
              start the match to reveal frames.
            </p>
            {copyState === 'error' ? (
              <p className="text-sm text-error">
                Could not copy the code. Copy it manually instead.
              </p>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
