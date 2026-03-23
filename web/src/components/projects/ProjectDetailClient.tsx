"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ProjectDetail = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

type ProjectFileListRow = {
  id: string;
  filename: string;
  mimeType: string;
  extension: string | null;
  sizeBytes: number;
  updatedAt: string;
  currentRevision: null | {
    id: string;
    versionNumber: number;
    createdAt: string;
    changeSummary: string | null;
    createdByType: "USER" | "AGENT";
  };
};

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"] as const;
  let idx = 0;
  let v = bytes;
  while (v >= 1024 && idx < units.length - 1) {
    v /= 1024;
    idx += 1;
  }
  const fixed = idx === 0 ? 0 : 1;
  return `${v.toFixed(fixed)} ${units[idx]}`;
}

export function ProjectDetailClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [files, setFiles] = useState<ProjectFileListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingAny, setUploadingAny] = useState(false);

  const callbackUrl = useMemo(() => `/projects/${encodeURIComponent(projectId)}`, [projectId]);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [projRes, filesRes] = await Promise.all([
        fetch(`/api/projects/${encodeURIComponent(projectId)}`),
        fetch(`/api/projects/${encodeURIComponent(projectId)}/files`),
      ]);

      if (projRes.status === 401 || filesRes.status === 401) {
        window.location.href = "/login?callbackUrl=" + encodeURIComponent(callbackUrl);
        return;
      }

      const projJson = (await projRes.json()) as { success?: boolean; project?: ProjectDetail; message?: string };
      const filesJson = (await filesRes.json()) as { success?: boolean; files?: ProjectFileListRow[]; message?: string };

      if (!projRes.ok || !projJson?.success || !projJson.project) {
        throw new Error(projJson?.message ?? "Failed to load project.");
      }
      if (!filesRes.ok || !filesJson?.success) {
        throw new Error(filesJson?.message ?? "Failed to load files.");
      }

      setProject(projJson.project);
      setFiles(filesJson.files ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function uploadNewFile(file: File) {
    setUploadingAny(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/files`, {
        method: "POST",
        body: fd,
      });
      if (res.status === 401) {
        window.location.href = "/login?callbackUrl=" + encodeURIComponent(callbackUrl);
        return;
      }
      const json = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok || !json?.success) throw new Error(json?.message ?? "Upload failed.");
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploadingAny(false);
    }
  }

  async function uploadNewRevision(fileId: string, file: File) {
    setUploadingAny(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`/api/files/${encodeURIComponent(fileId)}/revisions`, {
        method: "POST",
        body: fd,
      });
      if (res.status === 401) {
        window.location.href = "/login?callbackUrl=" + encodeURIComponent(callbackUrl);
        return;
      }
      const json = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok || !json?.success) throw new Error(json?.message ?? "Revision upload failed.");
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploadingAny(false);
    }
  }

  async function downloadFile(fileId: string, filename: string) {
    setError(null);
    try {
      const res = await fetch(`/api/files/${encodeURIComponent(fileId)}/download`);
      if (res.status === 401) {
        window.location.href = "/login?callbackUrl=" + encodeURIComponent(callbackUrl);
        return;
      }
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as any)?.message ?? "Download failed.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-neutral-200/80 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-900/30">
        {loading ? (
          <div className="h-6 w-64 animate-pulse rounded bg-neutral-200/60 dark:bg-slate-800/60" />
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  Project
                </p>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {project?.name ?? "—"}
                </h1>
                {project?.description ? (
                  <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-neutral-400">
                    {project.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => router.push("/projects")}
                className="rounded-xl border border-neutral-200/80 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-neutral-50 dark:border-slate-700 dark:bg-slate-800/40 dark:text-neutral-200 dark:hover:bg-slate-700"
              >
                Back to projects
              </button>
            </div>
          </>
        )}
      </header>

      <section className="rounded-2xl border border-neutral-200/80 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-900/30">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Files</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
              Upload drafts and save new revisions without overwriting history.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-neutral-50 dark:border-slate-700 dark:bg-slate-800/40 dark:text-neutral-200 dark:hover:bg-slate-700">
              <span>{uploadingAny ? "Uploading…" : "Upload file"}</span>
              <input
                type="file"
                className="hidden"
                disabled={uploadingAny}
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  if (!f) return;
                  void uploadNewFile(f);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-neutral-400">Loading files…</p>
        ) : error ? (
          <p className="mt-4 text-sm text-rose-600 dark:text-rose-400">{error}</p>
        ) : files.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-neutral-400">
            No files yet. Upload your first draft to start versioning.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-200/70 dark:divide-slate-700/60">
            {files.map((f) => (
              <li key={f.id} className="py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {f.filename}
                      </p>
                      {f.currentRevision ? (
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-neutral-200">
                          v{f.currentRevision.versionNumber}
                        </span>
                      ) : null}
                      <span className="text-xs text-slate-500 dark:text-neutral-400">
                        {formatBytes(f.sizeBytes)}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-neutral-500">
                        Updated{" "}
                        {f.updatedAt ? new Date(f.updatedAt).toLocaleString() : "—"}
                      </span>
                    </div>
                    {f.currentRevision?.changeSummary ? (
                      <p className="mt-1 text-xs text-slate-600 dark:text-neutral-400">
                        {f.currentRevision.changeSummary}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void downloadFile(f.id, f.filename)}
                      disabled={uploadingAny}
                      className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-neutral-50 disabled:opacity-70 dark:border-slate-700 dark:bg-slate-800/40 dark:text-neutral-200 dark:hover:bg-slate-700"
                    >
                      Download
                    </button>
                    <label className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-70 dark:bg-sky-600 dark:hover:bg-sky-500">
                      <span>Upload new version</span>
                      <input
                        type="file"
                        className="hidden"
                        disabled={uploadingAny}
                        onChange={(e) => {
                          const fileObj = e.target.files?.[0] ?? null;
                          if (!fileObj) return;
                          void uploadNewRevision(f.id, fileObj);
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

