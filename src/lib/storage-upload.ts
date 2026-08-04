import { supabase } from "@/integrations/supabase/client";

/** Uploads a file to a Supabase storage bucket with real upload progress. */
export async function uploadWithProgress(
  bucket: string,
  path: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ path: string }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Session expirée, reconnectez-vous");
  const baseUrl = import.meta.env['VITE_SUPABASE_URL'];
  const apiKey = import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] ?? import.meta.env['VITE_SUPABASE_ANON_KEY'];

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${baseUrl}/storage/v1/object/${bucket}/${encodeURI(path)}`);
    xhr.setRequestHeader("authorization", `Bearer ${token}`);
    if (apiKey) xhr.setRequestHeader("apikey", apiKey);
    xhr.setRequestHeader("x-upsert", "true");
    if (file.type) xhr.setRequestHeader("content-type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve({ path });
      } else {
        reject(new Error(`Échec de l'envoi (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Échec réseau pendant l'envoi"));
    xhr.send(file);
  });
}

export async function signedUrl(bucket: string, path: string, seconds = 3600) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, seconds);
  if (error) throw error;
  return data.signedUrl;
}