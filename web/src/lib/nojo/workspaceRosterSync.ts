import type { TeamWorkspaceRosterEntry } from "@/data/nojoWorkspaceRoster";
import { normalizeAgentKey } from "@/lib/agentAvatars";
import {
  readOverrides,
  type NojoAgentIdentityOverride,
} from "@/lib/nojo/agentIdentityOverrides";
import { readCustomRoster } from "@/lib/nojo/teamWorkspaceStore";

/** Payload for POST `/api/workspace/roster/sync` (localStorage migration). */
export function buildAgentRosterSyncPayload(): {
  entries: Array<{ roster: TeamWorkspaceRosterEntry; identity?: NojoAgentIdentityOverride }>;
} {
  const rosters = readCustomRoster();
  const overrides = readOverrides();
  return {
    entries: rosters.map((roster) => {
      const key = normalizeAgentKey(roster.id);
      const identity = overrides[key];
      const hasIdentity = identity && Object.keys(identity).length > 0;
      return hasIdentity ? { roster, identity } : { roster };
    }),
  };
}
