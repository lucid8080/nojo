import path from "node:path";

export type NojoAllowedExtensionInfo = {
  extension: string; // without dot, lowercase
  mimeType: string;
};

const DENYLIST_EXTENSIONS = new Set([
  // Executable / script-like
  "exe",
  "dll",
  "com",
  "bat",
  "cmd",
  "ps1",
  "vbs",
  "js",
  "mjs",
  "cjs",
  "ts",
  "tsx",
  "jsx",
  "py",
  "rb",
  "php",
  "pl",
  "sh",
  "jar",
  "class",
  // HTML / scriptable formats (SVG allowed - see EXPLICIT_ALLOWED.svg)
  "html",
  "htm",
  "xml",
  "xhtml",
  // Archives (can contain executables)
  "zip",
  "rar",
  "7z",
  "tar",
  "gz",
  "tgz",
  "bz2",
  "xz",
  "iso",
  "dmg",
]);

const EXPLICIT_ALLOWED: Record<string, NojoAllowedExtensionInfo> = {
  txt: { extension: "txt", mimeType: "text/plain; charset=utf-8" },
  md: { extension: "md", mimeType: "text/markdown; charset=utf-8" },
  json: { extension: "json", mimeType: "application/json; charset=utf-8" },
  csv: { extension: "csv", mimeType: "text/csv; charset=utf-8" },
  pdf: { extension: "pdf", mimeType: "application/pdf" },
  rtf: { extension: "rtf", mimeType: "application/rtf" },
  docx: {
    extension: "docx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  png: { extension: "png", mimeType: "image/png" },
  jpg: { extension: "jpg", mimeType: "image/jpeg" },
  jpeg: { extension: "jpeg", mimeType: "image/jpeg" },
  webp: { extension: "webp", mimeType: "image/webp" },
  gif: { extension: "gif", mimeType: "image/gif" },
  // Trusted server-generated diagram previews (Excalidraw); also user/agent durable files.
  svg: { extension: "svg", mimeType: "image/svg+xml" },
};

export function normalizeExtension(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const ext = raw.startsWith(".") ? raw.slice(1) : raw;
  const normalized = ext.trim().toLowerCase();
  if (!normalized) return null;
  if (!/^[a-z0-9]{1,10}$/.test(normalized)) return null;
  return normalized;
}

export function extensionFromFilename(filename: string): string | null {
  const base = path.basename(filename);
  const ext = path.extname(base);
  return normalizeExtension(ext);
}

export function assertExtensionUploadAllowed(extension: string | null): string {
  const ext = extension ?? "bin";
  if (!/^[a-z0-9]{1,10}$/.test(ext)) {
    throw new Error("Invalid file extension.");
  }
  if (DENYLIST_EXTENSIONS.has(ext)) {
    throw new Error(`Extension is not allowed: .${ext}`);
  }
  return ext;
}

/**
 * Agent-created durable files. Same extension policy as `assertExtensionUploadAllowed`
 * (including `.svg` for server-generated diagram artifacts).
 */
export function assertAgentExtensionUploadAllowed(extension: string | null): string {
  return assertExtensionUploadAllowed(extension);
}

export function resolveMimeTypeForExtension(extension: string | null): string {
  const ext = extension ?? "bin";
  return EXPLICIT_ALLOWED[ext]?.mimeType ?? "application/octet-stream";
}

export function resolveAllowedExtensionInfo(
  extension: string | null,
): NojoAllowedExtensionInfo {
  const ext = assertExtensionUploadAllowed(extension);
  return (
    EXPLICIT_ALLOWED[ext] ?? {
      extension: ext,
      mimeType: resolveMimeTypeForExtension(ext),
    }
  );
}

export function guessExtensionFromMimeType(mimeType: string | null | undefined): string | null {
  const mt = mimeType?.toLowerCase().trim() ?? "";
  if (!mt) return null;
  // Keep it conservative: only map a few known ones.
  if (mt === "text/plain") return "txt";
  if (mt === "text/markdown") return "md";
  if (mt === "application/json") return "json";
  if (mt === "text/csv") return "csv";
  if (mt === "application/pdf") return "pdf";
  if (
    mt ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return "docx";
  if (mt === "image/png") return "png";
  if (mt === "image/jpeg") return "jpg";
  if (mt === "image/webp") return "webp";
  if (mt === "image/gif") return "gif";
  if (mt === "image/svg+xml") return "svg";
  return null;
}

