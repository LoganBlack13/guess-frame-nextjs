'use client';

import type { Frame, Player, Room, RoomStatus, GameDifficulty } from "@/lib/rooms";
import { useRoomController } from "./useRoomController";
import RoomHeader from "./components/RoomHeader";
import PlayerList from "./components/PlayerList";
import GameSettings from "./components/GameSettings";
import CurrentFrame from "./components/CurrentFrame";
import FrameQueue from "./components/FrameQueue";
import HostControls from "./components/HostControls";
import Scoreboard from "./components/Scoreboard";

interface LobbyClientProps {
  initialRoom: Room;
  roomCode: string;
  playerId?: string | null;
  hostSessionActive?: boolean;
}

export default function LobbyClient({
  initialRoom,
  roomCode,
  playerId,
  hostSessionActive = false,
}: LobbyClientProps) {
  const {
    room,
    roomMissing,
    errorMessage,
    eventsConnected,
    isRefreshing,
    refreshRoom,
    countdown,
    currentFrame,
    currentFrameIndex,
    currentFrameDisplay,
    totalFrames,
    nextFrameNumber,
    isFinalFrameActive,
    players,
    playersById,
    sortedByScore,
    frameQueue,
    framesMissing,
    alreadySolvedByYou,
    canGuess,
    guessValue,
    setGuessValue,
    guessFeedback,
    isSubmittingGuess,
    handleGuessSubmit,
    canManage,
    hostSessionActive: isHostActive,
    mutateStatus,
    isUpdatingStatus,
    statusError,
    setStatusError,
    handleAdvanceFrame,
    isAdvancingFrame,
    difficultyChoice,
    setDifficultyChoice,
    durationChoice,
    setDurationChoice,
    handleSaveSettings,
    isSavingSettings,
    settingsError,
    settingsSavedAt,
    copyState,
    shareUrl,
    handleShareCopy,
    partyCountdown,
    shouldRedirectToParty,
  } = useRoomController({
    initialRoom,
    roomCode,
    playerId,
    hostSessionActive,
  });

  const advanceButtonLabel = room?.status === "in-progress"
    ? isFinalFrameActive
      ? "Finish match"
      : `Next frame (${nextFrameNumber}/${totalFrames})`
    : "Advance frame";

  const currentFrameSolvedCount = currentFrame ? currentFrame.solvedPlayerIds.length : 0;
  const scoreboardVisible = room?.status === "completed";

  // Affichage du countdown et de la redirection
  if (shouldRedirectToParty || partyCountdown !== null) {
    return (
      <div className="flex min-h-screen flex-col bg-base-100">
        <header className="border-b border-base-300 bg-base-100">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
            <span className="text-lg font-semibold text-primary">Guess the Frame</span>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="card border border-primary bg-base-200 shadow-xl">
            <div className="card-body items-center text-center gap-4">
              <h1 className="text-3xl font-semibold text-primary">La partie commence bientôt !</h1>
              {partyCountdown !== null && partyCountdown > 0 ? (
                <>
                  <div className="text-6xl font-bold text-primary">{partyCountdown}</div>
                  <p className="text-lg text-base-content/70">
                    Redirection vers la partie dans {partyCountdown} seconde{partyCountdown > 1 ? 's' : ''}...
                  </p>
                </>
              ) : (
                <p className="text-lg text-base-content/70">
                  Redirection en cours...
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (roomMissing || !room) {
    return (
      <div className="flex min-h-screen flex-col bg-base-100">
        <header className="border-b border-base-300 bg-base-100">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
            <span className="text-lg font-semibold text-primary">Guess the Frame</span>
            <a href="/" className="link link-hover text-sm">Start a new room</a>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="card border border-base-300 bg-base-200 shadow-xl">
            <div className="card-body items-center text-center gap-3">
              <h1 className="text-3xl font-semibold text-base-content">Room closed</h1>
              <p className="text-base text-base-content/70">
                The host has ended this lobby or everyone left. Head back home to spin up a new party.
              </p>
              <a href="/" className="btn btn-primary">Return home</a>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-base-100">
      <RoomHeader
        roomCode={room?.code || ""}
        status={room?.status || "waiting"}
        eventsConnected={eventsConnected}
        isRefreshing={isRefreshing}
        onRefresh={() => refreshRoom({ silent: false })}
        onCopyCode={handleShareCopy}
        copyState={copyState}
        shareUrl={shareUrl}
      />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
        <PlayerList 
          players={players} 
          currentPlayerId={playerId} 
        />

        <GameSettings
          difficulty={room?.difficulty || "medium"}
          durationMinutes={room?.durationMinutes || 10}
          targetFrameCount={room?.targetFrameCount || 0}
          currentFrameDisplay={currentFrameDisplay}
          totalFrames={totalFrames}
          timerDisplay={countdown.timerDisplay}
          framesMissing={framesMissing}
        />

        <CurrentFrame
          roomStatus={room?.status || "waiting"}
          currentFrame={currentFrame}
          isPreRoll={countdown.isPreRoll}
          timerDisplay={countdown.timerDisplay}
          currentFrameDisplay={currentFrameDisplay}
          totalFrames={totalFrames}
          currentFrameSolvedCount={currentFrameSolvedCount}
          frameQueueLength={frameQueue.length}
          canGuess={canGuess}
          alreadySolvedByYou={alreadySolvedByYou}
          guessValue={guessValue}
          setGuessValue={setGuessValue}
          onGuessSubmit={handleGuessSubmit}
          isSubmittingGuess={isSubmittingGuess}
          guessFeedback={guessFeedback}
        />

        <FrameQueue
          frameQueue={frameQueue}
          playersById={playersById}
          currentPlayerId={playerId}
        />

        <HostControls
          canManage={canManage}
          difficultyChoice={difficultyChoice}
          setDifficultyChoice={setDifficultyChoice}
          durationChoice={durationChoice}
          setDurationChoice={setDurationChoice}
          onSaveSettings={handleSaveSettings}
          isSavingSettings={isSavingSettings}
          settingsError={settingsError}
          settingsSavedAt={settingsSavedAt}
          currentFrameDisplay={currentFrameDisplay}
          totalFrames={totalFrames}
          timerDisplay={countdown.timerDisplay}
          framesMissing={framesMissing}
          onAdvanceFrame={handleAdvanceFrame}
          isAdvancingFrame={isAdvancingFrame}
          canAdvanceFrame={canManage && room?.status === "in-progress"}
          advanceButtonLabel={advanceButtonLabel}
          onMutateStatus={mutateStatus}
          isUpdatingStatus={isUpdatingStatus}
          statusError={statusError}
          roomStatus={room?.status || "waiting"}
        />

        <Scoreboard
          players={sortedByScore}
          currentPlayerId={playerId}
          targetFrameCount={room?.targetFrameCount || 0}
          isVisible={scoreboardVisible}
        />

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
