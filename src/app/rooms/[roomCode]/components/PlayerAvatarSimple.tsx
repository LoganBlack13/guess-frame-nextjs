'use client';

interface PlayerAvatarSimpleProps {
  name: string;
  isHost?: boolean;
  isCurrentPlayer?: boolean;
  className?: string;
}

export default function PlayerAvatarSimple({ 
  name, 
  isHost = false, 
  isCurrentPlayer = false,
  className = '' 
}: PlayerAvatarSimpleProps) {
  const initial = name.charAt(0).toUpperCase();
  
  return (
    <div className={`relative ${className}`}>
      <div className={`
        w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg
        ${isCurrentPlayer 
          ? 'bg-gradient-to-br from-primary to-secondary neon-glow' 
          : 'bg-gradient-to-br from-base-300 to-base-200'
        }
        ${isHost ? 'ring-2 ring-warning ring-offset-2 ring-offset-base-200' : ''}
      `}>
        {initial}
      </div>
      {isHost && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-warning rounded-full flex items-center justify-center">
          <span className="text-xs">👑</span>
        </div>
      )}
    </div>
  );
}
