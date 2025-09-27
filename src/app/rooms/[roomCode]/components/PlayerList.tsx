'use client';

import { useEffect, useState } from "react";
import type { Player } from "@/lib/rooms";

interface PlayerListProps {
  players: Player[];
  currentPlayerId?: string | null;
}

export default function PlayerList({ players, currentPlayerId }: PlayerListProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="card border border-base-300 bg-base-200 shadow-md">
      <div className="card-body gap-3">
        <div className="flex items-center justify-between">
          <h2 className="card-title text-2xl text-base-content">Players in lobby</h2>
          <span className="badge badge-outline">{players.length}&nbsp;joined</span>
        </div>
        <ul className="grid gap-3 md:grid-cols-2">
          {players.map((player) => (
            <li key={player.id} className="rounded-lg border border-base-300 bg-base-100 p-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-base-content">{player.name}</span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="badge badge-outline">{player.score} pt{player.score === 1 ? "" : "s"}</span>
                  {player.role === "host" ? (
                    <span className="badge badge-primary badge-sm">Host</span>
                  ) : null}
                  {player.id === currentPlayerId ? (
                    <span className="badge badge-outline badge-sm">You</span>
                  ) : null}
                </div>
              </div>
              <p className="mt-1 text-sm text-base-content/60">
                Joined {mounted ? new Date(player.joinedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--"}
              </p>
            </li>
          ))}
        </ul>
        {players.length === 1 ? (
          <p className="text-sm text-base-content/60">
            Waiting for friends to join. Share the code above to bring them into the lobby.
          </p>
        ) : null}
      </div>
    </section>
  );
}
