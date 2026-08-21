import type { ReactNode } from "react";

/** Standard content panel. */
export function Panel({
  children,
  className = "",
  raised = false,
}: {
  children: ReactNode;
  className?: string;
  raised?: boolean;
}) {
  return (
    <section className={`${raised ? "surface-raised" : "surface"} ${className}`.trim()}>
      {children}
    </section>
  );
}

/** Segmented control — courses, filters. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      className="grid gap-1 rounded-2xl border border-border/60 bg-secondary/20 p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(opt.value)}
            className={`press min-h-11 rounded-xl px-2 text-center text-sm font-semibold tracking-tight transition-colors ${
              on
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/80"
                : "text-muted-foreground"
            }`}
          >
            {opt.label}
            {opt.hint ? (
              <span className="mt-0.5 block t-micro text-gold-light">
                {opt.hint}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Selectable chip. */
export function Chip({
  children,
  on,
  onClick,
  className = "",
}: {
  children: ReactNode;
  on?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`press chip ${on ? "chip-on" : ""} ${className}`.trim()}
    >
      {children}
    </button>
  );
}

/** Quiet empty state — use inside a page or panel. */
export function EmptyState({
  title,
  detail,
  action,
  icon,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="surface flex flex-col items-center px-5 py-8 text-center">
      {icon ? (
        <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-white/5 text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <p className="t-title text-foreground">{title}</p>
      {detail ? <p className="t-micro mt-1.5 max-w-xs text-muted-foreground">{detail}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
