import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Compter le total de films
    const totalMovies = await prisma.movie.count();

    // Compter par genre
    const moviesByGenre = await prisma.movie.groupBy({
      by: ['genre'],
      _count: {
        id: true
      }
    });

    // Compter par année
    const moviesByYear = await prisma.movie.groupBy({
      by: ['releaseYear'],
      _count: {
        id: true
      }
    });

    // Dernière mise à jour
    const lastMovie = await prisma.movie.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    });

    const stats = {
      totalMovies,
      moviesByGenre: moviesByGenre.reduce((acc, item) => {
        acc[item.genre] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      moviesByYear: moviesByYear.reduce((acc, item) => {
        acc[item.releaseYear.toString()] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      lastUpdate: lastMovie?.createdAt?.toISOString() || null
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
