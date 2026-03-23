export type AgentFileClaimGuardPersistedArtifact = unknown;

export type AgentFileClaimGuardResult = {
  sanitizedText: string;
  forbiddenPathClaims: string[];
  hasForbiddenPathClaims: boolean;
  shouldShowFallbackBecauseNoDurablePersistence: boolean;
};

const FORBIDDEN_PATH_CLAIM_REGEXES: RegExp[] = [
  // Windows absolute paths, e.g. `D:\agent\runtime\foo.docx` or `C:/tmp/foo.pdf`
  // We allow whitespace inside the path, but stop at the first "filename extension" boundary.
  /[A-Za-z]:[\\/][^"'`()>\]\n]*?\.[A-Za-z0-9]{1,6}\b/g,

  // Workspace-relative or agent runtime claims, e.g. `projects/.../file.docx`
  /projects[\\/][^"'`()>\]\n]*?\.[A-Za-z0-9]{1,6}\b/gi,
  /\/workspace\/[^"'`()>\]\n]*?\.[A-Za-z0-9]{1,6}\b/gi,
  /agent[\\/]+runtime[\\/]+[^"'`()>\]\n]*?\.[A-Za-z0-9]{1,6}\b/gi,

  // Relative filesystem paths, e.g. `./foo.txt`, `../foo/bar.pdf`
  /\.\.?(?:[\\/])[^"'`()>\]\n]*?\.[A-Za-z0-9]{1,6}\b/g,
];

function basenameFromPathLike(p: string): string {
  const trimmed = p.trim().replace(/^["']+|["']+$/g, "");
  const parts = trimmed.split(/[\\/]/g);
  return parts[parts.length - 1] ?? trimmed;
}

function detectForbiddenPathClaims(text: string): string[] {
  const matches = new Set<string>();
  for (const re of FORBIDDEN_PATH_CLAIM_REGEXES) {
    // Reset lastIndex for safety with global regexes.
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      const s = m[0];
      if (s) matches.add(s);
    }
  }
  return Array.from(matches);
}

function sanitizeForbiddenPathClaims(text: string, forbiddenMatches: string[]): string {
  // Replace known forbidden matches by their basenames, so we remove local/runtime path structure
  // while still leaving a potentially useful filename.
  let out = text;
  for (const match of forbiddenMatches) {
    const escaped = match.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(escaped, "g"), basenameFromPathLike(match));
  }

  // Cleanup whitespace artifacts created by deletions/replacements.
  out = out.replace(/\s+([.,!?;:])/g, "$1");
  out = out.replace(/[ \t]{2,}/g, " ");
  return out;
}

export function applyAgentFileClaimGuard(params: {
  text: string;
  persistedArtifactsForRunId?: AgentFileClaimGuardPersistedArtifact[] | null;
}): AgentFileClaimGuardResult {
  const text = params.text ?? "";
  const persistedArtifactsForRunId = params.persistedArtifactsForRunId ?? [];

  const forbiddenPathClaims = detectForbiddenPathClaims(text);
  const hasForbiddenPathClaims = forbiddenPathClaims.length > 0;
  const shouldShowFallbackBecauseNoDurablePersistence =
    hasForbiddenPathClaims && persistedArtifactsForRunId.length === 0;

  const sanitizedText = hasForbiddenPathClaims
    ? sanitizeForbiddenPathClaims(text, forbiddenPathClaims)
    : text;

  return {
    sanitizedText,
    forbiddenPathClaims,
    hasForbiddenPathClaims,
    shouldShowFallbackBecauseNoDurablePersistence,
  };
}

