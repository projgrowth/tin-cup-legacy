import { supabase } from "./client";
import { assertMutationAllowed } from "@/lib/runtime-mode";
import { previewMediaUrl } from "@/lib/preview-media";

const VAULT_BUCKET = "vault";

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "image";
}

export async function currentUserId() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.user.id ?? null;
}

export async function uploadVaultImage(file: File, folder = "photos") {
  assertMutationAllowed("Photo upload");
  const userId = await currentUserId();
  if (!userId) throw new Error("Sign in again");
  const path = `${userId}/${folder}/${crypto.randomUUID()}-${safeName(file.name)}`;
  const { error } = await supabase.storage.from(VAULT_BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function signedVaultUrl(path: string, expiresIn = 60 * 60) {
  if (!path.trim()) return null;
  const preview = previewMediaUrl(path);
  if (preview) return preview;
  const { data, error } = await supabase.storage
    .from(VAULT_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function deleteVaultObject(path: string) {
  assertMutationAllowed("Photo removal");
  const { error } = await supabase.storage.from(VAULT_BUCKET).remove([path]);
  if (error) throw error;
}
