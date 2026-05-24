import { supabase } from "@/integrations/supabase/client";

const SIGNED_URL_EXPIRY = 3600; // 1 hour

/**
 * Extract the storage path from a stored URL or return the path as-is.
 * Handles both legacy public URLs and raw storage paths.
 */
export function extractStoragePath(urlOrPath: string, bucket = "contratos-documentos"): string {
  // If it's already a path (no protocol), return as-is
  if (!urlOrPath.startsWith("http")) {
    return urlOrPath;
  }

  // Extract path from public URL pattern:
  // https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
  const publicPrefix = `/storage/v1/object/public/${bucket}/`;
  const publicIdx = urlOrPath.indexOf(publicPrefix);
  if (publicIdx !== -1) {
    return decodeURIComponent(urlOrPath.substring(publicIdx + publicPrefix.length));
  }

  // Extract path from signed URL pattern:
  // https://<ref>.supabase.co/storage/v1/object/sign/<bucket>/<path>?token=...
  const signPrefix = `/storage/v1/object/sign/${bucket}/`;
  const signIdx = urlOrPath.indexOf(signPrefix);
  if (signIdx !== -1) {
    const pathWithQuery = urlOrPath.substring(signIdx + signPrefix.length);
    return decodeURIComponent(pathWithQuery.split("?")[0]);
  }

  // Fallback: return as-is
  return urlOrPath;
}

/**
 * Generate a signed URL for a file in the contratos-documentos bucket.
 * Works with both raw storage paths and legacy public URLs.
 */
export async function getSignedFileUrl(
  urlOrPath: string,
  bucket = "contratos-documentos",
  expiresIn = SIGNED_URL_EXPIRY
): Promise<string | null> {
  const path = extractStoragePath(urlOrPath, bucket);

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error("Error creating signed URL:", error);
    return null;
  }

  return data.signedUrl;
}
