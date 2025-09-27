import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { advanceFrame } from "@/lib/rooms";
import { HOST_SESSION_COOKIE } from "@/lib/session";

interface Params {
  params: Promise<{
    code: string;
  }>;
}

export async function POST(request: Request, { params }: Params) {
  try {
    const resolvedParams = await params;
    const code = resolvedParams.code.trim();
    if (!code) {
      return NextResponse.json({ error: "Room code is required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(HOST_SESSION_COOKIE)?.value;
    const room = await advanceFrame(code, sessionToken);

    return NextResponse.json({ room });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not advance the frame.";
    const statusCode = message.includes("Only the host")
      ? 403
      : message.includes("Host session")
        ? 401
        : message.includes("Start the match")
          ? 409
          : 400;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
