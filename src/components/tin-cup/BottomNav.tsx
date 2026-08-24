import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, House, Map, Users, Wallet } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: House, exact: true },
  { to: "/schedule", label: "Weekend", icon: CalendarDays, exact: false },
  { to: "/scout", label: "Plan", icon: Map, exact: false },
  { to: "/rosters", label: "Teams", icon: Users, exact: false },
  { to: "/purse", label: "Purse", icon: Wallet, exact: false },
] as const;

function homeIsActive(pathname: string) {
  if (pathname === "/profile" || pathname.startsWith("/profile/")) return false;
  if (pathname === "/player" || pathname.startsWith("/player/")) return false;
  return pathname === "/";
}

export function BottomNav({ live = false }: { live?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      data-bottom-nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex w-full max-w-4xl items-stretch px-2 sm:px-4">
        {items.map(({ to, label, icon: Icon, exact }) => {
          const isHome = label === "Home";
          const homeOn = isHome && homeIsActive(pathname);
          return (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact }}
              className={`group press t-micro relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 no-underline ${
                isHome
                  ? homeOn
                    ? "text-hunter"
                    : "text-muted-foreground"
                  : "text-muted-foreground data-[status=active]:text-hunter"
              }`}
              data-status={isHome ? (homeOn ? "active" : "inactive") : undefined}
            >
              <span className="relative flex size-6 items-center justify-center">
                <Icon
                  className={`size-[1.15rem] group-data-[status=active]:stroke-[2.25] ${
                    isHome
                      ? homeOn
                        ? "fill-hunter/15"
                        : ""
                      : "group-data-[status=active]:fill-hunter/15"
                  }`}
                  strokeWidth={isHome && homeOn ? 2.25 : 1.55}
                />
                {isHome && live ? (
                  <span
                    className="absolute -right-1 -top-0.5 size-1.5 rounded-full bg-[var(--status-live)]"
                    aria-label="Cup live"
                  />
                ) : null}
              </span>
              <span
                className={`leading-none ${
                  isHome
                    ? homeOn
                      ? "font-semibold"
                      : "font-medium"
                    : "font-medium group-data-[status=active]:font-semibold"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
