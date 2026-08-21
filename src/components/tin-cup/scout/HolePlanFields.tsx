import { Link } from "@tanstack/react-router";
import { Link as LinkIcon } from "lucide-react";

import { Chip } from "@/components/tin-cup/ui/primitives";
import { MISS_SHAPES, TEE_CLUBS, type useHolePlanEditor } from "@/hooks/useHolePlanEditor";

/** Club / miss / target / line — shared by the round sheet and the hole map dock. */
export function HolePlanFields({
  par,
  mode,
  loading,
  editor,
}: {
  par: number;
  mode: "cloud" | "guest";
  loading?: boolean;
  editor: ReturnType<typeof useHolePlanEditor>;
}) {
  const { club, line, green, score, notes, setClub, setLine, setGreen, setScore, setNotes } =
    editor;

  return (
    <div className="space-y-4">
      <div>
        <p className="t-eyebrow mb-2 text-muted-foreground">Club</p>
        <div className="flex flex-wrap gap-1.5">
          {TEE_CLUBS.map((c) => (
            <Chip key={c} on={club === c} onClick={() => setClub(club === c ? "" : c)}>
              {c === "Driver" ? "Dr" : c}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <p className="t-eyebrow mb-2 text-muted-foreground">Miss</p>
        <div className="flex flex-wrap gap-1.5">
          {MISS_SHAPES.map((m) => (
            <Chip
              key={m.label}
              on={green === m.value}
              onClick={() => setGreen(green === m.value ? "" : m.value)}
            >
              {m.label}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <p className="t-eyebrow mb-2 text-muted-foreground">Target</p>
        <div className="flex gap-1.5">
          {[par - 1, par, par + 1]
            .filter((n) => n > 0)
            .map((n) => (
              <Chip
                key={n}
                on={score === String(n)}
                onClick={() => setScore(score === String(n) ? "" : String(n))}
                className="min-w-[3rem]"
              >
                {n}
              </Chip>
            ))}
        </div>
      </div>

      <div>
        <p className="t-eyebrow mb-2 text-muted-foreground">Line</p>
        <input
          value={line}
          onChange={(e) => setLine(e.target.value)}
          placeholder="left edge of right bunker"
          maxLength={140}
          className="control w-full text-base"
        />
      </div>

      <details className="group">
        <summary className="press cursor-pointer list-none t-eyebrow text-muted-foreground [&::-webkit-details-marker]:hidden">
          More notes
        </summary>
        <div className="mt-2">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={600}
            placeholder="Wind, bail-out…"
            className="control w-full resize-none text-base"
          />
        </div>
      </details>

      {mode === "guest" && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <LinkIcon className="mt-0.5 size-3.5 shrink-0" />
          <span>
            On this device until you{" "}
            <Link to="/profile" className="font-semibold text-gold-light underline">
              sign in
            </Link>
          </span>
        </p>
      )}
      {loading && mode === "cloud" && <p className="text-xs text-muted-foreground">Loading…</p>}
    </div>
  );
}
