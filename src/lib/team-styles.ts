/** Team accent tokens — Strong Mental = hunter, Grass Roots = stone. */

export type TeamSlug = "strong-mental" | "grass-roots" | string;

export function teamAccentClass(slug: TeamSlug): string {
  if (slug === "grass-roots") return "text-stone";
  return "text-hunter";
}

export function teamRailClass(slug: TeamSlug): string {
  if (slug === "grass-roots") return "rail-b";
  return "rail-a";
}

export function teamShortName(slug: TeamSlug): string {
  if (slug === "strong-mental") return "Strong Mental";
  if (slug === "grass-roots") return "Grass Roots";
  return slug;
}

/** One or two initials from a display/roster name. */
export function playerInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

export function avatarRingClass(slug?: TeamSlug | null): string {
  if (slug === "grass-roots") return "border-stone/35";
  if (slug === "strong-mental") return "border-hunter/35";
  return "border-border";
}

/** Monogram surface classes by team. */
export function monogramClass(slug?: TeamSlug | null, size: "sm" | "md" | "lg" = "md"): string {
  const dim =
    size === "sm" ? "size-7 text-[0.6rem]" : size === "lg" ? "size-12 text-sm" : "size-9 text-[0.65rem]";
  if (slug === "grass-roots") {
    return `${dim} rounded-full border border-stone/35 bg-stone/15 font-semibold tracking-wide text-stone`;
  }
  if (slug === "strong-mental") {
    return `${dim} rounded-full border border-hunter/35 bg-hunter/10 font-semibold tracking-wide text-hunter`;
  }
  return `${dim} rounded-full border border-border bg-secondary font-semibold tracking-wide text-muted-foreground`;
}
