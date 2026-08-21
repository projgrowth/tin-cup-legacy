import { createFileRoute } from "@tanstack/react-router";

import { PageMasthead } from "@/components/tin-cup/PageMasthead";
import { ErrorState, LoadingRows, Shell } from "@/components/tin-cup/Shell";
import { useTournament } from "@/hooks/useTournament";
import { sideCash, sideCashByPlayer, settlement, formatPayout } from "@/lib/purse";
import {
  BUY_IN,
  EXPECTED_PLAYER_COUNT,
  FORMAT_RULES,
  MONEY_RULES,
  TOURNAMENT_BANK,
  SIDE_BET_PAYOUTS_CONFIRMED,
  contestHoleLabel,
  VENMO_HANDLE,
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
  const { data, isPending, isError, refetch, isFetching } = useTournament();
  const bets = data?.sideBets ?? [];
  const players = data?.players ?? [];
  const claimed = bets.filter((b) => b.player_name);
  const fieldSize = players.length || EXPECTED_PLAYER_COUNT;
  const cash = sideCash(bets, fieldSize);
  const hasTbdPayouts = !SIDE_BET_PAYOUTS_CONFIRMED || cash.unconfigured > 0;
  const perPlayer = sideCashByPlayer(bets);
  const cup = settlement(data?.matches ?? []);

  return (
    <Shell variant="dashboard">
      <div className="stack-page pb-4">
        <PageMasthead
          kicker="Buy-in"
          title="The purse"
          meta={
            <>
              @{VENMO_HANDLE} · {TOURNAMENT_BANK}
              <span className="mt-2 block text-foreground">$100 team pot + $50 side cash</span>
            </>
          }
        >
          <a
            href={venmoUrl}
            target="_blank"
            rel="noreferrer"
            className="press btn-gold t-body mt-5 flex min-h-11 w-full max-w-sm justify-center"
          >
            Pay ${BUY_IN}
          </a>
        </PageMasthead>

        {isPending && !data && <LoadingRows rows={2} height={100} />}
        {isError && !data && (
          <ErrorState
            title="Purse board didn't load"
            detail="The side-cash totals need a connection to the tournament board."
            onRetry={() => void refetch()}
            busy={isFetching}
          />
        )}

        <section className="grid grid-cols-2 gap-3">
          <div className="surface-inset p-4">
            <p className="t-micro text-muted-foreground">Team win</p>
            <p className="t-hero mt-1.5 text-foreground">${cup.winnerPayout}</p>
          </div>
          <div className="surface-inset p-4">
            <p className="t-micro text-muted-foreground">Side cash</p>
            <p className="t-hero mt-1.5 text-foreground">${cash.pool}</p>
            {hasTbdPayouts && <p className="t-micro mt-1 text-muted-foreground">Holes TBD</p>}
          </div>
        </section>

        {bets.length > 0 && (
          <section>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="t-section text-foreground">Side pots</h2>
              <span className="t-micro text-muted-foreground">
                {claimed.length}/{bets.length}
              </span>
            </div>
            <ul className="surface-inset divide-y divide-border overflow-hidden">
              {bets.map((bet) => (
                <li key={bet.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                  <span className="min-w-0">
                    <span className="t-body block truncate font-medium text-foreground">
                      {bet.label}
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
          <details className="surface-inset">
            <summary className="press cursor-pointer list-none px-4 py-3.5 t-body font-medium text-foreground [&::-webkit-details-marker]:hidden">
              Won so far
            </summary>
            <ul className="divide-y divide-border border-t border-border">
              {perPlayer.map((row) => (
                <li key={row.name} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="t-body min-w-0 truncate text-foreground">{row.name}</span>
                  <span className="t-numeral shrink-0 text-foreground">
                    {formatPayout(row.total)}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}

        <section className="stack-tight">
          <details className="surface-inset">
            <summary className="press cursor-pointer list-none px-4 py-3.5 t-body font-medium text-foreground [&::-webkit-details-marker]:hidden">
              Format & pairings
            </summary>
            <ul className="space-y-2 border-t border-border px-4 py-3">
              {FORMAT_RULES.map((rule) => (
                <li key={rule} className="t-micro text-muted-foreground">
                  {rule}
                </li>
              ))}
            </ul>
          </details>
          <details className="surface-inset">
            <summary className="press cursor-pointer list-none px-4 py-3.5 t-body font-medium text-foreground [&::-webkit-details-marker]:hidden">
              Money rules
            </summary>
            <ul className="space-y-2 border-t border-border px-4 py-3">
              {MONEY_RULES.map((rule) => (
                <li key={rule} className="t-micro text-muted-foreground">
                  {rule}
                </li>
              ))}
            </ul>
          </details>
          <p className="t-micro px-1 text-muted-foreground">
            Official scoring stays captain-controlled. Predictions are social signals only.
          </p>
        </section>
      </div>
    </Shell>
  );
}
