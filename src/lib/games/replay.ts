import { getGameTimeline } from '../database/games';
import { GameTimeline } from '../database/types';

export interface ReplayOptions {
  speed: number; // Multiplicateur de vitesse (1 = normale, 2 = 2x, 0.5 = 0.5x)
  startTime?: Date; // Heure de début du replay
  endTime?: Date; // Heure de fin du replay
  includeEvents?: string[]; // Types d'événements à inclure
  excludeEvents?: string[]; // Types d'événements à exclure
}

export interface ReplayFrame {
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
}

export interface ReplayPlayer {
  playerId: string;
  playerName: string;
  score: number;
  guesses: number;
  correctGuesses: number;
  accuracy: number;
}

export interface ReplayData {
  gameId: string;
  roomCode: string;
  duration: number;
  frames: ReplayFrame[];
  players: ReplayPlayer[];
  stats: GameStats;
  events: Array<{
    type: string;
    data: Record<string, unknown>;
    timestamp: Date;
  }>;
}

export class GameReplay {
  private timeline: GameTimeline;
  private options: ReplayOptions;

  constructor(timeline: GameTimeline, options: ReplayOptions = { speed: 1 }) {
    this.timeline = timeline;
    this.options = {
      includeEvents: ['game_started', 'frame_started', 'guess_submitted', 'frame_advanced', 'game_completed'],
      excludeEvents: [],
      ...options,
    };
  }

  // Crée un replay à partir d'un gameId
  static async createReplay(gameId: string, options: ReplayOptions = { speed: 1 }): Promise<GameReplay> {
    const timeline = await getGameTimeline(gameId);
    if (!timeline) {
      throw new Error(`Game ${gameId} not found`);
    }
    return new GameReplay(timeline, options);
  }

  // Génère les données de replay
  generateReplayData(): ReplayData {
    const { gameId, roomCode, events, frames, stats } = this.timeline;
    
    // Filtrer les événements selon les options
    const filteredEvents = this.filterEvents(events);
    
    // Créer les frames de replay
    const replayFrames = this.createReplayFrames(frames, filteredEvents);
    
    // Créer les données des joueurs
    const players = this.createPlayerData(stats);
    
    return {
      gameId,
      roomCode,
      duration: stats.duration,
      frames: replayFrames,
      players,
      stats,
      events: filteredEvents.map(event => ({
        type: event.type,
        data: JSON.parse(event.data),
        timestamp: event.timestamp,
      })),
    };
  }

  // Filtre les événements selon les options
  private filterEvents(events: Array<{ type: string; data: string; timestamp: Date }>) {
    return events.filter(event => {
      // Inclure les événements spécifiés
      if (this.options.includeEvents && !this.options.includeEvents.includes(event.type)) {
        return false;
      }
      
      // Exclure les événements spécifiés
      if (this.options.excludeEvents && this.options.excludeEvents.includes(event.type)) {
        return false;
      }
      
      // Filtrer par date si spécifié
      if (this.options.startTime && event.timestamp < this.options.startTime) {
        return false;
      }
      
      if (this.options.endTime && event.timestamp > this.options.endTime) {
        return false;
      }
      
      return true;
    });
  }

  // Crée les frames de replay
  private createReplayFrames(frames: Array<{ id: string; movie: { title: string }; imageUrl: string; createdAt: Date }>, events: Array<{ type: string; data: string; timestamp: Date }>): ReplayFrame[] {
    return frames.map((frame, index) => {
      // Trouver les événements liés à cette frame
      const frameEvents = events.filter(event => {
        const data = JSON.parse(event.data);
        return data.frameId === frame.id || data.frameIndex === index;
      });

      return {
        timestamp: frame.createdAt,
        frameIndex: index,
        frameId: frame.id,
        movieTitle: frame.movie.title,
        imageUrl: frame.imageUrl,
        events: frameEvents.map(event => ({
          type: event.type,
          data: JSON.parse(event.data),
          timestamp: event.timestamp,
        })),
      };
    });
  }

  // Crée les données des joueurs
  private createPlayerData(stats: GameStats): ReplayPlayer[] {
    return stats.playerStats.map(player => ({
      playerId: player.playerId,
      playerName: player.playerName,
      score: player.score,
      guesses: player.guesses,
      correctGuesses: player.correctGuesses,
      accuracy: player.accuracy,
    }));
  }

  // Exporte le replay en JSON
  exportToJSON(): string {
    const replayData = this.generateReplayData();
    return JSON.stringify(replayData, null, 2);
  }

  // Exporte le replay en format lisible
  exportToText(): string {
    const replayData = this.generateReplayData();
    
    let text = `=== REPLAY DE LA PARTIE ${replayData.roomCode} ===\n\n`;
    text += `Durée: ${Math.floor(replayData.duration / 60)}m ${replayData.duration % 60}s\n`;
    text += `Frames: ${replayData.frames.length}\n`;
    text += `Joueurs: ${replayData.players.length}\n\n`;
    
    text += `=== JOUEURS ===\n`;
    replayData.players.forEach(player => {
      text += `${player.playerName}: ${player.score} points (${player.correctGuesses}/${player.guesses} corrects, ${Math.round(player.accuracy * 100)}%)\n`;
    });
    
    text += `\n=== TIMELINE ===\n`;
    replayData.events.forEach(event => {
      const time = new Date(event.timestamp).toLocaleTimeString();
      text += `[${time}] ${event.type}: ${JSON.stringify(event.data)}\n`;
    });
    
    return text;
  }

  // Génère un résumé de la partie
  generateSummary(): string {
    const replayData = this.generateReplayData();
    
    let summary = `Résumé de la partie ${replayData.roomCode}:\n`;
    summary += `- Durée: ${Math.floor(replayData.duration / 60)}m ${replayData.duration % 60}s\n`;
    summary += `- Frames: ${replayData.frames.length}\n`;
    summary += `- Joueurs: ${replayData.players.length}\n`;
    summary += `- Précision globale: ${Math.round(replayData.stats.accuracy * 100)}%\n`;
    summary += `- Meilleur joueur: ${replayData.players.reduce((best, player) => 
      player.score > best.score ? player : best
    ).playerName}\n`;
    
    return summary;
  }
}

