"use client";

import type { WorkspaceAgent } from "@/data/workspaceChatMock";
import { useState } from "react";
import { WorkspaceAgentAvatar } from "./WorkspaceAgentAvatar";

export function ChatComposer({
  agents,
  placeholder = "Message this job room…",
  onSend,
  submitting = false,
}: {
  agents: WorkspaceAgent[];
  placeholder?: string;
  onSend: (prompt: string) => Promise<void>;
  submitting?: boolean;
}) {
  const [value, setValue] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const trimmed = value.trim();
  const disabled = submitting || trimmed.length === 0;

  async function handleSendClick() {
    if (disabled) return;
    try {
      await onSend(trimmed);
      setValue("");
    } catch {
      // WorkspaceShell appends a system message + toast on failure.
    }
  }

  return (
    <div className="shrink-0 border-t border-neutral-200/80 bg-white/95 p-3 shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.08)] dark:border-slate-800 dark:bg-slate-950/95 dark:shadow-black/20 sm:p-4">
      <div className="relative mb-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMentionOpen((o) => !o)}
          className="rounded-lg border border-neutral-200/80 bg-neutral-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-neutral-100 dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-200 dark:hover:bg-slate-700"
        >
          @ Mention agent
        </button>
        {mentionOpen ? (
          <div className="absolute bottom-full left-0 z-10 mb-1 max-h-40 w-56 overflow-y-auto rounded-xl border border-neutral-200/90 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800">
            {agents.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setValue((v) => `${v}@${a.name.split(" ")[0]} `);
                  setMentionOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-slate-700"
              >
                <WorkspaceAgentAvatar agent={a} size={28} />
                <span className="font-medium text-slate-800 dark:text-neutral-200">
                  {a.name}
                </span>
              </button>
            ))}
          </div>
        ) : null}
        <button
          type="button"
          className="rounded-lg border border-neutral-200/80 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-200"
          aria-label="Attach file"
        >
          Attach
        </button>
        <button
          type="button"
          className="rounded-lg border border-neutral-200/80 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-200"
        >
          Assign task
        </button>
        <button
          type="button"
          className="rounded-lg border border-neutral-200/80 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-200"
        >
          Ask for update
        </button>
        <button
          type="button"
          className="rounded-lg border border-neutral-200/80 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-200"
        >
          Summarize progress
        </button>
      </div>
      <div className="flex gap-2 rounded-2xl border border-neutral-200/90 bg-neutral-50/50 p-2 dark:border-slate-700 dark:bg-slate-900/50">
        <textarea
          rows={2}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="min-h-[52px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white dark:placeholder:text-neutral-500"
          aria-label="Message input"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={handleSendClick}
          className={`self-end rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 ${
            disabled ? "cursor-not-allowed opacity-70 hover:bg-slate-900 dark:hover:bg-sky-600" : ""
          }`}
        >
          Send
        </button>
      </div>
    </div>
  );
}
