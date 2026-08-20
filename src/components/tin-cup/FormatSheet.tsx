import { useState } from "react";
import { CircleHelp } from "lucide-react";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { FORMAT_RULES, MONEY_RULES, EVENT } from "@/lib/tin-cup";

const DAYS = [
  {
    key: "fri",
    title: "Friday · South",
    blurb: "Scramble + Modified Alternate Shot · 8 pts (4 / 4)",
    detail:
      "Same foursomes for both formats. Scramble is team ball; modified alt shot trades shots. Captains set pairings only — not CTP holes.",
  },
  {
    key: "sat",
    title: "Saturday · Copperhead",
    blurb: "Modified Stableford full team · 6 pts (2 / 2 / 2)",
    detail:
      "Full-team Stableford match play. Points on the board per session structure. Pairings announced the night before.",
  },
  {
    key: "sun",
    title: "Sunday · Island",
    blurb: "Shamble + Singles · 12 pts (4 / 8)",
    detail:
      "Shamble in the morning block, singles to close. Most points of the weekend. Stick around for awards after.",
  },
] as const;

/** Non-invasive format / money explainer — chip opens bottom sheet. */
export function FormatSheet({ triggerClassName = "" }: { triggerClassName?: string }) {
  const [tab, setTab] = useState<"cup" | "days" | "money">("cup");

  return (
    <Drawer>
      <DrawerTrigger
        className={`press t-micro inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-3.5 text-muted-foreground ${triggerClassName}`}
      >
        <CircleHelp className="size-3.5" strokeWidth={1.7} />
        How formats work
      </DrawerTrigger>
      <DrawerContent className="border-border bg-card/95 backdrop-blur-xl">
        <DrawerHeader className="pb-2 text-left">
          <DrawerTitle className="t-title text-foreground">Weekend formats</DrawerTitle>
          <p className="t-micro text-muted-foreground">
            {EVENT.totalPoints} pts total · {EVENT.pointsToWin} wins the Cup
          </p>
        </DrawerHeader>

        <div className="flex gap-1 border-b border-border px-4 pb-0">
          {(
            [
              ["cup", "Cup"],
              ["days", "Days"],
              ["money", "Money"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`press t-micro min-h-11 flex-1 rounded-t-lg px-2 font-semibold ${
                tab === key ? "bg-secondary text-foreground" : "text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="max-h-[50svh] overflow-y-auto px-4 py-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          {tab === "cup" && (
            <ul className="space-y-3">
              {FORMAT_RULES.map((rule) => (
                <li key={rule} className="t-body border-l-2 border-border pl-3 text-foreground/90">
                  {rule}
                </li>
              ))}
            </ul>
          )}
          {tab === "days" && (
            <ul className="space-y-4">
              {DAYS.map((d) => (
                <li key={d.key} className="surface-inset p-3.5">
                  <p className="t-title text-foreground">{d.title}</p>
                  <p className="t-micro mt-1 font-medium text-muted-foreground">{d.blurb}</p>
                  <p className="t-micro mt-2 text-muted-foreground">{d.detail}</p>
                </li>
              ))}
            </ul>
          )}
          {tab === "money" && (
            <ul className="space-y-3">
              {MONEY_RULES.map((rule) => (
                <li key={rule} className="t-body border-l-2 border-border pl-3 text-foreground/90">
                  {rule}
                </li>
              ))}
            </ul>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
