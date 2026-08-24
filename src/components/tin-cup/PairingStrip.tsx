import { Avatar } from "@/components/tin-cup/Avatar";
import type { AvatarIndex } from "@/hooks/usePlayerAvatars";
import { faceUrl } from "@/hooks/usePlayerAvatars";
import { foursomeSentence, fridayFoursome, type Day1Pairing } from "@/lib/day1-pairings";

function sameName(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Weekend Friday row: sentence, then four ~2rem faces. Not a lockup widget. */
export function PairingStrip({
  group,
  avatars,
  claimedName = null,
  playerIdByName,
}: {
  group: Day1Pairing;
  avatars?: AvatarIndex;
  claimedName?: string | null;
  playerIdByName?: (name: string) => string | undefined;
}) {
  const yours = Boolean(
    claimedName && [...group.playersA, ...group.playersB].some((name) => sameName(name, claimedName)),
  );
  const sentence = foursomeSentence(group.playersA, group.playersB, yours ? claimedName : null);
  const seats = yours && claimedName ? fridayFoursome(claimedName) : null;
  const faces = seats?.map((seat) => seat.name) ?? [...group.playersA, ...group.playersB];

  return (
    <article className="stack-tight" aria-label={sentence}>
      <p className="t-body text-foreground">{sentence}</p>
      <div className="flex gap-1">
        {faces.map((name) => (
          <span
            key={name}
            className="relative size-8 shrink-0 overflow-hidden bg-secondary"
            title={name}
          >
            <Avatar
              name={name}
              src={faceUrl(avatars, name, playerIdByName?.(name))}
              size="tile"
              crop="bleed"
              className="absolute inset-0"
            />
          </span>
        ))}
      </div>
    </article>
  );
}
