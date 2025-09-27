import { NextRequest, NextResponse } from 'next/server';
import { getRoomGames } from '@/lib/database/games';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Récupérer les parties de la salle
    const games = await getRoomGames(code);
    
    // Pagination
    const paginatedGames = games.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: {
        games: paginatedGames,
        total: games.length,
        limit,
        offset,
        hasMore: offset + limit < games.length,
      },
    });
  } catch (error) {
    console.error('Error getting room games:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get room games' },
      { status: 500 }
    );
  }
}
