import { Link } from "@tanstack/react-router";
import { BarChart3, CalendarDays, Map, Users, Wallet } from "lucide-react";

const items = [
  { to: "/", label: "Live", icon: BarChart3, exact: true },
  { to: "/schedule", label: "Day", icon: CalendarDays, exact: false },
  { to: "/scout", label: "Map", icon: Map, exact: false },
  { to: "/rosters", label: "Teams", icon: Users, exact: false },
  { to: "/purse", label: "Pay", icon: Wallet, exact: false },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:inset-x-auto md:left-1/2 md:top-3 md:bottom-auto md:-translate-x-1/2 md:px-0 md:pb-0">
      <div className="glass mx-auto flex w-full max-w-md items-stretch justify-between gap-0.5 p-1 md:w-auto md:max-w-none md:gap-2 md:px-2">
        {items.map(({ to, label, icon: Icon, exact }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact }}
            className="press t-micro flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 font-semibold tracking-[-0.01em] text-muted-foreground transition-colors data-[status=active]:bg-secondary data-[status=active]:text-foreground md:min-h-0 md:flex-row md:gap-2 md:px-3 md:py-2"
          >
            <Icon className="size-5 md:size-[18px]" strokeWidth={1.7} />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
