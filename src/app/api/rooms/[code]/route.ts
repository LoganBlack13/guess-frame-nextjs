import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getRoom, updateRoomStatus, RoomStatus } from "@/lib/rooms";
import { HOST_SESSION_COOKIE } from "@/lib/session";

interface Params {
  params: {
    code: string;
  };
}

export async function GET(request: Request, { params }: Params) {
  const code = params.code;
  const room = await getRoom(code);

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  return NextResponse.json({ room });
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const code = params.code.trim();

    if (!code) {
      return NextResponse.json({ error: "Room code is required" }, { status: 400 });
    }

    const body = await request.json();
    const status = typeof body?.status === "string" ? body.status : "";
    const sessionToken = cookies().get(HOST_SESSION_COOKIE)?.value;

    const room = await updateRoomStatus(code, status as RoomStatus, sessionToken);

    return NextResponse.json({ room });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update room.";
    const statusCode = message.includes("Only the host")
      ? 403
      : message.includes("Host session")
        ? 401
        : 400;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
