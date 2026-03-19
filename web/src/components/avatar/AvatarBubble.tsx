"use client";

import { getAvatarAccentClasses } from "@/lib/agentAvatars";
import {
  getCategoryAvatarFallbackClass,
  getCategoryAvatarFrameClass,
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
  hoverGrow = true,
}: {
  label: string;
  src?: string | null;
  size?: number;
  title?: string;
  className?: string;
  /** When set, avatar ring/fallback use category palette instead of hash. */
  category?: string;
  /** When true, avatar scales up on hover. Default true. */
  hoverGrow?: boolean;
}) {
  const initials = useMemo(() => initialsFromLabel(label), [label]);
  const px = `${size}px`;
  const [imgFailed, setImgFailed] = useState(false);
  const hashAccent = useMemo(() => getAvatarAccentClasses(label), [label]);
  const frameBg = category?.trim()
    ? getCategoryAvatarFrameClass(category)
    : hashAccent.frame;
  const fallbackSurface = category?.trim()
    ? getCategoryAvatarFallbackClass(category)
    : hashAccent.fallback;

  useEffect(() => {
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
