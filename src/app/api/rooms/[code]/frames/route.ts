import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { addFrame } from "@/lib/rooms";
import { HOST_SESSION_COOKIE } from "@/lib/session";

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
    const url = typeof body?.url === "string" ? body.url : "";
    const answer = typeof body?.answer === "string" ? body.answer : "";
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(HOST_SESSION_COOKIE)?.value;

    const frame = await addFrame(code, url, answer, sessionToken);

    return NextResponse.json({ frame });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not add frame.";
    const statusCode = message.includes("Only the host")
      ? 403
      : message.includes("Host session")
        ? 401
        : message.includes("Room not found")
          ? 404
          : 400;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
