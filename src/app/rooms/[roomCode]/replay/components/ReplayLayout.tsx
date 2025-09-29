'use client';

import Link from 'next/link';

import ThemeSelector from '@/components/ui/theme-selector';

interface ReplayLayoutProps {
  roomCode: string;
  children: React.ReactNode;
}

export default function ReplayLayout({
  roomCode,
  children,
}: ReplayLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-base-100">
      <header className="border-b border-base-300 bg-base-100">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-lg font-semibold text-primary">
            Guess the Frame
          </Link>
          <div className="flex items-center gap-3">
            <ThemeSelector />
            <Link
              href={`/rooms/${roomCode}/lobby`}
              className="btn btn-ghost btn-sm"
            >
              Back to Lobby
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
