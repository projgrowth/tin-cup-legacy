import { createFileRoute } from "@tanstack/react-router";

import { PageMasthead } from "@/components/tin-cup/PageMasthead";
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
  venmoUrl,
} from "@/lib/tin-cup";
import { displaySidePots, potStatus } from "@/lib/contest-holes";

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
  const pots = displaySidePots(bets);
  const claimed = pots.filter((b) => b.player_name);
  const fieldSize = players.length || EXPECTED_PLAYER_COUNT;
  const cash = sideCash(bets, fieldSize);
  const hasTbdPayouts = !SIDE_BET_PAYOUTS_CONFIRMED || cash.unconfigured > 0;
  const perPlayer = sideCashByPlayer(bets);
  const cup = settlement(data?.matches ?? []);

  return (
    <Shell variant="content">
      <div className="stack-page pb-10">
        <PageMasthead
          title="Purse"
          meta={
            <>
              Venmo {TOURNAMENT_BANK}
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
            className="press chip chip-on mt-4 inline-flex min-h-11 no-underline"
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

        <section className="stack-tight">
          <h2 className="t-eyebrow">Where the $150 goes</h2>
          <MoneySplit />
        </section>

        <section>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="t-eyebrow">Side pots</h2>
            <span className="t-micro text-muted-foreground">
              {claimed.length}/{pots.length}
            </span>
          </div>
          <ul className="surface divide-y divide-border overflow-hidden">
            {pots.map((bet) => (
              <li key={bet.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                <span className="min-w-0">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="contest-mark">
                      {isLongDrive(bet.kind) ? "LD" : isCtp(bet.kind) ? "CTP" : bet.kind}
                    </span>
                    <span className="t-body min-w-0 truncate font-medium text-foreground">
                      {bet.label}
                    </span>
                  </span>
                  <span className="t-micro text-muted-foreground">
                    {bet.player_name ?? "Open"} · {potStatus(bet.hole)}
                  </span>
                </span>
                <span className="t-numeral shrink-0 text-foreground">
                  {formatPayout(bet.amount)}
                </span>
              </li>
            ))}
          </ul>
        </section>

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
