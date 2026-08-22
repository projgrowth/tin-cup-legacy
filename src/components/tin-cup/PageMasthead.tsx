import type { ReactNode } from "react";

export function PageMasthead({
  image,
  kicker,
  title,
  meta,
  children,
  embedded = false,
  size = "page",
}: {
  image?: string;
  kicker?: string;
  title: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  embedded?: boolean;
  /** `display` is Home only. Other pages use a quiet title line. */
  size?: "display" | "page";
}) {
  const photo = Boolean(image);
  return (
    <section
      className={
        embedded
          ? "relative overflow-hidden"
          : photo
            ? "relative overflow-hidden rounded-xl border border-border bg-[var(--turf-rough)]"
            : "relative"
      }
    >
      {photo ? (
        <>
          <img
            src={image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-[center_42%] opacity-[0.78]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#06120f] via-[#06120f]/70 to-transparent" />
        </>
      ) : null}
      <div
        className={
          photo
            ? "relative min-h-[6.25rem] p-3.5 sm:min-h-[9.5rem] sm:p-6"
            : "px-0.5 py-1"
        }
      >
        {kicker ? (
          <p className={`t-micro ${photo ? "text-white" : "text-muted-foreground"}`}>{kicker}</p>
        ) : null}
        <h1
          className={`${size === "display" ? "t-display" : "t-title"} ${kicker ? "mt-1.5" : ""} ${
            photo ? "text-white" : "text-foreground"
          }`}
        >
          {title}
        </h1>
        {meta ? (
          <div className={`t-body mt-1 max-w-xl ${photo ? "text-white/78" : "text-muted-foreground"}`}>
            {meta}
          </div>
        ) : null}
        {children}
      </div>
    </section>
  );
}
