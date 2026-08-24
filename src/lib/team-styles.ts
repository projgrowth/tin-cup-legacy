/** Stationery initials — no team wash. */

export type TeamSlug = "strong-mental" | "grass-roots" | string;

export function teamAccentClass(_slug: TeamSlug): string {
  return "text-foreground";
}

export function teamRailClass(_slug: TeamSlug): string {
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

export function avatarRingClass(_slug?: TeamSlug | null): string {
  return "border-border";
}

/** Monogram surface classes — paper initials. */
export function monogramClass(
  _slug?: TeamSlug | null,
  size: "sm" | "md" | "lg" | "xl" | "poster" | "tile" = "md",
): string {
  if (size === "tile") {
    return "mono-tile mono-tile-plain flex size-full items-center justify-center bg-secondary t-title font-semibold tracking-wide text-foreground";
  }
  const dim =
    size === "sm"
      ? "size-7 t-micro"
      : size === "lg"
        ? "size-12 t-title"
        : size === "xl"
          ? "size-[5.5rem] t-title"
          : size === "poster"
            ? "size-[8.75rem] t-title"
            : "size-9 t-micro";
  return `${dim} rounded-full border border-border bg-secondary font-semibold tracking-wide text-foreground`;
}
