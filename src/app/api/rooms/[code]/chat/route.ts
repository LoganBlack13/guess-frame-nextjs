import { z } from 'zod';

import { NextRequest, NextResponse } from 'next/server';

import { getRoom } from '@/lib/rooms';
import { broadcastChatMessage } from '@/lib/socket';

const sendMessageSchema = z.object({
  playerId: z.string().min(1),
  message: z.string().min(1).max(500),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = await params;
    const body = await request.json();

    const { playerId, message } = sendMessageSchema.parse(body);

    const room = await getRoom(code);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Vérifier que le joueur existe dans la room
    const player = room.players.find((p) => p.id === playerId);
    if (!player) {
      return NextResponse.json(
        { error: 'Player not found in room' },
        { status: 400 }
      );
    }

    // Créer le message de chat
    const chatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      playerName: player.name,
      message: message.trim(),
      timestamp: Date.now(),
    };

    // Publier l'événement de chat via WebSocket
    broadcastChatMessage(code, chatMessage);

    return NextResponse.json({
      success: true,
      message: chatMessage,
    });
  } catch (error) {
    console.error('Chat API error:', error);

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
