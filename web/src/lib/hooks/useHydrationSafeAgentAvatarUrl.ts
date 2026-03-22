"use client";

import { getAgentAvatarUrl, getDefaultAgentAvatarUrl } from "@/lib/agentAvatars";
import { useEffect, useMemo, useState } from "react";

/**
 * Returns the deterministic default avatar URL on SSR and the first client pass,
 * then applies `localStorage` overrides from `getAgentAvatarUrl` after mount
 * so hydration matches the server HTML.
 */
export function useHydrationSafeAgentAvatarUrl(agentKey: string): string {
  const defaultSrc = useMemo(() => getDefaultAgentAvatarUrl(agentKey), [agentKey]);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return useMemo(() => {
    if (!hydrated) return defaultSrc;
    return getAgentAvatarUrl(agentKey, { withDefault: true }) ?? defaultSrc;
  }, [agentKey, defaultSrc, hydrated]);
}
