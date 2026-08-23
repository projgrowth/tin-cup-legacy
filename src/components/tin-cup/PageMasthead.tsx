import type { ReactNode } from "react";

export function PageMasthead({
  kicker,
  title,
  meta,
  children,
  embedded = false,
  align = "start",
}: {
  kicker?: string;
  title: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  embedded?: boolean;
  align?: "start" | "center";
}) {
  const centered = align === "center";
  return (
    <section className={embedded ? "" : "relative"}>
      <div className={`px-0.5 ${centered ? "pb-1 pt-1 text-center" : "pb-2 pt-3"}`}>
        {kicker ? <p className="t-micro">{kicker}</p> : null}
        <h1 className={`t-title text-foreground ${kicker ? "mt-1.5" : ""}`}>{title}</h1>
        {meta ? (
          <div className={`t-micro mt-1 ${centered ? "mx-auto" : ""} max-w-xl`}>{meta}</div>
        ) : null}
        {children}
      </div>
    </section>
  );
}
