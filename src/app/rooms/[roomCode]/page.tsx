import { redirect } from 'next/navigation';

interface RoomPageProps {
  params: {
    roomCode: string;
  };
}

export default function RoomIndexPage({ params }: RoomPageProps) {
  redirect(`/rooms/${params.roomCode}/lobby`);
}
