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
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const initialRoom = await getRoom(resolvedParams.roomCode);

  if (!initialRoom) {
    notFound();
  }

  const playerId = readParam(resolvedSearchParams?.playerId);
  const role = readParam(resolvedSearchParams?.role);
  const hostSessionActive = role === "host";

  return (
    <LobbyView
      initialRoom={initialRoom}
      roomCode={resolvedParams.roomCode}
      playerId={playerId}
      hostSessionActive={hostSessionActive}
    />
  );
}
