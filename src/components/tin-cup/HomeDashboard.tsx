import { Link } from "@tanstack/react-router";

import type { SideBet } from "@/hooks/useTournament";
import type { WeekendContext } from "@/lib/weekend-context";
import { formatPayout } from "@/lib/purse";
import { BUY_IN } from "@/lib/tin-cup";
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
  const cards: Record<HomeModuleKey, { label: string; hint: string; to: string }> = {
    upcoming: {
      label: "Weekend",
      hint: context.nextRound
        ? `${context.nextRound.day_label} · ${context.nextRound.course}`
        : "Friday pairing",
      to: "/schedule",
    },
    plan: {
      label: "Plan",
      hint: context.planProgress.planned > 0 ? context.planProgress.planned + "/18 holes" : "Course book",
      to: "/scout",
    },
    photos: {
      label: "Photos",
      hint: `${photoCount} recent`,
      to: "/photos",
    },
    purse: {
      label: "Purse",
      hint: claimed > 0 ? formatPayout(claimed) : `$${BUY_IN}`,
      to: "/purse",
    },
  };
  const keys = order.filter((key) => {
    if (key === "photos" && photoCount === 0) return false;
    if (context.player) return true;
    return key === "photos" || key === "purse";
  });
  if (keys.length === 0) return null;
  return (
    <section aria-label="Weekend shortcuts" className="space-y-3">
      <div className="surface divide-y divide-border overflow-hidden">
        {keys.map((key) => {
          const card = cards[key];
          return (
            <Link
              key={key}
              to={card.to}
              className="press flex min-h-12 items-center justify-between px-4 py-3"
            >
              <span className="t-body font-medium text-foreground">{card.label}</span>
              <span className="t-micro">{card.hint}</span>
            </Link>
          );
        })}
      </div>
      {context.phase !== "pre" ? (
        <p className="t-micro px-1">
          Official scoring stays captain-controlled. Predictions are social signals only.
        </p>
      ) : null}
    </section>
  );
}
