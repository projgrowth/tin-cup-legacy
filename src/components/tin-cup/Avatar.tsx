import { monogramClass, playerInitials, type TeamSlug } from "@/lib/team-styles";

const SIZE = {
  sm: "size-8 text-[0.65rem]",
  md: "size-10 text-xs",
  lg: "size-14 text-base",
} as const;

/** Circular face or team-color monogram fallback. */
export function Avatar({
  name,
  teamSlug,
  src,
  size = "md",
  className = "",
  title,
}: {
  name: string;
  teamSlug?: TeamSlug | null;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  title?: string;
}) {
  const dim = SIZE[size];
  if (src) {
    return (
      <img
        src={src}
        alt={title ?? name}
        title={title ?? name}
        className={`${dim} shrink-0 rounded-full border border-border object-cover ${className}`}
      />
    );
  }
  return (
    <span
      title={title ?? name}
      aria-hidden={!title}
      className={`inline-flex shrink-0 items-center justify-center ${monogramClass(teamSlug, size)} ${className}`}
    >
      {playerInitials(name)}
    </span>
  );
}

/** Overlapping pair of avatars for match / Day 1 sides. */
export function AvatarPair({
  people,
  size = "sm",
}: {
  people: Array<{ name: string; teamSlug?: string | null; src?: string | null }>;
  size?: "sm" | "md";
}) {
  if (people.length === 0) return null;
  const shown = people.slice(0, 2);
  return (
    <span className="inline-flex shrink-0 items-center">
      {shown.map((p, i) => (
        <span
          key={`${p.name}-${i}`}
          className={i === 0 ? "" : "-ml-2 ring-2 ring-background rounded-full"}
        >
          <Avatar name={p.name} teamSlug={p.teamSlug} src={p.src} size={size} />
        </span>
      ))}
    </span>
  );
}
