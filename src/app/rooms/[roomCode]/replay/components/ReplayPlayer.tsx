'use client';

import { useEffect, useRef, useState } from 'react';


interface ReplayPlayerProps {
  replayData: {
    gameId: string;
    roomCode: string;
    duration: number;
    frames: Array<{
      timestamp: Date;
      frameIndex: number;
      frameId: string;
      movieTitle: string;
      imageUrl: string;
      events: Array<{
        type: string;
        data: Record<string, unknown>;
        timestamp: Date;
      }>;
    }>;
    players: Array<{
      playerId: string;
      playerName: string;
      score: number;
      guesses: number;
      correctGuesses: number;
      accuracy: number;
    }>;
    stats: {
      gameId: string;
      roomCode: string;
      duration: number;
      totalFrames: number;
      totalGuesses: number;
      correctGuesses: number;
      accuracy: number;
      averageResponseTime: number;
      playerStats: Array<{
        playerId: string;
        playerName: string;
        score: number;
        guesses: number;
        correctGuesses: number;
        accuracy: number;
        averageResponseTime: number;
      }>;
    };
    events: Array<{
      type: string;
      data: Record<string, unknown>;
      timestamp: Date;
    }>;
  };
}

export default function ReplayPlayer({ replayData }: ReplayPlayerProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Calculer le temps total basé sur les événements
  useEffect(() => {
    if (replayData.events && replayData.events.length > 0) {
      const firstEvent = replayData.events[0];
      const lastEvent = replayData.events[replayData.events.length - 1];
      const total =
        new Date(lastEvent.timestamp).getTime() -
        new Date(firstEvent.timestamp).getTime();
      setTotalTime(total);
    }
  }, [replayData]);

  // Gérer la lecture
  useEffect(() => {
    if (isPlaying) {
      startTimeRef.current = Date.now() - currentTime;
      intervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) * speed;
        setCurrentTime(Math.min(elapsed, totalTime));

        if (elapsed >= totalTime) {
          setIsPlaying(false);
          setCurrentTime(totalTime);
        }
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, speed, totalTime]);

  // Mettre à jour la frame actuelle basée sur le temps
  useEffect(() => {
    if (replayData.frames && replayData.frames.length > 0) {
      const frameIndex = Math.floor(
        (currentTime / totalTime) * replayData.frames.length
      );
      setCurrentFrame(Math.min(frameIndex, replayData.frames.length - 1));
    }
  }, [currentTime, totalTime, replayData.frames]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    setIsPlaying(false);
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60000);
    const seconds = Math.floor((time % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const currentFrameData = replayData.frames?.[currentFrame];
  const currentEvents =
    replayData.events?.filter((event) => {
      const eventTime = new Date(event.timestamp).getTime();
      const startTime = replayData.events[0]
        ? new Date(replayData.events[0].timestamp).getTime()
        : 0;
      const relativeTime = eventTime - startTime;
      return relativeTime <= currentTime;
    }) || [];

  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <h3 className="card-title">Lecteur de Replay</h3>

        {/* Contrôles de lecture */}
        <div className="flex items-center gap-4 mb-4">
          <button
            className={`btn ${isPlaying ? 'btn-error' : 'btn-success'}`}
            onClick={handlePlayPause}
          >
            {isPlaying ? '⏸️ Pause' : '▶️ Play'}
          </button>

          <div className="flex items-center gap-2">
            <label className="text-sm">Vitesse:</label>
            <select
              className="select select-sm"
              value={speed}
              onChange={(e) => handleSpeedChange(Number(e.target.value))}
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </select>
          </div>

          <div className="text-sm text-base-content/70">
            {formatTime(currentTime)} / {formatTime(totalTime)}
          </div>
        </div>

        {/* Barre de progression */}
        <div className="mb-4">
          <input
            type="range"
            min="0"
            max={totalTime}
            value={currentTime}
            onChange={(e) => handleSeek(Number(e.target.value))}
            className="range range-primary w-full"
          />
        </div>

        {/* Frame actuelle */}
        {currentFrameData && (
          <div className="mb-6">
            <div className="card bg-base-100">
              <div className="card-body">
                <h4 className="card-title">
                  Frame {currentFrame + 1} / {replayData.frames.length}
                </h4>
                <p className="text-base-content/70">
                  Film: {currentFrameData.movieTitle}
                </p>
                <div className="aspect-video bg-base-300 rounded-lg flex items-center justify-center">
                  <img
                    src={currentFrameData.imageUrl}
                    alt={`Frame ${currentFrame + 1}`}
                    className="max-w-full max-h-full object-contain rounded-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Événements actuels */}
        <div className="space-y-2">
          <h4 className="text-lg font-semibold">Événements</h4>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {currentEvents.map((event, index: number) => (
              <div key={index} className="text-sm p-2 bg-base-100 rounded">
                <span className="font-mono text-xs text-base-content/70">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
                <span className="ml-2 font-semibold">{event.type}</span>
                <div className="text-xs text-base-content/70 mt-1">
                  {JSON.stringify(event.data, null, 2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
