import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export async function DELETE() {
  try {
    // Supprimer tous les films (cascade supprimera les GameFrames associées)
    const result = await prisma.movie.deleteMany({});

    return NextResponse.json({
      message: 'Database cleared',
      deletedCount: result.count,
    });
  } catch (error) {
    console.error('Failed to clear TMDB database:', error);
    return NextResponse.json(
      { error: 'Failed to clear database' },
      { status: 500 }
    );
  }
}
