import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, Star } from "lucide-react";
import { toast } from "sonner";

import { PageMasthead } from "@/components/tin-cup/PageMasthead";
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

export function MediaGallery({
  players,
  teams,
}: {
  players: Player[];
  teams: Team[];
  rounds?: Round[];
}) {
  const { user, canScore, isAdmin } = useAuth();
  const { profile } = useProfile();
  const activity = useActivityFeed(players, teams);
  const engagement = useEngagementPlatform(user?.id, profile?.player_id);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [downloading, setDownloading] = useState(false);
  const photos = useMemo(
    () => (activity.data ?? []).filter((item) => item.kind === "photo" && item.mediaPath),
    [activity.data],
  );
  const favoriteIds = new Set(engagement.favorites.map((row) => row.photoId));
  const filtered = photos.filter(
    (item) => !favoritesOnly || (item.photoId && favoriteIds.has(item.photoId)),
  );
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
      link.download = favoritesOnly ? "tin-cup-favorites.zip" : "tin-cup-gallery.zip";
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

  const empty = photos.length === 0;

  return (
    <section className="stack-tight" aria-label="Photos">
      <PageMasthead
        title="Photos"
        meta={
          empty
            ? "Photos land here after someone posts."
            : "Photos from the field. Favorite one, download the set."
        }
      />
      {empty ? (
        <div className="surface overflow-hidden">
          <Link to="/" className="press flex min-h-12 items-center justify-between px-4 py-3">
            <span className="t-body font-medium text-foreground">Home</span>
            <span className="t-micro">Field</span>
          </Link>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4 px-1">
            {user ? (
              <button
                type="button"
                aria-pressed={favoritesOnly}
                onClick={() => setFavoritesOnly((on) => !on)}
                className={`press t-micro min-h-11 px-1 font-semibold ${
                  favoritesOnly ? "text-hunter" : "text-muted-foreground"
                }`}
              >
                Favorites
              </button>
            ) : null}
            <button
              type="button"
              disabled={downloading || filtered.length === 0}
              onClick={() => void downloadZip(filtered)}
              className="press t-micro ml-auto min-h-11 px-1 font-semibold text-foreground disabled:opacity-40"
            >
              {downloading ? "Preparing…" : favoritesOnly ? "Download favorites" : "Download"}
            </button>
          </div>
          {filtered.length === 0 ? (
            <p className="t-micro px-1">No favorites yet. Tap a heart on a photo.</p>
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
                      <div className="skeleton h-full min-h-36 w-full" />
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
                      {item.featured && <Star className="size-4 shrink-0 text-hunter" />}
                    </figcaption>
                    {user && item.photoId && (
                      <button
                        type="button"
                        aria-label={
                          favorite ? "Remove from favorite photos" : "Add to favorite photos"
                        }
                        aria-pressed={favorite}
                        onClick={() =>
                          engagement.toggleFavorite.mutate(item.photoId!, {
                            onError: (error) => toast.error(error.message),
                          })
                        }
                        className={`press absolute right-2 top-2 flex size-11 items-center justify-center rounded-full border backdrop-blur-md ${favorite ? "border-hunter/50 bg-hunter/20 text-hunter" : "border-white/15 bg-black/45 text-white"}`}
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
                        className={`press absolute left-2 top-2 flex size-11 items-center justify-center rounded-full border backdrop-blur-md ${item.featured ? "border-hunter/50 bg-hunter/20 text-hunter" : "border-white/15 bg-black/45 text-white"}`}
                      >
                        <Star className={`size-5 ${item.featured ? "fill-current" : ""}`} />
                      </button>
                    )}
                  </figure>
                );
              })}
            </div>
          )}
          {filtered.length > 0 ? (
            <p className="t-micro px-1 pb-2">
              {filtered.length} photo{filtered.length === 1 ? "" : "s"}
              {favoritesOnly ? " in favorites" : " from the weekend"}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
