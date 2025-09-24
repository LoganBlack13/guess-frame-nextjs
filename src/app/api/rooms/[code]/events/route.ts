import { NextResponse } from "next/server";
import { getRoom } from "@/lib/rooms";
import { subscribeToRoom } from "@/lib/roomEvents";

interface Params {
  params: {
    code: string;
  };
}

function formatSse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(request: Request, { params }: Params) {
  const roomCode = params.code.trim();

  if (!roomCode) {
    return NextResponse.json({ error: "Room code required" }, { status: 400 });
  }

  const initialRoom = await getRoom(roomCode);

  if (!initialRoom) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(formatSse("room:update", initialRoom)));

      const unsubscribe = subscribeToRoom(roomCode, (event) => {
        controller.enqueue(encoder.encode(formatSse(event.type, event.room)));
      });

      const abort = () => {
        unsubscribe();
        controller.close();
      };

      request.signal.addEventListener("abort", abort);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
