"use client";

import { useEffect } from "react";

/**
 * Full-viewport workspace relies on internal scroll regions. Without this,
 * nested overflow (e.g. long chat) can still inflate document scrollHeight and
 * allow the browser page to scroll even when the route root is overflow-hidden.
 */
export function WorkspaceDocumentLock() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      htmlHeight: html.style.height,
      bodyOverflow: body.style.overflow,
      bodyHeight: body.style.height,
    };
    html.style.height = "100%";
    html.style.overflow = "hidden";
    body.style.height = "100%";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev.htmlOverflow;
      html.style.height = prev.htmlHeight;
      body.style.overflow = prev.bodyOverflow;
      body.style.height = prev.bodyHeight;
    };
  }, []);
  return null;
}
