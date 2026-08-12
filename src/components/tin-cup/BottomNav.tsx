import { Link } from "@tanstack/react-router";
import { BarChart3, CalendarDays, Map, Users, Wallet } from "lucide-react";

const items = [
  { to: "/", label: "Live", icon: BarChart3, exact: true },
  { to: "/schedule", label: "Day", icon: CalendarDays, exact: false },
  { to: "/scout", label: "Plan", icon: Map, exact: false },
  { to: "/rosters", label: "Teams", icon: Users, exact: false },
  { to: "/purse", label: "Pay", icon: Wallet, exact: false },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.35rem,env(safe-area-inset-bottom))] md:inset-x-auto md:left-1/2 md:top-3 md:bottom-auto md:-translate-x-1/2 md:px-0 md:pb-0">
      <div className="glass-panel mx-auto flex w-full max-w-md items-stretch justify-between gap-0.5 px-1 py-1 md:w-auto md:max-w-none md:gap-1 md:px-1.5">
        {items.map(({ to, label, icon: Icon, exact }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact }}
            className="press t-micro relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 font-semibold tracking-[-0.01em] text-muted-foreground transition-colors data-[status=active]:bg-white/10 data-[status=active]:text-foreground md:min-h-0 md:flex-row md:gap-2 md:px-3.5 md:py-2"
          >
            <Icon className="size-[18px] md:size-4" strokeWidth={1.65} />
            <span className="text-[0.6875rem] md:text-[0.8125rem]">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
