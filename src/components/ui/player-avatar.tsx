'use client';

import { cn } from '@/lib/utils';

interface PlayerAvatarProps {
  name: string;
  score: number;
  isCorrect?: boolean;
  className?: string;
}

export function PlayerAvatar({ name, score, isCorrect = false, className }: PlayerAvatarProps) {
  const initials = name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);


  return (
    <div className={cn("relative flex flex-col items-center gap-2", className)}>
      <div 
        className={cn(
          "relative flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-content font-bold text-lg transition-all duration-300",
          isCorrect && "ring-4 ring-green-400 ring-opacity-75 shadow-lg shadow-green-400/50"
        )}
      >
        {initials}
        {isCorrect && (
          <div className="absolute inset-0 rounded-full bg-green-400/20 animate-pulse" />
        )}
      </div>
      <div className="text-center">
        <div className="text-sm font-medium text-base-content">{name}</div>
        <div className="text-xs text-primary font-bold">{score}</div>
      </div>
    </div>
  );
}
