import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Camera, ChevronRight, Loader2 } from "lucide-react";

import { AuthCard } from "@/components/tin-cup/AuthCard";
import { Avatar } from "@/components/tin-cup/Avatar";
import { PageMasthead } from "@/components/tin-cup/PageMasthead";
import { PhotoPicker } from "@/components/tin-cup/PhotoPicker";
import { NotificationSettings } from "@/components/tin-cup/NotificationSettings";
import { DeviceReadiness } from "@/components/tin-cup/DeviceReadiness";
import { ExperienceCustomizer } from "@/components/tin-cup/ExperienceCustomizer";
import { LoadingForm, PageHeading, Shell } from "@/components/tin-cup/Shell";
import { WhatsAppGroupButton } from "@/components/tin-cup/WhatsAppLinks";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useJournal";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { useTournament } from "@/hooks/useTournament";
import { signOut, supabase } from "@/integrations/supabase/client";
import { signedVaultUrl, uploadVaultImage } from "@/integrations/supabase/storage";
import { type CourseId } from "@/lib/courses";
import { day1GroupForPlayer } from "@/lib/day1-pairings";
import { clearGuestNotes, countGuestNotes, listGuestNotes } from "@/lib/guest-notes";
import { formatPayout } from "@/lib/purse";
import { formatRecord, playerRecord } from "@/lib/scoring";
import { teamRailClass } from "@/lib/team-styles";
import { resolveIdentity } from "@/lib/profile-identity";
import { assertMutationAllowed } from "@/lib/runtime-mode";

type ProfileSearch = {
  code?: string;
  token_hash?: string;
  type?: string;
  claim?: string;
};

function authSearch(raw: Record<string, unknown>): ProfileSearch {
  const text = (key: "code" | "token_hash" | "type" | "claim") => {
    const value = raw[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  };
  return {
    ...(text("code") ? { code: text("code") } : {}),
    ...(text("token_hash") ? { token_hash: text("token_hash") } : {}),
    ...(text("type") ? { type: text("type") } : {}),
    ...(text("claim") ? { claim: text("claim") } : {}),
  };
}

export const Route = createFileRoute("/profile")({
  validateSearch: (raw: Record<string, unknown>): ProfileSearch => authSearch(raw),
  head: () => ({
    meta: [
      { title: "Account — Tin Cup Invitational" },
      {
        name: "description",
        content:
          "Sign in, claim your roster spot, and keep private course notes for the Tin Cup Invitational.",
      },
      { property: "og:title", content: "Account — Tin Cup Invitational" },
      {
        property: "og:description",
        content: "Your account for roster identity and private notes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const search = Route.useSearch();
  const {
    user,
    loading,
    canScore,
    isAdmin,
    rolesError,
    rolesLoading,
    refreshRoles,
    passwordRecovery,
    recoveryBusy,
    recoveryError,
    clearPasswordRecovery,
  } = useAuth();
  const { profile, loading: profileLoading, error: profileError, refetch } = useProfile();
  const { data: tournament, isPending: tournamentPending, refetch: refetchTournament } =
    useTournament();
  const claimedPlayer = useMemo(() => {
    if (!profile?.player_id) return null;
    return (tournament?.players ?? []).find((p) => p.id === profile.player_id) ?? null;
  }, [profile?.player_id, tournament?.players]);
  const identity = resolveIdentity({
    signedIn: Boolean(user),
    profilePending: profileLoading,
    profileError: Boolean(profileError),
    playerId: profile?.player_id ?? null,
    tournamentPending: Boolean(profile?.player_id && tournamentPending && !tournament),
    playerOnRoster: Boolean(claimedPlayer),
  });
  const claimedTeam = useMemo(() => {
    if (!claimedPlayer) return null;
    return (tournament?.teams ?? []).find((t) => t.id === claimedPlayer.team_id) ?? null;
  }, [claimedPlayer, tournament?.teams]);
  return (
    <Shell>
      {!user ? (
        <div className="mb-6">
          <PageMasthead
            title="Join the weekend"
            meta="Sign in once for your player card and private course notes."
          />
        </div>
      ) : (
        <PageHeading
          eyebrow="Account"
          title={
            claimedPlayer
              ? "Your Tin Cup"
              : identity.kind === "claim"
                ? "Claim your name"
                : "Your account"
          }
        />
      )}
      {user && rolesError && (
        <div role="alert" className="surface mb-4 flex items-center justify-between gap-3 p-4">
          <p className="t-micro">Your access level could not be refreshed.</p>
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
      {passwordRecovery && user && <SetNewPassword onDone={clearPasswordRecovery} />}
      {passwordRecovery && !user && recoveryBusy && (
        <div className="surface mb-4 p-4">
          <p className="t-title text-foreground">Opening your reset link…</p>
          <p className="t-micro mt-1.5 text-muted-foreground">Set a new password in a moment.</p>
        </div>
      )}
      {recoveryError && (
        <div role="alert" className="surface mb-4 p-4">
          <p className="t-title text-foreground">That reset link didn&apos;t work</p>
          <p className="t-micro mt-1.5 text-muted-foreground">
            {recoveryError} Request a new one below, then tap it in this browser.
          </p>
        </div>
      )}
      {passwordRecovery && !user && !recoveryBusy && !recoveryError && (
        <div role="status" className="surface mb-4 p-4">
          <p className="t-title text-foreground">Request a new reset</p>
          <p className="t-micro mt-1.5 text-muted-foreground">
            This link couldn&apos;t be opened here. Use Forgot password below, then tap the email
            link in this same browser.
          </p>
        </div>
      )}
      {!user ? (
        <div className="space-y-6">
          <AuthCard
            redirectPath={`/profile${search.claim ? `?claim=${encodeURIComponent(search.claim)}` : ""}`}
            blurb={
              search.claim
                ? "Sign in to confirm the roster spot from your claim link."
                : "Claim your name. Password works if the email link is rate-limited."
            }
          />
        </div>
      ) : identity.kind === "loading" ? (
        <LoadingForm fields={3} />
      ) : identity.kind === "error" ? (
        <div role="alert" className="surface space-y-3 p-4">
          <p className="t-title text-foreground">Couldn&apos;t load your account</p>
          <p className="t-micro text-muted-foreground">
            Check the connection and try again. This is not the roster claim step.
          </p>
          <button
            type="button"
            className="press btn-primary t-body min-h-11 w-full"
            onClick={() => void refetch()}
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="stack-page">
          {identity.kind === "hub" && claimedPlayer && claimedTeam ? (
            <MyHubCard
              player={claimedPlayer}
              teamSlug={claimedTeam.slug}
              teamName={claimedTeam.name}
              matches={tournament?.matches ?? []}
              sideBets={tournament?.sideBets ?? []}
            />
          ) : identity.kind === "hub" && identity.playerMissing ? (
            <div role="alert" className="surface space-y-3 p-4">
              <p className="t-title text-foreground">Couldn&apos;t load your roster</p>
              <p className="t-micro text-muted-foreground">
                You already claimed a name, but the field list didn&apos;t load. Retry before
                picking a different player.
              </p>
              <button
                type="button"
                className="press btn-primary t-body min-h-11 w-full"
                onClick={() => void refetchTournament()}
              >
                Retry
              </button>
            </div>
          ) : (
            <Identity
              email={user.email ?? ""}
              canScore={canScore}
              isAdmin={isAdmin}
              requestedClaimId={search.claim}
            />
          )}
          <GuestNotesMerge />
          {claimedPlayer && <DeviceReadiness />}
          {claimedPlayer && <ExperienceCustomizer userId={user.id} teamSlug={claimedTeam?.slug} />}
          {claimedPlayer && <NotificationSettings userId={user.id} />}
          <ul className="surface divide-y divide-border overflow-hidden">
            {claimedPlayer && (
              <li>
                <Link
                  to="/player/$playerId"
                  params={{ playerId: claimedPlayer.id }}
                  className="press flex min-h-12 items-center justify-between px-4 py-3"
                >
                  <span className="t-body font-medium">Player card</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            )}
            <li>
              <Link
                to="/scout"
                className="press flex min-h-12 items-center justify-between px-4 py-3"
              >
                <span className="t-body font-medium">Notes</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  void signOut().catch((e) =>
                    toast.error(e instanceof Error ? e.message : "Could not sign out"),
                  );
                }}
                className="press flex min-h-12 w-full items-center px-4 py-3 text-left t-body font-medium"
              >
                Sign out
              </button>
            </li>
          </ul>
          <details className="t-micro text-muted-foreground">
            <summary className="press cursor-pointer list-none py-2 [&::-webkit-details-marker]:hidden">
              More
            </summary>
            <div className="mt-2 flex flex-col gap-2">
              <WhatsAppGroupButton className="!min-h-11 w-full" />
              <p>iPhone: Share → Add to Home Screen.</p>
              {canScore && (
                <Link
                  to="/ops"
                  className="press inline-flex min-h-11 items-center font-semibold text-hunter"
                >
                  Ops
                </Link>
              )}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="press inline-flex min-h-11 items-center text-muted-foreground"
                >
                  Admin
                </Link>
              )}
            </div>
          </details>
        </div>
      )}
    </Shell>
  );
}

function SetNewPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (password.length < 6) {
      toast.error("Use at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      assertMutationAllowed("Password update");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated — you're signed in.");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface space-y-3 p-4">
      <h2 className="t-title text-foreground">Set a new password</h2>
      <p className="t-micro text-muted-foreground">
        You opened a reset link. Choose a password for this weekend.
      </p>
      <label htmlFor="new-password" className="t-micro font-semibold text-foreground">
        New password
      </label>
      <input
        id="new-password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="New password"
        className="control t-body w-full"
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="press btn-primary t-body w-full"
      >
        {busy ? "Saving…" : "Save password"}
      </button>
    </section>
  );
}

function MyHubCard({
  player,
  teamSlug,
  teamName,
  matches,
  sideBets,
}: {
  player: { id: string; name: string; is_captain: boolean };
  teamSlug: string;
  teamName: string;
  matches: Parameters<typeof playerRecord>[0];
  sideBets: Array<{ player_name: string | null; amount: number | string }>;
}) {
  const queryClient = useQueryClient();
  const { profile, save } = useProfile();
  const { data: tournament } = useTournament();
  const avatars = usePlayerAvatars(tournament?.players ?? [], tournament?.teams ?? []);
  const face = avatars.data?.byPlayerId.get(player.id);
  const [uploading, setUploading] = useState(false);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const d1 = day1GroupForPlayer(player.name);
  const record = playerRecord(matches, player.name, teamSlug);
  const shorthand = formatRecord(record);
  const cash = sideBets
    .filter((b) => b.player_name === player.name)
    .reduce((sum, c) => sum + Number(c.amount), 0);

  async function onPick(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Keep photos under 5MB");
      return;
    }
    setUploading(true);
    try {
      const storagePath = await uploadVaultImage(file, "avatars");
      await new Promise<void>((resolve, reject) => {
        save.mutate(
          {
            display_name: profile?.display_name || player.name,
            player_id: player.id,
            avatar_path: storagePath,
          },
          {
            onSuccess: () => resolve(),
            onError: (e) => reject(e),
          },
        );
      });
      setLocalUrl(await signedVaultUrl(storagePath));
      setShowPicker(false);
      void queryClient.invalidateQueries({ queryKey: ["player-avatars"] });
      void queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
      toast.success("Photo updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload photo");
    } finally {
      setUploading(false);
    }
  }

  const src = localUrl || face?.url || null;

  return (
    <section className={`surface p-4 ${teamRailClass(teamSlug)}`}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => setShowPicker((v) => !v)}
          disabled={uploading}
          className="press relative shrink-0"
          aria-label="Upload profile photo"
        >
          <Avatar name={player.name} teamSlug={teamSlug} src={src} size="lg" />
          <span className="absolute -bottom-0.5 -right-0.5 flex size-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
            {uploading ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Camera className="size-3" strokeWidth={1.8} />
            )}
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="t-micro text-muted-foreground">{teamName}</p>
          <h2 className="t-title mt-0.5 text-foreground">{player.name}</h2>
          {player.is_captain && <span className="t-micro text-muted-foreground">Captain</span>}
          <button
            type="button"
            onClick={() => setShowPicker((v) => !v)}
            disabled={uploading}
            className="press t-micro mt-1 text-muted-foreground underline-offset-2 hover:underline"
          >
            {src ? "Change photo" : "Add photo"}
          </button>
          {d1 && (
            <p className="t-micro mt-2 text-muted-foreground">
              Day 1 · w/ {d1.partner.split(" ")[0]} · vs {d1.opponents}
            </p>
          )}
          <p className="t-micro mt-1 text-muted-foreground">
            {shorthand ? `${shorthand} · ${record.points} pts` : "No results yet"}
            {cash > 0 ? ` · ${formatPayout(cash)} side` : ""}
          </p>
        </div>
      </div>
      {showPicker && (
        <div className="mt-3 border-t border-border pt-3">
          <PhotoPicker
            onFile={(f) => void onPick(f)}
            disabled={uploading}
            cameraFacing="user"
            size="compact"
            cameraLabel="Selfie"
            libraryLabel="Library"
          />
        </div>
      )}
    </section>
  );
}

/** One-time merge of guest (on-device) notes after sign-in. */
function GuestNotesMerge() {
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCount(countGuestNotes());
  }, []);

  if (count === 0) return null;

  async function merge() {
    setBusy(true);
    try {
      const notes = listGuestNotes();
      for (const { courseId, hole, draft } of notes) {
        await saveForCourse(courseId, hole, draft);
      }
      clearGuestNotes();
      setCount(0);
      toast.success(
        `Moved ${notes.length} hole note${notes.length === 1 ? "" : "s"} to your account`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not merge notes");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="t-title text-foreground">On-device notes found</p>
        <p className="t-micro mt-0.5 text-muted-foreground">
          {count} guest note{count === 1 ? "" : "s"} on this phone. Move them into your account?
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void merge()}
          className="press btn-primary t-body"
        >
          {busy ? "Moving…" : "Save to account"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            clearGuestNotes();
            setCount(0);
            toast.message("Guest notes discarded");
          }}
          className="press btn-quiet t-body"
        >
          Discard
        </button>
      </div>
    </div>
  );
}

async function saveForCourse(
  courseId: CourseId,
  hole: number,
  draft: {
    tee_club?: string | null;
    target_line?: string | null;
    green_note?: string | null;
    target_score?: number | null;
    notes?: string | null;
  },
) {
  const { graphqlRequest } = await import("@/integrations/supabase/graphql");
  await graphqlRequest(
    `mutation SaveHoleNote($object: hole_notes_insert_input!) {
      insert_hole_notes_one(
        object: $object,
        on_conflict: {
          constraint: hole_notes_user_id_course_id_hole_key,
          update_columns: [tee_club, target_line, green_note, target_score, notes]
        }
      ) { id }
    }`,
    { object: { course_id: courseId, hole, ...draft } },
  );
}

function Identity({
  email,
  canScore,
  isAdmin,
  requestedClaimId,
}: {
  email: string;
  canScore: boolean;
  isAdmin: boolean;
  requestedClaimId?: string;
}) {
  const navigate = useNavigate();
  const { profile, save } = useProfile();
  const { data } = useTournament();
  const players = data?.players ?? [];
  const teams = data?.teams ?? [];
  const [name, setName] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [claimConfirmed, setClaimConfirmed] = useState(false);

  useEffect(() => {
    setName(profile?.display_name ?? "");
    setPlayerId(profile?.player_id ?? requestedClaimId ?? "");
  }, [profile, requestedClaimId]);

  const roleLabel = isAdmin ? "Admin" : canScore ? "Captain" : "Player";

  const needsClaim = !playerId;

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="t-section text-foreground">{needsClaim ? "Claim your name" : "Identity"}</h2>
        <span className="pill t-micro text-muted-foreground">{roleLabel}</span>
      </div>
      <div className={`space-y-3 p-4 ${needsClaim ? "surface-raised" : "surface"}`}>
        <p className="t-micro truncate text-muted-foreground">{email}</p>
        <select
          value={playerId}
          onChange={(e) => setPlayerId(e.target.value)}
          className="control t-body w-full"
          aria-label="Roster name"
        >
          <option value="">Select your name…</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.is_captain ? " (Captain)" : ""} —{" "}
              {teams.find((t) => t.id === p.team_id)?.name ?? "Team"}
            </option>
          ))}
        </select>
        {requestedClaimId &&
          !profile?.player_id &&
          players.some((player) => player.id === requestedClaimId) && (
            <label className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-secondary px-3 py-2.5 t-body text-foreground">
              <input
                type="checkbox"
                checked={claimConfirmed}
                onChange={(event) => setClaimConfirmed(event.target.checked)}
                className="size-5"
              />
              Confirm {players.find((player) => player.id === requestedClaimId)?.name} is me
            </label>
          )}
        {!needsClaim && (
          <div className="space-y-1.5">
            <label htmlFor="display-name" className="t-micro font-semibold text-foreground">
              Display name
            </label>
            <input
              id="display-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="Optional"
              className="control t-body min-h-11 w-full"
            />
          </div>
        )}
        <button
          type="button"
          disabled={
            save.isPending ||
            players.length === 0 ||
            Boolean(requestedClaimId && !profile?.player_id && !claimConfirmed)
          }
          onClick={() =>
            save.mutate(
              {
                display_name:
                  name.trim() ||
                  players.find((p) => p.id === playerId)?.name ||
                  email.split("@")[0] ||
                  "",
                player_id: playerId || null,
              },
              {
                onSuccess: () => {
                  toast.success("Roster spot claimed — welcome to your weekend");
                  void navigate({ to: "/" });
                },
                onError: (error) =>
                  toast.error(
                    /unique|player_id/i.test(error.message)
                      ? "That player has already been claimed. Choose your own roster name or ask an admin."
                      : error.message,
                  ),
              },
            )
          }
          className="press btn-primary t-body w-full"
        >
          {save.isPending ? "Saving…" : needsClaim ? "Save my name" : "Save profile"}
        </button>
      </div>
    </section>
  );
}
