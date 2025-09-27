import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getRoomGames } from '@/lib/database/games';
import { ReplayView } from './components';
import LoadingSpinner from '@/app/rooms/[roomCode]/components/LoadingSpinner';

interface ReplayPageProps {
  params: {
    roomCode: string;
  };
  searchParams: {
    gameId?: string;
  };
}

export default async function ReplayPage({ params, searchParams }: ReplayPageProps) {
  const { roomCode } = params;
  const { gameId } = searchParams;

  try {
    // Récupérer les parties de la salle
    const games = await getRoomGames(roomCode);
    
    if (games.length === 0) {
      return (
        <div className="min-h-screen bg-base-100 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-base-content mb-4">
              Aucune partie trouvée
            </h1>
            <p className="text-base-content/70">
              Cette salle n'a pas encore de parties enregistrées.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-base-100">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-base-content mb-2">
              Replay des Parties
            </h1>
            <p className="text-base-content/70">
              Salle: <span className="font-mono font-bold">{roomCode}</span>
            </p>
          </div>

          <Suspense fallback={<LoadingSpinner />}>
            <ReplayView 
              roomCode={roomCode} 
              games={games} 
              selectedGameId={gameId} 
            />
          </Suspense>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading replay page:', error);
    notFound();
  }
}
