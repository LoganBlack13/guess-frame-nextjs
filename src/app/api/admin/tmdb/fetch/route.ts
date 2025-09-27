import { NextResponse } from "next/server";
import { QuizGenerator } from "@/lib/games";

interface FetchSettings {
  pages: number;
  genres: string[];
  years: { min: number; max: number };
  difficulty: "easy" | "medium" | "hard";
}

export async function POST(request: Request) {
  try {
    const settings: FetchSettings = await request.json();
    
    if (!process.env.TMDB_API_KEY) {
      return NextResponse.json(
        { error: 'TMDB API key not configured' },
        { status: 500 }
      );
    }

    const quizGenerator = new QuizGenerator(process.env.TMDB_API_KEY);
    
    // Démarrer la récupération en arrière-plan
    const fetchPromise = quizGenerator.fetchAndStoreMovies(settings);
    
    // Retourner immédiatement pour ne pas bloquer la requête
    fetchPromise
      .then(result => {
        console.log('✅ Background fetch completed:', result);
      })
      .catch(error => {
        console.error('❌ Background fetch failed:', error);
      });

    return NextResponse.json({ 
      message: 'Fetch started',
      settings 
    });
    
  } catch (error) {
    console.error('Failed to start TMDB fetch:', error);
    return NextResponse.json(
      { error: 'Failed to start fetch' },
      { status: 500 }
    );
  }
}
