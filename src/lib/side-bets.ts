/** Side-bet kind helpers. DB seeds use `ctp` / `ld`; some older UI code used `long-drive`. */

export function isCtp(kind: string): boolean {
  return kind === "ctp";
}

export function isLongDrive(kind: string): boolean {
  return kind === "ld" || kind === "long-drive";
}

export function sideBetKindLabel(kind: string): string {
  if (isLongDrive(kind)) return "Long Drive";
  if (isCtp(kind)) return "Closest to the Pin";
  return kind;
}

/** Short badge label for roster / player cards. */
export function sideBetShortLabel(kind: string): string {
  if (isLongDrive(kind)) return "Long Drive";
  if (isCtp(kind)) return "CTP";
  return kind;
}

/** Normalize mixed kind strings to the DB canonical form. */
export function normalizeSideBetKind(kind: string): "ctp" | "ld" | string {
  if (isCtp(kind)) return "ctp";
  if (isLongDrive(kind)) return "ld";
  return kind;
}
