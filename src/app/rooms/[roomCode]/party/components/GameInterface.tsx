'use client';

import { useState } from 'react';
import type { Room } from '@/lib/rooms';
import { useGameplay } from '../hooks/useGameplay';
import { useSharing } from '../hooks/useSharing';

interface GameInterfaceProps {
  room: Room;
  roomCode: string;
  playerId: string | null;
  canManage: boolean;
  onAdvanceFrame: () => void;
  isAdvancingFrame: boolean;
  statusError: string | null;
}

export default function GameInterface({
  room,
  roomCode,
  playerId,
  canManage,
  onAdvanceFrame,
  isAdvancingFrame,
  statusError,
}: GameInterfaceProps) {
  const {
    guessValue,
    setGuessValue,
    guessFeedback,
    isSubmittingGuess,
    hasAnsweredCorrectly,
    handleGuessSubmit,
  } = useGameplay();

  const { shareUrl, copyState, handleShareCopy } = useSharing(roomCode);

  const currentFrame = room.frames[room.currentFrameIndex];
  const alreadySolvedByYou = Boolean(
    currentFrame &&
    playerId &&
    currentFrame.solvedPlayerIds.includes(playerId)
  );

  const canGuess = Boolean(
    playerId &&
    room.status === 'in-progress' &&
    !alreadySolvedByYou
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Game in Progress</h1>
        <div className="flex gap-2">
          <button
            onClick={handleShareCopy}
            className={`btn btn-sm ${
              copyState === 'copied' ? 'btn-success' : 
              copyState === 'error' ? 'btn-error' : 'btn-outline'
            }`}
          >
            {copyState === 'copied' ? 'Copied!' : 'Share Room'}
          </button>
        </div>
      </div>

      {/* Current Frame */}
      {currentFrame && (
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title">Frame {room.currentFrameIndex + 1} of {room.frames.length}</h2>
            
            <div className="aspect-video bg-base-200 rounded-lg overflow-hidden mb-4">
              <img
                src={currentFrame.imageUrl}
                alt="Movie frame"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Guess Form */}
            {canGuess && (
              <form onSubmit={(e) => handleGuessSubmit(e, roomCode, playerId)} className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Your guess:</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={guessValue}
                      onChange={(e) => setGuessValue(e.target.value)}
                      placeholder="Enter movie title..."
                      className="input input-bordered flex-1"
                      disabled={isSubmittingGuess}
                    />
                    <button
                      type="submit"
                      className={`btn btn-primary ${isSubmittingGuess ? 'loading' : ''}`}
                      disabled={!guessValue.trim() || isSubmittingGuess}
                    >
                      Submit
                    </button>
                  </div>
                </div>

                {guessFeedback && (
                  <div className={`alert ${guessFeedback.includes('Correct') ? 'alert-success' : 'alert-error'}`}>
                    <span>{guessFeedback}</span>
                  </div>
                )}
              </form>
            )}

            {alreadySolvedByYou && (
              <div className="alert alert-success">
                <span>Great job! You&apos;ve already answered this frame correctly.</span>
              </div>
            )}

            {/* Host Controls */}
            {canManage && (
              <div className="card-actions justify-end">
                <button
                  onClick={onAdvanceFrame}
                  className={`btn btn-primary ${isAdvancingFrame ? 'loading' : ''}`}
                  disabled={isAdvancingFrame}
                >
                  Next Frame
                </button>
              </div>
            )}

            {statusError && (
              <div className="alert alert-error">
                <span>{statusError}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
