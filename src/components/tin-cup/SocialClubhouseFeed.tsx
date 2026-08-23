import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  Check,
  Clock3,
  Flame,
  MoreHorizontal,
  PartyPopper,
  Pin,
  Trophy,
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
import { CLUBHOUSE_MOMENT_KEY, type FeedFilter } from "@/lib/social-platform";
import { buildCardMoments } from "@/lib/the-card";
import { trackProductEvent } from "@/lib/product-analytics";
import { savePreviewPhoto } from "@/lib/preview-media";
import { isPreviewMode } from "@/lib/runtime-mode";
import { claimedPlayerIdFor } from "@/lib/profile-identity";
import {
  buildStoryMoments,
  isHangoutMoment,
  type ReactionKind,
  type StoryComment,
  type StoryMoment,
} from "@/lib/weekend-story";

const REACTIONS: Array<{ kind: ReactionKind; label: string; icon: typeof Flame }> = [
  { kind: "applause", label: "Applause", icon: PartyPopper },
  { kind: "fire", label: "Fire", icon: Flame },
  { kind: "trophy", label: "Trophy", icon: Trophy },
];

function isJunkBody(body?: string | null) {
  const text = (body ?? "").trim();
  return !text || text.toLowerCase() === "test";
}

function fieldReplyKey(postId: string) {
  return `clubhouse-post:${postId}`;
}

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
  filter,
  onFilter,
  canModerate = false,
  canUpload = false,
  compact = false,
  homePeek = false,
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
  homePeek?: boolean;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const story = useWeekendStory(user?.id);
  const matchSocial = useMatchSocial(user?.id, profile?.player_id);
  const activity = useActivityFeed(players, teams);
  const profiles = usePublicProfiles();
  const avatars = usePlayerAvatars(players, teams);
  const [draft, setDraft] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [announcementHours, setAnnouncementHours] = useState("24");
  const playerId = claimedPlayerIdFor(user?.id, profile?.player_id);
  const claimed = Boolean(playerId);
  const canParticipate = Boolean(
    user && claimed && story.enabled && story.clubhouseEnabled,
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
    const teamSlugById = new Map(teams.map((team) => [team.id, team.slug]));
    const predictions = matchSocial.predictionsEnabled
      ? buildCardMoments({
          matches,
          predictions: matchSocial.predictions,
          authorName: (userId) => {
            const row = profileById.get(userId);
            return (
              (row?.player_id && playerById.get(row.player_id)?.name) ||
              row?.display_name ||
              "Player"
            );
          },
          authorPlayer: (userId) => {
            const row = profileById.get(userId);
            const player = row?.player_id ? playerById.get(row.player_id) : undefined;
            return {
              id: player?.id ?? row?.player_id ?? null,
              teamSlug: player ? (teamSlugById.get(player.team_id) ?? null) : null,
            };
          },
        })
      : [];
    return [
      ...buildStoryMoments({ matches, sideBets, trophies, activity: activity.data }),
      ...predictions,
    ]
      .sort((a, b) => b.at - a.at)
      .filter((moment) => {
        if (!isHangoutMoment(moment)) return false;
        if (filter === "all") return true;
        if (filter === "photos") return moment.kind === "photo";
        if (filter === "scores")
          return ["match", "prediction", "side-bet", "trophy", "lead-change"].includes(moment.kind);
        return false;
      });
  }, [
    activity.data,
    filter,
    matchSocial.predictions,
    matchSocial.predictionsEnabled,
    matches,
    playerById,
    profileById,
    sideBets,
    teams,
    trophies,
  ]);
  const showClubhouse = filter === "all" || filter === "clubhouse";
  const photoMomentsAll = moments.filter((moment) => moment.kind === "photo");
  const restMomentsAll = moments.filter((moment) => moment.kind !== "photo");
  const visiblePostsAll = story.clubhousePosts.filter((post) => !isJunkBody(post.body));
  const photoMoments = homePeek ? photoMomentsAll.slice(0, 1) : photoMomentsAll;
  const visiblePosts = homePeek
    ? photoMomentsAll.length
      ? []
      : visiblePostsAll.slice(0, 1)
    : visiblePostsAll;
  const restMoments = homePeek
    ? photoMomentsAll.length || visiblePostsAll.length
      ? []
      : restMomentsAll.slice(0, 1)
    : restMomentsAll;
  const emptyFeed =
    visiblePosts.length === 0 && photoMoments.length === 0 && restMoments.length === 0;
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
    if (!file.type.startsWith("image/")) {
      toast.error("That file isn’t an image");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      toast.error("Keep photos under 12MB");
      return;
    }
    setUploading(true);
    try {
      const caption = draft.trim() || null;
      if (isPreviewMode()) {
        await savePreviewPhoto(file, {
          caption,
          altText: caption,
          courseId: null,
          roundId: null,
          eventTag: null,
          uploadedBy: user?.id ?? null,
        });
        await queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
        setDraft("");
        void trackProductEvent("clubhouse_post", { kind: "photo" });
        toast.success("Photo added to this protected preview");
        return;
      }
      const storagePath = await uploadVaultImage(file, "photos");
      await graphqlRequest(
        `mutation AddPhoto($fileId: String!, $caption: String) {
          insert_photos_one(object: {storage_path: $fileId, caption: $caption}) { id }
        }`,
        { fileId: storagePath, caption },
      );
      setDraft("");
      await queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
      await queryClient.invalidateQueries({ queryKey: ["story-comments"] });
      void trackProductEvent("clubhouse_post", { kind: "photo" });
      toast.success("Photo added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add photo");
    } finally {
      setUploading(false);
    }
  }

  function react(momentKey: string, kind: ReactionKind) {
    if (!canParticipate) {
      void navigate({ to: "/profile" });
      return;
    }
    story.toggleReaction.mutate(
      { momentKey, kind },
      { onError: (error) => toast.error(error.message) },
    );
  }

  function submitPost() {
    const body = draft.trim();
    if (!body) return;
    story.addComment.mutate(
      { momentKey: CLUBHOUSE_MOMENT_KEY, body },
      {
        onSuccess: () => {
          setDraft("");
          void trackProductEvent("clubhouse_post", { kind: "text" });
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  return (
    <section aria-labelledby="updates-title" className="stack-tight">
      <div className="flex items-end justify-between gap-3 px-1">
        <h2 id="updates-title" className="t-eyebrow">
          Field
        </h2>
        {story.unreadCount > 0 && (
          <span className="t-micro">
            {story.unreadCount} new
          </span>
        )}
      </div>

      {!homePeek && user && claimed && canParticipate ? (
        <div className="feed-composer surface-raised p-2.5 sm:p-3">
          <div className="flex gap-3">
            <Avatar
              name={profile?.display_name || "You"}
              teamSlug={profile?.player_id ? authorTeam(user?.id ?? "") : undefined}
              src={authorAvatar(user?.id, profile?.player_id)}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <label className="sr-only" htmlFor="clubhouse-post">
                Post to the field
              </label>
              <textarea
                id="clubhouse-post"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                disabled={!canParticipate}
                maxLength={500}
                rows={2}
                placeholder="What’s going on…"
                className="control w-full resize-none border-0 bg-transparent px-0 text-base shadow-none focus:ring-0"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {canUpload ? (
                  <PhotoPicker
                    onFile={(file) => void uploadPhoto(file)}
                    disabled={uploading}
                    size="compact"
                    cameraLabel="Camera"
                    libraryLabel="Library"
                    className="min-w-0"
                  />
                ) : null}
                <button
                  type="button"
                  disabled={!canParticipate || !draft.trim() || story.addComment.isPending}
                  onClick={submitPost}
                  className={`press min-h-11 px-4 text-sm font-semibold ${
                    draft.trim() ? "btn-primary" : "btn-quiet"
                  }`}
                >
                  {uploading ? "Adding…" : "Post"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {!homePeek && canModerate && story.clubhouseEnabled && (
        <details className="surface-inset overflow-hidden">
          <summary className="press flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 t-body font-medium text-foreground [&::-webkit-details-marker]:hidden">
            <span>Organizer announcement</span>
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
                className="press btn-primary min-h-11 px-4 text-sm font-semibold"
              >
                Publish and pin
              </button>
            </div>
          </form>
        </details>
      )}

      {!homePeek && canModerate && (!emptyFeed || filter !== "all") && (
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
              className={`press chip min-h-11 shrink-0 ${filter === value ? "chip-on" : ""}`}
            >
              {value === "scores"
                ? "Results"
                : value === "clubhouse"
                  ? "Field"
                  : value === "photos"
                    ? "Photos"
                    : "All"}
            </button>
          ))}
        </div>
      )}

      <div className={compact ? "space-y-2" : "space-y-4"}>
        {!homePeek && showClubhouse && story.clubhouseEnabled && canParticipate ? (
          <ClubhouseEngagement
            userId={user?.id}
            playerId={profile?.player_id}
            players={players}
            canModerate={canModerate}
          />
        ) : null}
                {photoMoments.map((moment) => {
          const reactions = story.reactions.filter((row) => row.moment_key === moment.key);
          const comments = story.comments.filter((comment) => comment.moment_key === moment.key);
          const open = openComments[moment.key];
          const mediaUrl = moment.mediaPath ? mediaUrls[moment.mediaPath] : null;
          return (
            <article key={moment.key} id={`post-${moment.key}`} className="feed-photo overflow-hidden">
              {mediaUrl ? (
                <div className="flex justify-center bg-secondary">
                  <img
                    src={mediaUrl}
                    alt={moment.detail || moment.playerName || "Field photo"}
                    className="h-auto max-h-[32rem] w-auto max-w-full object-contain"
                  />
                </div>
              ) : moment.mediaPath ? (
                <div className="skeleton h-48 w-full" />
              ) : null}
              <div className="px-4 py-3.5">
                <header className="flex items-start gap-3">
                  <Avatar
                    name={moment.playerName || "Tin Cup"}
                    teamSlug={moment.teamSlug}
                    src={authorAvatar(moment.authorId, moment.playerId, moment.playerName)}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-foreground">
                      {moment.playerName || "Player"}
                    </h3>
                    <p className="t-micro">
                      {formatActivityTime(new Date(moment.at).toISOString())}
                    </p>
                    {moment.detail && !isJunkBody(moment.detail) ? (
                      <p className="mt-1 text-[0.98rem] leading-7 text-foreground/95">
                        {moment.detail}
                      </p>
                    ) : null}
                  </div>
                </header>
                <ReactionBar
                  visible={canParticipate}
                  momentKey={moment.key}
                  reactions={reactions}
                  userId={user?.id}
                  onToggle={(kind) => react(moment.key, kind)}
                />
                <CommentThread
                  momentKey={moment.key}
                  label={moment.playerName || "photo"}
                  comments={comments}
                  open={Boolean(open)}
                  onToggle={() =>
                    setOpenComments((current) => ({ ...current, [moment.key]: !open }))
                  }
                  canParticipate={canParticipate}
                  canModerate={canModerate}
                  userId={user?.id}
                  authorName={authorName}
                  editing={editing}
                  setEditing={setEditing}
                  draft={commentDrafts[moment.key] ?? ""}
                  setDraft={(body) =>
                    setCommentDrafts((current) => ({ ...current, [moment.key]: body }))
                  }
                  onPost={(body) =>
                    story.addComment.mutate(
                      { momentKey: moment.key, body },
                      {
                        onSuccess: () =>
                          setCommentDrafts((current) => ({ ...current, [moment.key]: "" })),
                        onError: (error) => toast.error(error.message),
                      },
                    )
                  }
                  onEdit={(id, body) =>
                    story.editComment.mutate(
                      { id, body },
                      {
                        onSuccess: () => setEditing(null),
                        onError: (error) => toast.error(error.message),
                      },
                    )
                  }
                  onRemove={(id, moderate) =>
                    story.removeComment.mutate(
                      { id, moderate },
                      { onError: (error) => toast.error(error.message) },
                    )
                  }
                  onReport={(commentId) =>
                    story.reportPost.mutate(
                      { commentId },
                      { onError: (error) => toast.error(error.message) },
                    )
                  }
                />
              </div>
            </article>
          );
        })}

        <div className="feed-moments divide-y divide-border overflow-hidden empty:hidden">
          {showClubhouse &&
            visiblePosts
            .map((post) => {
              const reactionKey = `clubhouse-post:${post.id}`;
              const reactions = story.reactions.filter((row) => row.moment_key === reactionKey);
              const reported = story.reports.some(
                (row) => row.comment_id === post.id && row.reporter_id === user?.id,
              );
              return (
                <article
                  key={post.id}
                  id={`post-${post.id}`}
                  className={`px-4 py-2.5 ${post.pinned_at ? "announcement-card" : ""}`}
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
                          <span className="inline-flex items-center gap-1 px-1 text-xs font-semibold text-hunter">
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
                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={!editing.body.trim() || story.editComment.isPending}
                          className="press t-micro min-h-11 px-1 font-semibold text-hunter"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(null)}
                          className="press t-micro min-h-11 px-1"
                        >
                          Cancel
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
                    visible={canParticipate}
                    momentKey={reactionKey}
                    reactions={reactions}
                    userId={user?.id}
                    onToggle={(kind) => react(reactionKey, kind)}
                  />
                  <CommentThread
                    momentKey={fieldReplyKey(post.id)}
                    label={`post by ${authorName(post.author_id)}`}
                    comments={story.comments.filter(
                      (row) => row.moment_key === fieldReplyKey(post.id),
                    )}
                    open={Boolean(openComments[fieldReplyKey(post.id)])}
                    onToggle={() =>
                      setOpenComments((current) => ({
                        ...current,
                        [fieldReplyKey(post.id)]: !current[fieldReplyKey(post.id)],
                      }))
                    }
                    canParticipate={canParticipate}
                    canModerate={canModerate}
                    userId={user?.id}
                    authorName={authorName}
                    editing={editing}
                    setEditing={setEditing}
                    draft={commentDrafts[fieldReplyKey(post.id)] ?? ""}
                    setDraft={(body) =>
                      setCommentDrafts((current) => ({
                        ...current,
                        [fieldReplyKey(post.id)]: body,
                      }))
                    }
                    onPost={(body) =>
                      story.addComment.mutate(
                        { momentKey: fieldReplyKey(post.id), body },
                        {
                          onSuccess: () =>
                            setCommentDrafts((current) => ({
                              ...current,
                              [fieldReplyKey(post.id)]: "",
                            })),
                          onError: (error) => toast.error(error.message),
                        },
                      )
                    }
                    onEdit={(id, body) =>
                      story.editComment.mutate(
                        { id, body },
                        {
                          onSuccess: () => setEditing(null),
                          onError: (error) => toast.error(error.message),
                        },
                      )
                    }
                    onRemove={(id, moderate) =>
                      story.removeComment.mutate(
                        { id, moderate },
                        { onError: (error) => toast.error(error.message) },
                      )
                    }
                    onReport={(commentId) =>
                      story.reportPost.mutate(
                        { commentId },
                        { onError: (error) => toast.error(error.message) },
                      )
                    }
                  />
                </article>
              );
            })}

          {restMoments.map((moment) => {
            const reactions = story.reactions.filter((row) => row.moment_key === moment.key);
            const comments = story.comments.filter((comment) => comment.moment_key === moment.key);
            const open = openComments[moment.key];
            const mediaUrl = moment.mediaPath ? mediaUrls[moment.mediaPath] : null;
            const origin =
              typeof window === "undefined" ? "https://www.tincupinv.com" : window.location.origin;
            const canonicalUrl = `${origin}/?feed=${moment.kind === "photo" ? "photos" : "scores"}&post=${encodeURIComponent(moment.key)}`;
            return (
              <article key={moment.key} id={`post-${moment.key}`}>
                {moment.kind === "photo" && mediaUrl ? (
                  <div className="flex justify-center bg-secondary">
                    <img
                      src={mediaUrl}
                      alt={moment.detail || moment.title}
                      className="h-auto max-h-[32rem] w-auto max-w-full object-contain"
                    />
                  </div>
                ) : moment.kind === "photo" && moment.mediaPath ? (
                  <div className="skeleton h-48 w-full" />
                ) : null}
                <div className="px-4 py-3.5">
                  <header className="flex items-start gap-3">
                    <Avatar
                      name={moment.playerName || "Tin Cup"}
                      teamSlug={moment.teamSlug}
                      src={authorAvatar(moment.authorId, moment.playerId, moment.playerName)}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      {moment.kind === "photo" ? (
                        <>
                          <h3 className="text-base font-semibold text-foreground">
                            {moment.playerName || "Player"}
                          </h3>
                          <p className="t-micro">
                            {formatActivityTime(new Date(moment.at).toISOString())}
                          </p>
                          {moment.detail && !isJunkBody(moment.detail) ? (
                            <p className="mt-1 text-[0.98rem] leading-7 text-foreground/95">
                              {moment.detail}
                            </p>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <p className="t-micro flex items-center gap-1.5 text-muted-foreground">
                            <MomentIcon kind={moment.kind} /> {moment.kind.replace("-", " ")}
                          </p>
                          <h3 className="t-body mt-1 font-medium text-foreground">{moment.title}</h3>
                          {moment.detail ? (
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                              {moment.detail}
                            </p>
                          ) : null}
                        </>
                      )}
                    </div>
                  </header>
                  <div className="mt-3">
                    <ReactionBar
                      visible={canParticipate}
                      momentKey={moment.key}
                      reactions={reactions}
                      userId={user?.id}
                      onToggle={(kind) => react(moment.key, kind)}
                    />
                    <CommentThread
                      momentKey={moment.key}
                      label={moment.title}
                      comments={comments}
                      open={Boolean(open)}
                      onToggle={() =>
                        setOpenComments((current) => ({ ...current, [moment.key]: !open }))
                      }
                      canParticipate={canParticipate}
                      canModerate={canModerate}
                      userId={user?.id}
                      authorName={authorName}
                      editing={editing}
                      setEditing={setEditing}
                      draft={commentDrafts[moment.key] ?? ""}
                      setDraft={(body) =>
                        setCommentDrafts((current) => ({ ...current, [moment.key]: body }))
                      }
                      onPost={(body) =>
                        story.addComment.mutate(
                          { momentKey: moment.key, body },
                          {
                            onSuccess: () =>
                              setCommentDrafts((current) => ({ ...current, [moment.key]: "" })),
                            onError: (error) => toast.error(error.message),
                          },
                        )
                      }
                      onEdit={(id, body) =>
                        story.editComment.mutate(
                          { id, body },
                          {
                            onSuccess: () => setEditing(null),
                            onError: (error) => toast.error(error.message),
                          },
                        )
                      }
                      onRemove={(id, moderate) =>
                        story.removeComment.mutate(
                          { id, moderate },
                          { onError: (error) => toast.error(error.message) },
                        )
                      }
                      onReport={(commentId) =>
                        story.reportPost.mutate(
                          { commentId },
                          { onError: (error) => toast.error(error.message) },
                        )
                      }
                      trailing={
                        moment.shareable ? (
                          <ShareMomentButton
                            className="!min-h-11 !border-0 !bg-transparent !px-1"
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
                        ) : null
                      }
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {emptyFeed && (
        <p className="t-micro px-1 py-1">Nothing on the field yet.</p>
      )}
      {canParticipate && matchSocial.unavailable ? (
        <p className="t-micro text-muted-foreground">Field tools are temporarily read-only.</p>
      ) : null}
    </section>
  );
}

function CommentThread({
  momentKey: _momentKey,
  label,
  comments,
  open,
  onToggle,
  canParticipate,
  canModerate,
  userId,
  authorName,
  editing,
  setEditing,
  draft,
  setDraft,
  onPost,
  onEdit,
  onRemove,
  onReport,
  trailing = null,
}: {
  momentKey: string;
  label: string;
  comments: StoryComment[];
  open: boolean;
  onToggle: () => void;
  canParticipate: boolean;
  canModerate: boolean;
  userId?: string;
  authorName: (id: string) => string;
  editing: { id: string; body: string } | null;
  setEditing: (value: { id: string; body: string } | null) => void;
  draft: string;
  setDraft: (body: string) => void;
  onPost: (body: string) => void;
  onEdit: (id: string, body: string) => void;
  onRemove: (id: string, moderate: boolean) => void;
  onReport: (commentId: string) => void;
  trailing?: ReactNode;
}) {
  if (!canParticipate) return trailing ? <div className="mt-2">{trailing}</div> : null;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-label={`Comments on ${label}, ${comments.length}`}
          aria-expanded={open}
          onClick={onToggle}
          className="press t-micro inline-flex min-h-11 items-center px-1 font-semibold"
        >
          {comments.length ? `${comments.length} replies` : "Reply"}
        </button>
        {trailing}
      </div>
      {open ? (
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
                    onEdit(comment.id, editing.body);
                  }}
                >
                  <textarea
                    autoFocus
                    aria-label="Edit comment"
                    value={editing.body}
                    onChange={(event) => setEditing({ id: comment.id, body: event.target.value })}
                    maxLength={500}
                    rows={2}
                    className="control w-full resize-none text-base"
                  />
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="press t-micro min-h-11 px-1 font-semibold text-hunter"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="press t-micro min-h-11 px-1"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <p className="mt-0.5 text-sm text-foreground/90">{comment.body}</p>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-3">
                {comment.updated_at !== comment.created_at ? (
                  <span className="t-micro">Edited</span>
                ) : null}
                {comment.author_id === userId && editing?.id !== comment.id ? (
                  <button
                    type="button"
                    onClick={() => setEditing({ id: comment.id, body: comment.body })}
                    className="press t-micro min-h-11"
                  >
                    Edit
                  </button>
                ) : null}
                {comment.author_id === userId || canModerate ? (
                  <button
                    type="button"
                    onClick={() => onRemove(comment.id, comment.author_id !== userId)}
                    className="press t-micro min-h-11 text-copper"
                  >
                    {comment.author_id === userId ? "Delete" : "Hide"}
                  </button>
                ) : null}
                {canParticipate && comment.author_id !== userId && !canModerate ? (
                  <button
                    type="button"
                    onClick={() => onReport(comment.id)}
                    className="press t-micro min-h-11 text-copper"
                  >
                    Report
                  </button>
                ) : null}
              </div>
            </div>
          ))}
          {canParticipate ? (
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const body = draft.trim();
                if (!body) return;
                onPost(body);
              }}
            >
              <input
                aria-label={`Comment on ${label}`}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={500}
                placeholder="Write a reply"
                className="control min-h-11 min-w-0 flex-1 text-base"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className={`press min-h-11 px-3 text-sm font-semibold ${
                  draft.trim() ? "btn-primary" : "btn-quiet"
                }`}
              >
                Post
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ReactionBar({
  momentKey: _momentKey,
  reactions,
  userId,
  onToggle,
  visible = true,
}: {
  momentKey: string;
  reactions: Array<{ kind: string; user_id: string }>;
  userId?: string;
  onToggle: (kind: ReactionKind) => void;
  visible?: boolean;
}) {
  if (!visible) return null;
  return (
    <div className="mt-2 flex gap-1">
      {REACTIONS.map(({ kind, label, icon: Icon }) => {
        const count = reactions.filter((row) => row.kind === kind).length;
        const mine = reactions.some((row) => row.kind === kind && row.user_id === userId);
        return (
          <button
            key={kind}
            type="button"
            aria-label={`${label}, ${count}`}
            aria-pressed={mine}
            onClick={() => onToggle(kind)}
            className={`press inline-flex min-h-11 items-center gap-1 rounded-full px-2.5 t-micro ${
              mine ? "chip-on" : "text-muted-foreground"
            }`}
          >
            <Icon className="size-3.5" /> {count || ""}
          </button>
        );
      })}
    </div>
  );
}
