import { Link } from "@tanstack/react-router";
import { CalendarDays, House, Map, Users, Wallet } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: House, exact: true },
  { to: "/schedule", label: "Weekend", icon: CalendarDays, exact: false },
  { to: "/scout", label: "Plan", icon: Map, exact: false },
  { to: "/rosters", label: "Teams", icon: Users, exact: false },
  { to: "/purse", label: "Purse", icon: Wallet, exact: false },
] as const;

export function BottomNav({ live = false }: { live?: boolean }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-4xl items-stretch px-2 sm:px-5">
        {items.map(({ to, label, icon: Icon, exact }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact }}
            className="group press t-micro relative flex min-h-12 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 font-semibold text-muted-foreground data-[status=active]:text-hunter lg:flex-row lg:gap-2 lg:px-3"
          >
            <span className="relative">
              <Icon className="size-4" strokeWidth={1.7} />
              {label === "Home" && live ? (
                <span
                  className="absolute -right-1 -top-0.5 size-1.5 rounded-full bg-[var(--status-live)]"
                  aria-label="Cup live"
                />
              ) : null}
            </span>
            <span className="relative">
              {label}
              <span
                aria-hidden
                className="absolute inset-x-0 -bottom-0.5 mx-auto hidden h-px w-full bg-hunter group-data-[status=active]:block"
              />
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
