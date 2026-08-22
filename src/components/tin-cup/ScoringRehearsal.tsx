import { useState } from "react";
import { CheckCircle2, Play, RotateCcw, Smartphone } from "lucide-react";

import {
  advanceRehearsal,
  initialRehearsal,
  rehearsalPassed,
  REHEARSAL_KEY,
  type RehearsalState,
  type RehearsalStep,
} from "@/lib/scoring-rehearsal";

const STEPS: Array<{ id: RehearsalStep; label: string; detail: string }> = [
  {
    id: "baseline",
    label: "Load both phones",
    detail: "Both begin at revision 0 with no posted result.",
  },
  {
    id: "offline-a",
    label: "Phone A scores offline",
    detail: "Strong Mental is held in the local queue.",
  },
  {
    id: "online-b",
    label: "Phone B posts online",
    detail: "The server advances while Phone A is stale.",
  },
  {
    id: "conflict",
    label: "Phone A reconnects",
    detail: "The stale edit is preserved as a visible conflict.",
  },
  {
    id: "resolve",
    label: "Resolve to server truth",
    detail: "Both devices agree without silently losing the edit.",
  },
  { id: "undo", label: "Post and undo safely", detail: "The rehearsal returns to Not played." },
];

function load(): RehearsalState {
  try {
    return JSON.parse(localStorage.getItem(REHEARSAL_KEY) ?? "null") || initialRehearsal();
  } catch {
    return initialRehearsal();
  }
}

export function ScoringRehearsal() {
  const [state, setState] = useState<RehearsalState>(load);
  const next = STEPS.find((step) => !state.completed.includes(step.id));
  const passed = rehearsalPassed(state);
  function run(step: RehearsalStep) {
    setState((current) => {
      const updated = advanceRehearsal(current, step);
      localStorage.setItem(REHEARSAL_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("tin-cup-rehearsal"));
      return updated;
    });
  }
  return (
    <section className="surface overflow-hidden" aria-labelledby="rehearsal-title">
      <div className="border-b border-border p-4">
        <p className="t-micro">Safe simulation</p>
        <h2 id="rehearsal-title" className="t-section mt-1 text-foreground">
          Two-phone scoring rehearsal
        </h2>
        <p className="t-micro mt-1 text-muted-foreground">
          Runs entirely on this device. Tournament records never change.
        </p>
      </div>
      <ol className="divide-y divide-border/70 px-4">
        {STEPS.map((step) => {
          const done = state.completed.includes(step.id);
          return (
            <li key={step.id} className="flex gap-3 py-3">
              <span
                className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${done ? "bg-hunter/15 text-hunter" : "bg-secondary text-muted-foreground"}`}
              >
                {done ? <CheckCircle2 className="size-4" /> : <Smartphone className="size-3.5" />}
              </span>
              <span>
                <span className="t-body block font-medium text-foreground">{step.label}</span>
                <span className="t-micro mt-0.5 block text-muted-foreground">{step.detail}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <div className="flex gap-2 border-t border-border p-4">
        {next ? (
          <button
            type="button"
            onClick={() => run(next.id)}
            className="press btn-primary t-body flex min-h-11 flex-1 items-center justify-center gap-2"
          >
            <Play className="size-4" />
            Run next step
          </button>
        ) : (
          <p
            role="status"
            className="t-body flex min-h-11 flex-1 items-center text-[var(--status-live)]"
          >
            Rehearsal passed · queue clean
          </p>
        )}
        <button
          type="button"
          aria-label="Reset scoring rehearsal"
          onClick={() => {
            const fresh = initialRehearsal();
            localStorage.removeItem(REHEARSAL_KEY);
            window.dispatchEvent(new Event("tin-cup-rehearsal"));
            setState(fresh);
          }}
          className="press btn-quiet flex size-11 items-center justify-center"
        >
          <RotateCcw className="size-4" />
        </button>
      </div>
      {state.conflict && (
        <p
          role="alert"
          className="mx-4 mb-4 rounded-xl border border-copper/35 bg-copper/10 px-3 py-2.5 t-micro text-foreground"
        >
          Conflict detected correctly. The stale result remains visible until resolved.
        </p>
      )}
      {passed && <span className="sr-only">The complete scoring rehearsal passed.</span>}
    </section>
  );
}
