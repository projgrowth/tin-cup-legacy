import { createFileRoute } from "@tanstack/react-router";

import { ErrorState, Shell } from "@/components/tin-cup/Shell";
import { useTournament } from "@/hooks/useTournament";
import { isCtp, isLongDrive } from "@/lib/side-bets";
import { sideCash, sideCashByPlayer, settlement, formatPayout } from "@/lib/purse";
import {
  BUY_IN,
  EXPECTED_PLAYER_COUNT,
  FEE_BREAKDOWN,
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
        {isError && !data && (
          <ErrorState
            title="Purse board didn't load"
            detail="The side-cash totals need a connection to the tournament board."
            onRetry={() => void refetch()}
            busy={isFetching}
          />
        )}

        <section className="surface overflow-hidden">
          <div className="card-row py-5">
            <p className="t-eyebrow">Buy-in</p>
            <p className="t-hero mt-1 text-foreground">${BUY_IN}</p>
            <p className="t-micro mt-2">
              Venmo {TOURNAMENT_BANK}
              <span className="mt-1 block">
                Team win ${cup.winnerPayout} · side cash ${cash.pool}
                {hasTbdPayouts ? " · holes TBD" : ""}
              </span>
            </p>
            <a
              href={venmoUrl}
              target="_blank"
              rel="noreferrer"
              className="press btn-primary t-body mt-4 flex min-h-12 w-full items-center justify-center no-underline"
            >
              Pay ${BUY_IN}
            </a>
          </div>
          <div className="grid grid-cols-2 border-t border-border">
            {FEE_BREAKDOWN.map((row, index) => (
              <article
                key={row.label}
                className={`card-row py-4 ${index === 1 ? "border-l border-border" : ""}`}
              >
                <p className="t-micro">{row.label}</p>
                <p className="t-title mt-1 tabular-nums text-foreground">{row.value}</p>
                <p className="t-micro mt-1.5">{row.note}</p>
              </article>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="t-eyebrow">Side pots</h2>
            <span className="t-micro">
              {claimed.length}/{pots.length}
            </span>
          </div>
          <ul className="grid grid-cols-2 gap-2">
            {pots.map((bet) => (
              <li key={bet.id} className="surface px-3 py-3.5">
                <span className="flex items-center justify-between gap-2">
                  <span className="contest-mark">
                    {isLongDrive(bet.kind) ? "LD" : isCtp(bet.kind) ? "CTP" : bet.kind}
                  </span>
                  <span className="t-numeral text-[1.05rem] text-foreground">
                    {formatPayout(bet.amount)}
                  </span>
                </span>
                <p className="t-body mt-2 font-semibold leading-snug text-foreground">
                  {bet.label}
                </p>
                <p className="t-micro mt-1">
                  {bet.player_name ?? "Open"} · {potStatus(bet.hole)}
                </p>
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
