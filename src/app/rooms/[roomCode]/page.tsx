import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getPlayerBySessionToken, getRoom, Room } from "@/lib/rooms";
import { HOST_SESSION_COOKIE } from "@/lib/session";
import LobbyClient from "./LobbyClient";

interface RoomPageProps {
  params: {
    roomCode: string;
  };
  searchParams?: Record<string, string | string[] | undefined>;
}

export default async function RoomPage({ params, searchParams }: RoomPageProps) {
  const roomCode = params.roomCode.trim();
  const existingRoom = await getRoom(roomCode);

  if (!existingRoom) {
    notFound();
  }

  const safeRoom: Room = JSON.parse(JSON.stringify(existingRoom));

  const playerIdParam = searchParams?.playerId;
  let playerId = Array.isArray(playerIdParam) ? playerIdParam[0] : playerIdParam;

  const sessionToken = cookies().get(HOST_SESSION_COOKIE)?.value;
  let hostSessionActive = false;

  if (sessionToken) {
    const sessionPlayer = await getPlayerBySessionToken(sessionToken);
    if (sessionPlayer && sessionPlayer.roomCode === safeRoom.code) {
      playerId = sessionPlayer.id;
      hostSessionActive = sessionPlayer.role === "host";
    }
  }

  return (
    <LobbyClient
      initialRoom={safeRoom}
      roomCode={safeRoom.code}
      playerId={playerId}
      hostSessionActive={hostSessionActive}
    />
  );
}
