import { Link } from "@tanstack/react-router";

import { Avatar } from "@/components/tin-cup/Avatar";
import type { Player, Team } from "@/hooks/useTournament";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { chipForPlayer, type BanterPrompt, type BanterVote } from "@/lib/banter";
import { fridayFoursome } from "@/lib/day1-pairings";

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function FridayFoursome({
  claimedName,
  players,
  teams,
  votes = [],
  prompts,
}: {
  claimedName: string;
  players: Player[];
  teams: Team[];
  votes?: BanterVote[];
  prompts?: BanterPrompt[];
}) {
  const seats = fridayFoursome(claimedName);
  const avatars = usePlayerAvatars(players, teams);
  if (!seats) return null;

  return (
    <div className="grid grid-cols-2 gap-[var(--space-5)]">
      {seats.map((seat) => {
        const player = players.find(
          (row) => row.name.trim().toLowerCase() === seat.name.toLowerCase(),
        );
        const face = avatars.data?.getByName(seat.name);
        const first = firstName(seat.name);
        const chips = player ? chipForPlayer(votes, player.id, first, prompts) : [];
        const team = seat.teamSlug === "strong-mental" ? "Strong Mental" : "Grass Roots";
        const inner = (
          <>
            <Avatar
              name={seat.name}
              teamSlug={seat.teamSlug}
              src={face?.url}
              size="xl"
            />
            <p className="t-title mt-[var(--space-3)] text-foreground">
              {seat.you ? "You" : first}
            </p>
            <p className="t-micro mt-[var(--space-3)]">{team}</p>
            {chips[0] ? <p className="t-micro mt-[var(--space-3)] text-hunter">{chips[0]}</p> : null}
          </>
        );
        const chrome =
          "surface flex h-full min-h-[12.5rem] flex-col items-center p-[var(--space-4)] text-center";
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
