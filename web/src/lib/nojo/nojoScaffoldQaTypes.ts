export type ScaffoldFileOutcome =
  | "seeded"
  | "pre_existing_non_empty"
  | "template_empty"
  | "template_missing"
  | "io_error";

export type ScaffoldFileReport = {
  fileName: string;
  outcome: ScaffoldFileOutcome;
  detail?: string;
};

export type RuntimeFileSnapshotEntry = {
  exists: boolean;
  byteLength: number;
  sha256: string;
};

/** QA bundle for nojo-content client logs and API responses. */
export type NovaContentQaPayload = {
  routedToNojoContent: true;
  runtimeWorkspaceAbsPath: string;
  scaffoldSkippedBecauseFilesExist: boolean;
  preExistingNonEmptyFiles: string[];
  seededFiles: string[];
  configuredAgentsRoot: string;
  templateRootResolved: string;
  fileReports: ScaffoldFileReport[];
  runtimeFileSnapshot: Record<string, RuntimeFileSnapshotEntry>;
  runtimeIdentityFingerprint: string;
  genericFallbackRisk: boolean;
};

export type NojoAgentIdentityScaffoldResult = {
  seeded: boolean;
  seededFiles: string[];
  scaffoldSkippedBecauseFilesExist: boolean;
  runtimeWorkspaceAbsPath: string;
  preExistingNonEmptyFiles: string[];
  configuredAgentsRoot: string;
  templateRootResolved: string;
  fileReports: ScaffoldFileReport[];
  runtimeFileSnapshot: Record<string, RuntimeFileSnapshotEntry>;
  runtimeIdentityFingerprint: string;
  genericFallbackRisk: boolean;
};
