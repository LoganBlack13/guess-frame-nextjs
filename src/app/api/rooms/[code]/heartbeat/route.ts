import { NextRequest, NextResponse } from 'next/server';
import { getRoom } from '@/lib/rooms';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const heartbeatSchema = z.object({
  playerId: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    
    const { playerId } = heartbeatSchema.parse(body);
    
    const room = await getRoom(code);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    
    // Vérifier que le joueur existe dans la room
    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      return NextResponse.json({ error: 'Player not found in room' }, { status: 400 });
    }
    
    // Mettre à jour le lastSeenAt
    await prisma.player.update({
      where: { id: playerId },
      data: { lastSeenAt: new Date() }
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Heartbeat API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
