import type { ReactNode } from "react";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { WeekendDayStories } from "@/components/tin-cup/DayStory";
import { EVENT, PLAYOFF_RULE } from "@/lib/tin-cup";

/** Non-invasive format / money explainer — chip opens bottom sheet. */
export function FormatSheet({
  triggerClassName = "",
  children,
}: {
  triggerClassName?: string;
  children?: ReactNode;
}) {
  return (
    <Drawer>
      <DrawerTrigger
        className={`press min-h-11 ${triggerClassName || "t-micro inline-flex items-center gap-1.5 text-muted-foreground"}`}
      >
        {children ?? "How formats work"}
      </DrawerTrigger>
      <DrawerContent className="border-border bg-card">
        <DrawerHeader className="pb-2 text-left">
          <DrawerTitle className="t-title text-foreground">Weekend formats</DrawerTitle>
          <p className="t-micro text-muted-foreground">
            Fri 8 + Sat 6 + Sun 12 = {EVENT.totalPoints}. {EVENT.pointsToWin} wins the Cup.
          </p>
        </DrawerHeader>

        <div className="max-h-[50svh] space-y-2.5 overflow-y-auto px-4 py-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <WeekendDayStories />
          <p className="t-micro text-muted-foreground">
            Halves are 0.5. Tie: {PLAYOFF_RULE}, one hole until decided.
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
