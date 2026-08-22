import { Link } from "@tanstack/react-router";

import { Chip } from "@/components/tin-cup/ui/primitives";
import { MISS_SHAPES, TEE_CLUBS, type useHolePlanEditor } from "@/hooks/useHolePlanEditor";

/** Club / miss / target / line — shared by the round sheet and the hole map dock. */
export function HolePlanFields({
  par: _par,
  mode,
  loading,
  editor,
}: {
  par: number;
  mode: "cloud" | "guest";
  loading?: boolean;
  editor: ReturnType<typeof useHolePlanEditor>;
}) {
  const { club, line, green, notes, setClub, setLine, setGreen, setNotes } = editor;

  return (
    <div className="space-y-4">
      <div>
        <p className="t-micro mb-2 text-muted-foreground">Club</p>
        <div className="flex flex-wrap gap-1.5">
          {TEE_CLUBS.map((c) => (
            <Chip
              key={c}
              on={club === c}
              onClick={() => setClub(club === c ? "" : c)}
              className="chip-sm"
            >
              {c === "Driver" ? "Dr" : c}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <p className="t-micro mb-2 text-muted-foreground">Miss</p>
        <div className="flex flex-wrap gap-1.5">
          {MISS_SHAPES.map((m) => (
            <Chip
              key={m.label}
              on={green === m.value}
              onClick={() => setGreen(green === m.value ? "" : m.value)}
              className="chip-sm"
            >
              {m.label}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <p className="t-micro mb-2 text-muted-foreground">Line</p>
        <input
          value={line}
          onChange={(e) => setLine(e.target.value)}
          placeholder="left edge of right bunker"
          maxLength={140}
          className="control w-full text-base"
        />
      </div>

      <details className="group">
        <summary className="press cursor-pointer list-none t-micro text-muted-foreground [&::-webkit-details-marker]:hidden">
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
        <p className="t-micro">
          On this device until you{" "}
          <Link to="/profile" className="font-semibold text-foreground">
            sign in
          </Link>
          .
        </p>
      )}
      {loading && mode === "cloud" && <p className="t-micro">Loading…</p>}
    </div>
  );
}
