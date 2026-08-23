import { avatarRingClass, monogramClass, playerInitials, type TeamSlug } from "@/lib/team-styles";

const SIZE = {
  sm: "size-7 text-[0.6rem]",
  md: "size-9 text-[0.65rem]",
  lg: "size-12 text-sm",
  xl: "size-[5.5rem] text-xl",
  poster: "size-[8.75rem] text-2xl",
  tile: "size-full text-[clamp(2rem,8vw,3.25rem)]",
} as const;

/** Circular face or team-color monogram fallback. Faces never overlap. */
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
  size?: "sm" | "md" | "lg" | "xl" | "poster" | "tile";
  className?: string;
  title?: string;
}) {
  const dim = SIZE[size];
  if (src) {
    const frame =
      size === "tile"
        ? `block size-full overflow-hidden bg-secondary ${className}`.trim()
        : `inline-flex shrink-0 overflow-hidden rounded-full border bg-secondary ${avatarRingClass(teamSlug)} ${dim} ${className}`.trim();
    return (
      <span className={frame}>
        <img
          src={src}
          alt={title ?? name}
          title={title ?? name}
          className="size-full object-cover object-center"
        />
      </span>
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

/** Two faces side by side — no stacked overlap. */
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
    <span className="inline-flex shrink-0 items-center gap-1">
      {shown.map((p, i) => (
        <Avatar key={`${p.name}-${i}`} name={p.name} teamSlug={p.teamSlug} src={p.src} size={size} />
      ))}
    </span>
  );
}
