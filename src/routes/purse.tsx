import { createFileRoute } from "@tanstack/react-router";

import { ErrorState, Shell } from "@/components/tin-cup/Shell";
import { useTournament } from "@/hooks/useTournament";
import { isCtp, isLongDrive } from "@/lib/side-bets";
import { sideCash, sideCashByPlayer, settlement, formatPayout } from "@/lib/purse";
import { MoneySplit } from "@/components/tin-cup/DayStory";
import {
  BUY_IN,
  EXPECTED_PLAYER_COUNT,
  TOURNAMENT_BANK,
  SIDE_BET_PAYOUTS_CONFIRMED,
  contestHoleLabel,
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
  const cup = settlement(data?.matches ?? []);

  return (
    <Shell variant="content">
      <div className="stack-page">
        <section className="surface p-[var(--space-4)]">
          <h1 className="t-hero text-foreground">${BUY_IN}</h1>
          <p className="t-micro mt-[var(--space-3)]">
            Venmo {TOURNAMENT_BANK} · team win ${cup.winnerPayout} · side ${cash.pool}
            {hasTbdPayouts ? " · holes TBD" : ""}
          </p>
          <div className="mt-[var(--space-5)]">
            <MoneySplit bare />
          </div>
          <a
            href={venmoUrl}
            target="_blank"
            rel="noreferrer"
            className="press btn-quiet t-body mt-[var(--space-5)] flex min-h-11 w-full justify-center"
          >
            Pay ${BUY_IN}
          </a>
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
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="t-eyebrow">Side pots</h2>
              <span className="t-micro text-muted-foreground">
                {claimed.length > 0 ? claimed.length + "/" + bets.length : ""}
              </span>
            </div>
            <ul className="surface divide-y divide-border overflow-hidden">
              {claimed
                .filter((bet) => bet.hole != null)
                .map((bet) => (
                  <li key={bet.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                    <span className="min-w-0">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[0.65rem] font-semibold ${
                            isLongDrive(bet.kind)
                              ? "ring-1 ring-stone text-stone"
                              : isCtp(bet.kind)
                                ? "ring-1 ring-hunter text-hunter"
                                : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {isLongDrive(bet.kind) ? "LD" : isCtp(bet.kind) ? "CTP" : bet.kind}
                        </span>
                        <span className="t-body min-w-0 truncate font-medium text-foreground">
                          {bet.label}
                        </span>
                      </span>
                      <span className="t-micro text-muted-foreground">
                        {bet.player_name ?? "Open"} · {contestHoleLabel(bet.hole)}
                      </span>
                    </span>
                    <span className="t-numeral shrink-0 text-foreground">
                      {formatPayout(bet.amount)}
                    </span>
                  </li>
                ))}
            </ul>
          </section>
        )}

        {perPlayer.length > 0 && (
          <section>
            <h2 className="t-eyebrow">Won so far</h2>
            <ul className="surface divide-y divide-border overflow-hidden">
              {perPlayer.map((row) => (
                <li key={row.name} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="t-body min-w-0 truncate text-foreground">{row.name}</span>
                  <span className="t-numeral shrink-0 text-foreground">
                    {formatPayout(row.total)}
                  </span>
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
