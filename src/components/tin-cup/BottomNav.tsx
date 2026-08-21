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
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.35rem,env(safe-area-inset-bottom))] lg:inset-x-auto lg:left-1/2 lg:bottom-3 lg:-translate-x-1/2 lg:px-0 lg:pb-0">
      <div className="mx-auto flex w-full max-w-md items-stretch justify-between gap-0.5 rounded-xl border border-border bg-[var(--glass)] px-1 py-0.5 backdrop-blur-xl lg:w-auto lg:max-w-none lg:gap-1 lg:px-1.5 lg:py-1">
        {items.map(({ to, label, icon: Icon, exact }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact }}
            className="group press t-micro relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 font-semibold tracking-[-0.01em] text-muted-foreground transition-colors data-[status=active]:text-gold-light lg:flex-row lg:gap-2 lg:px-3.5 lg:py-2"
          >
            <span className="relative">
              <Icon className="size-[18px] md:size-4" strokeWidth={1.65} />
              {label === "Home" && live ? (
                <span
                  className="absolute -right-1 -top-0.5 size-1.5 rounded-full bg-[var(--status-live)]"
                  aria-label="Cup live"
                />
              ) : null}
            </span>
            <span className="relative text-[0.65rem] md:text-[0.8125rem]">
              {label}
              <span
                aria-hidden
                className="absolute inset-x-0 -bottom-0.5 mx-auto hidden h-px w-full bg-gold group-data-[status=active]:block"
              />
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
