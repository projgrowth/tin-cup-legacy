export type RehearsalStep = "baseline" | "offline-a" | "online-b" | "conflict" | "resolve" | "undo";
export type RehearsalState = {
  revision: number;
  serverResult: string;
  phoneAResult: string;
  phoneBResult: string;
  queuedA: boolean;
  conflict: boolean;
  completed: RehearsalStep[];
};

export const REHEARSAL_KEY = "tc-scoring-rehearsal-v2";

export function initialRehearsal(): RehearsalState {
  return {
    revision: 0,
    serverResult: "pending",
    phoneAResult: "pending",
    phoneBResult: "pending",
    queuedA: false,
    conflict: false,
    completed: [],
  };
}

export function advanceRehearsal(state: RehearsalState, step: RehearsalStep): RehearsalState {
  if (step === "baseline") return { ...initialRehearsal(), completed: ["baseline"] };
  if (step === "offline-a")
    return {
      ...state,
      phoneAResult: "strong-mental",
      queuedA: true,
      completed: [...state.completed, step],
    };
  if (step === "online-b")
    return {
      ...state,
      serverResult: "halved",
      phoneBResult: "halved",
      revision: state.revision + 1,
      completed: [...state.completed, step],
    };
  if (step === "conflict")
    return {
      ...state,
      conflict: state.queuedA && state.revision > 0,
      queuedA: false,
      completed: [...state.completed, step],
    };
  if (step === "resolve")
    return {
      ...state,
      conflict: false,
      phoneAResult: state.serverResult,
      completed: [...state.completed, step],
    };
  return {
    ...state,
    serverResult: "pending",
    phoneAResult: "pending",
    phoneBResult: "pending",
    revision: state.revision + 1,
    completed: [...state.completed, "undo"],
  };
}

export function rehearsalPassed(state: RehearsalState): boolean {
  return (
    ["baseline", "offline-a", "online-b", "conflict", "resolve", "undo"].every((step) =>
      state.completed.includes(step as RehearsalStep),
    ) &&
    !state.conflict &&
    state.serverResult === "pending"
  );
}
