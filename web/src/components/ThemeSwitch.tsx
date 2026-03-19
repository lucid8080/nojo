"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "dashboard-theme";

function applyThemeClass(isDark: boolean) {
  const root = document.documentElement;
  if (isDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function ThemeSwitch() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    const prefersDark =
      stored === "dark" ||
      (stored !== "light" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    setIsDark(prefersDark);
    applyThemeClass(prefersDark);
  }, []);

  const toggle = useCallback(() => {
    const next = !isDark;
    setIsDark(next);
    applyThemeClass(next);
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
  }, [isDark]);

  if (!mounted) {
    return (
      <span
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-neutral-200/80 bg-white/80 dark:border-slate-700 dark:bg-slate-800/80"
        aria-hidden
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-neutral-200/80 bg-white text-slate-600 shadow-sm transition hover:bg-neutral-50 hover:text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <svg
          className="size-5 text-amber-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ) : (
        <svg
          className="size-5 text-slate-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}
    </button>
  );
}
