import { monogramClass, playerInitials, type TeamSlug } from "@/lib/team-styles";

export function Monogram({
  name,
  teamSlug,
  size = "md",
  className = "",
  title,
}: {
  name: string;
  teamSlug?: TeamSlug | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  title?: string;
}) {
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
