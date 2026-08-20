import type { ReactNode } from "react";

export function PageMasthead({
  image,
  kicker,
  title,
  meta,
  children,
  embedded = false,
}: {
  image?: string;
  kicker: string;
  title: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  embedded?: boolean;
}) {
  const photo = Boolean(image);
  return (
    <section
      className={
        embedded
          ? "relative overflow-hidden"
          : photo
            ? "relative overflow-hidden rounded-xl border border-border bg-emerald-deep"
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
        <p className={`event-kicker ${photo ? "text-gold-light" : ""}`}>{kicker}</p>
        <h1 className={`t-display mt-2 ${photo ? "text-white" : "text-foreground"}`}>{title}</h1>
        {meta ? (
          <div className={`t-body mt-2 max-w-xl ${photo ? "text-white/78" : "text-muted-foreground"}`}>
            {meta}
          </div>
        ) : null}
        {children}
      </div>
    </section>
  );
}
