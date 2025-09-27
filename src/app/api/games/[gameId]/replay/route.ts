import { NextRequest, NextResponse } from 'next/server';
import { GameReplay } from '@/lib/games/replay';
import { getGameTimeline } from '@/lib/database/games';

export async function GET(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const { gameId } = params;
    const { searchParams } = new URL(request.url);
    
    // Paramètres de replay
    const speed = parseFloat(searchParams.get('speed') || '1');
    const startTime = searchParams.get('startTime') ? new Date(searchParams.get('startTime')!) : undefined;
    const endTime = searchParams.get('endTime') ? new Date(searchParams.get('endTime')!) : undefined;
    const includeEvents = searchParams.get('includeEvents')?.split(',') || undefined;
    const excludeEvents = searchParams.get('excludeEvents')?.split(',') || undefined;

    // Créer le replay
    const replay = await GameReplay.createReplay(gameId, {
      speed,
      startTime,
      endTime,
      includeEvents,
      excludeEvents,
    });

    // Générer les données de replay
    const replayData = replay.generateReplayData();

    return NextResponse.json({
      success: true,
      data: replayData,
    });
  } catch (error) {
    console.error('Error creating replay:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create replay' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const { gameId } = params;
    const body = await request.json();
    const { format = 'json' } = body;

    // Créer le replay
    const replay = await GameReplay.createReplay(gameId);

    let result: string;
    
    switch (format) {
      case 'text':
        result = replay.exportToText();
        break;
      case 'summary':
        result = replay.generateSummary();
        break;
      default:
        result = replay.exportToJSON();
    }

    return new NextResponse(result, {
      headers: {
        'Content-Type': format === 'json' ? 'application/json' : 'text/plain',
        'Content-Disposition': `attachment; filename="replay-${gameId}.${format === 'json' ? 'json' : 'txt'}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting replay:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export replay' },
      { status: 500 }
    );
  }
}