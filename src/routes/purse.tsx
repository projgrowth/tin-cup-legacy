import { createFileRoute } from "@tanstack/react-router";

import { ErrorState, Shell } from "@/components/tin-cup/Shell";
import { useTournament } from "@/hooks/useTournament";
import { sideCash, sideCashByPlayer, formatPayout } from "@/lib/purse";
import { MoneySplit } from "@/components/tin-cup/DayStory";
import {
  BUY_IN,
  EXPECTED_PLAYER_COUNT,
  TOURNAMENT_BANK,
  SIDE_BET_PAYOUTS_CONFIRMED,
  venmoUrl,
} from "@/lib/tin-cup";

export const Route = createFileRoute("/purse")({
  head: () => ({
    meta: [
      { title: "Purse & Rules — Tin Cup Invitational 2026" },
      {
        name: "description",
        content:
          "The $150 buy-in, $200 winner payout, six closest-to-the-pin pots, two long drives and the full 26-point rule set.",
      },
      { property: "og:title", content: "Purse & Rules — Tin Cup Invitational 2026" },
      {
        property: "og:description",
        content: "Where the money goes and how the 26 points are won.",
      },
    ],
  }),
  component: PursePage,
});

function PursePage() {
  const { data, isError, refetch, isFetching } = useTournament();
  const bets = data?.sideBets ?? [];
  const players = data?.players ?? [];
  const claimed = bets.filter((b) => b.player_name);
  const fieldSize = players.length || EXPECTED_PLAYER_COUNT;
  const cash = sideCash(bets, fieldSize);
  const hasTbdPayouts = !SIDE_BET_PAYOUTS_CONFIRMED || cash.unconfigured > 0;
  const perPlayer = sideCashByPlayer(bets);

  return (
    <Shell variant="content">
      <div className="stack-page">
        <section>
          <h1 className="t-numeral text-foreground">${BUY_IN}</h1>
          <div className="mt-[var(--space-5)]">
            <MoneySplit bare />
          </div>
          <a
            href={venmoUrl}
            target="_blank"
            rel="noreferrer"
            className="press btn-primary mt-[var(--space-5)] flex min-h-11 w-full items-center justify-center"
          >
            Pay ${BUY_IN} · Venmo {TOURNAMENT_BANK}
          </a>
          {hasTbdPayouts ? <p className="t-micro mt-[var(--space-3)]">Contest holes TBD</p> : null}
        </section>

        {isError && !data && (
          <ErrorState
            title="Purse board didn't load"
            detail="The side-cash totals need a connection to the tournament board."
            onRetry={() => void refetch()}
            busy={isFetching}
          />
        )}

        {claimed.length > 0 && (
          <section>
            <ul className="stack">
              {claimed
                .filter((bet) => bet.hole != null)
                .map((bet) => (
                  <li key={bet.id} className="t-micro flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate">
                      {bet.label} · {bet.player_name ?? "Open"}
                    </span>
                    <span className="shrink-0 text-foreground">{formatPayout(bet.amount)}</span>
                  </li>
                ))}
            </ul>
          </section>
        )}

        {perPlayer.length > 0 && (
          <section>
            <ul className="stack">
              {perPlayer.map((row) => (
                <li key={row.name} className="t-micro flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate">{row.name}</span>
                  <span className="shrink-0 text-foreground">{formatPayout(row.total)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="t-micro px-1">Official scoring stays captain-controlled.</p>
      </div>
    </Shell>
  );
}
