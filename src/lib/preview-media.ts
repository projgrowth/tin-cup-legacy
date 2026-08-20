import { PREVIEW_STORAGE_PREFIX } from "@/lib/runtime-mode";

const KEY = `${PREVIEW_STORAGE_PREFIX}:photos`;
export type PreviewPhoto = {
  id: string;
  dataUrl: string;
  caption: string | null;
  altText: string | null;
  courseId: string | null;
  roundId: string | null;
  eventTag: string | null;
  createdAt: string;
  uploadedBy: string | null;
  featured?: boolean;
};

export function readPreviewPhotos(): PreviewPhoto[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as PreviewPhoto[];
  } catch {
    return [];
  }
}

export async function savePreviewPhoto(
  file: File,
  metadata: Omit<PreviewPhoto, "id" | "dataUrl" | "createdAt">,
) {
  if (file.size > 2_000_000) throw new Error("Preview photos must be under 2 MB.");
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read this photo."));
    reader.readAsDataURL(file);
  });
  const row: PreviewPhoto = {
    ...metadata,
    id: crypto.randomUUID(),
    dataUrl,
    createdAt: new Date().toISOString(),
  };
  const rows = [row, ...readPreviewPhotos()].slice(0, 12);
  localStorage.setItem(KEY, JSON.stringify(rows));
  return row;
}

export function previewMediaUrl(path: string) {
  if (!path.startsWith("preview:")) return null;
  const id = path.slice("preview:".length);
  return readPreviewPhotos().find((photo) => photo.id === id)?.dataUrl ?? null;
}

export function togglePreviewPhotoFeatured(photoId: string) {
  const rows = readPreviewPhotos().map((photo) =>
    photo.id === photoId ? { ...photo, featured: !photo.featured } : photo,
  );
  localStorage.setItem(KEY, JSON.stringify(rows));
}
