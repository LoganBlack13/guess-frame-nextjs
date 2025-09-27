import { addGameEvent, getGameEvents, GameEventData } from '../database';

export class GameEventManager {
  // Enregistre le démarrage d'une partie
  static async recordGameStarted(gameId: string, roomCode: string, playerCount: number, targetFrameCount: number) {
    await addGameEvent(gameId, {
      type: 'game_started',
      data: {
        roomCode,
        playerCount,
        targetFrameCount,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Enregistre le démarrage d'une frame
  static async recordFrameStarted(
    gameId: string, 
    frameIndex: number, 
    frameId: string, 
    movieTitle: string, 
    timeLimit: number
  ) {
    await addGameEvent(gameId, {
      type: 'frame_started',
      data: {
        frameIndex,
        frameId,
        movieTitle,
        timeLimit,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Enregistre une tentative de réponse
  static async recordGuessSubmitted(
    gameId: string,
    playerId: string,
    playerName: string,
    guess: string,
    frameId: string,
    isCorrect: boolean,
    pointsAwarded: number
  ) {
    await addGameEvent(gameId, {
      type: 'guess_submitted',
      data: {
        playerId,
        playerName,
        guess,
        frameId,
        isCorrect,
        pointsAwarded,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Enregistre l'avancement d'une frame
  static async recordFrameAdvanced(
    gameId: string,
    fromFrameIndex: number,
    toFrameIndex: number,
    correctAnswer: string,
    totalGuesses: number,
    correctGuesses: number
  ) {
    await addGameEvent(gameId, {
      type: 'frame_advanced',
      data: {
        fromFrameIndex,
        toFrameIndex,
        correctAnswer,
        totalGuesses,
        correctGuesses,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Enregistre la fin d'une partie
  static async recordGameCompleted(
    gameId: string,
    totalFrames: number,
    totalGuesses: number,
    correctGuesses: number,
    playerScores: Array<{
      playerId: string;
      playerName: string;
      score: number;
    }>,
    duration: number
  ) {
    await addGameEvent(gameId, {
      type: 'game_completed',
      data: {
        totalFrames,
        totalGuesses,
        correctGuesses,
        playerScores,
        duration,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Récupère tous les événements d'une partie
  static async getGameEvents(gameId: string) {
    return getGameEvents(gameId);
  }

  // Récupère les événements d'un type spécifique
  static async getGameEventsByType(gameId: string, type: string) {
    const events = await getGameEvents(gameId);
    return events.filter(event => event.type === type);
  }

  // Récupère les événements d'une frame spécifique
  static async getFrameEvents(gameId: string, frameId: string) {
    const events = await getGameEvents(gameId);
    return events.filter(event => {
      const data = JSON.parse(event.data);
      return data.frameId === frameId;
    });
  }

  // Récupère les événements d'un joueur spécifique
  static async getPlayerEvents(gameId: string, playerId: string) {
    const events = await getGameEvents(gameId);
    return events.filter(event => {
      const data = JSON.parse(event.data);
      return data.playerId === playerId;
    });
  }

  // Calcule les statistiques d'une partie à partir des événements
  static async calculateGameStats(gameId: string) {
    const events = await getGameEvents(gameId);
    
    const gameStarted = events.find(e => e.type === 'game_started');
    const gameCompleted = events.find(e => e.type === 'game_completed');
    const frameEvents = events.filter(e => e.type === 'frame_started');
    const guessEvents = events.filter(e => e.type === 'guess_submitted');
    const correctGuesses = guessEvents.filter(e => {
      const data = JSON.parse(e.data);
      return data.isCorrect;
    });

    return {
      totalFrames: frameEvents.length,
      totalGuesses: guessEvents.length,
      correctGuesses: correctGuesses.length,
      accuracy: guessEvents.length > 0 ? correctGuesses.length / guessEvents.length : 0,
      duration: gameStarted && gameCompleted 
        ? new Date(gameCompleted.timestamp).getTime() - new Date(gameStarted.timestamp).getTime()
        : 0,
    };
  }

  // Reconstruit la timeline d'une partie
  static async reconstructTimeline(gameId: string) {
    const events = await getGameEvents(gameId);
    
    const timeline = {
      gameId,
      events: events.map(event => ({
        ...event,
        data: JSON.parse(event.data),
      })),
      stats: await this.calculateGameStats(gameId),
    };

    return timeline;
  }
}
