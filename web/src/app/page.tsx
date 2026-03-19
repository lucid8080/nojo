import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-neutral-100 px-6 dark:bg-slate-950">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-neutral-100">
        HireFlow
      </h1>
      <Link
        href="/dashboard"
        className="rounded-full bg-slate-900 px-8 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800 dark:bg-neutral-100 dark:text-slate-900 dark:hover:bg-white"
      >
        Open Agent Journeys dashboard
      </Link>
    </div>
  );
}
