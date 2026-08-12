import { MISS_SHAPES, TEE_CLUBS } from "@/hooks/useHolePlanEditor";

/**
 * Floating Grint-style tool strip on the map — club + shape without leaving canvas.
 */
export function MapQuickStrip({
  club,
  green,
  onClub,
  onGreen,
}: {
  club: string;
  green: string;
  onClub: (v: string) => void;
  onGreen: (v: string) => void;
}) {
  return (
    <div className="pointer-events-auto absolute bottom-[4.75rem] left-1/2 z-20 w-[min(100%-1.5rem,22rem)] -translate-x-1/2">
      <div className="hud-pod space-y-2 px-2.5 py-2">
        <div className="no-scrollbar flex gap-1 overflow-x-auto">
          {TEE_CLUBS.map((c) => {
            const on = club === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => onClub(on ? "" : c)}
                className={`press shrink-0 rounded-full border px-3 py-2 text-xs font-bold ${
                  on
                    ? "border-gold/45 bg-gold/20 text-gold-light"
                    : "border-white/10 bg-black/25 text-white/70"
                }`}
              >
                {c === "Driver" ? "Dr" : c}
              </button>
            );
          })}
        </div>
        <div className="flex gap-1">
          {MISS_SHAPES.map((m) => {
            const on = green === m.value;
            return (
              <button
                key={m.label}
                type="button"
                onClick={() => onGreen(on ? "" : m.value)}
                className={`press min-h-10 flex-1 rounded-full border text-sm font-bold ${
                  on
                    ? "border-gold/45 bg-gold/20 text-gold-light"
                    : "border-white/10 bg-black/25 text-white/70"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
