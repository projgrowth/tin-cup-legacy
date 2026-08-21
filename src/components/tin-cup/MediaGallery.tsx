import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Camera, Download, Heart, ImageOff, Loader2, Star } from "lucide-react";
import { toast } from "sonner";

import { useActivityFeed, type ActivityItem } from "@/hooks/useActivityFeed";
import { useAuth } from "@/hooks/useAuth";
import { useEngagementPlatform } from "@/hooks/useEngagementPlatform";
import { useProfile } from "@/hooks/useJournal";
import type { Player, Round, Team } from "@/hooks/useTournament";
import { signedVaultUrl } from "@/integrations/supabase/storage";
import { supabase } from "@/integrations/supabase/client";
import { trackProductEvent } from "@/lib/product-analytics";
import { isPreviewMode } from "@/lib/runtime-mode";
import { togglePreviewPhotoFeatured } from "@/lib/preview-media";

type GalleryFilter = {
  team: string;
  player: string;
  course: string;
  round: string;
  event: string;
  favorites: boolean;
};

export function MediaGallery({
  players,
  teams,
  rounds,
}: {
  players: Player[];
  teams: Team[];
  rounds: Round[];
}) {
  const { user, canScore, isAdmin } = useAuth();
  const { profile } = useProfile();
  const activity = useActivityFeed(players, teams);
  const engagement = useEngagementPlatform(user?.id, profile?.player_id);
  const [filter, setFilter] = useState<GalleryFilter>({
    team: "",
    player: "",
    course: "",
    round: "",
    event: "",
    favorites: false,
  });
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [downloading, setDownloading] = useState(false);
  const photos = useMemo(
    () => (activity.data ?? []).filter((item) => item.kind === "photo" && item.mediaPath),
    [activity.data],
  );
  const favoriteIds = new Set(engagement.favorites.map((row) => row.photoId));
  const filtered = photos.filter(
    (item) =>
      (!filter.team || item.teamSlug === filter.team) &&
      (!filter.player || item.playerId === filter.player) &&
      (!filter.course || item.courseId === filter.course) &&
      (!filter.round || item.roundId === filter.round) &&
      (!filter.event || item.eventTag === filter.event) &&
      (!filter.favorites || (item.photoId && favoriteIds.has(item.photoId))),
  );
  const eventTags = [
    ...new Set(
      photos.map((item) => item.eventTag).filter((value): value is string => Boolean(value)),
    ),
  ];
  const courses = [
    ...new Set(
      photos.map((item) => item.courseId).filter((value): value is string => Boolean(value)),
    ),
  ];
  const photoMediaKey = photos.map((item) => item.mediaPath).join("|");

  useEffect(() => {
    void trackProductEvent("gallery_opened");
  }, []);
  useEffect(() => {
    let cancelled = false;
    const mediaPaths = photoMediaKey.split("|").filter(Boolean);
    void Promise.all(
      mediaPaths.map(async (path) => [path, await signedVaultUrl(path)] as const),
    ).then((rows) => {
      if (!cancelled)
        setUrls(
          Object.fromEntries(
            rows.filter((row): row is readonly [string, string] => Boolean(row[1])),
          ),
        );
    });
    return () => {
      cancelled = true;
    };
  }, [photoMediaKey]);

  async function downloadZip(items: ActivityItem[]) {
    if (items.length === 0) return;
    setDownloading(true);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      await Promise.all(
        items.map(async (item, index) => {
          const url = item.mediaPath ? urls[item.mediaPath] : null;
          if (!url) return;
          const response = await fetch(url);
          if (!response.ok) throw new Error("A selected photo could not be downloaded.");
          const blob = await response.blob();
          const extension = blob.type.includes("png")
            ? "png"
            : blob.type.includes("webp")
              ? "webp"
              : "jpg";
          zip.file(`tin-cup-${String(index + 1).padStart(2, "0")}.${extension}`, blob);
        }),
      );
      const archive = await zip.generateAsync({ type: "blob" });
      const href = URL.createObjectURL(archive);
      const link = document.createElement("a");
      link.href = href;
      link.download = filter.favorites ? "tin-cup-favorites.zip" : "tin-cup-gallery.zip";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(href), 1000);
      toast.success(`${items.length} photos downloaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the photo archive");
    } finally {
      setDownloading(false);
    }
  }

  async function toggleFeatured(photoId: string) {
    try {
      if (isPreviewMode()) {
        togglePreviewPhotoFeatured(photoId);
      } else {
        const current = photos.find((photo) => photo.photoId === photoId);
        const result = await supabase
          .from("photos")
          .update({ featured: !current?.featured })
          .eq("id", photoId);
        if (result.error) throw result.error;
      }
      await activity.refetch();
      toast.success("Featured gallery updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the featured photo");
    }
  }

  return (
    <section className="space-y-4" aria-labelledby="media-gallery-title">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="event-kicker">Weekend gallery</p>
          <h1 id="media-gallery-title" className="t-display mt-1">
            The camera roll
          </h1>
          <p className="t-body mt-1 text-muted-foreground">
            Photos from the field, ready to favorite and download.
          </p>
        </div>
        <button
          type="button"
          disabled={downloading || filtered.length === 0}
          onClick={() => void downloadZip(filtered)}
          className={`press flex min-h-11 items-center gap-2 px-4 text-sm font-semibold ${
            filtered.length === 0 ? "btn-quiet" : "btn-gold"
          }`}
        >
          {downloading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}{" "}
          Download {filter.favorites ? "favorites" : "shown"}
        </button>
      </header>
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1" aria-label="Photo filters">
        <select
          aria-label="Filter by team"
          value={filter.team}
          onChange={(event) => setFilter((current) => ({ ...current, team: event.target.value }))}
          className="control min-h-11 shrink-0 text-sm"
        >
          <option value="">All teams</option>
          {teams.map((team) => (
            <option key={team.id} value={team.slug}>
              {team.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by player"
          value={filter.player}
          onChange={(event) => setFilter((current) => ({ ...current, player: event.target.value }))}
          className="control min-h-11 shrink-0 text-sm"
        >
          <option value="">All players</option>
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.name}
            </option>
          ))}
        </select>
        {courses.length > 0 && (
          <select
            aria-label="Filter by course"
            value={filter.course}
            onChange={(event) =>
              setFilter((current) => ({ ...current, course: event.target.value }))
            }
            className="control min-h-11 shrink-0 text-sm"
          >
            <option value="">All courses</option>
            {courses.map((course) => (
              <option key={course}>{course}</option>
            ))}
          </select>
        )}
        {rounds.some((round) => photos.some((photo) => photo.roundId === round.id)) && (
          <select
            aria-label="Filter by round"
            value={filter.round}
            onChange={(event) =>
              setFilter((current) => ({ ...current, round: event.target.value }))
            }
            className="control min-h-11 shrink-0 text-sm"
          >
            <option value="">All rounds</option>
            {rounds.map((round) => (
              <option key={round.id} value={round.id}>
                {round.day_label}
              </option>
            ))}
          </select>
        )}
        {eventTags.length > 0 && (
          <select
            aria-label="Filter by event"
            value={filter.event}
            onChange={(event) =>
              setFilter((current) => ({ ...current, event: event.target.value }))
            }
            className="control min-h-11 shrink-0 text-sm"
          >
            <option value="">All events</option>
            {eventTags.map((tag) => (
              <option key={tag}>{tag}</option>
            ))}
          </select>
        )}
        {user && (
          <button
            type="button"
            aria-pressed={filter.favorites}
            onClick={() => setFilter((current) => ({ ...current, favorites: !current.favorites }))}
            className={`press chip min-h-11 shrink-0 ${filter.favorites ? "chip-on" : ""}`}
          >
            <Heart className="size-4" /> Favorites
          </button>
        )}
      </div>
      {activity.isLoading ? (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          <div className="aspect-square animate-pulse rounded-xl bg-secondary" />
          <div className="aspect-square animate-pulse rounded-xl bg-secondary" />
          <div className="aspect-square animate-pulse rounded-xl bg-secondary" />
        </div>
      ) : photos.length === 0 ? (
        <div className="surface-inset px-5 py-12 text-center">
          <Camera className="mx-auto size-6 text-muted-foreground" />
          <p className="t-title mt-3">Nothing in the roll yet</p>
          <p className="t-micro mt-1">Photos land here after someone posts from Home.</p>
          <Link to="/" className="press btn-quiet t-body mt-4 inline-flex min-h-11 px-4">
            Open Home
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface-inset px-5 py-12 text-center">
          <ImageOff className="mx-auto size-6 text-muted-foreground" />
          <p className="t-title mt-3">No photos in this view</p>
          <p className="t-micro mt-1">Clear a filter or post another shot from Home.</p>
        </div>
      ) : (
        <div className="gallery-grid pb-2">
          {filtered.map((item, index) => {
            const url = item.mediaPath ? urls[item.mediaPath] : null;
            const favorite = Boolean(item.photoId && favoriteIds.has(item.photoId));
            return (
              <figure
                key={item.id}
                className={`gallery-photo group ${item.featured ? "gallery-photo-featured" : ""}`}
              >
                {url ? (
                  <img
                    src={url}
                    alt={
                      item.altText ||
                      item.subtitle ||
                      `${item.playerName || "Tin Cup player"} at the weekend`
                    }
                    loading={index < 4 ? "eager" : "lazy"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-secondary">
                    <Camera className="size-6 text-muted-foreground" />
                  </div>
                )}
                <figcaption className="gallery-caption">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-foreground">
                      {item.playerName || "Tin Cup"}
                    </span>
                    <span className="t-micro block truncate">
                      {item.subtitle || item.eventTag || "Weekend photo"}
                    </span>
                  </span>
                  {item.featured && <Star className="size-4 shrink-0 text-gold-light" />}
                </figcaption>
                {user && item.photoId && (
                  <button
                    type="button"
                    aria-label={favorite ? "Remove from favorite photos" : "Add to favorite photos"}
                    aria-pressed={favorite}
                    onClick={() =>
                      engagement.toggleFavorite.mutate(item.photoId!, {
                        onError: (error) => toast.error(error.message),
                      })
                    }
                    className={`press absolute right-2 top-2 flex size-11 items-center justify-center rounded-full border backdrop-blur-md ${favorite ? "border-gold/50 bg-gold/20 text-gold-light" : "border-white/15 bg-black/45 text-white"}`}
                  >
                    <Heart className={`size-5 ${favorite ? "fill-current" : ""}`} />
                  </button>
                )}
                {(canScore || isAdmin) && item.photoId && (
                  <button
                    type="button"
                    aria-label={item.featured ? "Remove featured photo" : "Feature this photo"}
                    aria-pressed={Boolean(item.featured)}
                    onClick={() => void toggleFeatured(item.photoId!)}
                    className={`press absolute left-2 top-2 flex size-11 items-center justify-center rounded-full border backdrop-blur-md ${item.featured ? "border-gold/50 bg-gold/20 text-gold-light" : "border-white/15 bg-black/45 text-white"}`}
                  >
                    <Star className={`size-5 ${item.featured ? "fill-current" : ""}`} />
                  </button>
                )}
              </figure>
            );
          })}
        </div>
      )}
      {filtered.length > 0 && (
        <p className="t-micro pb-2">
          {filtered.length} photo{filtered.length === 1 ? "" : "s"}
          {filter.favorites ? " in favorites" : " from the weekend"}
        </p>
      )}
    </section>
  );
}
