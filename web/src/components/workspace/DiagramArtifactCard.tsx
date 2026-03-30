import type { WorkspaceAgent } from "@/data/workspaceChatMock";
import { useEffect, useRef, useState } from "react";

function appendQuery(url: string, key: string, value: string): string {
  try {
    const u = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    u.searchParams.set(key, value);
    return u.pathname + u.search + u.hash;
  } catch {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
  }
}

export function DiagramArtifactCard({
  title,
  createdAt,
  agent,
  files,
}: {
  title: string;
  createdAt: string;
  agent?: WorkspaceAgent;
  files: { kind: string; name: string; url: string }[];
}) {
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const previewBlobUrlRef = useRef<string | null>(null);

  const previewFile = files.find((f) => f.kind === "preview" || f.name.endsWith(".svg"));
  const sourceFile = files.find((f) => f.kind === "source" || f.name.endsWith(".excalidraw"));
  const pngFile = files.find((f) => f.kind === "fallback" || f.name.endsWith(".png"));

  useEffect(() => {
    if (!previewFile?.url) {
      setPreviewObjectUrl(null);
      return;
    }
    const isSvg =
      previewFile.name.toLowerCase().endsWith(".svg") ||
      previewFile.url.toLowerCase().includes(".svg");
    if (!isSvg) {
      setPreviewObjectUrl(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(previewFile.url, { credentials: "include" });
        if (!res.ok || cancelled) return;
        const blob = await res.blob();
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        if (previewBlobUrlRef.current) URL.revokeObjectURL(previewBlobUrlRef.current);
        previewBlobUrlRef.current = objectUrl;
        setPreviewObjectUrl(objectUrl);
      } catch {
        if (!cancelled) setPreviewObjectUrl(null);
      }
    })();

    return () => {
      cancelled = true;
      if (previewBlobUrlRef.current) {
        URL.revokeObjectURL(previewBlobUrlRef.current);
        previewBlobUrlRef.current = null;
      }
      setPreviewObjectUrl(null);
    };
  }, [previewFile?.url, previewFile?.name]);

  return (
    <div className="rounded-2xl border border-blue-200/80 bg-white p-4 shadow-sm dark:border-blue-900/50 dark:bg-slate-900">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300">
          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900 dark:text-white">{title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-neutral-400">
            <span>{createdAt}</span>
            {agent ? <span>· {agent.name}</span> : null}
          </div>
        </div>
      </div>
      
      <div className="overflow-hidden rounded-lg border border-neutral-100 bg-neutral-50 p-2 dark:border-slate-800 dark:bg-slate-950">
        {previewFile ? (
          <img
            src={previewObjectUrl ?? previewFile.url}
            alt={title}
            className="max-h-96 h-auto w-full object-contain"
          />
        ) : pngFile ? (
          <img src={pngFile.url} alt={title} className="w-full h-auto object-contain max-h-96" />
        ) : (
          <div className="flex h-32 items-center justify-center text-sm text-neutral-400">
            No preview available
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {previewFile && (
          <a
            href={appendQuery(previewFile.url, "attachment", "1")}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
          >
            Open SVG
          </a>
        )}
        {sourceFile && (
          <a
            href={sourceFile.url}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-neutral-50 dark:border-slate-700 dark:bg-slate-800 dark:text-neutral-300 dark:hover:bg-slate-700"
          >
            Open Source (.excalidraw)
          </a>
        )}
        {pngFile && (
          <a
            href={pngFile.url}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-neutral-50 dark:border-slate-700 dark:bg-slate-800 dark:text-neutral-300 dark:hover:bg-slate-700"
          >
            Download PNG
          </a>
        )}
      </div>
    </div>
  );
}
