import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Check, Clock3, MoreHorizontal, Pin, Trophy } from "lucide-react";
import { toast } from "sonner";

import { Avatar } from "@/components/tin-cup/Avatar";
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
import { TALK_MAX, isJunkBody, isJunkCaption, maskGuestProfanity } from "@/lib/locker-copy";
import { rosterName } from "@/lib/profile-identity";
import { CLUBHOUSE_MOMENT_KEY, type FeedFilter } from "@/lib/social-platform";
import { trackProductEvent } from "@/lib/product-analytics";
import { savePreviewPhoto } from "@/lib/preview-media";
import { isPreviewMode } from "@/lib/runtime-mode";
import {
  LOCKER_REACTIONS,
  buildStoryMoments,
  isBoardMoment,
  isHangoutMoment,
  isResultsMoment,
  type ReactionKind,
  type StoryComment,
  type StoryMoment,
} from "@/lib/weekend-story";

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const story = useWeekendStory(user?.id);
  const matchSocial = useMatchSocial(user?.id, profile?.player_id);
  const signedIn = Boolean(user);
  const activity = useActivityFeed(players, teams);
  const profiles = usePublicProfiles();
  const avatars = usePlayerAvatars(players, teams);
  const [draft, setDraft] = useState("");
  const [tagPlayerId, setTagPlayerId] = useState("");
  const [tagMatch, setTagMatch] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [announcementHours, setAnnouncementHours] = useState("24");
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
    return buildStoryMoments({ matches, sideBets, trophies, activity: activity.data })
      .sort((a, b) => b.at - a.at)
      .filter((moment) => {
        if (!isHangoutMoment(moment)) return false;
        if (moment.kind === "prediction") return false;
        if (moment.kind === "photo" && isJunkCaption(moment.detail)) return false;
        if (filter === "photos") return isBoardMoment(moment);
        if (filter === "scores") return isResultsMoment(moment);
        return isBoardMoment(moment) || isResultsMoment(moment);
      });
  }, [activity.data, filter, matches, sideBets, trophies]);
  const showClubhouse = filter !== "photos" && filter !== "scores";
  const photoMoments = moments.filter((moment) => moment.kind === "photo");
  const resultMoments = moments.filter((moment) => isResultsMoment(moment));
  const restMoments = filter === "scores" ? resultMoments : [];
  const hasResults = resultMoments.length > 0;
  const emptyFeed =
    story.clubhousePosts.length === 0 && photoMoments.length === 0 && restMoments.length === 0;
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
    return rosterName({
      userId: authorId,
      players,
      profiles: profiles.data ?? [],
    });
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
    const raw = draft.trim();
    if (!raw) return;
    const taggedPlayer = players.find((player) => player.id === tagPlayerId);
    const prefix = [taggedPlayer ? `@${taggedPlayer.name.split(/\s+/)[0]}` : null, tagMatch || null]
      .filter(Boolean)
      .join(" ");
    const body = (prefix ? `${prefix} ${raw}` : raw).slice(0, TALK_MAX);
    const mentionedUserId = taggedPlayer
      ? (profiles.data ?? []).find((row) => row.player_id === taggedPlayer.id)?.id
      : undefined;
    story.addComment.mutate(
      { momentKey: CLUBHOUSE_MOMENT_KEY, body, mentionedUserId },
      {
        onSuccess: () => {
          setDraft("");
          setTagPlayerId("");
          setTagMatch("");
          void trackProductEvent("clubhouse_post", { kind: "text" });
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  return (
    <section aria-labelledby="updates-title" className="stack-tight">
      <div className="flex items-end justify-between gap-3">
        <h2 id="updates-title" className="t-eyebrow">
          Board
        </h2>
        {story.unreadCount > 0 && (
          <span className="rounded-full bg-hunter px-2.5 py-1 text-xs font-bold text-primary-foreground">
            {story.unreadCount} new
          </span>
        )}
      </div>

      {!user ? (
        <Link
          to="/profile"
          className="press surface flex min-h-12 items-center justify-between px-4 py-3"
        >
          <span className="t-body font-medium text-foreground">Sign in to post</span>
          <span className="t-micro">Account</span>
        </Link>
      ) : !canParticipate ? (
        <Link
          to="/profile"
          className="press surface flex min-h-12 items-center justify-between px-4 py-3"
        >
          <span className="t-body font-medium text-foreground">Claim your name to post</span>
          <span className="t-micro">Account</span>
        </Link>
      ) : (
        <div className="feed-composer surface p-2.5 sm:p-3">
          <div className="flex gap-3">
            <Avatar
              name={(profile?.player_id && playerById.get(profile.player_id)?.name) || "You"}
              teamSlug={profile?.player_id ? authorTeam(user?.id ?? "") : undefined}
              src={authorAvatar(user?.id, profile?.player_id)}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <label className="sr-only" htmlFor="clubhouse-post">
                Talk
              </label>
              <textarea
                id="clubhouse-post"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                disabled={!canParticipate}
                maxLength={TALK_MAX}
                rows={2}
                placeholder="Talk your shit"
                className="control w-full resize-none border-0 bg-transparent px-0 text-base shadow-none focus:ring-0"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor="talk-tag-player">
                  Tag a player
                </label>
                <select
                  id="talk-tag-player"
                  value={tagPlayerId}
                  onChange={(event) => setTagPlayerId(event.target.value)}
                  className="control min-h-11 max-w-[9.5rem] text-sm"
                >
                  <option value="">Player</option>
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name.split(/\s+/)[0]}
                    </option>
                  ))}
                </select>
                <label className="sr-only" htmlFor="talk-tag-match">
                  Tag a match
                </label>
                <select
                  id="talk-tag-match"
                  value={tagMatch}
                  onChange={(event) => setTagMatch(event.target.value)}
                  className="control min-h-11 max-w-[10rem] text-sm"
                >
                  <option value="">Match</option>
                  {matches
                    .filter(
                      (match, index, list) =>
                        list.findIndex(
                          (row) => row.side_a === match.side_a && row.side_b === match.side_b,
                        ) === index,
                    )
                    .slice(0, 8)
                    .map((match) => {
                      const label = `${(match.side_a ?? "TBD").split("/")[0]?.trim()} vs ${(match.side_b ?? "TBD").split("/")[0]?.trim()}`;
                      return (
                        <option key={match.id} value={label}>
                          {label}
                        </option>
                      );
                    })}
                </select>
                {canUpload ? (
                  <PhotoPicker
                    onFile={(file) => void uploadPhoto(file)}
                    disabled={uploading}
                    size="compact"
                    single
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
      )}

      {canModerate && story.clubhouseEnabled && (
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

      {hasResults && (
        <div
          className="no-scrollbar flex gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Board filter"
        >
          {(["all", "scores"] as FeedFilter[]).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value || (value === "all" && filter !== "scores")}
              onClick={() => onFilter(value)}
              className={`press chip min-h-11 shrink-0 ${
                (value === "scores" ? filter === "scores" : filter !== "scores") ? "chip-on" : ""
              }`}
            >
              {value === "scores" ? "Results" : "Board"}
            </button>
          ))}
        </div>
      )}

      <div className={compact ? "space-y-2" : "space-y-3"}>
        <div className="surface divide-y divide-border overflow-hidden empty:hidden">
          {showClubhouse &&
            story.clubhousePosts
              .filter((post) => !isJunkBody(post.body))
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
                    className={`px-4 py-3.5 ${post.pinned_at ? "announcement-card" : ""}`}
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
                            <span className="inline-flex items-center gap-1 rounded-full bg-hunter/15 px-2 py-0.5 text-xs font-semibold text-hunter">
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
                          onChange={(event) =>
                            setEditing({ id: post.id, body: event.target.value })
                          }
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
                        {maskGuestProfanity(post.body, signedIn)}
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
                          {moment.detail ? (
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
                          <h3 className="t-title mt-1 text-foreground">{moment.title}</h3>
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
        {photoMoments.map((moment) => {
          const reactions = story.reactions.filter((row) => row.moment_key === moment.key);
          const comments = story.comments.filter((comment) => comment.moment_key === moment.key);
          const open = openComments[moment.key];
          const mediaUrl = moment.mediaPath ? mediaUrls[moment.mediaPath] : null;
          return (
            <article key={moment.key} id={`post-${moment.key}`} className="surface overflow-hidden">
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
                    {moment.detail ? (
                      <p className="mt-1 text-[0.98rem] leading-7 text-foreground/95">
                        {moment.detail}
                      </p>
                    ) : null}
                  </div>
                </header>
                <ReactionBar
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
      </div>

      {emptyFeed && user ? (
        <p className="t-micro py-2">
          {story.clubhouseEnabled
            ? "Talk and photos land here."
            : "Field notes land here as people post."}
        </p>
      ) : null}
      {matchSocial.unavailable && (
        <p className="t-micro text-muted-foreground">
          Match participation is temporarily read-only.
        </p>
      )}
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
}: {
  momentKey: string;
  reactions: Array<{ kind: string; user_id: string }>;
  userId?: string;
  onToggle: (kind: ReactionKind) => void;
}) {
  return (
    <div className="mt-2 flex gap-1">
      {LOCKER_REACTIONS.map(({ kind, label, glyph }) => {
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
            {glyph} {count || ""}
          </button>
        );
      })}
    </div>
  );
}
