"use client";

import { getAvatarAccentClasses } from "@/lib/agentAvatars";
import {
  getAgentAvatarFallbackClassFromAgent,
  getAgentAvatarFrameClassFromAgent,
  getCategoryAvatarFallbackClass,
  getCategoryAvatarFrameClass,
  type CategoryColorName,
} from "@/lib/categoryColors";
import { useEffect, useMemo, useState } from "react";

function initialsFromLabel(label: string): string {
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return label.slice(0, 2).toUpperCase();
}

const hoverGrowClasses =
  "transition-transform duration-200 ease-out hover:scale-110";

export function AvatarBubble({
  label,
  src,
  size = 36,
  title,
  className = "",
  category,
  avatarAccent,
  hoverGrow = true,
  /** Canonical id for ring/fallback color hash; defaults to label when omitted. */
  accentKey,
}: {
  label: string;
  src?: string | null;
  size?: number;
  title?: string;
  className?: string;
  /** When set, avatar ring/fallback use category palette instead of hash. */
  category?: string;
  /** When set, takes precedence over category (View details / identity accent). */
  avatarAccent?: CategoryColorName;
  /** When true, avatar scales up on hover. Default true. */
  hoverGrow?: boolean;
  accentKey?: string;
}) {
  const initials = useMemo(() => initialsFromLabel(label), [label]);
  const px = `${size}px`;
  const [imgFailed, setImgFailed] = useState(false);
  const hashSource = accentKey?.trim() || label;
  const hashAccent = useMemo(() => getAvatarAccentClasses(hashSource), [hashSource]);
  const palette = useMemo(() => {
    if (avatarAccent) {
      return {
        frame: getAgentAvatarFrameClassFromAgent({
          categoryLabel: "SPECIALIZED",
          avatarAccent,
        }),
        fallback: getAgentAvatarFallbackClassFromAgent({
          categoryLabel: "SPECIALIZED",
          avatarAccent,
        }),
      };
    }
    if (category?.trim()) {
      return {
        frame: getCategoryAvatarFrameClass(category),
        fallback: getCategoryAvatarFallbackClass(category),
      };
    }
    return null;
  }, [avatarAccent, category]);
  const frameBg = palette?.frame ?? hashAccent.frame;
  const fallbackSurface = palette?.fallback ?? hashAccent.fallback;

  // Reset load error when the image URL changes (external img src).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync error state to new `src`
    setImgFailed(false);
  }, [src]);

  const pad = 2;
  const inner = Math.max(size - pad * 2, 8);
  const innerPx = `${inner}px`;

  if (src && !imgFailed) {
    return (
      <span
        title={title ?? label}
        className={`inline-flex shrink-0 items-center justify-center rounded-full ring-2 ring-white ${frameBg} ${hoverGrow ? hoverGrowClasses : ""} ${className}`}
        style={{ width: px, height: px, minWidth: px, minHeight: px, padding: pad }}
      >
        <img
          src={src}
          alt={label}
          width={inner}
          height={inner}
          className="rounded-full object-cover"
          style={{
            width: innerPx,
            height: innerPx,
            minWidth: innerPx,
            minHeight: innerPx,
          }}
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      title={title ?? label}
      className={`inline-flex shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-2 ring-white ${fallbackSurface} ${hoverGrow ? hoverGrowClasses : ""} ${className}`}
      style={{ width: px, height: px }}
    >
      {initials}
    </span>
  );
}
