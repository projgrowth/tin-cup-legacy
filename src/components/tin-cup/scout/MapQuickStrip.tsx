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
    <div className="pointer-events-auto absolute bottom-[5.25rem] left-1/2 z-20 w-[min(100%-1.25rem,22rem)] -translate-x-1/2 sm:bottom-[5.5rem]">
      <div className="hud-pod space-y-1.5 px-2 py-2 backdrop-blur-xl">
        <div className="no-scrollbar flex gap-1 overflow-x-auto px-0.5">
          {TEE_CLUBS.map((c) => {
            const on = club === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => onClub(on ? "" : c)}
                className={`press shrink-0 rounded-full border px-3 py-2 text-xs font-bold transition-colors ${
                  on
                    ? "border-gold/45 bg-gold/20 text-gold-light"
                    : "border-white/10 bg-black/20 text-white/65"
                }`}
              >
                {c === "Driver" ? "Dr" : c}
              </button>
            );
          })}
        </div>
        <div className="flex gap-1 px-0.5">
          {MISS_SHAPES.map((m) => {
            const on = green === m.value;
            return (
              <button
                key={m.label}
                type="button"
                onClick={() => onGreen(on ? "" : m.value)}
                className={`press min-h-10 flex-1 rounded-full border text-sm font-bold transition-colors ${
                  on
                    ? "border-gold/45 bg-gold/20 text-gold-light"
                    : "border-white/10 bg-black/20 text-white/65"
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
