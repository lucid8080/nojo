import type { ReactNode } from "react";
import type { SmartSuggestionCategory } from "@/data/smartSuggestionsMock";

type ChipMeta = {
  label: SmartSuggestionCategory;
  chipCls: string;
  icon: ReactNode;
};

function SparkIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2l1.2 6.2L20 10l-6.8 1.8L12 18l-1.2-6.2L4 10l6.8-1.8L12 2z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BotIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 4h6l1 3H8l1-3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M6 9c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2V9Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M9.2 12h.01M14.8 12h.01"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChatIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 10h8M8 14h5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M21 12c0 4.4-4 8-9 8-1.2 0-2.3-.2-3.3-.6L3 20l.9-3c-.6-1.1-1-2.3-1-3.9C2 8.6 6 5 11 5c5 0 10 3.6 10 7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UsersIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M16 11c1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3 1.3 3 3 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M8 11c1.7 0 3-1.3 3-3S9.7 5 8 5 5 6.3 5 8s1.3 3 3 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M2.5 20c.4-3 2.5-5 5.5-5h0c3 0 5.1 2 5.5 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M13.5 20c.3-2 1.7-3.6 3.8-4h0c2.1.4 3.4 2 3.7 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ShieldIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2l8 4v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 12l1.7 1.8L15 10"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ZigZagIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 17l6-10 6 10 6-10"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const META_BY_CATEGORY: Record<SmartSuggestionCategory, ChipMeta> = {
  Review: {
    label: "Review",
    chipCls:
      "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-800/50",
    icon: <SparkIcon className="h-3.5 w-3.5" />,
  },
  Automation: {
    label: "Automation",
    chipCls:
      "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/50",
    icon: <BotIcon className="h-3.5 w-3.5" />,
  },
  Communication: {
    label: "Communication",
    chipCls:
      "bg-violet-50 text-violet-800 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-800/50",
    icon: <ChatIcon className="h-3.5 w-3.5" />,
  },
  Staffing: {
    label: "Staffing",
    chipCls:
      "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800/50",
    icon: <UsersIcon className="h-3.5 w-3.5" />,
  },
  "Quality Check": {
    label: "Quality Check",
    chipCls:
      "bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-950/35 dark:text-rose-300 dark:ring-rose-800/45",
    icon: <ShieldIcon className="h-3.5 w-3.5" />,
  },
  Escalation: {
    label: "Escalation",
    chipCls:
      "bg-slate-100 text-slate-800 ring-slate-200 dark:bg-slate-900/45 dark:text-slate-200 dark:ring-slate-600/60",
    icon: <ZigZagIcon className="h-3.5 w-3.5" />,
  },
};

export function CategoryChip({ category }: { category: SmartSuggestionCategory }) {
  const meta = META_BY_CATEGORY[category];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${meta.chipCls}`}
      title={meta.label}
    >
      <span aria-hidden className="text-current">
        {meta.icon}
      </span>
      {meta.label}
    </span>
  );
}

