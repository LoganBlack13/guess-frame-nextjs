'use client';

import Link from 'next/link';

interface GameCompletedProps {
  className?: string;
}

export default function GameCompleted({ className }: GameCompletedProps) {
  return (
    <div className={`card bg-base-200 shadow-xl ${className}`}>
      <div className="card-body text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold text-primary mb-2">Game Completed!</h1>
        <p className="text-base-content/70 mb-6">
          Great game everyone! Check out the final results below.
        </p>
        <Link 
          href="/" 
          className="btn btn-primary btn-lg"
        >
          🏠 Return to Homepage
        </Link>
      </div>
    </div>
  );
}
