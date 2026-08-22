import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";

import type { WeekendContext } from "@/lib/weekend-context";

function ActionLink({ context }: { context: WeekendContext }) {
  const action = context.nextAction;
  const className = "press btn-primary t-body flex min-h-11 w-full items-center justify-center sm:min-w-48";
  if (action.kind === "loading-identity") {
    return <p className="t-micro text-muted-foreground">{action.label}</p>;
  }
  if (action.kind === "sign-in" || action.kind === "claim-player") {
    return (
      <Link to="/profile" className={className}>
        {action.label}
      </Link>
    );
  }
  if (action.kind === "finish-plan") {
    return (
      <Link to="/scout" className={className}>
        {action.label}
      </Link>
    );
  }
  if (action.kind === "view-pairing") {
    return (
      <Link to="/schedule" className={className}>
        {action.label}
      </Link>
    );
  }
  if (action.kind === "view-recap") {
    return (
      <Link to="/" search={{ story: "recap" }} className={className}>
        {action.label}
      </Link>
    );
  }
  return (
    <Link to="/" className={className}>
      {action.label}
    </Link>
  );
}

export function WeekendCommandCenter({ context }: { context: WeekendContext }) {
  const syncCopy =
    context.syncHealth === "conflict"
      ? "A scoring conflict needs review"
      : context.syncHealth === "failed"
        ? "A tournament update failed"
        : context.syncHealth === "pending"
          ? "An offline update is waiting to sync"
          : null;
  const title = !context.player
    ? context.nextAction.kind === "claim-player"
      ? "Claim your roster name to post"
      : context.nextAction.kind === "loading-identity"
        ? "Finding your roster spot"
        : "Sign in to join the Clubhouse"
    : context.nextRound
      ? `${context.nextRound.day_label} · ${context.nextRound.course}`
      : `${context.player.name.split(" ")[0]}'s weekend`;
  const detail = context.player
    ? [context.partner ? `With ${context.partner}` : null, context.opponents ? `vs ${context.opponents}` : null]
        .filter(Boolean)
        .join(" · ") || context.nextAction.label
    : null;
  return (
    <section
      className="home-next-action flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"
      aria-label="Your weekend"
    >
      <div className="min-w-0 flex-1">
        <p className="t-micro">Next</p>
        <h2 id="my-weekend-title" className="t-title mt-1 text-foreground">
          {title}
        </h2>
        {detail ? <p className="t-micro mt-0.5">{detail}</p> : null}
        {syncCopy ? (
          <p role="status" className="t-micro mt-2 flex items-center gap-1.5 text-copper">
            <AlertTriangle className="size-3.5 shrink-0" />
            {syncCopy}
          </p>
        ) : null}
      </div>
      <div className="sm:w-auto sm:shrink-0">
        <ActionLink context={context} />
      </div>
    </section>
  );
}
