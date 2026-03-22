"use client";

import { useEffect, useState } from "react";

/**
 * False on SSR and the first client render; true after mount. Use to avoid
 * hydration mismatches when reading browser-only state (e.g. localStorage).
 */
export function useHasMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
