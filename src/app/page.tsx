'use client';

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const featureHighlights = [
  {
    title: "Instant screening rooms",
    description:
      "Start a private round in seconds, drop your favourite movie and series frames, and keep the suspense alive with optional hints.",
  },
  {
    title: "Join from any screen",
    description:
      "Friends hop in from phones, tablets, or laptops using a quick six-digit code—no downloads or accounts required.",
  },
  {
    title: "Live score tracker",
    description:
      "See guesses lock in, reveal answers dramatically, and climb the leaderboard as frames flip by in real time.",
  },
  {
    title: "Your frames, your rules",
    description:
      "Upload custom stills, set timed reveals, or remix community-curated frame packs for every movie night theme.",
  },
];

export default function Home() {
  const router = useRouter();

  const [hostName, setHostName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, startCreate] = useTransition();

  const [joinCode, setJoinCode] = useState("");
  const [guestName, setGuestName] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, startJoin] = useTransition();

  const handleCreateRoom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);

    startCreate(async () => {
      try {
        const response = await fetch("/api/rooms", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ hostName }),
        });

        if (!response.ok) {
          const payload = await response.json();
          setCreateError(typeof payload?.error === "string" ? payload.error : "Couldn't launch the room.");
          return;
        }

        const payload = await response.json();
        const roomCode: string | undefined = payload?.room?.code;
        const playerId: string | undefined = payload?.player?.id;

        if (!roomCode || !playerId) {
          setCreateError("Room created, but we couldn't fetch your details. Refresh and try again.");
          return;
        }

        setHostName("");
        router.push(`/rooms/${roomCode}?playerId=${playerId}&role=host`);
      } catch (error) {
        console.error("Failed to create room", error);
        setCreateError("Network hiccup. Give it another go.");
      }
    });
  };

  const handleJoinRoom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setJoinError(null);

    startJoin(async () => {
      try {
        const response = await fetch("/api/rooms/join", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ roomCode: joinCode, playerName: guestName }),
        });

        if (!response.ok) {
          const payload = await response.json();
          setJoinError(typeof payload?.error === "string" ? payload.error : "Couldn't join this room.");
          return;
        }

        const payload = await response.json();
        const roomCode: string | undefined = payload?.room?.code;
        const playerId: string | undefined = payload?.player?.id;

        if (!roomCode || !playerId) {
          setJoinError("Joined, but we couldn't fetch your details. Try again.");
          return;
        }

        setJoinCode("");
        setGuestName("");
        router.push(`/rooms/${roomCode}?playerId=${playerId}&role=guest`);
      } catch (error) {
        console.error("Failed to join room", error);
        setJoinError("Network hiccup. Try again in a moment.");
      }
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-base-100">
      <header className="border-b border-base-300 bg-base-100">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-semibold text-primary">Guess the Frame</span>
            <span className="badge badge-outline badge-sm border-primary text-primary">beta</span>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <a className="link link-hover" href="#features">
              Features
            </a>
            <a className="link link-hover" href="#roadmap">
              Roadmap
            </a>
            <a className="btn btn-sm btn-primary" href="#play">
              Open lobby tools
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-6 py-16">
        <section id="play" className="flex w-full flex-col items-center text-center">
          <span className="badge badge-primary badge-outline mb-6 uppercase tracking-wide">
            Multiplayer movie quiz
          </span>
          <h1 className="text-balance text-4xl font-bold text-base-content sm:text-5xl lg:text-6xl">
            Challenge friends to guess the movie from a single frame
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-base-content/70">
            Guess the Frame lets you host real-time cinematic trivia, stream dramatic stills, and crown
            the quickest cinephile in your crew—whether you&apos;re together or apart.
          </p>

          <div className="mt-10 grid w-full gap-6 lg:grid-cols-2">
            <div className="card border border-base-300 bg-base-200 shadow-lg">
              <div className="card-body items-stretch text-left">
                <h2 className="card-title text-2xl font-semibold text-base-content">Host a new room</h2>
                <p className="text-base text-base-content/70">
                  Name yourself, spin up a private lobby, and a six-digit code will be ready to share instantly.
                </p>
                <form className="mt-4 flex flex-col gap-3" onSubmit={handleCreateRoom} aria-label="Create new room">
                  <label className="form-control w-full" htmlFor="host-name">
                    <span className="label-text">Display name</span>
                    <input
                      id="host-name"
                      name="hostName"
                      type="text"
                      placeholder="Sofia the Host"
                      value={hostName}
                      onChange={(event) => setHostName(event.target.value)}
                      className="input input-bordered"
                      required
                      minLength={2}
                      maxLength={24}
                    />
                  </label>
                  <button type="submit" className="btn btn-primary" disabled={isCreating}>
                    {isCreating ? "Creating…" : "Launch lobby"}
                  </button>
                  <p className="text-xs text-base-content/50">
                    You&apos;ll hop into the lobby as host and can kick off rounds once everyone arrives.
                  </p>
                  {createError ? (
                    <p className="rounded-md bg-error/10 px-3 py-2 text-sm text-error" role="alert">
                      {createError}
                    </p>
                  ) : null}
                </form>
              </div>
            </div>

            <div className="card border border-base-300 bg-base-200 shadow-lg">
              <div className="card-body items-stretch text-left">
                <h2 className="card-title text-2xl font-semibold text-base-content">Join your friends</h2>
                <p className="text-base text-base-content/70">
                  Drop the code your host shares, choose a name for the scoreboard, and you&apos;ll be in the lobby.
                </p>
                <form className="form-control mt-4 gap-4" onSubmit={handleJoinRoom} aria-label="Join existing room">
                  <label className="form-control" htmlFor="join-name">
                    <span className="label-text">Display name</span>
                    <input
                      id="join-name"
                      name="playerName"
                      type="text"
                      placeholder="Guest player"
                      value={guestName}
                      onChange={(event) => setGuestName(event.target.value)}
                      className="input input-bordered"
                      required
                      minLength={2}
                      maxLength={24}
                    />
                  </label>
                  <label className="form-control" htmlFor="room-code">
                    <span className="label-text">Room code</span>
                    <input
                      id="room-code"
                      name="roomCode"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      placeholder="123456"
                      className="input input-bordered uppercase"
                      value={joinCode}
                      onChange={(event) => setJoinCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      required
                      minLength={6}
                      maxLength={6}
                    />
                  </label>
                  <button type="submit" className="btn btn-secondary" disabled={isJoining}>
                    {isJoining ? "Joining…" : "Enter lobby"}
                  </button>
                  {joinError ? (
                    <p className="rounded-md bg-error/10 px-3 py-2 text-sm text-error" role="alert">
                      {joinError}
                    </p>
                  ) : null}
                </form>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mt-20 w-full">
          <h2 className="text-3xl font-semibold text-base-content">Why film fans love Guess the Frame</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {featureHighlights.map((feature) => (
              <article
                key={feature.title}
                className="card border border-base-300 bg-base-200 shadow-md"
              >
                <div className="card-body">
                  <h3 className="card-title text-xl text-base-content">{feature.title}</h3>
                  <p className="text-base text-base-content/70">{feature.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="roadmap" className="mt-20 w-full">
          <div className="card border border-dashed border-primary bg-base-200/80">
            <div className="card-body">
              <h2 className="card-title text-2xl text-base-content">What we&apos;re building next</h2>
              <ul className="mt-4 list-disc space-y-2 pl-6 text-base-content/70">
                <li>Real-time room lobby with host controls, streaks, and reactions.</li>
                <li>Creator studio for building frame packs and sharing with the community.</li>
                <li>Progression system with season passes, achievements, and highlight reels.</li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-base-300 bg-base-200">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-6 text-sm text-base-content/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Guess the Frame. Built for movie-night trivia fanatics.</p>
          <div className="flex items-center gap-4">
            <a className="link link-hover" href="#">Privacy</a>
            <a className="link link-hover" href="#">Terms</a>
            <a className="link link-hover" href="mailto:hello@guessframe.app">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
