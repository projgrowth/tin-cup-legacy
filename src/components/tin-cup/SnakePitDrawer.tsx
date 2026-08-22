import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { SNAKE_PIT } from "@/lib/tin-cup";

export function SnakePitDrawer() {
  return (
    <Drawer>
      <DrawerTrigger className="press btn-quiet t-micro min-h-11">
        Snake Pit
      </DrawerTrigger>
      <DrawerContent className="border-border bg-card/95 backdrop-blur-xl">
        <DrawerHeader>
          <DrawerTitle className="t-display text-foreground">The Snake Pit</DrawerTitle>
          <p className="t-micro">
            Copperhead's closing stretch decides the Saturday round — and the Snake Pit Trophy.
          </p>
        </DrawerHeader>
        <div className="px-5 pb-8">
          {SNAKE_PIT.map((hole) => (
            <article key={hole.hole} className="hairline pt-5 first:border-t-0 [&+article]:mt-5">
              <div className="flex items-baseline gap-3">
                <span className="t-display tabular-nums text-foreground">{hole.hole}</span>
                <div className="min-w-0">
                  <h3 className="t-title truncate text-foreground">{hole.name}</h3>
                  <p className="t-micro text-copper">{hole.yards}</p>
                </div>
              </div>
              <p className="t-body mt-3">{hole.tip}</p>
            </article>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
