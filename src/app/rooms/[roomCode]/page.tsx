import { redirect } from 'next/navigation';

interface RoomPageProps {
  params: {
    roomCode: string;
  };
}

export default async function RoomIndexPage({ params }: RoomPageProps) {
  const resolvedParams = await params;
  redirect(`/rooms/${resolvedParams.roomCode}/lobby`);
}
