"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AdminDataTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from "@/components/admin/AdminDataTable";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { SkillCardMarkdownPreview } from "@/components/admin/SkillCardMarkdownPreview";
import { AdminTableSkeleton } from "@/components/admin/AdminSkeleton";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { skillCategories } from "@/data/marketplaceSkillCatalog";
import type { AdminSkillCardDetail, AdminSkillCardListRow } from "@/types/admin";

type Mode = "list" | "edit" | "create";

const emptyForm: FormState = {
  title: "",
  summary: "",
  category: "General",
  slug: "",
  tagsInput: "",
  status: "DRAFT",
  fullDefinitionMarkdown: "",
  sourceType: null as "MANUAL" | "IMPORTED_MARKDOWN" | "IMPORTED_SKILL" | "OTHER" | null,
  sourcePath: "",
};

type FormState = {
  title: string;
  summary: string;
  category: string;
  slug: string;
  tagsInput: string;
  status: "DRAFT" | "PUBLISHED";
  fullDefinitionMarkdown: string;
  sourceType: "MANUAL" | "IMPORTED_MARKDOWN" | "IMPORTED_SKILL" | "OTHER" | null;
  sourcePath: string;
};

function tagsToInput(tags: string[]): string {
  return tags.join(", ");
}

function inputToTags(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function SkillCardsPage() {
  const [mode, setMode] = useState<Mode>("list");
  const [rows, setRows] = useState<AdminSkillCardListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [importPaste, setImportPaste] = useState("");
  const [importFilename, setImportFilename] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setQ((prev) => {
        if (prev !== qInput) setPage(1);
        return qInput;
      });
    }, 400);
    return () => clearTimeout(t);
  }, [qInput]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (statusFilter === "DRAFT" || statusFilter === "PUBLISHED") {
        params.set("status", statusFilter);
      }
      params.set("page", String(page));
      const res = await fetch(`/api/admin/skill-cards?${params}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message ?? `HTTP ${res.status}`);
      setRows(json.data.rows);
      setTotalPages(json.data.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [q, statusFilter, page]);

  useEffect(() => {
    if (mode === "list") loadList();
  }, [mode, loadList]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setImportPaste("");
    setImportFilename("");
    setMode("create");
  };

  const openEdit = async (id: string) => {
    setEditingId(id);
    setMode("edit");
    setError(null);
    try {
      const res = await fetch(`/api/admin/skill-cards/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message ?? `HTTP ${res.status}`);
      const sc: AdminSkillCardDetail = json.data.skillCard;
      setForm({
        title: sc.title,
        summary: sc.summary,
        category: sc.category,
        slug: sc.slug,
        tagsInput: tagsToInput(sc.tags),
        status: sc.status,
        fullDefinitionMarkdown: sc.fullDefinitionMarkdown,
        sourceType: sc.sourceType,
        sourcePath: sc.sourcePath ?? "",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setMode("list");
    }
  };

  const backToList = () => {
    setMode("list");
    setEditingId(null);
  };

  const applyImportParse = async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/skill-cards/import-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markdown: importPaste,
          filename: importFilename || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message ?? `HTTP ${res.status}`);
      const d = json.data;
      setForm((f) => ({
        ...f,
        title: d.title,
        slug: d.slug,
        fullDefinitionMarkdown: d.fullDefinitionMarkdown,
        sourceType: d.sourceTypeSuggestion === "IMPORTED_MARKDOWN" ? "IMPORTED_MARKDOWN" : f.sourceType,
        summary: f.summary || d.title.slice(0, 240),
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setImportFilename(file.name);
    const text = await file.text();
    setImportPaste(text);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const tags = inputToTags(form.tagsInput);
      const payload = {
        title: form.title,
        summary: form.summary,
        category: form.category,
        slug: form.slug,
        tags,
        status: form.status,
        fullDefinitionMarkdown: form.fullDefinitionMarkdown,
        sourceType: form.sourceType,
        sourcePath: form.sourcePath.trim() || null,
      };

      if (mode === "create") {
        const res = await fetch("/api/admin/skill-cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json?.success) throw new Error(json?.message ?? `HTTP ${res.status}`);
        backToList();
        return;
      }

      if (editingId) {
        const res = await fetch(`/api/admin/skill-cards/${encodeURIComponent(editingId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json?.success) throw new Error(json?.message ?? `HTTP ${res.status}`);
        backToList();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (!window.confirm("Delete this skill card permanently? This cannot be undone.")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/skill-cards/${encodeURIComponent(editingId)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message ?? `HTTP ${res.status}`);
      backToList();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (mode === "create" || mode === "edit") {
    return (
      <AdminPageShell
        title={mode === "create" ? "New skill card" : "Edit skill card"}
        description="Full definition markdown, metadata, and live preview. Draft items are hidden on the public marketplace."
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={backToList}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium dark:border-slate-700 dark:bg-slate-900"
          >
            ← Back to list
          </button>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
            {error}
          </div>
        ) : null}

        <div className="mb-8 rounded-lg border border-neutral-200 bg-neutral-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/40">
          <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Import markdown</h3>
          <p className="mb-3 text-xs text-slate-600 dark:text-slate-400">
            Paste content or choose a .md file. Parse fills title, slug, and body; review before saving.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
              Optional filename hint (e.g. my-topic-full-skill-definition.md)
              <input
                value={importFilename}
                onChange={(e) => setImportFilename(e.target.value)}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                placeholder="filename.md"
              />
            </label>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Upload .md
              <input
                type="file"
                accept=".md,text/markdown"
                className="mt-1 block w-full text-sm"
                onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <textarea
            value={importPaste}
            onChange={(e) => setImportPaste(e.target.value)}
            className="mt-3 min-h-[120px] w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
            placeholder="Paste full markdown…"
          />
          <button
            type="button"
            onClick={() => void applyImportParse()}
            className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-slate-900"
          >
            Parse into form
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
              Title
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
              Slug (URL)
              <input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
              Summary
              <textarea
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                rows={3}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
              Category
              <input
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                list="skill-card-categories"
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
              <datalist id="skill-card-categories">
                {skillCategories
                  .filter((c) => c !== "All")
                  .map((c) => (
                    <option key={c} value={c} />
                  ))}
              </datalist>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
              Tags (comma-separated)
              <input
                value={form.tagsInput}
                onChange={(e) => setForm((f) => ({ ...f, tagsInput: e.target.value }))}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                placeholder="rta, ontario, landlord"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
              Status
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as "DRAFT" | "PUBLISHED",
                  }))
                }
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
              Source type (optional)
              <select
                value={form.sourceType ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    sourceType:
                      e.target.value === ""
                        ? null
                        : (e.target.value as FormState["sourceType"]),
                  }))
                }
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="">—</option>
                <option value="MANUAL">Manual</option>
                <option value="IMPORTED_MARKDOWN">Imported markdown</option>
                <option value="IMPORTED_SKILL">Imported skill</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
              Source path (optional)
              <input
                value={form.sourcePath}
                onChange={(e) => setForm((f) => ({ ...f, sourcePath: e.target.value }))}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                placeholder="repo/path/SKILL.md"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
              Full definition (markdown)
              <textarea
                value={form.fullDefinitionMarkdown}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fullDefinitionMarkdown: e.target.value }))
                }
                rows={18}
                className="min-h-[280px] w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-xs leading-relaxed dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-400">Preview</p>
            <SkillCardMarkdownPreview markdown={form.fullDefinitionMarkdown} />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {mode === "edit" ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleDelete()}
              className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-900 hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100"
            >
              Delete
            </button>
          ) : null}
        </div>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="Skill cards"
      description="Create and publish full skill definition cards (long-form markdown). Published cards appear on the marketplace."
    >
      {error ? (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-slate-900"
        >
          New skill card
        </button>
      </div>

      <AdminFilterBar>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Search
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            placeholder="Title, slug, summary…"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Status
          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value);
            }}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="">All</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </select>
        </label>
      </AdminFilterBar>

      {loading ? <AdminTableSkeleton rows={8} /> : null}

      {!loading && rows.length === 0 ? (
        <AdminEmptyState title="No skill cards yet" />
      ) : null}

      {!loading && rows.length > 0 ? (
        <>
          <AdminDataTable empty={false}>
            <AdminTableHead>
              <tr>
                <AdminTableHeaderCell>Title</AdminTableHeaderCell>
                <AdminTableHeaderCell>Slug</AdminTableHeaderCell>
                <AdminTableHeaderCell>Status</AdminTableHeaderCell>
                <AdminTableHeaderCell>Category</AdminTableHeaderCell>
                <AdminTableHeaderCell>Updated</AdminTableHeaderCell>
              </tr>
            </AdminTableHead>
            <tbody>
              {rows.map((r) => (
                <AdminTableRow key={r.id} onClick={() => void openEdit(r.id)}>
                  <AdminTableCell compact>{r.title}</AdminTableCell>
                  <AdminTableCell compact className="font-mono text-xs">
                    {r.slug}
                  </AdminTableCell>
                  <AdminTableCell compact>
                    <AdminStatusBadge
                      variant={r.status === "PUBLISHED" ? "configured" : "unknown"}
                    >
                      {r.status.toLowerCase()}
                    </AdminStatusBadge>
                  </AdminTableCell>
                  <AdminTableCell compact>{r.category}</AdminTableCell>
                  <AdminTableCell compact className="whitespace-nowrap text-xs text-slate-500">
                    {new Date(r.updatedAt).toLocaleString()}
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </tbody>
          </AdminDataTable>
          {totalPages > 1 ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded border border-neutral-200 px-3 py-1 disabled:opacity-40 dark:border-slate-700"
              >
                Prev
              </button>
              <span>
                Page {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border border-neutral-200 px-3 py-1 disabled:opacity-40 dark:border-slate-700"
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </AdminPageShell>
  );
}
