import { Link } from "@tanstack/react-router";

export function SideNames({
  names,
  playerIdByName,
}: {
  names: string[];
  playerIdByName?: (name: string) => string | undefined;
}) {
  return (
    <>
      {names.map((name, index) => {
        const id = playerIdByName?.(name);
        const label = name.trim().split(/\s+/)[0] ?? name;
        const sep = index === 0 ? null : " · ";
        if (id) {
          return (
            <span key={name}>
              {sep}
              <Link
                to="/player/$playerId"
                params={{ playerId: id }}
                className="press text-foreground"
              >
                {label}
              </Link>
            </span>
          );
        }
        return (
          <span key={name} className="text-foreground">
            {sep}
            {label}
          </span>
        );
      })}
    </>
  );
}
