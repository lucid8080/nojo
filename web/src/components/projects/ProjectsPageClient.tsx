"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export function ProjectsPageClient() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadProjects() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/projects");
      if (res.status === 401) {
        window.location.href = "/login?callbackUrl=" + encodeURIComponent("/projects");
        return;
      }
      const json = (await res.json()) as { success?: boolean; projects?: ProjectRow[]; message?: string };
      if (!res.ok || !json?.success) {
        throw new Error(json?.message ?? "Failed to load projects.");
      }
      setProjects(json.projects ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      });
      if (res.status === 401) {
        window.location.href = "/login?callbackUrl=" + encodeURIComponent("/projects");
        return;
      }
      const json = (await res.json()) as { success?: boolean; project?: ProjectRow; message?: string };
      if (!res.ok || !json?.success || !json.project) {
        throw new Error(json?.message ?? "Project create failed.");
      }
      router.push(`/projects/${encodeURIComponent(json.project.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-neutral-200/80 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-900/30">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Create a project</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
          A project is a durable container for files and revisions.
        </p>

        <form onSubmit={onCreate} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-neutral-100"
              placeholder="e.g. 2026 Resume Drafts"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300">
              Description (optional)
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-neutral-100"
              placeholder="e.g. Iterating with an agent"
            />
          </div>
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-70 dark:bg-sky-600 dark:hover:bg-sky-500"
          >
            {creating ? "Creating…" : "Create project"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-neutral-200/80 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-900/30">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Your projects</h2>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-neutral-400">Loading projects…</p>
        ) : error ? (
          <p className="mt-4 text-sm text-rose-600 dark:text-rose-400">{error}</p>
        ) : projects.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-neutral-400">
            No projects yet. Create one above to start storing files.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {projects.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/projects/${encodeURIComponent(p.id)}`)}
                  className="flex w-full items-start justify-between gap-3 rounded-xl border border-neutral-200/60 bg-white px-3 py-2 text-left text-sm shadow-sm transition hover:bg-neutral-50 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:bg-slate-800"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-900 dark:text-white">
                      {p.name}
                    </span>
                    {p.description ? (
                      <span className="mt-0.5 block truncate text-xs text-slate-600 dark:text-neutral-400">
                        {p.description}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400 dark:text-neutral-500">
                    Open →
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

