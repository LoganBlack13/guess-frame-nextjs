import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Compter le total de films
    const totalMovies = await prisma.movie.count();

    // Compter par genre (les genres sont stockés en JSON dans le champ genres)
    const allMovies = await prisma.movie.findMany({
      select: {
        genres: true,
        releaseDate: true,
      },
    });

    // Traiter les genres (JSON string -> array)
    const genreCounts: Record<string, number> = {};
    const yearCounts: Record<string, number> = {};

    allMovies.forEach((movie) => {
      // Compter les genres
      try {
        const genres = JSON.parse(movie.genres || '[]');
        genres.forEach((genre: string) => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
      } catch {
        // Ignorer les erreurs de parsing JSON
      }

      // Compter les années
      if (movie.releaseDate) {
        const year = movie.releaseDate.getFullYear().toString();
        yearCounts[year] = (yearCounts[year] || 0) + 1;
      }
    });

    // Dernière mise à jour
    const lastMovie = await prisma.movie.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    const stats = {
      totalMovies,
      moviesByGenre: genreCounts,
      moviesByYear: yearCounts,
      lastUpdate: lastMovie?.createdAt?.toISOString() || null,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to get TMDB stats:', error);
    return NextResponse.json(
      { error: 'Failed to get statistics' },
      { status: 500 }
    );
  }
}
