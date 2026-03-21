/**
 * Fetches agent markdown from msitarzewski/agency-agents, writes full files under
 * src/data/agency-agents-bundled/ (mirrored paths) and an enriched agencyAgents.json index.
 * Optional: GITHUB_TOKEN for higher API rate limits (tree + commits).
 * Raw file fetches use raw.githubusercontent.com (no token needed for public repo).
 */
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(__dirname, "..");
const OUT = join(WEB_ROOT, "src/data/agencyAgents.json");
const BUNDLED_ROOT = join(WEB_ROOT, "src/data/agency-agents-bundled");

const OWNER = "msitarzewski";
const REPO = "agency-agents";
const BRANCH = "main";

const AGENT_ROOTS = new Set([
  "academic",
  "design",
  "engineering",
  "game-development",
  "marketing",
  "paid-media",
  "product",
  "project-management",
  "sales",
  "spatial-computing",
  "specialized",
  "strategy",
  "support",
  "testing",
]);

function divisionToChipLabel(division) {
  return division.replace(/-/g, " ").toUpperCase();
}

function categoryLabelForPath(parts) {
  if (parts.length <= 2) return divisionToChipLabel(parts[0]);
  return parts[parts.length - 2].replace(/-/g, " ").toUpperCase();
}

function isAgentMdPath(path) {
  if (!path.endsWith(".md")) return false;
  const parts = path.split("/");
  const root = parts[0];
  if (!AGENT_ROOTS.has(root)) return false;
  const file = parts[parts.length - 1];
  if (file.toLowerCase() === "readme.md") return false;
  return true;
}

/** JSON-serializable frontmatter (drops functions, etc.). */
function jsonSafeFrontmatter(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (k === "__proto__" || k === "constructor") continue;
    if (v === undefined || typeof v === "function" || typeof v === "symbol")
      continue;
    try {
      JSON.stringify(v);
      out[k] = v;
    } catch {
      out[k] = String(v);
    }
  }
  return out;
}

async function fetchJson(url, headers) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}: ${await res.text()}`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

async function fetchRepoCommitSha(headers) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/commits/${BRANCH}?per_page=1`;
  try {
    const commits = await fetchJson(url, headers);
    if (Array.isArray(commits) && commits[0]?.sha) return commits[0].sha;
  } catch (e) {
    console.warn("[sync-agency-agents] Could not fetch repo commit SHA:", e?.message);
  }
  return null;
}

function fileBaseName(filename) {
  return filename.replace(/\.md$/i, "");
}

function writeBundledFile(relativePath, text) {
  const outPath = join(BUNDLED_ROOT, ...relativePath.split("/"));
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, text, "utf8");
}

async function main() {
  const headers = {};
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    headers.Accept = "application/vnd.github+json";
  }

  const [tree, repoCommitSha] = await Promise.all([
    fetchJson(
      `https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`,
      headers,
    ),
    fetchRepoCommitSha(headers),
  ]);

  console.log("[sync-agency-agents] Fetching repo tree…");
  const blobEntries = tree.tree.filter(
    (e) => e.type === "blob" && isAgentMdPath(e.path),
  );
  const paths = blobEntries.map((e) => e.path).sort();
  const shaByPath = new Map(blobEntries.map((e) => [e.path, e.sha]));

  console.log(`[sync-agency-agents] Found ${paths.length} agent markdown files.`);

  async function loadOne(path) {
    const rawUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${path}`;
    const text = await fetchText(rawUrl);
    writeBundledFile(path, text);

    const parts = path.split("/");
    const division = parts[0];
    const baseTitle = fileBaseName(parts[parts.length - 1]).replace(/-/g, " ");

    let fm = {};
    let title = baseTitle;
    let desc =
      "(No description in frontmatter — see bundled content below.)";

    try {
      const parsed = matter(text);
      fm = parsed.data && typeof parsed.data === "object" ? parsed.data : {};
      if (typeof fm.name === "string" && fm.name.trim()) title = fm.name.trim();
      if (typeof fm.description === "string" && fm.description.trim()) {
        desc = fm.description.trim();
      }
    } catch (e) {
      console.warn(
        `[sync-agency-agents] gray-matter failed for ${path}:`,
        e?.message ?? e,
      );
      desc =
        "(Frontmatter could not be parsed — full markdown is still bundled below.)";
    }

    return {
      id: path,
      localContentPath: path,
      division,
      categoryLabel: categoryLabelForPath(parts),
      title,
      description: desc,
      githubUrl: `https://github.com/${OWNER}/${REPO}/blob/${BRANCH}/${path}`,
      contentSha: shaByPath.get(path) ?? null,
      frontmatter: jsonSafeFrontmatter(fm),
    };
  }

  const CONCURRENCY = 8;
  const agents = [];
  for (let j = 0; j < paths.length; j += CONCURRENCY) {
    const batch = paths.slice(j, j + CONCURRENCY);
    const settled = await Promise.allSettled(batch.map(loadOne));
    for (let k = 0; k < settled.length; k++) {
      const r = settled[k];
      if (r.status === "fulfilled") agents.push(r.value);
      else console.error(`[sync-agency-agents] Failed ${batch[k]}:`, r.reason?.message);
    }
  }

  agents.sort((a, b) => a.title.localeCompare(b.title));

  const payload = {
    generatedAt: new Date().toISOString(),
    source: `https://github.com/${OWNER}/${REPO}`,
    branch: BRANCH,
    ...(repoCommitSha ? { repoCommitSha } : {}),
    agents,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload, null, 2), "utf8");
  console.log(`[sync-agency-agents] Wrote ${agents.length} agents to ${OUT}`);
  console.log(`[sync-agency-agents] Bundled markdown under ${BUNDLED_ROOT}`);
}

main().catch((e) => {
  console.error("[sync-agency-agents] Fatal:", e);
  process.exit(1);
});
