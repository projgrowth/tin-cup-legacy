import { Link } from "@tanstack/react-router";
import { CalendarDays, Camera, Map, Wallet } from "lucide-react";

import type { SideBet } from "@/hooks/useTournament";
import type { WeekendContext } from "@/lib/weekend-context";
import { formatPayout } from "@/lib/purse";
import type { HomeModuleKey } from "@/lib/social-platform";

export function HomeSecondaryModules({
  order,
  context,
  sideBets,
  photoCount,
}: {
  order: HomeModuleKey[];
  context: WeekendContext;
  sideBets: SideBet[];
  photoCount: number;
}) {
  const claimed = sideBets
    .filter((bet) => bet.player_name)
    .reduce((sum, bet) => sum + Number(bet.amount), 0);
  const cards: Record<
    HomeModuleKey,
    { icon: typeof Map; label: string; hint: string; to: string }
  > = {
    upcoming: {
      icon: CalendarDays,
      label: "Weekend",
      hint: context.nextRound
        ? `${context.nextRound.day_label} · ${context.nextRound.course}`
        : "Friday pairing",
      to: "/schedule",
    },
    plan: {
      icon: Map,
      label: "Plan",
      hint: `${context.planProgress.planned}/18 holes`,
      to: "/scout",
    },
    photos: {
      icon: Camera,
      label: "Photos",
      hint: `${photoCount} recent`,
      to: "/photos",
    },
    purse: {
      icon: Wallet,
      label: "Purse",
      hint: formatPayout(claimed),
      to: "/purse",
    },
  };
  const keys = order.filter((key) => {
    if (context.player) return true;
    return key === "photos" || key === "purse";
  });
  return (
    <section aria-label="Weekend shortcuts" className="space-y-3">
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {keys.map((key) => {
          const card = cards[key];
          const Icon = card.icon;
          return (
            <Link key={key} to={card.to} className="press chip min-h-11 shrink-0 gap-1.5">
              <Icon className="size-3.5" />
              {card.label}
              <span className="text-muted-foreground">{card.hint}</span>
            </Link>
          );
        })}
      </div>
      <p className="t-micro">
        Official scoring stays captain-controlled. Predictions are social signals only.
      </p>
    </section>
  );
}
