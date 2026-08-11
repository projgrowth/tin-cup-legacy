import { supabase } from "./client";

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
  const { data, error } = await supabase.storage
    .from(VAULT_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteVaultObject(path: string) {
  const { error } = await supabase.storage.from(VAULT_BUCKET).remove([path]);
  if (error) throw error;
}
