import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

import { Countdown } from "@/components/tin-cup/Countdown";
import { useAuth } from "@/hooks/useAuth";
import { isIntroPlaying, readSeat, subscribeIntroPlaying, writeSeat } from "@/lib/seat";

/**
 * Inviting first-run sheet: field vs looking.
 * Sits over the live app — never a lock. Hidden during the intro film.
 */
export function SeatWelcome() {
  const { user, loading } = useAuth();
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

  if (!ready || loading || filmOn || user || seat) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[oklch(0.08_0.02_165/55%)] p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:items-center">
      <div className="panel w-full max-w-md space-y-4 p-5 shadow-[0_24px_80px_-24px_oklch(0_0_0/70%)]">
        <div>
          <p className="t-eyebrow">Tin Cup 2026</p>
          <h2 className="t-display mt-2 text-foreground">Welcome to the weekend</h2>
          <p className="t-body mt-2 text-muted-foreground">
            Same app either way. Sign in if you&apos;re in the field — or just look around.
          </p>
          <div className="mt-3">
            <Countdown compact />
          </div>
        </div>
        <Link to="/profile" className="press btn-gold t-body flex w-full justify-center">
          I&apos;m in the field
        </Link>
        <button
          type="button"
          onClick={() => {
            writeSeat("guest");
            setSeat("guest");
          }}
          className="press btn-quiet t-body w-full"
        >
          Just looking
        </button>
      </div>
    </div>
  );
}
