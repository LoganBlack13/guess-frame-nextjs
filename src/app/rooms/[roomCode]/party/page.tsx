import { notFound } from "next/navigation";
import { getRoom } from "@/lib/rooms";
import PartyClient from "./PartyClient";

interface PartyPageProps {
  params: { roomCode: string };
  searchParams?: Record<string, string | string[] | undefined>;
}

function readParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value || null;
}

export default async function PartyPage({ params, searchParams }: PartyPageProps) {
  const resolvedParams = await params;
  const initialRoom = await getRoom(resolvedParams.roomCode);

  if (!initialRoom) {
    notFound();
  }

  const playerId = readParam(searchParams?.playerId);
  const role = readParam(searchParams?.role);
  const hostSessionActive = role === "host";

  return (
    <PartyClient
      initialRoom={initialRoom}
      roomCode={resolvedParams.roomCode}
      playerId={playerId}
      hostSessionActive={hostSessionActive}
    />
  );
}


