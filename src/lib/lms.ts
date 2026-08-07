// Shared LMS constants (client-safe)
export const MAX_FILE_SIZE_MB = 50;
export const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

export const RESOURCE_TYPES = [
  { value: "note", label: "Notes de cours" },
  { value: "presentation", label: "Présentation" },
  { value: "video", label: "Vidéo (fichier)" },
  { value: "video_link", label: "Lien vidéo (YouTube…)" },
  { value: "image", label: "Image" },
  { value: "reference", label: "Document de référence" },
] as const;

export const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  note: ["pdf", "doc", "docx", "ppt", "pptx", "zip", "txt", "odt"],
  presentation: ["ppt", "pptx", "pdf", "odp", "key"],
  video: ["mp4", "webm", "mov", "m4v"],
  video_link: [],
  image: ["png", "jpg", "jpeg", "webp", "gif", "svg"],
  reference: ["pdf", "doc", "docx", "ppt", "pptx", "zip", "xls", "xlsx", "csv", "txt"],
};

export const SUBMISSION_EXTENSIONS = [
  "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx",
  "jpg", "jpeg", "png", "webp", "zip", "txt", "odt",
];

export const ASSIGNMENT_ATTACHMENT_EXTENSIONS = ["pdf", "doc", "docx", "ppt", "pptx", "zip", "png", "jpg", "jpeg", "webp"];

export function fileExt(name: string) {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export function formatBytes(bytes?: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/** Returns an error message when the file is not acceptable, otherwise null. */
export function validateFile(file: File, allowed: string[]): string | null {
  const ext = fileExt(file.name);
  if (allowed.length && !allowed.includes(ext)) {
    return `Type de fichier non pris en charge (.${ext}). Autorisés : ${allowed.join(", ")}`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `Fichier trop volumineux (${formatBytes(file.size)}). Maximum ${MAX_FILE_SIZE_MB} Mo.`;
  }
  return null;
}

export function isYoutube(url: string) {
  return /youtube\.com|youtu\.be|vimeo\.com/i.test(url);
}

export function youtubeEmbed(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=)([A-Za-z0-9_-]{6,})/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  const v = url.match(/vimeo\.com\/(\d+)/);
  if (v) return `https://player.vimeo.com/video/${v[1]}`;
  return null;
}