import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { PhotoPicker } from "@/components/tin-cup/PhotoPicker";
import { supabase } from "@/integrations/supabase/client";
import { graphqlRequest, subscribeGraphql } from "@/integrations/supabase/graphql";
import {
  currentUserId,
  deleteVaultObject,
  signedVaultUrl,
  uploadVaultImage,
} from "@/integrations/supabase/storage";

type VaultItem = {
  id: string;
  caption: string | null;
  url: string;
  storagePath: string;
  uploadedBy: string | null;
  authorName: string | null;
  createdAt: string | null;
};

async function loadPhotos(): Promise<VaultItem[]> {
  const result = await graphqlRequest<{
    photos: Array<{
      id: string;
      caption: string | null;
      storage_path: string;
      uploaded_by: string | null;
      created_at: string;
    }>;
    profiles?: Array<{ id: string; display_name: string; player_id: string | null }>;
    players?: Array<{ id: string; name: string }>;
  }>(`query PhotoVault {
    photos(order_by: {created_at: desc}, limit: 60) {
      id caption storage_path uploaded_by created_at
    }
    profiles { id display_name player_id }
    players { id name }
  }`);
  const rows = result.photos;
  if (rows.length === 0) return [];

  const rosterByPlayerId = new Map(
    (result.players ?? []).map((p) => [p.id, p.name.trim()] as const),
  );
  /** Prefer roster name when profile is claimed; else display_name */
  const authorByUserId = new Map<string, string>();
  for (const p of result.profiles ?? []) {
    const roster =
      p.player_id && rosterByPlayerId.get(p.player_id)
        ? rosterByPlayerId.get(p.player_id)!
        : null;
    const label = roster || p.display_name.trim();
    if (label) authorByUserId.set(p.id, label);
  }

  const signed = await Promise.all(
    rows.map((row) => signedVaultUrl(row.storage_path)),
  );

  return rows.map((row, i) => {
    const authorName = row.uploaded_by ? authorByUserId.get(row.uploaded_by) ?? null : null;
    return {
      id: row.id,
      caption: row.caption,
      url: signed[i] ?? "",
      storagePath: row.storage_path,
      uploadedBy: row.uploaded_by,
      authorName,
      createdAt: row.created_at ?? null,
    };
  });
}

export function PhotoVault({
  canUpload,
  variant = "vault",
  hideWhenEmpty = false,
}: {
  canUpload: boolean;
  /** `pulse` = compact horizontal strip for Live; `vault` = full masonry gallery */
  variant?: "vault" | "pulse";
  /** When true, render nothing if there are no photos (and not uploading). */
  hideWhenEmpty?: boolean;
}) {
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [pendingCaption, setPendingCaption] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    void currentUserId().then(setUserId).catch(() => setUserId(null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const {
    data: photos,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["vault"],
    queryFn: loadPhotos,
    // Photos are public-read; signed-in users also get profile names.
    enabled: mounted,
    retry: 1,
  });

  useEffect(() => {
    if (!mounted) return;
    let ready = false;
    return subscribeGraphql(`subscription PhotoVaultLive { photos { id created_at } }`, () => {
      if (ready) void queryClient.invalidateQueries({ queryKey: ["vault"] });
      ready = true;
    });
  }, [mounted, queryClient]);

  const [progress, setProgress] = useState(0);

  const upload = useMutation({
    mutationFn: async ({ file, caption }: { file: File; caption: string }) => {
      if (!file.type.startsWith("image/")) throw new Error("That file isn't an image");
      if (file.size > 12 * 1024 * 1024) throw new Error("Images need to be under 12MB");
      const user = await currentUserId();
      if (!user) throw new Error("Sign in to add photos");
      setProgress(15);
      const storagePath = await uploadVaultImage(file, "photos");
      setProgress(85);
      await graphqlRequest(
        `mutation AddPhoto($fileId: String!, $caption: String) {
          insert_photos_one(object: {storage_path: $fileId, caption: $caption}) { id }
        }`,
        { fileId: storagePath, caption: caption.trim() || null },
      );
      setProgress(100);
    },
    onSuccess: () => {
      toast.success("Added to Pulse");
      void queryClient.invalidateQueries({ queryKey: ["vault"] });
      void queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
      setProgress(0);
      setPendingFile(null);
      setPendingCaption("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Upload failed");
      setProgress(0);
    },
  });

  const remove = useMutation({
    mutationFn: async (photo: VaultItem) => {
      await graphqlRequest(
        `mutation RemovePhoto($id: uuid!) { delete_photos_by_pk(id: $id) { id } }`,
        { id: photo.id },
      );
      await deleteVaultObject(photo.storagePath);
    },
    onSuccess: () => {
      toast.success("Photo removed");
      void queryClient.invalidateQueries({ queryKey: ["vault"] });
    },
    onError: () => toast.error("Couldn't remove that photo"),
  });

  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    if (lightbox === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(null);
      if (!photos) return;
      if (e.key === "ArrowLeft") setLightbox((i) => Math.max(0, (i ?? 0) - 1));
      if (e.key === "ArrowRight") setLightbox((i) => Math.min(photos.length - 1, (i ?? 0) + 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, photos]);

  function pickFile(file: File | undefined) {
    if (!file) return;
    if (!canUpload) {
      toast.message("Sign in to add photos");
      return;
    }
    setPendingFile(file);
    setPendingCaption("");
  }

  function confirmUpload() {
    if (!pendingFile) return;
    upload.mutate({ file: pendingFile, caption: pendingCaption });
  }

  const labelFor = (photo: VaultItem) =>
    photo.authorName || (photo.uploadedBy === userId ? "You" : null);

  const captionComposer =
    pendingFile && !upload.isPending ? (
      <div className="surface-inset space-y-3 p-3.5">
        <p className="t-micro text-muted-foreground">
          Ready to post
          <span className="ml-1 opacity-70">· optional caption</span>
        </p>
        <input
          value={pendingCaption}
          onChange={(e) => setPendingCaption(e.target.value)}
          maxLength={140}
          placeholder="Caption (optional)"
          className="control t-body w-full"
          autoFocus
        />
        <div className="flex gap-2">
          <button type="button" onClick={() => confirmUpload()} className="press btn-gold t-body flex-1">
            Post photo
          </button>
          <button
            type="button"
            onClick={() => {
              setPendingFile(null);
              setPendingCaption("");
            }}
            className="press btn-quiet t-body"
          >
            Cancel
          </button>
        </div>
      </div>
    ) : null;

  const picker = canUpload ? (
    <PhotoPicker
      onFile={(f) => pickFile(f)}
      disabled={upload.isPending}
      cameraFacing="environment"
      size="compact"
      className="w-full sm:max-w-xs"
    />
  ) : null;

  if (variant === "pulse") {
    const strip = photos?.slice(0, 16) ?? [];
    const empty =
      !isPending && !isError && strip.length === 0 && !upload.isPending && !pendingFile;
    if (hideWhenEmpty && empty) return null;

    return (
      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="t-section text-foreground">Pulse</h2>
          {picker}
        </div>
        {captionComposer}
        {upload.isPending && (
          <div
            className="h-1 overflow-hidden rounded-full bg-secondary/60"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-gold transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        {isPending && (
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton size-24 shrink-0 rounded-xl" />
            ))}
          </div>
        )}
        {isError && (
          <button
            type="button"
            onClick={() => void refetch()}
            className="press t-micro text-muted-foreground"
          >
            Pulse didn&apos;t load · Retry
          </button>
        )}
        {!isPending && !isError && strip.length === 0 && canUpload && (
          <p className="t-micro text-muted-foreground">First photo of the weekend?</p>
        )}
        {strip.length > 0 && (
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {strip.map((photo, idx) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setLightbox(idx)}
                className="press relative shrink-0 overflow-hidden rounded-xl border border-border"
              >
                <img
                  src={photo.url}
                  alt={photo.caption ?? "Weekend moment"}
                  loading="lazy"
                  className="size-24 object-cover sm:size-28"
                />
                {labelFor(photo) && (
                  <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {labelFor(photo)}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        {lightbox !== null && photos && photos[lightbox] && (
          <Lightbox
            photos={photos}
            index={lightbox}
            setIndex={setLightbox}
            labelFor={labelFor}
            userId={userId}
            onRemove={(p) => remove.mutate(p)}
            removing={remove.isPending}
          />
        )}
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="t-section text-foreground">Photo vault</h2>
        {picker}
      </div>
      {captionComposer}
      {upload.isPending && (
        <div
          className="h-1 overflow-hidden rounded-full bg-secondary/60"
          role="progressbar"
          aria-label="Photo upload progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div
            className="h-full rounded-full bg-gold transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {isPending && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Loading photos">
          {[120, 170, 140, 190, 130, 160].map((height, index) => (
            <div key={index} className="skeleton" style={{ height }} />
          ))}
        </div>
      )}
      {isError && (
        <div className="surface p-5 text-center" role="alert">
          <p className="t-body text-foreground">The photo vault didn&apos;t load.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="press btn-quiet t-body mt-3"
          >
            Try again
          </button>
        </div>
      )}
      {!isPending && !isError && photos && photos.length > 0 ? (
        <div className="columns-2 gap-2 space-y-2 sm:columns-3">
          {photos.map((photo, idx) => (
            <div key={photo.id} className="relative break-inside-avoid">
              <button
                type="button"
                onClick={() => setLightbox(idx)}
                className="block w-full text-left"
              >
                <img
                  src={photo.url}
                  alt={photo.caption ?? "Tin Cup Invitational moment"}
                  loading="lazy"
                  className="w-full rounded-xl border border-border object-cover"
                />
                {(labelFor(photo) || photo.caption) && (
                  <span className="mt-1.5 block px-0.5">
                    {labelFor(photo) && (
                      <span className="t-micro font-medium text-foreground">{labelFor(photo)}</span>
                    )}
                    {photo.caption && (
                      <span className="t-micro block text-muted-foreground">{photo.caption}</span>
                    )}
                  </span>
                )}
              </button>
              {userId && photo.uploadedBy === userId && (
                <button
                  type="button"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(photo)}
                  aria-label="Remove this photo"
                  className="press absolute right-1.5 top-1.5 rounded-full bg-background/75 p-1.5 text-muted-foreground backdrop-blur-sm disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" strokeWidth={1.7} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : !isPending && !isError ? (
        <p className="surface t-body p-5 text-center text-muted-foreground">
          {canUpload
            ? "No photos yet. Add the first one."
            : "No photos yet. Sign in to add the first one."}
        </p>
      ) : null}

      {lightbox !== null && photos && photos[lightbox] && (
        <Lightbox
          photos={photos}
          index={lightbox}
          setIndex={setLightbox}
          labelFor={labelFor}
          userId={userId}
          onRemove={(p) => remove.mutate(p)}
          removing={remove.isPending}
        />
      )}
    </section>
  );
}

function Lightbox({
  photos,
  index,
  setIndex,
  labelFor,
  userId,
  onRemove,
  removing,
}: {
  photos: VaultItem[];
  index: number;
  setIndex: (n: number | null | ((i: number | null) => number | null)) => void;
  labelFor: (p: VaultItem) => string | null;
  userId: string | null;
  onRemove: (p: VaultItem) => void;
  removing: boolean;
}) {
  const photo = photos[index];
  if (!photo) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--scrim)] p-4"
      onClick={() => setIndex(null)}
    >
      <button
        type="button"
        onClick={() => setIndex(null)}
        className="press absolute right-4 top-4 rounded-full bg-background/60 p-2 text-foreground"
        aria-label="Close lightbox"
      >
        <X className="size-5" />
      </button>
      {userId && photo.uploadedBy === userId && (
        <button
          type="button"
          disabled={removing}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(photo);
            setIndex(null);
          }}
          className="press absolute right-4 top-16 rounded-full bg-background/60 p-2 text-muted-foreground"
          aria-label="Remove photo"
        >
          <Trash2 className="size-4" />
        </button>
      )}
      <button
        type="button"
        disabled={index === 0}
        onClick={(e) => {
          e.stopPropagation();
          setIndex((i) => Math.max(0, (i ?? 0) - 1));
        }}
        className="press absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/60 p-2 text-foreground disabled:opacity-30"
        aria-label="Previous photo"
      >
        <ChevronLeft className="size-6" />
      </button>
      <button
        type="button"
        disabled={index >= photos.length - 1}
        onClick={(e) => {
          e.stopPropagation();
          setIndex((i) => Math.min(photos.length - 1, (i ?? 0) + 1));
        }}
        className="press absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/60 p-2 text-foreground disabled:opacity-30"
        aria-label="Next photo"
      >
        <ChevronRight className="size-6" />
      </button>
      <div className="max-w-full" onClick={(e) => e.stopPropagation()}>
        <img
          src={photo.url}
          alt={photo.caption ?? "Tin Cup Invitational moment"}
          className="max-h-[80vh] max-w-full rounded-2xl object-contain"
        />
        {(labelFor(photo) || photo.caption) && (
          <p className="t-body mt-3 text-center text-foreground/90">
            {labelFor(photo)}
            {labelFor(photo) && photo.caption ? " · " : ""}
            {photo.caption}
          </p>
        )}
      </div>
    </div>
  );
}
