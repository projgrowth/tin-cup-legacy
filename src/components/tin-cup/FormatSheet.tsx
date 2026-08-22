import { useState } from "react";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { MoneySplit, WeekendDayStories } from "@/components/tin-cup/DayStory";
import { EVENT } from "@/lib/tin-cup";

/** Non-invasive format / money explainer — chip opens bottom sheet. */
export function FormatSheet({ triggerClassName = "" }: { triggerClassName?: string }) {
  const [tab, setTab] = useState<"days" | "money">("days");

  return (
    <Drawer>
      <DrawerTrigger
        className={`press min-h-11 ${triggerClassName || "t-micro inline-flex items-center gap-1.5 text-muted-foreground"}`}
      >
        How formats work
      </DrawerTrigger>
      <DrawerContent className="border-border bg-card/95 backdrop-blur-xl">
        <DrawerHeader className="pb-2 text-left">
          <DrawerTitle className="t-title text-foreground">Weekend formats</DrawerTitle>
          <p className="t-micro text-muted-foreground">
            {EVENT.totalPoints} pts · {EVENT.pointsToWin} wins the Cup
          </p>
        </DrawerHeader>

        <div className="flex gap-1 border-b border-border px-4 pb-0">
          {(
            [
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

        <div className="max-h-[50svh] space-y-2.5 overflow-y-auto px-4 py-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          {tab === "days" && (
            <>
              <WeekendDayStories />
              <p className="t-micro text-muted-foreground">
                Halves are 0.5. Tie: captains each pick a scramble partner, one hole until decided.
              </p>
            </>
          )}
          {tab === "money" && (
            <>
              <MoneySplit />
              <p className="t-body text-muted-foreground">
                CTP 3 and 18, long drive 13 on Friday. Later holes TBD. Winning side takes $200 a
                player.
              </p>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
