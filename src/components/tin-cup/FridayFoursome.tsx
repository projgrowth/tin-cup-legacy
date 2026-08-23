import { Link } from "@tanstack/react-router";

import { Avatar } from "@/components/tin-cup/Avatar";
import type { Player, Team } from "@/hooks/useTournament";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { fridayFoursome } from "@/lib/day1-pairings";

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function FridayFoursome({
  claimedName,
  players,
  teams,
}: {
  claimedName: string;
  players: Player[];
  teams: Team[];
}) {
  const seats = fridayFoursome(claimedName);
  const avatars = usePlayerAvatars(players, teams);
  if (!seats) return null;

  return (
    <div className="grid grid-cols-2 items-stretch gap-[var(--space-5)]">
      {seats.map((seat) => {
        const player = players.find(
          (row) => row.name.trim().toLowerCase() === seat.name.toLowerCase(),
        );
        const face = avatars.data?.getByName(seat.name);
        const first = firstName(seat.name);
        const team = seat.teamSlug === "strong-mental" ? "Strong Mental" : "Grass Roots";
        const inner = (
          <>
            <Avatar name={seat.name} teamSlug={seat.teamSlug} src={face?.url} size="xl" />
            <p className="t-title mt-[var(--space-3)] text-foreground">{seat.you ? "You" : first}</p>
            <p className="t-micro mt-1">{team}</p>
          </>
        );
        const chrome = "flex h-full flex-col items-center py-[var(--space-2)] text-center";
        if (!player) {
          return (
            <article key={seat.name} className={chrome}>
              {inner}
            </article>
          );
        }
        return (
          <Link
            key={seat.name}
            to="/player/$playerId"
            params={{ playerId: player.id }}
            className={`press ${chrome}`}
          >
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
