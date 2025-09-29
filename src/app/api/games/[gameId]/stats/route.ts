import { NextRequest, NextResponse } from 'next/server';

import { getGameStats } from '@/lib/database/games';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    // Récupérer les statistiques
    const stats = await getGameStats(gameId);
    if (!stats) {
      return NextResponse.json(
        { success: false, error: 'Game not found' },
        { status: 404 }
      );
    }

    if (format === 'json') {
      return NextResponse.json({
        success: true,
        data: stats,
      });
    }

    // Format texte pour les statistiques
    const textStats = `
=== STATISTIQUES DE LA PARTIE ${stats.roomCode} ===

Durée: ${Math.floor(stats.duration / 60)}m ${stats.duration % 60}s
Frames: ${stats.totalFrames}
Tentatives: ${stats.totalGuesses}
Bonnes réponses: ${stats.correctGuesses}
Précision: ${Math.round(stats.accuracy * 100)}%

=== JOUEURS ===
${stats.playerStats
  .map(
    (player) =>
      `${player.playerName}: ${player.score} points (${player.correctGuesses}/${player.guesses} corrects, ${Math.round(player.accuracy * 100)}%)`
  )
  .join('\n')}
    `.trim();

    return new NextResponse(textStats, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="stats-${stats.roomCode}.txt"`,
      },
    });
  } catch (error) {
    console.error('Error getting game stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get game stats' },
      { status: 500 }
    );
  }
}
