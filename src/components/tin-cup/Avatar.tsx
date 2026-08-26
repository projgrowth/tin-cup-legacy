import { avatarRingClass, monogramClass, playerInitials, type TeamSlug } from "@/lib/team-styles";

const SIZE = {
  sm: "size-7 text-[0.6rem]",
  md: "size-9 text-[0.65rem]",
  lg: "size-12 text-sm",
} as const;

/** Circular face, or initials when there is no photo. */
export function Avatar({
  name,
  teamSlug,
  src,
  size = "md",
  fallback = "team",
  className = "",
  title,
}: {
  name: string;
  teamSlug?: TeamSlug | null;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  /** `ink` is a bag-tag initial, not a team-color disc. */
  fallback?: "team" | "ink";
  className?: string;
  title?: string;
}) {
  const dim = SIZE[size];
  if (src) {
    return (
      <span
        className={`inline-flex shrink-0 overflow-hidden rounded-full border bg-secondary ${avatarRingClass(teamSlug)} ${dim} ${className}`.trim()}
      >
        <img
          src={src}
          alt={title ?? name}
          title={title ?? name}
          className="size-full object-cover object-center"
        />
      </span>
    );
  }
  const mark =
    fallback === "ink"
      ? `${dim} rounded-full border border-foreground/15 font-medium tracking-wide text-muted-foreground`
      : monogramClass(teamSlug, size);
  return (
    <span
      title={title ?? name}
      aria-hidden={!title}
      className={`inline-flex shrink-0 items-center justify-center ${mark} ${className}`}
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
