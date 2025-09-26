import { notFound } from "next/navigation";
import { getRoom } from "@/lib/rooms";
import { LobbyView } from "../LobbyView";

interface LobbyPageProps {
  params: { roomCode: string };
  searchParams?: Record<string, string | string[] | undefined>;
}

function readParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value || null;
}

export default async function LobbyPage({ params, searchParams }: LobbyPageProps) {
  const initialRoom = await getRoom(params.roomCode);

  if (!initialRoom) {
    notFound();
  }

  const playerId = readParam(searchParams?.playerId);
  const role = readParam(searchParams?.role);
  const hostSessionActive = role === "host";

  return (
    <LobbyView
      initialRoom={initialRoom}
      roomCode={params.roomCode}
      playerId={playerId}
      hostSessionActive={hostSessionActive}
    />
  );
}
