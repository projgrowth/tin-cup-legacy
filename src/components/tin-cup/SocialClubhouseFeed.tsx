import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  Check,
  Clock3,
  Flame,
  MessageCircle,
  MoreHorizontal,
  Megaphone,
  PartyPopper,
  Pencil,
  Pin,
  Send,
  Trophy,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar } from "@/components/tin-cup/Avatar";
import { ClubhouseEngagement } from "@/components/tin-cup/EngagementPanels";
import { PhotoPicker } from "@/components/tin-cup/PhotoPicker";
import { ShareMomentButton } from "@/components/tin-cup/ShareMomentButton";
import { useActivityFeed, formatActivityTime } from "@/hooks/useActivityFeed";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useJournal";
import { useMatchSocial } from "@/hooks/useMatchSocial";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { usePublicProfiles } from "@/hooks/usePublicProfiles";
import { useWeekendStory } from "@/hooks/useWeekendStory";
import type {
  Match,
  Player,
  Round,
  SideBet,
  Team,
  Trophy as TrophyRow,
} from "@/hooks/useTournament";
import { signedVaultUrl, uploadVaultImage } from "@/integrations/supabase/storage";
import { graphqlRequest } from "@/integrations/supabase/graphql";
import { CLUBHOUSE_MOMENT_KEY, predictionTotals, type FeedFilter } from "@/lib/social-platform";
import { trackProductEvent } from "@/lib/product-analytics";
import { savePreviewPhoto } from "@/lib/preview-media";
import { isPreviewMode } from "@/lib/runtime-mode";
import { buildStoryMoments, type ReactionKind, type StoryMoment } from "@/lib/weekend-story";

const REACTIONS: Array<{ kind: ReactionKind; label: string; icon: typeof Flame }> = [
  { kind: "applause", label: "Applause", icon: PartyPopper },
  { kind: "fire", label: "Fire", icon: Flame },
  { kind: "trophy", label: "Trophy", icon: Trophy },
];

function MomentIcon({ kind }: { kind: StoryMoment["kind"] }) {
  if (kind === "photo") return <Camera className="size-4" />;
  if (kind === "trophy" || kind === "side-bet") return <Trophy className="size-4" />;
  return <Check className="size-4" />;
}

export function SocialClubhouseFeed({
  matches,
  sideBets,
  trophies,
  players,
  teams,
  rounds,
  filter,
  onFilter,
  canModerate = false,
  canUpload = false,
  compact = false,
}: {
  matches: Match[];
  sideBets: SideBet[];
  trophies: TrophyRow[];
  players: Player[];
  teams: Team[];
  rounds: Round[];
  filter: FeedFilter;
  onFilter: (filter: FeedFilter) => void;
  canModerate?: boolean;
  canUpload?: boolean;
  compact?: boolean;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const story = useWeekendStory(user?.id);
  const matchSocial = useMatchSocial(user?.id, profile?.player_id);
  const activity = useActivityFeed(players, teams);
  const profiles = usePublicProfiles();
  const avatars = usePlayerAvatars(players, teams);
  const [draft, setDraft] = useState("");
  const [mention, setMention] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentMentions, setCommentMentions] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [announcementHours, setAnnouncementHours] = useState("24");
  const [photoRound, setPhotoRound] = useState("");
  const [photoEvent, setPhotoEvent] = useState("");
  const [photoAlt, setPhotoAlt] = useState("");
  const canParticipate = Boolean(
    user && profile?.player_id && story.enabled && story.clubhouseEnabled,
  );
  const playerById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );
  const profileById = useMemo(
    () => new Map((profiles.data ?? []).map((row) => [row.id, row])),
    [profiles.data],
  );
  const moments = useMemo(() => {
    const predictions: StoryMoment[] = matches
      .map((match) => ({ match, totals: predictionTotals(matchSocial.predictions, match.id) }))
      .filter(({ match, totals }) => match.result === "pending" && totals.total > 0)
      .map(({ match, totals }) => ({
        key: `prediction:${match.id}`,
        kind: "prediction" as const,
        title: `${totals.total} clubhouse pick${totals.total === 1 ? "" : "s"} · ${match.label}`,
        detail: `${totals.sideA} Side A · ${totals.halved} Halved · ${totals.sideB} Side B`,
        at: Date.parse(match.updated_at) || 0,
        shareable: false,
      }));
    return [
      ...buildStoryMoments({ matches, sideBets, trophies, activity: activity.data }),
      ...predictions,
    ]
      .sort((a, b) => b.at - a.at)
      .filter((moment) =>
        filter === "all"
          ? true
          : filter === "photos"
            ? moment.kind === "photo"
            : filter === "scores"
              ? ["match", "prediction", "side-bet", "trophy", "lead-change"].includes(moment.kind)
              : false,
      );
  }, [activity.data, filter, matchSocial.predictions, matches, sideBets, trophies]);
  const showClubhouse = filter === "all" || filter === "clubhouse";
  const mediaPaths = moments
    .map((moment) => moment.mediaPath)
    .filter((path): path is string => Boolean(path));
  const mediaPathKey = mediaPaths.join("|");

  useEffect(() => {
    if (!mediaPathKey) return;
    const paths = mediaPathKey.split("|");
    let cancelled = false;
    void Promise.all(
      paths.map(async (path) => {
        const url = await signedVaultUrl(path);
        return [path, url] as const;
      }),
    ).then((rows) => {
      if (cancelled) return;
      setMediaUrls((current) => ({
        ...current,
        ...Object.fromEntries(
          rows.filter((row): row is readonly [string, string] => Boolean(row[1])),
        ),
      }));
    });
    return () => {
      cancelled = true;
    };
  }, [mediaPathKey]);

  useEffect(() => {
    if (!user || !showClubhouse || story.clubhousePosts.length === 0) return;
    void story.markClubhouseRead.mutateAsync();
    // Mark once for each newest post, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, showClubhouse, story.clubhousePosts[0]?.id]);

  function authorName(authorId: string) {
    if (authorId === "preview-organizer") return "Tin Cup Committee";
    if (authorId === "preview-captain") return "Captain's Desk";
    if (authorId === "preview-player") return "Clubhouse Player";
    const row = profileById.get(authorId);
    return (row?.player_id && playerById.get(row.player_id)?.name) || row?.display_name || "Player";
  }

  function authorTeam(authorId: string) {
    const row = profileById.get(authorId);
    const player = row?.player_id ? playerById.get(row.player_id) : null;
    return player ? teams.find((team) => team.id === player.team_id)?.slug : undefined;
  }

  function authorAvatar(authorId?: string | null, playerId?: string | null, playerName?: string) {
    if (playerId) return avatars.data?.byPlayerId.get(playerId)?.url;
    const row = authorId ? profileById.get(authorId) : null;
    if (row?.player_id) return avatars.data?.byPlayerId.get(row.player_id)?.url;
    return playerName ? avatars.data?.getByName(playerName)?.url : undefined;
  }

  async function uploadPhoto(file: File) {
    setUploading(true);
    try {
      const selectedRound = rounds.find((round) => round.id === photoRound);
      if (isPreviewMode()) {
        await savePreviewPhoto(file, {
          caption: draft.trim() || null,
          altText: photoAlt.trim() || draft.trim() || null,
          courseId: selectedRound?.course ?? null,
          roundId: selectedRound?.id ?? null,
          eventTag: photoEvent.trim() || null,
          uploadedBy: user?.id ?? null,
        });
        await queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
        setDraft("");
        setPhotoAlt("");
        void trackProductEvent("clubhouse_post", { kind: "photo" });
        toast.success("Photo added to this protected preview");
        return;
      }
      const storagePath = await uploadVaultImage(file, "photos");
      await graphqlRequest(
        `mutation AddPhoto($object: photos_insert_input!) {
        insert_photos_one(object: $object) { id }
      }`,
        {
          object: {
            storage_path: storagePath,
            caption: draft.trim() || null,
            alt_text: photoAlt.trim() || draft.trim() || null,
            course_id: selectedRound?.course ?? null,
            round_id: selectedRound?.id ?? null,
            event_tag: photoEvent.trim() || null,
          },
        },
      );
      setDraft("");
      setPhotoAlt("");
      void trackProductEvent("clubhouse_post", { kind: "photo" });
      toast.success("Photo added to the Clubhouse");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add photo");
    } finally {
      setUploading(false);
    }
  }

  function submitPost() {
    const body = draft.trim();
    if (!body) return;
    story.addComment.mutate(
      { momentKey: CLUBHOUSE_MOMENT_KEY, body, mentionedUserId: mention || undefined },
      {
        onSuccess: () => {
          setDraft("");
          setMention("");
          void trackProductEvent("clubhouse_post", { kind: "text" });
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  return (
    <section aria-labelledby="clubhouse-feed-title" className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="t-eyebrow text-gold-light">The clubhouse</p>
          <h2 id="clubhouse-feed-title" className="t-title mt-1 text-foreground">
            Around the weekend
          </h2>
        </div>
        {story.unreadCount > 0 && (
          <span className="rounded-full bg-gold px-2.5 py-1 text-xs font-bold text-primary-foreground">
            {story.unreadCount} new
          </span>
        )}
      </div>

      {story.clubhouseEnabled && (
      <div className="feed-composer surface-raised p-3 sm:p-4">
        <div className="flex gap-3">
          <Avatar
            name={profile?.display_name || "You"}
            teamSlug={profile?.player_id ? authorTeam(user?.id ?? "") : undefined}
            src={authorAvatar(user?.id, profile?.player_id)}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <label className="sr-only" htmlFor="clubhouse-post">
              Post to the Clubhouse
            </label>
            <textarea
              id="clubhouse-post"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={!canParticipate}
              maxLength={500}
              rows={2}
              placeholder={
                !story.clubhouseEnabled
                  ? "Clubhouse conversation is not active yet"
                  : canParticipate
                    ? "What’s happening out there?"
                    : "Claim your player to join the conversation"
              }
              className="control w-full resize-none border-0 bg-transparent px-0 text-base shadow-none focus:ring-0"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-2">
              {canUpload && (
                <PhotoPicker
                  onFile={(file) => void uploadPhoto(file)}
                  disabled={uploading}
                  size="compact"
                  cameraLabel="Photo"
                  libraryLabel="Library"
                  className="min-w-[12rem] flex-1 sm:flex-none"
                />
              )}
              {canParticipate && (
                <select
                  aria-label="Mention a player"
                  value={mention}
                  onChange={(event) => setMention(event.target.value)}
                  className="control min-h-11 min-w-0 flex-1 text-sm"
                >
                  <option value="">Mention</option>
                  {(profiles.data ?? [])
                    .filter((row) => row.id !== user?.id)
                    .map((row) => (
                      <option key={row.id} value={row.id}>
                        @{authorName(row.id)}
                      </option>
                    ))}
                </select>
              )}
              <button
                type="button"
                disabled={!canParticipate || !draft.trim() || story.addComment.isPending}
                onClick={submitPost}
                className="press btn-gold flex min-h-11 items-center gap-2 px-4 text-sm font-semibold"
              >
                <Send className="size-4" /> Post
              </button>
            </div>
            {canUpload && (
              <details className="mt-2">
                <summary className="press t-micro flex min-h-11 cursor-pointer list-none items-center font-semibold text-muted-foreground [&::-webkit-details-marker]:hidden">
                  Photo details and accessibility
                </summary>
                <div className="grid gap-2 pb-1 sm:grid-cols-3">
                  <label className="t-micro">
                    Round
                    <select
                      value={photoRound}
                      onChange={(event) => setPhotoRound(event.target.value)}
                      className="control mt-1 min-h-11 w-full text-base"
                    >
                      <option value="">Weekend</option>
                      {rounds.map((round) => (
                        <option key={round.id} value={round.id}>
                          {round.day_label} · {round.course}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="t-micro">
                    Event
                    <input
                      value={photoEvent}
                      onChange={(event) => setPhotoEvent(event.target.value)}
                      maxLength={60}
                      className="control mt-1 min-h-11 w-full text-base"
                      placeholder="Dinner, awards…"
                    />
                  </label>
                  <label className="t-micro">
                    Image description
                    <input
                      value={photoAlt}
                      onChange={(event) => setPhotoAlt(event.target.value)}
                      maxLength={180}
                      className="control mt-1 min-h-11 w-full text-base"
                      placeholder="Who or what is pictured?"
                    />
                  </label>
                </div>
              </details>
            )}
          </div>
        </div>
      </div>
      )}

      {canModerate && story.clubhouseEnabled && (
        <details className="surface-inset overflow-hidden">
          <summary className="press flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <Megaphone className="size-4 text-gold-light" /> Organizer announcement
            </span>
            <span className="t-micro">Compose</span>
          </summary>
          <form
            className="space-y-3 border-t border-border p-4"
            onSubmit={(event) => {
              event.preventDefault();
              const hours = Number(announcementHours);
              const expiresAt =
                Number.isFinite(hours) && hours > 0
                  ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
                  : null;
              story.addAnnouncement.mutate(
                { body: announcement, expiresAt },
                {
                  onSuccess: () => {
                    setAnnouncement("");
                    toast.success("Announcement pinned");
                  },
                  onError: (error) => toast.error(error.message),
                },
              );
            }}
          >
            <label className="sr-only" htmlFor="announcement-body">
              Announcement
            </label>
            <textarea
              id="announcement-body"
              value={announcement}
              onChange={(event) => setAnnouncement(event.target.value)}
              maxLength={500}
              rows={3}
              className="control w-full resize-none text-base"
              placeholder="What does everyone need to know?"
            />
            <div className="flex flex-wrap items-end gap-2">
              <label className="t-micro min-w-32 flex-1">
                Expires after
                <select
                  value={announcementHours}
                  onChange={(event) => setAnnouncementHours(event.target.value)}
                  className="control mt-1 min-h-11 w-full text-base"
                >
                  <option value="6">6 hours</option>
                  <option value="24">24 hours</option>
                  <option value="48">48 hours</option>
                  <option value="0">No expiration</option>
                </select>
              </label>
              <button
                type="submit"
                disabled={!announcement.trim() || story.addAnnouncement.isPending}
                className="press btn-gold flex min-h-11 items-center gap-2 px-4 text-sm font-semibold"
              >
                <Megaphone className="size-4" /> Publish and pin
              </button>
            </div>
          </form>
        </details>
      )}

      <div
        className="no-scrollbar flex gap-2 overflow-x-auto pb-1"
        role="tablist"
        aria-label="Feed filter"
      >
        {(
          [
            "all",
            ...(story.clubhouseEnabled ? ["clubhouse" as const] : []),
            "scores",
            "photos",
          ] as FeedFilter[]
        ).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            onClick={() => onFilter(value)}
            className={`press chip min-h-11 shrink-0 capitalize ${filter === value ? "chip-on" : ""}`}
          >
            {value === "scores" ? "Results" : value}
          </button>
        ))}
      </div>

      <div className={compact ? "space-y-2" : "space-y-3"}>
        {showClubhouse && story.clubhouseEnabled && (
          <ClubhouseEngagement
            userId={user?.id}
            playerId={profile?.player_id}
            players={players}
            canModerate={canModerate}
          />
        )}
        {showClubhouse &&
          story.clubhousePosts.map((post) => {
            const reactionKey = `clubhouse-post:${post.id}`;
            const reactions = story.reactions.filter((row) => row.moment_key === reactionKey);
            const reported = story.reports.some(
              (row) => row.comment_id === post.id && row.reporter_id === user?.id,
            );
            return (
              <article
                key={post.id}
                id={`post-${post.id}`}
                className={`feed-card ${post.pinned_at ? "announcement-card" : ""}`}
              >
                <header className="flex items-start gap-3">
                  <Avatar
                    name={authorName(post.author_id)}
                    teamSlug={authorTeam(post.author_id)}
                    src={authorAvatar(post.author_id)}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3 className="text-base font-semibold text-foreground">
                        {authorName(post.author_id)}
                      </h3>
                      {profileById.get(post.author_id)?.flair && (
                        <span className="player-flair">
                          {profileById
                            .get(post.author_id)
                            ?.flair?.replace("vibes", "vibes captain")}
                        </span>
                      )}
                      {post.pinned_at && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold-light">
                          <Pin className="size-3" /> Pinned
                        </span>
                      )}
                    </div>
                    <p className="t-micro">{formatActivityTime(post.created_at)}</p>
                    {profileById.get(post.author_id)?.status_text && (
                      <p className="t-micro mt-0.5 text-foreground/70">
                        {profileById.get(post.author_id)?.status_text}
                      </p>
                    )}
                  </div>
                  {(post.author_id === user?.id || canModerate || canParticipate) && (
                    <details className="relative">
                      <summary className="press flex size-11 cursor-pointer list-none items-center justify-center rounded-full text-muted-foreground [&::-webkit-details-marker]:hidden">
                        <MoreHorizontal className="size-5" />
                        <span className="sr-only">Post actions</span>
                      </summary>
                      <div className="absolute right-0 top-11 z-10 min-w-36 rounded-xl border border-border bg-popover p-1 shadow-xl">
                        {canModerate && (
                          <button
                            type="button"
                            onClick={() =>
                              story.pinPost.mutate({ id: post.id, pinned: !post.pinned_at })
                            }
                            className="press min-h-11 w-full rounded-lg px-3 text-left text-sm"
                          >
                            {post.pinned_at ? "Unpin" : "Pin announcement"}
                          </button>
                        )}
                        {post.author_id === user?.id && (
                          <button
                            type="button"
                            onClick={() => setEditing({ id: post.id, body: post.body })}
                            className="press min-h-11 w-full rounded-lg px-3 text-left text-sm"
                          >
                            Edit post
                          </button>
                        )}
                        {post.author_id === user?.id || canModerate ? (
                          <button
                            type="button"
                            onClick={() =>
                              story.removeComment.mutate({
                                id: post.id,
                                moderate: post.author_id !== user?.id,
                              })
                            }
                            className="press min-h-11 w-full rounded-lg px-3 text-left text-sm text-copper"
                          >
                            {post.author_id === user?.id ? "Delete" : "Hide post"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={reported}
                            onClick={() => story.reportPost.mutate({ commentId: post.id })}
                            className="press min-h-11 w-full rounded-lg px-3 text-left text-sm text-copper"
                          >
                            {reported ? "Reported" : "Report"}
                          </button>
                        )}
                      </div>
                    </details>
                  )}
                </header>
                {editing?.id === post.id ? (
                  <form
                    className="mt-3 space-y-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      story.editComment.mutate(
                        { id: post.id, body: editing.body },
                        {
                          onSuccess: () => {
                            setEditing(null);
                            toast.success("Post updated");
                          },
                          onError: (error) => toast.error(error.message),
                        },
                      );
                    }}
                  >
                    <textarea
                      autoFocus
                      aria-label="Edit post"
                      value={editing.body}
                      onChange={(event) => setEditing({ id: post.id, body: event.target.value })}
                      maxLength={500}
                      rows={3}
                      className="control w-full resize-none text-base"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={!editing.body.trim() || story.editComment.isPending}
                        className="press btn-gold flex min-h-11 items-center gap-2 px-3 text-sm font-semibold"
                      >
                        <Pencil className="size-4" /> Save edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="press btn-quiet flex min-h-11 items-center gap-2 px-3 text-sm"
                      >
                        <X className="size-4" /> Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="mt-3 whitespace-pre-wrap text-[0.98rem] leading-7 text-foreground/95">
                    {post.body}
                  </p>
                )}
                {post.updated_at !== post.created_at && <p className="t-micro mt-1">Edited</p>}
                {post.pinned_at && post.announcement_expires_at && (
                  <p className="t-micro mt-2 flex items-center gap-1">
                    <Clock3 className="size-3.5" /> Announcement expires{" "}
                    {new Date(post.announcement_expires_at).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                )}
                <ReactionBar
                  momentKey={reactionKey}
                  reactions={reactions}
                  userId={user?.id}
                  enabled={canParticipate}
                  onToggle={(kind) => story.toggleReaction.mutate({ momentKey: reactionKey, kind })}
                />
              </article>
            );
          })}

        {moments.map((moment) => {
          const reactions = story.reactions.filter((row) => row.moment_key === moment.key);
          const comments = story.comments.filter((comment) => comment.moment_key === moment.key);
          const open = openComments[moment.key];
          const mediaUrl = moment.mediaPath ? mediaUrls[moment.mediaPath] : null;
          const origin =
            typeof window === "undefined" ? "https://www.tincupinv.com" : window.location.origin;
          const canonicalUrl = `${origin}/?feed=${moment.kind === "photo" ? "photos" : "scores"}&post=${encodeURIComponent(moment.key)}`;
          return (
            <article
              key={moment.key}
              id={`post-${moment.key}`}
              className="feed-card overflow-hidden"
            >
              {mediaUrl && (
                <img
                  src={mediaUrl}
                  alt={moment.detail || moment.title}
                  className="max-h-[34rem] w-full bg-black/20 object-cover"
                />
              )}
              <div className="p-4 sm:p-5">
                <header className="flex items-start gap-3">
                  <Avatar
                    name={moment.playerName || "Tin Cup"}
                    teamSlug={moment.teamSlug}
                    src={authorAvatar(moment.authorId, moment.playerId, moment.playerName)}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="t-eyebrow flex items-center gap-1.5 text-muted-foreground">
                      <MomentIcon kind={moment.kind} /> {moment.kind.replace("-", " ")}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                      {moment.title}
                    </h3>
                    {moment.detail && (
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {moment.detail}
                      </p>
                    )}
                  </div>
                </header>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <ReactionBar
                    momentKey={moment.key}
                    reactions={reactions}
                    userId={user?.id}
                    enabled={canParticipate}
                    onToggle={(kind) =>
                      story.toggleReaction.mutate({ momentKey: moment.key, kind })
                    }
                  />
                  <button
                    type="button"
                    aria-label={`Comments on ${moment.title}, ${comments.length}`}
                    aria-expanded={Boolean(open)}
                    onClick={() =>
                      setOpenComments((current) => ({ ...current, [moment.key]: !open }))
                    }
                    className="press chip min-h-11 gap-1.5"
                  >
                    <MessageCircle className="size-4" /> {comments.length || ""}
                  </button>
                  {moment.shareable && (
                    <ShareMomentButton
                      className="min-h-11 flex-1 sm:flex-none sm:px-4"
                      payload={{
                        kind:
                          moment.kind === "match"
                            ? "match"
                            : moment.kind === "side-bet"
                              ? "side-bet"
                              : moment.kind === "trophy"
                                ? "trophy"
                                : "score",
                        eyebrow: moment.kind.replace("-", " "),
                        title: moment.title,
                        primary: moment.detail || "Tin Cup 2026",
                        canonicalUrl,
                      }}
                    >
                      Share
                    </ShareMomentButton>
                  )}
                </div>
                {open && (
                  <div className="mt-3 space-y-2 border-t border-border pt-3">
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        id={`comment-${comment.id}`}
                        className="rounded-xl bg-secondary/45 px-3 py-2.5"
                      >
                        <p className="text-xs font-semibold text-foreground">
                          {authorName(comment.author_id)}
                        </p>
                        {editing?.id === comment.id ? (
                          <form
                            className="mt-2 space-y-2"
                            onSubmit={(event) => {
                              event.preventDefault();
                              story.editComment.mutate(
                                { id: comment.id, body: editing.body },
                                {
                                  onSuccess: () => setEditing(null),
                                  onError: (error) => toast.error(error.message),
                                },
                              );
                            }}
                          >
                            <textarea
                              autoFocus
                              aria-label="Edit comment"
                              value={editing.body}
                              onChange={(event) =>
                                setEditing({ id: comment.id, body: event.target.value })
                              }
                              maxLength={500}
                              rows={2}
                              className="control w-full resize-none text-base"
                            />
                            <div className="flex gap-2">
                              <button
                                type="submit"
                                className="press btn-gold min-h-11 px-3 text-sm"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditing(null)}
                                className="press btn-quiet min-h-11 px-3 text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <p className="mt-0.5 text-sm text-foreground/90">{comment.body}</p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-3">
                          {comment.updated_at !== comment.created_at && (
                            <span className="t-micro">Edited</span>
                          )}
                          {comment.author_id === user?.id && editing?.id !== comment.id && (
                            <button
                              type="button"
                              onClick={() => setEditing({ id: comment.id, body: comment.body })}
                              className="press t-micro min-h-11"
                            >
                              Edit
                            </button>
                          )}
                          {(comment.author_id === user?.id || canModerate) && (
                            <button
                              type="button"
                              onClick={() =>
                                story.removeComment.mutate(
                                  { id: comment.id, moderate: comment.author_id !== user?.id },
                                  { onError: (error) => toast.error(error.message) },
                                )
                              }
                              className="press t-micro min-h-11 text-copper"
                            >
                              {comment.author_id === user?.id ? "Delete" : "Hide"}
                            </button>
                          )}
                          {canParticipate && comment.author_id !== user?.id && !canModerate && (
                            <button
                              type="button"
                              onClick={() =>
                                story.reportPost.mutate(
                                  { commentId: comment.id },
                                  { onError: (error) => toast.error(error.message) },
                                )
                              }
                              className="press t-micro min-h-11 text-copper"
                            >
                              Report
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {canParticipate && (
                      <form
                        className="flex gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const body = commentDrafts[moment.key]?.trim();
                          if (!body) return;
                          story.addComment.mutate(
                            {
                              momentKey: moment.key,
                              body,
                              mentionedUserId: commentMentions[moment.key] || undefined,
                            },
                            {
                              onSuccess: () => {
                                setCommentDrafts((current) => ({ ...current, [moment.key]: "" }));
                                setCommentMentions((current) => ({ ...current, [moment.key]: "" }));
                              },
                            },
                          );
                        }}
                      >
                        <input
                          aria-label={`Comment on ${moment.title}`}
                          value={commentDrafts[moment.key] ?? ""}
                          onChange={(event) =>
                            setCommentDrafts((current) => ({
                              ...current,
                              [moment.key]: event.target.value,
                            }))
                          }
                          maxLength={500}
                          placeholder="Add a comment"
                          className="control min-h-11 min-w-0 flex-1 text-base"
                        />
                        <select
                          aria-label={`Mention a player on ${moment.title}`}
                          value={commentMentions[moment.key] ?? ""}
                          onChange={(event) =>
                            setCommentMentions((current) => ({
                              ...current,
                              [moment.key]: event.target.value,
                            }))
                          }
                          className="control min-h-11 max-w-28 text-sm"
                        >
                          <option value="">Mention</option>
                          {(profiles.data ?? [])
                            .filter((row) => row.id !== user?.id)
                            .map((row) => (
                              <option key={row.id} value={row.id}>
                                @{authorName(row.id)}
                              </option>
                            ))}
                        </select>
                        <button
                          type="submit"
                          className="press btn-gold flex size-11 items-center justify-center"
                        >
                          <Send className="size-4" /> <span className="sr-only">Post comment</span>
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {story.clubhousePosts.length === 0 && moments.length === 0 && (
        <div className="px-1 py-10 text-center">
          <p className="t-title text-foreground">
            {story.clubhouseEnabled ? "The clubhouse is ready" : "Results land here"}
          </p>
          <p className="t-micro mt-1">
            {story.clubhouseEnabled
              ? "Post the first update, photo, prediction, or result."
              : "Photos and official scores will show up as the weekend starts."}
          </p>
        </div>
      )}
      {matchSocial.unavailable && (
        <p className="t-micro text-muted-foreground">
          Match participation is temporarily read-only.
        </p>
      )}
    </section>
  );
}

function ReactionBar({
  momentKey: _momentKey,
  reactions,
  userId,
  enabled,
  onToggle,
}: {
  momentKey: string;
  reactions: Array<{ kind: string; user_id: string }>;
  userId?: string;
  enabled: boolean;
  onToggle: (kind: ReactionKind) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {REACTIONS.map(({ kind, label, icon: Icon }) => {
        const count = reactions.filter((row) => row.kind === kind).length;
        const mine = reactions.some((row) => row.kind === kind && row.user_id === userId);
        return (
          <button
            key={kind}
            type="button"
            disabled={!enabled}
            aria-label={`${label}, ${count}`}
            aria-pressed={mine}
            onClick={() => onToggle(kind)}
            className={`press chip min-h-11 gap-1 ${mine ? "chip-on" : ""}`}
          >
            <Icon className="size-4" /> {count || ""}
          </button>
        );
      })}
    </div>
  );
}
