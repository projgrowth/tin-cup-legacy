import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";

import { Countdown } from "@/components/tin-cup/Countdown";
import { useAuth } from "@/hooks/useAuth";
import { isAuthPath, isIntroPlaying, readSeat, subscribeIntroPlaying, writeSeat } from "@/lib/seat";

/**
 * Inviting first-run sheet. Never covers the sign-in page.
 */
export function SeatWelcome() {
  const { user, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [seat, setSeat] = useState<ReturnType<typeof readSeat>>(null);
  const [ready, setReady] = useState(false);
  const [filmOn, setFilmOn] = useState(false);

  useEffect(() => {
    setSeat(readSeat());
    setFilmOn(isIntroPlaying());
    setReady(true);
    return subscribeIntroPlaying(() => setFilmOn(isIntroPlaying()));
  }, []);

  useEffect(() => {
    if (!user) return;
    writeSeat("account");
    setSeat("account");
  }, [user]);

  // Home is the cover. Don't stack a welcome sheet over it after the film.
  if (
    !ready ||
    loading ||
    filmOn ||
    user ||
    seat ||
    pathname === "/" ||
    isAuthPath(pathname)
  )
    return null;

  function chooseField() {
    writeSeat("account");
    setSeat("account");
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[oklch(0.08_0.02_165/55%)] p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:items-center">
      <div className="surface w-full max-w-md space-y-4 p-5 shadow-[0_24px_80px_-24px_oklch(0_0_0/70%)]">
        <div>
          <p className="t-eyebrow">Tin Cup 2026</p>
          <h2 className="t-title mt-2 text-foreground">Welcome to the weekend</h2>
          <p className="t-body mt-2 text-muted-foreground">
            Sign in if you&apos;re playing — or just look around.
          </p>
          <div className="mt-3">
            <Countdown compact />
          </div>
        </div>
        <Link
          to="/profile"
          onClick={chooseField}
          className="press btn-primary t-body flex min-h-12 w-full items-center justify-center"
        >
          I&apos;m in the field
        </Link>
        <button
          type="button"
          onClick={() => {
            writeSeat("guest");
            setSeat("guest");
          }}
          className="press btn-quiet t-body min-h-12 w-full"
        >
          Just looking
        </button>
      </div>
    </div>
  );
}
