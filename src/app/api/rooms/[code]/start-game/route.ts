import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { QuizGenerator } from "@/lib/games";
import { createGame, addGameFrames } from "@/lib/database";
import { GameEventManager } from "@/lib/games";
import { HOST_SESSION_COOKIE } from "@/lib/session";

interface Params {
  params: {
    code: string;
  };
}

interface StartGameSettings {
  difficulty: 'easy' | 'normal' | 'hard';
  durationMinutes: number;
  genres?: string[];
  yearRange?: { min: number; max: number };
}

export async function POST(request: Request, { params }: Params) {
  try {
    const resolvedParams = await params;
    const roomCode = resolvedParams.code.trim();
    
    if (!roomCode) {
      return NextResponse.json({ error: "Room code required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(HOST_SESSION_COOKIE)?.value;
    
    if (!sessionToken) {
      return NextResponse.json({ error: "Host session required" }, { status: 401 });
    }

    const settings: StartGameSettings = await request.json();
    
    if (!process.env.TMDB_API_KEY) {
      return NextResponse.json({ error: "TMDB API key not configured" }, { status: 500 });
    }

    console.log('🎮 Starting game generation for room:', roomCode);
    console.log('⚙️ Settings:', settings);

    // Calculer le nombre de frames basé sur la durée et la difficulté
    const secondsPerFrame = settings.difficulty === 'easy' ? 30 : settings.difficulty === 'normal' ? 20 : 10;
    const totalSeconds = settings.durationMinutes * 60;
    const frameCount = Math.floor(totalSeconds / secondsPerFrame);

    console.log(`📊 Calculated frame count: ${frameCount} frames`);

    // Générer le quiz avec les films de la base de données
    const quizGenerator = new QuizGenerator(process.env.TMDB_API_KEY);
    const quizResult = await quizGenerator.generateQuizFromDatabase({
      roomCode,
      frameCount,
      difficulty: settings.difficulty,
      genres: settings.genres,
      yearRange: settings.yearRange
    });

    console.log('✅ Quiz generated from database:', {
      totalFrames: quizResult.totalFrames,
      totalMovies: quizResult.totalMovies
    });

    // Créer la partie
    const game = await createGame(roomCode);
    console.log('🎮 Game created:', game.id);

    // Créer les GameFrames
    if (quizResult.frames.length > 0) {
      await addGameFrames(
        game.id,
        quizResult.frames.map((frame, index) => ({
          movieId: frame.movieId,
          imageUrl: frame.imageUrl,
          aspectRatio: frame.aspectRatio,
          isScene: frame.isScene,
          order: index,
        }))
      );
      console.log(`🎬 Created ${quizResult.frames.length} GameFrames`);
    }

    // Enregistrer l'événement de génération
    await GameEventManager.recordGameStarted(
      game.id,
      roomCode,
      1, // Seulement l'hôte pour l'instant
      frameCount
    );

    console.log('✅ Game setup completed successfully');

    return NextResponse.json({ 
      success: true,
      gameId: game.id,
      frameCount: quizResult.totalFrames,
      movieCount: quizResult.totalMovies
    });
    
  } catch (error) {
    console.error('❌ Failed to start game:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start game' },
      { status: 500 }
    );
  }
}
