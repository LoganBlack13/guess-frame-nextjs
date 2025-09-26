'use client';

import Link from "next/link";
import type { Room } from "@/lib/rooms";
import { useRoomController, UseRoomControllerOptions } from "./useRoomController";

interface LobbyViewProps extends UseRoomControllerOptions {
  initialRoom: Room;
}

export function LobbyView(props: LobbyViewProps) {
  const controller = useRoomController(props);
  const {
    room,
    eventsConnected,
    isRefreshing,
    refreshRoom,
    errorMessage,
    roomMissing,
    players,
    sortedByScore,
    shareUrl,
    copyState,
    handleShareCopy,
    difficultyChoice,
    setDifficultyChoice,
    durationChoice,
    setDurationChoice,
    handleSaveSettings,
    isSavingSettings,
    settingsError,
    settingsSavedAt,
    mutateStatus,
    isUpdatingStatus,
    statusError,
    setStatusError,
    hostSessionActive,
  } = controller;

  if (roomMissing) {
    return (
      <div className="flex min-h-screen flex-col bg-base-100">
        <header className="border-b border-base-300 bg-base-100">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
            <Link href="/" className="text-lg font-semibold text-primary">
              Guess the Frame
            </Link>
            <Link href="/" className="link link-hover text-sm">
              Start a new room
            </Link>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="card border border-base-300 bg-base-200 shadow-xl">
            <div className="card-body items-center text-center gap-3">
              <h1 className="text-3xl font-semibold text-base-content">Room closed</h1>
              <p className="text-base text-base-content/70">
                The host has wrapped this lobby. Head back home to spin up a new party.
              </p>
              <Link href="/" className="btn btn-primary">
                Return home
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const shareBadge = eventsConnected ? "badge-success" : "badge-warning";
  const settingsSaved = Boolean(settingsSavedAt);

  return (
    <div className="flex min-h-screen flex-col bg-base-100">
      <header className="border-b border-base-300 bg-base-100">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-5 sm:flex-nowrap">
          <Link href="/" className="text-lg font-semibold text-primary">
            Guess the Frame
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className={`badge ${shareBadge} badge-outline uppercase`}>
              {eventsConnected ? "Live" : "Reconnecting"}
            </span>
            <button
              type="button"
              onClick={() => refreshRoom({ silent: false })}
              className="btn btn-ghost btn-sm"
              disabled={isRefreshing}
            >
              {isRefreshing ? "Refreshing…" : "Refresh"}
            </button>
            <Link href={`/rooms/${room.code}/party`} className="btn btn-secondary btn-sm">
              Go to party view
            </Link>
            {room.status === "completed" ? (
              <Link href={`/rooms/${room.code}/scoreboard`} className="btn btn-ghost btn-sm">
                Scoreboard
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
        <section className="card border border-base-300 bg-base-200 shadow-xl">
          <div className="card-body gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-base-content/60">Room code</p>
                <p className="font-mono text-4xl font-semibold text-base-content">{room.code}</p>
                <p className="mt-2 text-sm text-base-content/70">
                  Share this code and send everyone to the party view when you are ready to launch.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <button type="button" className="btn btn-primary" onClick={handleShareCopy}>
                  {copyState === "copied" ? "Copied" : "Copy code"}
                </button>
                {shareUrl ? (
                  <span className="text-xs text-base-content/60">
                    Share link:
                    <br />
                    <span className="font-mono">{shareUrl}</span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="card border border-base-300 bg-base-200 shadow-md">
          <div className="card-body gap-3">
            <div className="flex items-center justify-between">
              <h2 className="card-title text-2xl text-base-content">Players in lobby</h2>
              <span className="badge badge-outline">{players.length}&nbsp;joined</span>
            </div>
            <ul className="grid gap-3 md:grid-cols-2">
              {players.map((player) => (
                <li key={player.id} className="rounded-lg border border-base-300 bg-base-100 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-base-content">{player.name}</span>
                    <div className="flex items-center gap-2 text-xs text-base-content/70">
                      <span className="badge badge-outline">{player.score} pt{player.score === 1 ? "" : "s"}</span>
                      {player.role === "host" ? (
                        <span className="badge badge-primary badge-sm">Host</span>
                      ) : null}
                      {player.id === playerId ? (
                        <span className="badge badge-outline badge-sm">You</span>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-base-content/60">
                    Joined {new Date(player.joinedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </li>
              ))}
            </ul>
            {players.length === 1 ? (
              <p className="text-sm text-base-content/60">
                Waiting for friends to join. Share the link above to bring everyone into the lobby.
              </p>
            ) : null}
          </div>
        </section>

        <section className="card border border-base-300 bg-base-200 shadow-md">
          <div className="card-body gap-3">
            <div className="flex items-center justify-between">
              <h2 className="card-title text-2xl text-base-content">Game setup</h2>
              <span className="badge badge-outline">{room.targetFrameCount}&nbsp;frames</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-base-300 bg-base-100 p-4">
                <p className="text-sm uppercase tracking-wide text-base-content/60">Difficulty</p>
                <p className="text-lg font-semibold text-base-content">{room.difficulty.toUpperCase()}</p>
                <p className="mt-1 text-sm text-base-content/60">
                  Players get {room.guessWindowSeconds} seconds per frame to lock in their guess.
                </p>
              </div>
              <div className="rounded-lg border border-base-300 bg-base-100 p-4">
                <p className="text-sm uppercase tracking-wide text-base-content/60">Duration</p>
                <p className="text-lg font-semibold text-base-content">{room.durationMinutes} minute party</p>
                <p className="mt-1 text-sm text-base-content/60">
                  Expect roughly {room.targetFrameCount} frames this round.
                </p>
              </div>
            </div>
          </div>
        </section>

        {hostSessionActive ? (
          <section className="card border border-dashed border-primary bg-base-200/70 shadow-sm">
            <div className="card-body gap-4">
              <h2 className="card-title text-xl text-base-content">Host controls</h2>
              <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSaveSettings}>
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
                {settingsSaved ? (
                  <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success md:col-span-2" role="status">
                    Game settings updated. Quiz stills have been regenerated.
                  </p>
                ) : null}
              </form>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => mutateStatus("in-progress")}
                  disabled={isUpdatingStatus}
                >
                  Start match
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => mutateStatus("lobby")}
                  disabled={isUpdatingStatus || room.status === "lobby"}
                >
                  Reset to lobby
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => mutateStatus("completed")}
                  disabled={isUpdatingStatus}
                >
                  End match
                </button>
              </div>
              {statusError ? (
                <div className="alert alert-error">
                  <span>{statusError}</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => setStatusError(null)}
                  >
                    Clear
                  </button>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {errorMessage ? (
          <div className="alert alert-warning">
            <span className="font-medium">Heads up:</span>
            <span>{errorMessage}</span>
          </div>
        ) : null}
      </main>
    </div>
  );
}
