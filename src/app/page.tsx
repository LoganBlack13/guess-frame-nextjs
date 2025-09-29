'use client';

import { FormEvent, useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { useTheme } from '@/hooks/useTheme';

export default function Home() {
  const router = useRouter();
  const { theme, themes, changeTheme, isLoading } = useTheme();

  const [hostName, setHostName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, startCreate] = useTransition();

  const [joinCode, setJoinCode] = useState('');
  const [guestName, setGuestName] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, startJoin] = useTransition();

  const handleCreateRoom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);

    startCreate(async () => {
      try {
        const response = await fetch('/api/rooms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ hostName }),
        });

        if (!response.ok) {
          const payload = await response.json();
          setCreateError(
            typeof payload?.error === 'string'
              ? payload.error
              : "Couldn't launch the room."
          );
          return;
        }

        const payload = await response.json();
        const roomCode: string | undefined = payload?.room?.code;
        const playerId: string | undefined = payload?.player?.id;

        if (!roomCode || !playerId) {
          setCreateError(
            "Room created, but we couldn't fetch your details. Refresh and try again."
          );
          return;
        }

        setHostName('');
        router.push(`/rooms/${roomCode}/lobby?playerId=${playerId}&role=host`);
      } catch (error) {
        console.error('Failed to create room', error);
        setCreateError('Network hiccup. Give it another go.');
      }
    });
  };

  const handleJoinRoom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setJoinError(null);

    startJoin(async () => {
      try {
        const response = await fetch('/api/rooms/join', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ roomCode: joinCode, playerName: guestName }),
        });

        if (!response.ok) {
          const payload = await response.json();
          setJoinError(
            typeof payload?.error === 'string'
              ? payload.error
              : "Couldn't join this room."
          );
          return;
        }

        const payload = await response.json();
        const roomCode: string | undefined = payload?.room?.code;
        const playerId: string | undefined = payload?.player?.id;

        if (!roomCode || !playerId) {
          setJoinError(
            "Joined, but we couldn't fetch your details. Try again."
          );
          return;
        }

        setJoinCode('');
        setGuestName('');
        router.push(`/rooms/${roomCode}/lobby?playerId=${playerId}&role=guest`);
      } catch (error) {
        console.error('Failed to join room', error);
        setJoinError('Network hiccup. Try again in a moment.');
      }
    });
  };

  return (
    <div className="full-height synthwave-bg grid-pattern relative overflow-hidden">
      {/* Navigation */}
      <div className="navbar bg-base-100/10 backdrop-blur-sm border-b border-primary/20">
        <div className="navbar-start">
          <a className="btn btn-ghost text-xl font-bold movie-icon">
            🎬 Guess the Frame
          </a>
        </div>
        <div className="navbar-end">
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              {!isLoading && (
                <span className="ml-2">
                  {themes.find((t) => t.value === theme)?.icon}
                </span>
              )}
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content bg-base-300 rounded-box z-1 w-52 p-2 shadow-2xl"
            >
              {themes.map((themeOption) => (
                <li key={themeOption.value}>
                  <input
                    type="radio"
                    name="theme-dropdown"
                    className="theme-controller w-full btn btn-sm btn-block btn-ghost justify-start"
                    aria-label={themeOption.label}
                    value={themeOption.value}
                    checked={theme === themeOption.value}
                    onChange={() => changeTheme(themeOption.value)}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-6xl">
          {/* Title Section */}
          <div className="text-center mb-12">
            <div className="badge badge-primary badge-outline mb-6 neon-glow">
              <span className="neon-text">BETA</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-bold mb-6">
              <span className="movie-icon neon-text">GUESS THE FRAME</span>
            </h1>
            <p className="text-2xl md:text-3xl text-base-content/80 mb-4">
              🎮 <span className="movie-icon">RETRO MOVIE GAME</span> 🎮
            </p>
            <p className="text-lg text-base-content/70">
              Challenge yourself with iconic{' '}
              <span className="movie-icon font-bold">movie frames!</span>
            </p>
          </div>

          {/* Main Action Cards */}
          <div className="grid lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Create Room Card */}
            <div className="card bg-base-100/20 backdrop-blur-sm shadow-2xl retro-border">
              <div className="card-body">
                <h2 className="card-title text-2xl movie-icon justify-center mb-6">
                  🎬 CREATE ROOM
                </h2>
                <p className="text-center text-base-content/70 mb-6">
                  Start a new game and invite your friends
                </p>

                <form onSubmit={handleCreateRoom} className="space-y-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text text-base-content">
                        Your name
                      </span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your name"
                      value={hostName}
                      onChange={(event) => setHostName(event.target.value)}
                      className="input input-bordered w-full bg-base-100/50"
                      required
                      minLength={2}
                      maxLength={24}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary w-full neon-glow"
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Creating...
                      </>
                    ) : (
                      '🎮 CREATE GAME'
                    )}
                  </button>

                  {createError && (
                    <div className="alert alert-error">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>{createError}</span>
                    </div>
                  )}
                </form>
              </div>
            </div>

            {/* Join Room Card */}
            <div className="card bg-base-100/20 backdrop-blur-sm shadow-2xl retro-border">
              <div className="card-body">
                <h2 className="card-title text-2xl movie-icon justify-center mb-6">
                  🎯 JOIN ROOM
                </h2>
                <p className="text-center text-base-content/70 mb-6">
                  Enter a room code to join an existing game
                </p>

                <form onSubmit={handleJoinRoom} className="space-y-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text text-base-content">
                        Your name
                      </span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your name"
                      value={guestName}
                      onChange={(event) => setGuestName(event.target.value)}
                      className="input input-bordered w-full bg-base-100/50"
                      required
                      minLength={2}
                      maxLength={24}
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text text-base-content">
                        Room code
                      </span>
                    </label>
                    <input
                      type="text"
                      placeholder="6-digit code"
                      value={joinCode}
                      onChange={(event) =>
                        setJoinCode(
                          event.target.value.replace(/\D/g, '').slice(0, 6)
                        )
                      }
                      className="input input-bordered w-full text-center text-2xl font-mono bg-base-100/50"
                      required
                      minLength={6}
                      maxLength={6}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-secondary w-full neon-glow"
                    disabled={isJoining}
                  >
                    {isJoining ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Joining...
                      </>
                    ) : (
                      '🎮 JOIN GAME'
                    )}
                  </button>

                  {joinError && (
                    <div className="alert alert-error">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>{joinError}</span>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer footer-center p-4 bg-base-100/10 backdrop-blur-sm border-t border-primary/20">
        <div>
          <p className="font-bold text-lg movie-icon">
            © 2024 Guess the Frame
          </p>
          <p className="text-sm text-base-content/60">
            Built for movie-night trivia fanatics
          </p>
        </div>
      </footer>
    </div>
  );
}
