import { NextResponse } from "next/server";
import { createRoom } from "@/lib/rooms";
import { createHostSessionCookie } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const hostName = typeof body?.hostName === "string" ? body.hostName : "";
    const useTMDB = typeof body?.useTMDB === "boolean" ? body.useTMDB : false;

    if (!hostName.trim()) {
      return NextResponse.json(
        { error: "Tell us who's hosting the party." },
        { status: 400 },
      );
    }

    const { room, host, sessionToken } = await createRoom(hostName, useTMDB);

    const response = NextResponse.json({ room, player: host });
    response.cookies.set(createHostSessionCookie(sessionToken));

    return response;
  } catch (error) {
    console.error("Failed to create room", error);
    return NextResponse.json(
      { error: "Couldn't spin up the room. Try again in a moment." },
      { status: 500 },
    );
  }
}
