import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  GameDifficulty,
  RoomStatus,
  getRoom,
  updateRoomSettings,
  updateRoomStatus,
} from '@/lib/rooms';
import { HOST_SESSION_COOKIE } from '@/lib/session';

interface Params {
  params: Promise<{
    code: string;
  }>;
}

export async function GET(request: Request, { params }: Params) {
  const resolvedParams = await params;
  const code = resolvedParams.code;
  const room = await getRoom(code);

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  return NextResponse.json({ room });
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const resolvedParams = await params;
    const code = resolvedParams.code.trim();

    if (!code) {
      return NextResponse.json(
        { error: 'Room code is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(HOST_SESSION_COOKIE)?.value;
    const hasSettings =
      typeof body?.settings === 'object' && body.settings !== null;
    const hasStatus = typeof body?.status === 'string';

    if (!hasSettings && !hasStatus) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      );
    }

    if (hasSettings) {
      const rawSettings = body.settings as {
        difficulty?: string;
        durationMinutes?: number;
      };
      const difficulty = rawSettings.difficulty ?? '';
      const durationMinutes = Number(rawSettings.durationMinutes ?? NaN);

      const room = await updateRoomSettings(code, sessionToken, {
        difficulty: difficulty as GameDifficulty,
        durationMinutes,
      });

      return NextResponse.json({ room });
    }

    const status = body.status as string;
    const room = await updateRoomStatus(
      code,
      status as RoomStatus,
      sessionToken
    );

    return NextResponse.json({ room });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not update room.';
    const statusCode = message.includes('Only the host')
      ? 403
      : message.includes('Host session')
        ? 401
        : 400;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
