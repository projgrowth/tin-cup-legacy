import { createFileRoute } from "@tanstack/react-router";

import { PageMasthead } from "@/components/tin-cup/PageMasthead";
import { ErrorState, Shell } from "@/components/tin-cup/Shell";
import { useTournament } from "@/hooks/useTournament";
import { sideCash, sideCashByPlayer, settlement, formatPayout } from "@/lib/purse";
import { MoneySplit, WeekendDayStories } from "@/components/tin-cup/DayStory";
import {
  BUY_IN,
  EXPECTED_PLAYER_COUNT,
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
      <div className="stack-page pb-4">
        <PageMasthead
          title="The purse"
          meta={
            <>
              @{VENMO_HANDLE} · {TOURNAMENT_BANK}
              <span className="mt-1 block">
                Team win ${cup.winnerPayout} · side cash ${cash.pool}
                {hasTbdPayouts ? " · holes TBD" : ""}
              </span>
            </>
          }
        >
          <a
            href={venmoUrl}
            target="_blank"
            rel="noreferrer"
            className="press btn-gold t-body mt-4 flex min-h-11 w-full max-w-sm justify-center"
          >
            Pay ${BUY_IN}
          </a>
        </PageMasthead>

        {isError && !data && (
          <ErrorState
            title="Purse board didn't load"
            detail="The side-cash totals need a connection to the tournament board."
            onRetry={() => void refetch()}
            busy={isFetching}
          />
        )}

        {bets.length > 0 && (
          <section>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="t-section text-foreground">Side pots</h2>
              <span className="t-micro text-muted-foreground">
                {claimed.length}/{bets.length}
              </span>
            </div>
            <ul className="divide-y divide-border">
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
          <section>
            <h2 className="t-section text-foreground">Won so far</h2>
            <ul className="divide-y divide-border">
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

        <section className="stack-tight">
          <h2 className="t-section text-foreground">How the Cup is won</h2>
          <WeekendDayStories />
          <p className="t-micro px-1 text-muted-foreground">
            13.5 wins the Cup. Halves are 0.5 each. If 13–13, captains each pick a scramble partner
            for one hole until it’s decided.
          </p>
        </section>

        <section className="stack-tight">
          <h2 className="t-section text-foreground">Where the $150 goes</h2>
          <MoneySplit />
          <p className="t-body px-1 text-muted-foreground">
            Six closest-to-the-pin and two long drives pay $100. Friday: CTP 3 and 18, long drive 13
            in the fairway. Saturday and Sunday holes TBD. Captains do not pick them.
          </p>
          <p className="t-micro px-1 text-muted-foreground">
            Official scoring stays captain-controlled.
          </p>
        </section>
      </div>
    </Shell>
  );
}
