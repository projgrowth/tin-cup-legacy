/** Team accent tokens — Strong Mental = gold, Grass Roots = copper. */

export type TeamSlug = "strong-mental" | "grass-roots" | string;

export function teamAccentClass(slug: TeamSlug): string {
  if (slug === "grass-roots") return "text-copper";
  return "text-gold";
}

export function teamRailClass(slug: TeamSlug): string {
  if (slug === "grass-roots") return "rail-copper";
  return "rail-gold";
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

/** Monogram surface classes by team (flat, no gold wash). */
export function monogramClass(slug?: TeamSlug | null, size: "sm" | "md" | "lg" = "md"): string {
  const dim =
    size === "sm" ? "size-8 text-[0.65rem]" : size === "lg" ? "size-14 text-base" : "size-10 text-xs";
  if (slug === "grass-roots") {
    return `${dim} rounded-full border border-copper/35 bg-copper/15 font-semibold tracking-wide text-copper`;
  }
  if (slug === "strong-mental") {
    return `${dim} rounded-full border border-gold/35 bg-gold/12 font-semibold tracking-wide text-gold-light`;
  }
  return `${dim} rounded-full border border-border bg-secondary font-semibold tracking-wide text-muted-foreground`;
}
