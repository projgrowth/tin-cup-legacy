import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { SNAKE_PIT } from "@/lib/tin-cup";

export function SnakePitDrawer({ triggerClassName = "" }: { triggerClassName?: string }) {
  const stretch = SNAKE_PIT.map((hole) => `${hole.hole} ${hole.name}`).join(", ");
  return (
    <Drawer>
      <DrawerTrigger className={`press ${triggerClassName || "t-micro"}`}>
        Snake Pit
      </DrawerTrigger>
      <DrawerContent className="border-border bg-card">
        <DrawerHeader>
          <DrawerTitle className="t-title text-foreground">The Snake Pit</DrawerTitle>
        </DrawerHeader>
        <div className="px-5 pb-8">
          <p className="t-body text-foreground">
            Copperhead&apos;s last three — {stretch} — decide Saturday and the Snake Pit Trophy: best
            combined score on 16, 17 and 18. Fade it into Moccasin&apos;s tight fairway, take the
            middle of The Rattler, and enough club up The Copperhead.
          </p>
          <p className="t-micro mt-3">
            {SNAKE_PIT.map((hole) => `${hole.hole} · ${hole.yards}`).join(" · ")}
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
