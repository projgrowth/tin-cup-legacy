import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Circle, ShieldCheck } from "lucide-react";

import { AuthCard } from "@/components/tin-cup/AuthCard";
import { ClaimQrSheet } from "@/components/tin-cup/ClaimQr";
import { PlatformAdminPanel } from "@/components/tin-cup/PlatformAdminPanel";
import { ErrorState, LoadingRows, PageHeading, Shell } from "@/components/tin-cup/Shell";
import { useAuth } from "@/hooks/useAuth";
import { useTournament } from "@/hooks/useTournament";
import { claimFirstAdmin, getRoleSetup, listMembers, setMemberRole } from "@/lib/roles.functions";
import { VENMO_IS_PLACEHOLDER } from "@/lib/tin-cup";
import { assertMutationAllowed } from "@/lib/runtime-mode";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Access Control — Tin Cup Invitational 2026" },
      {
        name: "description",
        content:
          "Grant captain scorekeeping access for the 2026 Tin Cup Invitational and manage admin permissions.",
      },
      { property: "og:title", content: "Access Control — Tin Cup Invitational 2026" },
      {
        property: "og:description",
        content:
          "Admin screen for granting captain scorekeeping access at the Tin Cup Invitational.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user, loading } = useAuth();

  return (
    <Shell>
      <PageHeading eyebrow="Permissions" title="Access Control" />
      {loading ? (
        <LoadingRows rows={2} />
      ) : !user ? (
        <AuthCard
          redirectPath="/admin"
          blurb="Sign in as Kevin (admin) to grant captains scorekeeping access."
        />
      ) : (
        <AdminBody />
      )}
    </Shell>
  );
}

function ChecklistItem({ done, children }: { done: boolean; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      {done ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
      ) : (
        <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
      )}
      <span className={`t-body ${done ? "text-foreground" : "text-muted-foreground"}`}>
        {children}
      </span>
    </li>
  );
}

function AdminBody() {
  const qc = useQueryClient();
  const fetchSetup = useServerFn(getRoleSetup);
  const fetchMembers = useServerFn(listMembers);
  const claim = useServerFn(claimFirstAdmin);
  const setRole = useServerFn(setMemberRole);
  const tournament = useTournament();

  const setup = useQuery({ queryKey: ["role-setup"], queryFn: () => fetchSetup({}) });
  const members = useQuery({
    queryKey: ["members"],
    queryFn: () => fetchMembers({}),
    enabled: setup.data?.isAdmin === true,
  });

  const claimMutation = useMutation({
    mutationFn: () => {
      assertMutationAllowed("Admin claim");
      return claim({});
    },
    onSuccess: () => {
      toast.success("You're the admin now");
      void qc.invalidateQueries({ queryKey: ["role-setup"] });
      void qc.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const roleMutation = useMutation({
    mutationFn: (v: { userId: string; role: "admin" | "captain"; grant: boolean }) => {
      assertMutationAllowed("Role update");
      return setRole({ data: v });
    },
    onSuccess: (_d, v) => {
      toast.success(v.grant ? `${v.role} access granted` : `${v.role} access removed`);
      void qc.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (setup.isLoading) return <LoadingRows rows={2} />;
  if (setup.isError)
    return <ErrorState detail="Couldn't check your access." onRetry={() => void setup.refetch()} />;

  if (!setup.data?.adminExists) {
    return (
      <div className="surface space-y-3 p-6 text-center">
        <ShieldCheck className="mx-auto size-6 text-muted-foreground" strokeWidth={1.6} />
        <p className="t-title text-foreground">No admin yet</p>
        <p className="t-micro">
          The deployment operator must configure <code>INITIAL_ADMIN_EMAILS</code> before claiming
          admin. This prevents any event participant from taking the first-admin slot.
        </p>
        <button
          type="button"
          disabled={claimMutation.isPending}
          onClick={() => claimMutation.mutate()}
          className="press btn-gold t-body mt-2 w-full"
        >
          {claimMutation.isPending ? "Claiming…" : "Claim admin access"}
        </button>
      </div>
    );
  }

  if (!setup.data.isAdmin) {
    return (
      <div className="surface p-6 text-center">
        <p className="t-title text-foreground">Admin only</p>
        <p className="t-micro mt-1.5">
          This account can't manage permissions. Ask the tournament admin for access.
        </p>
      </div>
    );
  }

  if (members.isLoading) return <LoadingRows rows={3} />;
  if (members.isError)
    return <ErrorState detail="Couldn't load accounts." onRetry={() => void members.refetch()} />;

  const rows = members.data ?? [];
  const captainCount = rows.filter(
    (m) => m.roles.includes("captain") || m.roles.includes("admin"),
  ).length;
  const hasTwoScorekeepers = captainCount >= 2;

  return (
    <div className="space-y-6">
      <section className="surface space-y-3 p-4">
        <h2 className="t-eyebrow">Event readiness</h2>
        <ul className="space-y-2.5">
          <ChecklistItem done={!VENMO_IS_PLACEHOLDER}>
            {VENMO_IS_PLACEHOLDER
              ? "Set VITE_VENMO_HANDLE and redeploy (buy-in still placeholder)"
              : "Venmo buy-in handle is configured"}
          </ChecklistItem>
          <ChecklistItem done={Boolean(setup.data?.adminExists)}>Admin claimed</ChecklistItem>
          <ChecklistItem done={hasTwoScorekeepers}>
            At least two scorekeepers (captain or admin) — currently {captainCount}
          </ChecklistItem>
          <ChecklistItem done={rows.length >= 2}>
            Captains have signed in once so they appear below ({rows.length} accounts)
          </ChecklistItem>
        </ul>
        <p className="t-micro border-t border-border pt-3">
          Interactive tools:{" "}
          <Link to="/ops" className="text-foreground underline underline-offset-2">
            Event Ops →
          </Link>{" "}
          · written steps in <span className="text-foreground">EVENT_OPS.md</span>
        </p>
      </section>

      {tournament.data && (
        <ClaimQrSheet
          players={tournament.data.players.map((player) => ({
            id: player.id,
            name: player.name,
            teamName: tournament.data?.teams.find((team) => team.id === player.team_id)?.name,
          }))}
        />
      )}

      <PlatformAdminPanel />

      <p className="t-micro">
        Captains can post match results and log side bets. Admins can also manage access. Grant{" "}
        <strong className="text-foreground">captain</strong> to Zack Smith and Charles Grass after
        they sign in once.
      </p>
      {rows.map((m) => (
        <div key={m.userId} className="surface space-y-3 p-4">
          <div className="min-w-0">
            <p className="t-body truncate text-foreground">
              {m.displayName || m.email || m.userId.slice(0, 8)}
            </p>
            {m.displayName && m.email && <p className="t-micro truncate">{m.email}</p>}
          </div>
          <div className="flex gap-2">
            {(["captain", "admin"] as const).map((role) => {
              const has = m.roles.includes(role);
              return (
                <button
                  key={role}
                  type="button"
                  disabled={roleMutation.isPending}
                  onClick={() => roleMutation.mutate({ userId: m.userId, role, grant: !has })}
                  className={`press t-body flex-1 rounded-xl border px-3 py-2.5 font-medium capitalize transition-colors disabled:opacity-50 ${
                    has
                      ? "border-foreground/25 bg-secondary text-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {role}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {rows.length === 0 && (
        <div className="surface p-6 text-center">
          <p className="t-micro">No accounts yet — captains need to sign in once first.</p>
        </div>
      )}
    </div>
  );
}
