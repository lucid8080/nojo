"use client";

import {
  integrationIconsCdnSlug,
  integrationIconsInline,
} from "@/lib/integrationBrandIcons";
import { useState } from "react";

const CDN = "https://cdn.simpleicons.org";

function InlineBrandIcon({ path, hex }: { path: string; hex: string }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-sm ring-1 ring-neutral-200/80 dark:bg-slate-800 dark:ring-slate-600">
      <svg
        role="img"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        className="size-5"
        aria-hidden
      >
        <title />
        <path fill={`#${hex}`} d={path} />
      </svg>
    </span>
  );
}

function InitialFallback({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
      aria-hidden
    >
      {initial}
    </span>
  );
}

export function IntegrationBrandLogo({
  integrationId,
  name,
}: {
  integrationId: string;
  name: string;
}) {
  const inline = integrationIconsInline[integrationId];
  const cdnSlug = integrationIconsCdnSlug[integrationId];
  const [cdnFailed, setCdnFailed] = useState(!cdnSlug);

  if (inline) {
    return <InlineBrandIcon path={inline.path} hex={inline.hex} />;
  }

  if (!cdnSlug || cdnFailed) {
    return <InitialFallback name={name} />;
  }

  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-sm ring-1 ring-neutral-200/80 dark:bg-slate-800 dark:ring-slate-600">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${CDN}/${cdnSlug}`}
        alt=""
        width={20}
        height={20}
        className="size-5 object-contain"
        loading="lazy"
        decoding="async"
        onError={() => setCdnFailed(true)}
      />
    </span>
  );
}
