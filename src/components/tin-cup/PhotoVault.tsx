import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { nhost } from "@/integrations/nhost/client";
import { graphqlRequest, subscribeGraphql } from "@/integrations/nhost/graphql";

type VaultItem = {
  id: string;
  caption: string | null;
  url: string;
  storagePath: string;
  uploadedBy: string | null;
};

async function loadPhotos(): Promise<VaultItem[]> {
  const result = await graphqlRequest<{
    photos: Array<{
      id: string;
      caption: string | null;
      storage_path: string;
      uploaded_by: string | null;
    }>;
  }>(`query PhotoVault {
    photos(order_by: {created_at: desc}, limit: 60) {
      id caption storage_path uploaded_by
    }
  }`);
  const rows = result.photos;
  if (rows.length === 0) return [];

  const signed = await Promise.all(
    rows.map((row) => nhost.storage.getFilePresignedURL(row.storage_path)),
  );

  return rows.map((row, i) => ({
    id: row.id,
    caption: row.caption,
    url: signed[i]?.body.url ?? "",
    storagePath: row.storage_path,
    uploadedBy: row.uploaded_by,
  }));
}

export function PhotoVault({ canUpload }: { canUpload: boolean }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setUserId(nhost.getUserSession()?.user?.id ?? null);
    return nhost.sessionStorage.onChange((session) => setUserId(session?.user?.id ?? null));
  }, []);

  const {
    data: photos,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["vault"],
    queryFn: loadPhotos,
    enabled: mounted && Boolean(userId),
  });

  // New photos land for everyone with the tab open, no reload needed.
  useEffect(() => {
    if (!mounted || !userId) return;
    let ready = false;
    return subscribeGraphql(`subscription PhotoVaultLive { photos { id created_at } }`, () => {
      if (ready) void queryClient.invalidateQueries({ queryKey: ["vault"] });
      ready = true;
    });
  }, [mounted, queryClient, userId]);

  const [progress, setProgress] = useState(0);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (!file.type.startsWith("image/")) throw new Error("That file isn't an image");
      if (file.size > 12 * 1024 * 1024) throw new Error("Images need to be under 12MB");
      const user = nhost.getUserSession()?.user;
      if (!user) throw new Error("Sign in to add photos");
      setProgress(15);
      const uploaded = await nhost.storage.uploadFiles({
        "bucket-id": "default",
        "file[]": [file],
        "metadata[]": [{ name: `${user.id}-${crypto.randomUUID()}-${file.name}` }],
      });
      const stored = uploaded.body.processedFiles[0];
      if (!stored) throw new Error("Nhost did not return the uploaded file");
      setProgress(85);
      await graphqlRequest(
        `mutation AddPhoto($fileId: String!) {
          insert_photos_one(object: {storage_path: $fileId}) { id }
        }`,
        { fileId: stored.id },
      );
      setProgress(100);
    },
    onSuccess: () => {
      toast.success("Added to the vault");
      void queryClient.invalidateQueries({ queryKey: ["vault"] });
      setProgress(0);
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
      await nhost.storage.deleteFile(photo.storagePath);
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

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="t-eyebrow">Photo Vault</h2>
        {canUpload && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={upload.isPending}
            className="press btn-quiet t-body inline-flex items-center gap-2"
          >
            {upload.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImagePlus className="size-4" />
            )}
            {upload.isPending ? `Uploading ${progress}%` : "Add"}
          </button>
        )}
      </div>
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
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload.mutate(file);
          e.target.value = "";
        }}
      />
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
        <p className="surface t-body p-5 text-center">
          {canUpload
            ? "No photos yet. Add the first one — tap Add above."
            : "No photos yet. Sign in to add the first one."}
        </p>
      ) : null}

      {lightbox !== null && photos && photos[lightbox] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--scrim)] p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="press absolute right-4 top-4 rounded-full bg-background/60 p-2 text-foreground"
            aria-label="Close lightbox"
          >
            <X className="size-5" />
          </button>
          <button
            type="button"
            disabled={lightbox === 0}
            onClick={(e) => {
              e.stopPropagation();
              setLightbox((i) => Math.max(0, (i ?? 0) - 1));
            }}
            className="press absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/60 p-2 text-foreground disabled:opacity-30"
            aria-label="Previous photo"
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            type="button"
            disabled={lightbox >= photos.length - 1}
            onClick={(e) => {
              e.stopPropagation();
              setLightbox((i) => Math.min(photos.length - 1, (i ?? 0) + 1));
            }}
            className="press absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/60 p-2 text-foreground disabled:opacity-30"
            aria-label="Next photo"
          >
            <ChevronRight className="size-6" />
          </button>
          <img
            src={photos[lightbox].url}
            alt={photos[lightbox].caption ?? "Tin Cup Invitational moment"}
            className="max-h-[85vh] max-w-full rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {photos[lightbox].caption && (
            <p className="t-body absolute bottom-4 left-0 right-0 px-4 text-center text-foreground/90">
              {photos[lightbox].caption}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
