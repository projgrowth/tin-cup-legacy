import type { ReactNode } from "react";

export function PageMasthead({
  kicker,
  title,
  meta,
  children,
  embedded = false,
}: {
  kicker?: string;
  title: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  embedded?: boolean;
}) {
  return (
    <section className={embedded ? "" : "relative"}>
      <div className="px-0.5 pb-2 pt-3">
        {kicker ? <p className="t-micro">{kicker}</p> : null}
        <h1 className={`t-display text-foreground ${kicker ? "mt-1.5" : ""}`}>{title}</h1>
        {meta ? <div className="t-micro mt-1 max-w-xl">{meta}</div> : null}
        {children}
      </div>
    </section>
  );
}
