import type { ReactNode } from "react";

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
        <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <p className="t-title text-foreground">{title}</p>
      {detail ? <p className="t-micro mt-1.5 max-w-xs text-muted-foreground">{detail}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
