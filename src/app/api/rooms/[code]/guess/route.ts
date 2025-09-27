import { NextResponse } from "next/server";
import { submitGuess } from "@/lib/rooms";

interface Params {
  params: {
    code: string;
  };
}

export async function POST(request: Request, { params }: Params) {
  try {
    const resolvedParams = await params;
    const code = resolvedParams.code.trim();
    if (!code) {
      return NextResponse.json({ error: "Room code is required" }, { status: 400 });
    }

    const body = await request.json();
    const playerId = typeof body?.playerId === "string" ? body.playerId : "";
    const answer = typeof body?.answer === "string" ? body.answer : "";

    const { room, outcome } = await submitGuess(code, playerId, answer);

    return NextResponse.json({ room, outcome });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not submit guess.";
    const statusCode = message.includes("Round isn't active") || message.includes("Wait for the frame")
      ? 409
      : 400;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
