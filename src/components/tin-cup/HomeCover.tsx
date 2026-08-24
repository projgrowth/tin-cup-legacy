import { Link } from "@tanstack/react-router";

import { Avatar } from "@/components/tin-cup/Avatar";
import { MostLikelySheet } from "@/components/tin-cup/MostLikelySheet";
import type { AvatarIndex } from "@/hooks/usePlayerAvatars";
import { faceUrl } from "@/hooks/usePlayerAvatars";
import type { Player, Team } from "@/hooks/useTournament";
import { DAY1_PAIRINGS, foursomeSentence, fridayFoursome } from "@/lib/day1-pairings";

export const FRIDAY_TEE_CAPTION = "Friday · South · 7:30a";

function sameName(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function srcFor(
  name: string,
  avatars?: AvatarIndex,
  playerIdByName?: (name: string) => string | undefined,
) {
  return faceUrl(avatars, name, playerIdByName?.(name));
}

/** Home cover: one horizontal filmstrip of four faces, then type. Not a lockup. */
export function HomeCover({
  avatars,
  claimedName = null,
  playerIdByName,
  players,
  teams,
}: {
  avatars?: AvatarIndex;
  claimedName?: string | null;
  playerIdByName?: (name: string) => string | undefined;
  players: Player[];
  teams: Team[];
}) {
  const featured =
    (claimedName
      ? DAY1_PAIRINGS.find((group) =>
          [...group.playersA, ...group.playersB].some((name) => sameName(name, claimedName)),
        )
      : undefined) ?? DAY1_PAIRINGS[0]!;
  const yours = Boolean(
    claimedName &&
      [...featured.playersA, ...featured.playersB].some((name) => sameName(name, claimedName)),
  );
  const seats = yours && claimedName ? fridayFoursome(claimedName) : null;
  const faces = seats?.map((seat) => seat.name) ?? [...featured.playersA, ...featured.playersB];
  const sentence = foursomeSentence(
    featured.playersA,
    featured.playersB,
    yours ? claimedName : null,
  );
  const rest = DAY1_PAIRINGS.filter((group) => group.matchIndex !== featured.matchIndex);

  return (
    <section aria-label="Friday cover" className="stack">
      <div className="-mx-4 grid grid-cols-4 gap-px sm:-mx-5" aria-hidden>
        {faces.map((name) => {
          const href = playerIdByName?.(name);
          const tile = (
            <span className="relative block aspect-square overflow-hidden bg-secondary">
              <Avatar
                name={name}
                src={srcFor(name, avatars, playerIdByName)}
                size="tile"
                crop="bleed"
                className="absolute inset-0"
              />
            </span>
          );
          if (href) {
            return (
              <Link key={name} to="/player/$playerId" params={{ playerId: href }} aria-label={name}>
                {tile}
              </Link>
            );
          }
          return <span key={name}>{tile}</span>;
        })}
      </div>
      <p className="t-body text-foreground">{sentence}</p>
      <p className="t-micro">{FRIDAY_TEE_CAPTION}</p>
      <ul className="stack">
        {rest.map((group) => (
          <li key={group.matchIndex} className="t-micro">
            {foursomeSentence(group.playersA, group.playersB)}
          </li>
        ))}
      </ul>
      <details>
        <summary className="press t-micro min-h-11 cursor-pointer list-none py-2 [&::-webkit-details-marker]:hidden">
          Most likely
        </summary>
        <div className="pt-2">
          <MostLikelySheet players={players} teams={teams} />
        </div>
      </details>
    </section>
  );
}
