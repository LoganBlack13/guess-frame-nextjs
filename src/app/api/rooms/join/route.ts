import { NextResponse } from 'next/server';

import { joinRoom } from '@/lib/rooms';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const roomCode = typeof body?.roomCode === 'string' ? body.roomCode : '';
    const playerName =
      typeof body?.playerName === 'string' ? body.playerName : '';

    if (!roomCode.trim()) {
      return NextResponse.json(
        { error: 'Pop in the six-digit room code to continue.' },
        { status: 400 }
      );
    }

    if (!playerName.trim()) {
      return NextResponse.json(
        { error: "What's your name for the leaderboard?" },
        { status: 400 }
      );
    }

    const { room, player } = await joinRoom(roomCode, playerName);

    return NextResponse.json({ room, player });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not join the room.';
    const status = message.includes('Room not found') ? 404 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
