/**
 * Fetches agent markdown from msitarzewski/agency-agents and writes agencyAgents.json.
 * Optional: GITHUB_TOKEN env for higher API rate limits (tree fetch only).
 * Raw file fetches use cdn raw.githubusercontent.com (no token needed for public repo).
 */
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../src/data/agencyAgents.json");

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

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return { name: "", description: "" };
  const block = m[1];
  const name = (block.match(/^name:\s*(.+)$/m) || [])[1]?.trim() || "";
  const desc = (block.match(/^description:\s*(.+)$/m) || [])[1]?.trim() || "";
  return {
    name: name.replace(/^["']|["']$/g, ""),
    description: desc.replace(/^["']|["']$/g, ""),
  };
}

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

async function main() {
  const headers = {};
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    headers.Accept = "application/vnd.github+json";
  }

  const treeUrl = `https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`;
  console.log("[sync-agency-agents] Fetching repo tree…");
  const tree = await fetchJson(treeUrl, headers);
  const paths = tree.tree
    .filter((e) => e.type === "blob" && isAgentMdPath(e.path))
    .map((e) => e.path)
    .sort();

  console.log(`[sync-agency-agents] Found ${paths.length} agent markdown files.`);

  async function loadOne(path) {
    const rawUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${path}`;
    const text = await fetchText(rawUrl);
    const { name, description } = parseFrontmatter(text);
    const parts = path.split("/");
    const division = parts[0];
    const title =
      name || fileBaseName(parts[parts.length - 1]).replace(/-/g, " ");
    const desc =
      description ||
      "(No description in frontmatter — open on GitHub for full agent definition.)";
    return {
      id: path,
      division,
      categoryLabel: categoryLabelForPath(parts),
      title,
      description: desc,
      githubUrl: `https://github.com/${OWNER}/${REPO}/blob/${BRANCH}/${path}`,
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
    agents,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload, null, 2), "utf8");
  console.log(`[sync-agency-agents] Wrote ${agents.length} agents to ${OUT}`);
}

function fileBaseName(filename) {
  return filename.replace(/\.md$/i, "");
}

main().catch((e) => {
  console.error("[sync-agency-agents] Fatal:", e);
  process.exit(1);
});
