import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { AuthCard } from "@/components/tin-cup/AuthCard";
import { LoadingForm, PageHeading, Shell } from "@/components/tin-cup/Shell";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "@/integrations/nhost/client";

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
    ? "border-border bg-secondary text-foreground"
    : "border-border text-muted-foreground";
  return <span className={`pill t-micro font-medium ${tone}`}>{label}</span>;
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
        <PageHeading eyebrow="Scorekeeping" title="Captain Access" />
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
        <div className="surface space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="t-body min-w-0 truncate text-muted-foreground">
              Signed in as <span className="text-foreground">{user.email}</span>
            </p>
            <RoleBadge canScore={canScore} isAdmin={isAdmin} />
          </div>
          <p className="t-body text-muted-foreground">
            {canScore
              ? "You can set pairings, post match results, and log contest winners from the Live tab."
              : "This account does not have scorekeeping access yet. Ask the tournament admin to grant the captain role."}
          </p>
          <div className="space-y-2 rounded-[var(--radius)] border border-border bg-secondary/20 p-3">
            <p className="t-eyebrow">Weekend setup</p>
            <ol className="t-micro list-decimal space-y-1.5 pl-4 text-muted-foreground">
              <li>Confirm the tournament owner has admin access</li>
              <li>Zack and Charles sign in once</li>
              <li>Admin grants each the captain role</li>
              <li>Both captains smoke-test offline scoring on two phones</li>
            </ol>
          </div>
          <Link to="/admin" className="press btn-quiet t-body w-full">
            Manage scorekeeping access
          </Link>
          <Link to="/ops" className="press btn-quiet t-body w-full text-center">
            Open event ops checklist
          </Link>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void navigate({ to: "/" })}
              className="press btn-gold t-body flex-1"
            >
              Go to board
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="press btn-quiet t-body"
            >
              Sign out
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <PageHeading eyebrow="Scorekeeping" title="Captain sign-in" />
      <p className="t-micro -mt-2 mb-4 text-muted-foreground">
        Same account as everyone else. After you sign in, Kevin grants captain access.
      </p>
      <AuthCard
        redirectPath="/captain"
        blurb="Sign in to unlock Live scoring once you have the captain role."
      />
      <Link to="/profile" className="press t-body mt-4 block text-center text-muted-foreground">
        Prefer the main Account page →
      </Link>
    </Shell>
  );
}
