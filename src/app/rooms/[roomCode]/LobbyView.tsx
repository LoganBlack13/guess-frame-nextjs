'use client';

import Link from "next/link";
import type { Room } from "@/lib/rooms";
import { useRoomController, UseRoomControllerOptions } from "./useRoomController";
import GameConfiguration from "./components/GameConfiguration";
import PlayerList from "./components/PlayerList";
import Chat from "./components/Chat";
import ThemeSelector from "@/components/ui/theme-selector";

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
    shareUrl,
    copyState,
    handleShareCopy,
    settingsSavedAt,
    mutateStatus,
    isUpdatingStatus,
    statusError,
    setStatusError,
    hostSessionActive,
    partyCountdown,
    shouldRedirectToParty,
    handleStartGame,
    isGeneratingGame,
    chatMessages,
    sendChatMessage,
  } = controller;

  if (roomMissing || !room) {
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

  // Affichage du countdown et de la redirection
  if (shouldRedirectToParty || partyCountdown !== null) {
    return (
      <div className="flex min-h-screen flex-col bg-base-100">
        <header className="border-b border-base-300 bg-base-100">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
            <Link href="/" className="text-lg font-semibold text-primary">
              Guess the Frame
            </Link>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="card border border-primary bg-base-200 shadow-xl">
            <div className="card-body items-center text-center gap-4">
              <h1 className="text-3xl font-semibold text-primary">The game starts soon!</h1>
              {partyCountdown !== null && partyCountdown > 0 ? (
                <>
                  <div className="text-6xl font-bold text-primary">{partyCountdown}</div>
                  <p className="text-lg text-base-content/70">
                    Redirecting to the game in {partyCountdown} second{partyCountdown > 1 ? 's' : ''}...
                  </p>
                </>
              ) : (
                <p className="text-lg text-base-content/70">
                  Redirecting...
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100">
      <div className="navbar bg-base-200">
        <div className="flex-1">
          <Link href="/" className="btn btn-ghost text-xl">
            Guess the Frame
          </Link>
        </div>
        <div className="flex-none gap-2">
          <ThemeSelector />
          <span className={`badge ${shareBadge}`}>
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
            Party view
          </Link>
        </div>
      </div>

      <div className="container mx-auto p-4">
        <div className="card bg-base-200 shadow-xl mb-4">
          <div className="card-body">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="card-title">Room Code</h2>
                <p className="text-4xl font-mono font-bold">{room.code}</p>
                <p className="text-sm opacity-70">
                  Share this code with your friends to join the game
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button type="button" className="btn btn-primary" onClick={handleShareCopy}>
                  {copyState === "copied" ? "Copied!" : "Copy Code"}
                </button>
                {shareUrl && (
                  <div className="text-xs opacity-60">
                    <div>Share link:</div>
                    <div className="font-mono break-all">{shareUrl}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <div className="lg:col-span-1">
            <PlayerList 
              players={players} 
              currentPlayerId={props.playerId}
            />
          </div>
          
          <div className="lg:col-span-2">
            <Chat
              messages={chatMessages}
              currentPlayerId={props.playerId}
              onSendMessage={sendChatMessage}
              isConnected={eventsConnected}
            />
          </div>
        </div>

        {room.status === "lobby" && hostSessionActive ? (
          <GameConfiguration 
            onStartGame={handleStartGame}
            isGenerating={isGeneratingGame}
          />
        ) : room.status === "lobby" ? (
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Game Setup</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card bg-base-100">
                  <div className="card-body">
                    <h3 className="card-title text-sm">Difficulty</h3>
                    <p className="text-2xl font-bold">{room.difficulty.toUpperCase()}</p>
                    <p className="text-sm opacity-70">
                      {room.guessWindowSeconds} seconds per frame
                    </p>
                  </div>
                </div>
                <div className="card bg-base-100">
                  <div className="card-body">
                    <h3 className="card-title text-sm">Duration</h3>
                    <p className="text-2xl font-bold">{room.durationMinutes} minutes</p>
                    <p className="text-sm opacity-70">
                      ~{room.targetFrameCount} frames expected
                    </p>
                  </div>
                </div>
              </div>
              <div className="alert alert-info">
                <span>Waiting for host to configure the game...</span>
              </div>
            </div>
          </div>
        ) : null}

        {room.status !== "lobby" && hostSessionActive ? (
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Host Controls</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => mutateStatus("in-progress")}
                  disabled={isUpdatingStatus}
                >
                  Start Match
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => mutateStatus("lobby")}
                  disabled={isUpdatingStatus}
                >
                  Reset to Lobby
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => mutateStatus("completed")}
                  disabled={isUpdatingStatus}
                >
                  End Match
                </button>
              </div>
              {statusError && (
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
              )}
            </div>
          </div>
        ) : null}

        {errorMessage && (
          <div className="alert alert-warning">
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
