import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { AuthCard } from "@/components/tin-cup/AuthCard";
import { LoadingForm, PageHeading, Shell } from "@/components/tin-cup/Shell";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "@/integrations/supabase/client";

export const Route = createFileRoute("/captain")({
  head: () => ({
    meta: [
      { title: "Captain Access — Tin Cup Invitational 2026" },
      {
        name: "description",
        content:
          "Captains sign in here to post match results and log closest-to-the-pin and long drive claims.",
      },
      { property: "og:title", content: "Captain Access — Tin Cup Invitational 2026" },
      {
        property: "og:description",
        content: "Scorekeeping access for the 2026 Tin Cup Invitational captains.",
      },
    ],
  }),
  component: CaptainPage,
});

function RoleBadge({ canScore, isAdmin }: { canScore: boolean; isAdmin: boolean }) {
  const label = isAdmin ? "Admin" : canScore ? "Captain" : "No score access";
  const tone = canScore
    ? "border-[color:var(--status-live)]/40 bg-[color:var(--status-live)]/12 text-[var(--status-live)]"
    : "border-border text-muted-foreground";
  return <span className={`pill t-micro font-semibold ${tone}`}>{label}</span>;
}

function CaptainPage() {
  const navigate = useNavigate();
  const { user, canScore, isAdmin, loading, rolesError, rolesLoading, refreshRoles } = useAuth();

  if (loading) {
    return (
      <Shell>
        <PageHeading eyebrow="Scorekeeping" title="Captain Access" />
        <LoadingForm fields={2} />
      </Shell>
    );
  }

  if (user) {
    return (
      <Shell>
        <PageHeading
          eyebrow="Scorekeeping"
          title="Captain Access"
          meta="Captains and admins can post results"
        />
        {rolesError && (
          <div role="alert" className="surface mb-4 flex items-center justify-between gap-3 p-4">
            <p className="t-micro">Scorekeeping access could not be refreshed.</p>
            <button
              type="button"
              disabled={rolesLoading}
              onClick={() => void refreshRoles()}
              className="press btn-quiet t-body min-h-11"
            >
              {rolesLoading ? "Retrying…" : "Retry"}
            </button>
          </div>
        )}
        <div className="stack-page">
          <div className="surface space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="t-body min-w-0 truncate text-muted-foreground">
                Signed in as <span className="font-medium text-foreground">{user.email}</span>
              </p>
              <RoleBadge canScore={canScore} isAdmin={isAdmin} />
            </div>
            <p className="t-body text-muted-foreground">
              {canScore
                ? "Your role can set pairings, post match results, and log contest winners from Live."
                : "This account cannot post official scores. Captains and admins can; Kevin grants captain after you sign in once."}
            </p>

            {canScore ? (
              <ol className="t-micro list-decimal space-y-2 rounded-xl border border-border/60 bg-secondary/15 px-4 py-3 pl-8 text-muted-foreground">
                <li>Open Live — gold scoring controls appear on matches.</li>
                <li>Post a throwaway test result, confirm spectator phone updates, then Clear.</li>
                <li>Prefer airplane-mode smoke once (EVENT_OPS dual-phone list).</li>
                <li>Install Add to Home Screen before Friday.</li>
              </ol>
            ) : (
              <ol className="t-micro list-decimal space-y-2 rounded-xl border border-border/60 bg-secondary/15 px-4 py-3 pl-8 text-muted-foreground">
                <li>Stay signed in so you appear on Admin.</li>
                <li>Kevin grants the captain role.</li>
                <li>Reload Live — score buttons should appear.</li>
                <li>Or use CAPTAIN_EMAILS + Sync on Event Ops.</li>
              </ol>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void navigate({ to: "/" })}
                className="press btn-primary t-body min-h-11 w-full"
              >
                {canScore ? "Go score on Live" : "Open Live board"}
              </button>
              <Link to="/ops" className="press btn-quiet t-body flex min-h-11 items-center justify-center">
                Event Ops checklist
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link to="/admin" className="press btn-quiet t-body min-h-11 text-center">
                Manage access
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                className="press btn-quiet t-body min-h-11"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <PageHeading
        eyebrow="Scorekeeping"
        title="Captain sign-in"
        meta="Same account as everyone else. Kevin grants captain after first sign-in."
      />
      <AuthCard
        redirectPath="/captain"
        blurb="Zack and Charles: sign in here, then confirm Event Ops dual-phone dry run."
      />
    </Shell>
  );
}
