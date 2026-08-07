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
