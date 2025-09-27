import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { QuizGenerator } from "@/lib/games";
import { createGame, addGameFrames } from "@/lib/database";
import { GameEventManager } from "@/lib/games";
import { HOST_SESSION_COOKIE } from "@/lib/session";
import { updateRoomStatus } from "@/lib/rooms";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{
    code: string;
  }>;
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

    // Créer ou récupérer la partie
    const game = await createGame(roomCode);
    console.log('🎮 Game created/retrieved:', game.id);

    // Créer les GameFrames seulement si elles n'existent pas déjà
    if (quizResult.frames.length > 0 && game.gameFrames.length === 0) {
      await addGameFrames(
        game.id,
        quizResult.frames.map((frame, index) => ({
          movieId: frame.movieId.toString(),
          imageUrl: frame.imageUrl,
          aspectRatio: frame.aspectRatio,
          isScene: frame.isScene,
          order: index,
        }))
      );
      console.log(`🎬 Created ${quizResult.frames.length} GameFrames`);
    } else if (game.gameFrames.length > 0) {
      console.log(`🎬 GameFrames already exist (${game.gameFrames.length} frames)`);
    }

    // Enregistrer l'événement de génération
    await GameEventManager.recordGameStarted(
      game.id,
      roomCode,
      1, // Seulement l'hôte pour l'instant
      frameCount
    );

    // Mettre à jour le statut de la salle pour passer en "in-progress"
    const updatedRoom = await updateRoomStatus(roomCode, "in-progress", sessionToken);
    
    // Réinitialiser l'index de la frame courante pour les GameFrames TMDB
    console.log('🔄 Resetting currentFrameIndex to 0 for room:', roomCode);
    await prisma.room.update({
      where: { code: roomCode },
      data: { currentFrameIndex: 0 }
    });
    console.log('✅ currentFrameIndex reset to 0');

    console.log('✅ Game setup completed successfully');

    return NextResponse.json({ 
      success: true,
      gameId: game.id,
      frameCount: quizResult.totalFrames,
      movieCount: quizResult.totalMovies,
      room: updatedRoom
    });
    
  } catch (error) {
    console.error('❌ Failed to start game:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start game' },
      { status: 500 }
    );
  }
}
