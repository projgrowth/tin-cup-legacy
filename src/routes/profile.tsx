import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, ChevronRight, Loader2, LogOut } from "lucide-react";

import { AuthCard } from "@/components/tin-cup/AuthCard";
import { Avatar } from "@/components/tin-cup/Avatar";
import { LoadingForm, LoadingRows, PageHeading, Shell } from "@/components/tin-cup/Shell";
import { WhatsAppGroupButton } from "@/components/tin-cup/WhatsAppLinks";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useRoundPlan } from "@/hooks/useJournal";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { useTournament } from "@/hooks/useTournament";
import { nhost, signOut } from "@/integrations/nhost/client";
import { COURSE_LABEL, ROUND_COURSE, type CourseId } from "@/lib/courses";
import { day1GroupForPlayer } from "@/lib/day1-pairings";
import { clearGuestNotes, countGuestNotes, listGuestNotes } from "@/lib/guest-notes";
import { formatPayout } from "@/lib/purse";
import { formatRecord, playerRecord } from "@/lib/scoring";
import { teamRailClass } from "@/lib/team-styles";

export const Route = createFileRoute("/profile")({
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
  const { user, loading, canScore, isAdmin, rolesError, rolesLoading, refreshRoles } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { data: tournament } = useTournament();
  const claimedPlayer = useMemo(() => {
    if (!profile?.player_id) return null;
    return (tournament?.players ?? []).find((p) => p.id === profile.player_id) ?? null;
  }, [profile?.player_id, tournament?.players]);
  const claimedTeam = useMemo(() => {
    if (!claimedPlayer) return null;
    return (tournament?.teams ?? []).find((t) => t.id === claimedPlayer.team_id) ?? null;
  }, [claimedPlayer, tournament?.teams]);
  const firstName = claimedPlayer?.name.split(" ")[0] ?? null;

  return (
    <Shell>
      <PageHeading
        eyebrow={claimedPlayer ? claimedTeam?.name.replace("Team ", "") ?? "My hub" : "Account"}
        title={user ? (firstName ? firstName : "You") : "Sign in"}
      />
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
      {loading || (user && profileLoading && !profile) ? (
        <LoadingForm fields={3} />
      ) : !user ? (
        <div className="space-y-6">
          <AuthCard blurb="Join the field: claim your roster name, private notes, and photo credits." />
          <p className="t-micro text-muted-foreground">
            Players should sign in and claim their name. Guests can still follow the live cup on the
            board without an account.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {claimedPlayer && claimedTeam && (
            <MyHubCard
              player={claimedPlayer}
              teamSlug={claimedTeam.slug}
              teamName={claimedTeam.name}
              matches={tournament?.matches ?? []}
              sideBets={tournament?.sideBets ?? []}
            />
          )}
          <Identity email={user.email ?? ""} canScore={canScore} isAdmin={isAdmin} />
          <GuestNotesMerge />
          <div className="grid gap-2 sm:grid-cols-2">
            {claimedPlayer && (
              <Link
                to="/player/$playerId"
                params={{ playerId: claimedPlayer.id }}
                className="press surface flex items-center justify-between gap-2 px-4 py-3.5"
              >
                <span className="t-body font-medium text-foreground">Your player card</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            )}
            <Link
              to="/rosters"
              className="press surface flex items-center justify-between gap-2 px-4 py-3.5"
            >
              <span className="t-body font-medium text-foreground">
                {claimedTeam ? "Your team hub" : "Teams"}
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
            <Link
              to="/scout"
              className="press surface flex items-center justify-between gap-2 px-4 py-3.5"
            >
              <span className="t-body font-medium text-foreground">Course notes</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
            {canScore && (
              <Link to="/" className="press surface flex items-center justify-between gap-2 px-4 py-3.5">
                <span className="t-body font-medium text-foreground">Live board · score</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            )}
          </div>
          <WhatsAppGroupButton className="w-full" />
          <RoundPlans />
          <section className="surface p-4">
            <p className="t-section text-foreground">Add to Home Screen</p>
            <p className="t-micro mt-1.5 text-muted-foreground">
              iPhone: Share → Add to Home Screen. Android: browser menu → Install app.
            </p>
          </section>
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
            {canScore && (
              <Link to="/ops" className="press t-micro text-muted-foreground">
                Ops
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin" className="press t-micro text-muted-foreground">
                Admin
              </Link>
            )}
            <button
              type="button"
              onClick={() => void signOut()}
              className="press btn-quiet t-micro ml-auto"
            >
              <LogOut className="size-3.5" strokeWidth={1.6} /> Sign out
            </button>
          </div>
          <p className="t-micro text-center text-muted-foreground">
            Chat lives in WhatsApp · issues → message Kevin
          </p>
        </div>
      )}
    </Shell>
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
  const { profile, save } = useProfile();
  const { data: tournament } = useTournament();
  const avatars = usePlayerAvatars(tournament?.players ?? [], tournament?.teams ?? []);
  const face = avatars.data?.byPlayerId.get(player.id);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localUrl, setLocalUrl] = useState<string | null>(null);

  const d1 = day1GroupForPlayer(player.name);
  const record = playerRecord(matches, player.name, teamSlug);
  const shorthand = formatRecord(record);
  const cash = sideBets
    .filter((b) => b.player_name === player.name)
    .reduce((sum, c) => sum + Number(c.amount), 0);

  async function onPick(file: File | undefined) {
    if (!file) return;
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
      const user = nhost.getUserSession()?.user;
      if (!user) throw new Error("Sign in again");
      const uploaded = await nhost.storage.uploadFiles({
        "bucket-id": "default",
        "file[]": [file],
        "metadata[]": [{ name: `avatars/${user.id}-${crypto.randomUUID()}` }],
      });
      const stored = uploaded.body.processedFiles[0];
      if (!stored?.id) throw new Error("Upload failed");
      await new Promise<void>((resolve, reject) => {
        save.mutate(
          {
            display_name: profile?.display_name || player.name,
            player_id: player.id,
            avatar_path: stored.id,
          },
          {
            onSuccess: () => resolve(),
            onError: (e) => reject(e),
          },
        );
      });
      const signed = await nhost.storage.getFilePresignedURL(stored.id);
      setLocalUrl(signed?.body?.url ?? null);
      toast.success("Photo updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload photo");
    } finally {
      setUploading(false);
    }
  }

  const src = localUrl || face?.url || null;

  return (
    <section className={`surface-raised p-4 ${teamRailClass(teamSlug)}`}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
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
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={(e) => {
            void onPick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <div className="min-w-0 flex-1">
          <p className="t-micro text-muted-foreground">{teamName}</p>
          <h2 className="t-title mt-0.5 text-foreground">{player.name}</h2>
          {player.is_captain && (
            <span className="t-micro text-muted-foreground">Captain</span>
          )}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
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
      toast.success(`Moved ${notes.length} hole note${notes.length === 1 ? "" : "s"} to your account`);
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
          className="press btn-gold t-body"
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
  const { graphqlRequest } = await import("@/integrations/nhost/graphql");
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
}: {
  email: string;
  canScore: boolean;
  isAdmin: boolean;
}) {
  const { profile, save } = useProfile();
  const { data } = useTournament();
  const players = data?.players ?? [];
  const teams = data?.teams ?? [];
  const [name, setName] = useState("");
  const [playerId, setPlayerId] = useState("");

  useEffect(() => {
    setName(profile?.display_name ?? "");
    setPlayerId(profile?.player_id ?? "");
  }, [profile]);

  const roleLabel = isAdmin ? "Admin" : canScore ? "Captain" : "Player";

  const needsClaim = !playerId;

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="t-section text-foreground">
          {needsClaim ? "Claim your name" : "Identity"}
        </h2>
        <span className="pill t-micro text-muted-foreground">{roleLabel}</span>
      </div>
      <div className={`space-y-3 p-4 ${needsClaim ? "surface-emphasized" : "surface"}`}>
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
        {!needsClaim && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="Display name (optional)"
            className="control t-body w-full"
          />
        )}
        <button
          type="button"
          disabled={save.isPending}
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
                onSuccess: () => toast.success("Profile saved"),
                onError: (error) => toast.error(error.message),
              },
            )
          }
          className="press btn-gold t-body w-full"
        >
          {save.isPending ? "Saving…" : needsClaim ? "Save my name" : "Save profile"}
        </button>
      </div>
    </section>
  );
}

function RoundPlans() {
  const { data, isPending } = useTournament();
  const rounds = data?.rounds ?? [];
  return (
    <section>
      <h2 className="t-eyebrow mb-3">Round game plans</h2>
      {isPending && rounds.length === 0 ? (
        <LoadingRows rows={3} height={78} />
      ) : (
        <div className="space-y-3">
          {rounds.map((round) => (
            <PlanCard
              key={round.slug}
              slug={round.slug}
              label={`${round.day_label} · ${round.course}`}
              format={round.format}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function PlanCard({ slug, label, format }: { slug: string; label: string; format: string }) {
  const { plan, save } = useRoundPlan(slug);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const course = ROUND_COURSE[slug];

  useEffect(() => setDraft(plan), [plan]);

  return (
    <div className="surface p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-baseline justify-between gap-3 text-left"
      >
        <span className="min-w-0">
          <span className="t-body block truncate text-foreground">{label}</span>
          <span className="t-micro mt-0.5 block text-muted-foreground">{format}</span>
        </span>
        <span className="t-micro shrink-0 text-muted-foreground">
          {plan ? "Edit" : open ? "Close" : "Add plan"}
        </span>
      </button>
      {open ? (
        <div className="mt-3 space-y-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            maxLength={1200}
            placeholder="Strategy, pairing thoughts, clubs to lean on, holes to attack…"
            className="control t-body w-full resize-none"
          />
          <div className="flex items-center justify-between gap-3">
            {course ? (
              <Link to="/scout" className="t-micro text-muted-foreground">
                Scout {COURSE_LABEL[course]} →
              </Link>
            ) : (
              <span />
            )}
            <button
              type="button"
              disabled={save.isPending}
              onClick={() =>
                save.mutate(draft.trim(), {
                  onSuccess: () => toast.success("Plan saved"),
                  onError: (error) => toast.error(error.message),
                })
              }
              className="press btn-gold t-body"
            >
              {save.isPending ? "Saving…" : "Save plan"}
            </button>
          </div>
        </div>
      ) : plan ? (
        <p className="t-micro mt-2 line-clamp-2 text-muted-foreground">{plan}</p>
      ) : null}
    </div>
  );
}
