"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  agentComparisonRows,
  agentDrillDownById,
  analyticsAgents,
  analyticsKpi,
  analyticsTaskTypes,
  analyticsTeams,
  categoryDistribution,
  costPerAgent,
  filterActivity,
  filterAgentRows,
  filterCostRows,
  getDailyForAgent,
  insightsPanel,
  kpiDeltas,
  mockActivityFeed,
  taskTypeDistribution,
  type ActivityEntry,
  type AgentComparisonRow,
} from "@/data/analyticsMockData";
import { getCategoryRowAccentClasses } from "@/lib/categoryColors";

const card =
  "rounded-3xl border border-neutral-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90";

function formatTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function formatTimeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleString();
}

function DeltaPill({
  delta,
  invert,
}: {
  delta: number;
  invert?: boolean;
}) {
  const good = invert ? delta < 0 : delta > 0;
  const sym = delta > 0 ? "↑" : delta < 0 ? "↓" : "—";
  const pct = Math.abs(delta).toFixed(1);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
        good
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
          : "bg-rose-500/15 text-rose-700 dark:text-rose-400"
      }`}
    >
      {sym} {pct}%
    </span>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-neutral-200 bg-white/95 px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="mb-1 font-semibold text-slate-700 dark:text-neutral-200">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-slate-600 dark:text-neutral-400">
          {p.name}: <span className="font-medium text-slate-900 dark:text-white">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  delta,
  invertDelta,
}: {
  label: string;
  value: string;
  sub?: string;
  delta: number;
  invertDelta?: boolean;
}) {
  return (
    <div className={card}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <DeltaPill delta={delta} invert={invertDelta} />
        {sub ? (
          <span className="text-xs text-slate-500 dark:text-slate-400">vs prev. period</span>
        ) : null}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ActivityEntry["status"] }) {
  const map = {
    success: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-400",
    failed: "bg-rose-500/15 text-rose-800 dark:text-rose-400",
    retrying: "bg-amber-500/15 text-amber-900 dark:text-amber-300",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${map[status]}`}>
      {status}
    </span>
  );
}

function AgentDrillPanel({
  agentId,
  onClose,
}: {
  agentId: string;
  onClose: () => void;
}) {
  const data = agentDrillDownById[agentId];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!data) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close panel"
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm dark:bg-black/50"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-neutral-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:rounded-l-3xl"
        role="dialog"
        aria-labelledby="drill-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-6 py-5 dark:border-slate-800">
          <div>
            <p className="text-xs font-medium text-sky-600 dark:text-sky-400">Agent detail</p>
            <h2 id="drill-title" className="text-xl font-bold text-slate-900 dark:text-white">
              {data.name}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{data.role}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-neutral-200 p-2 text-slate-600 transition hover:bg-neutral-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
          <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Task logs</h3>
            <ul className="space-y-2">
              {data.taskLogs.map((log) => (
                <li
                  key={log.id}
                  className="rounded-2xl border border-neutral-100 bg-neutral-50/80 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/50"
                >
                  <span
                    className={`mr-2 text-[10px] font-bold uppercase ${
                      log.level === "error"
                        ? "text-rose-600"
                        : log.level === "warn"
                          ? "text-amber-600"
                          : "text-sky-600"
                    }`}
                  >
                    {log.level}
                  </span>
                  {log.message}
                  <p className="mt-1 text-xs text-slate-500">{log.at}</p>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
              Token usage per request
            </h3>
            <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">Request</th>
                    <th className="px-3 py-2 font-medium">Tokens</th>
                    <th className="px-3 py-2 font-medium">At</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tokenPerRequest.map((r) => (
                    <tr key={r.id} className="border-t border-neutral-100 dark:border-slate-800">
                      <td className="px-3 py-2 font-mono text-xs">{r.request}</td>
                      <td className="px-3 py-2">{r.tokens.toLocaleString()}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">{r.at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Failure reasons</h3>
            {data.failureReasons.length === 0 ? (
              <p className="text-sm text-slate-500">No failures recorded this period.</p>
            ) : (
              <ul className="space-y-2">
                {data.failureReasons.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between rounded-2xl border border-rose-100 bg-rose-50/50 px-3 py-2 dark:border-rose-900/40 dark:bg-rose-950/20"
                  >
                    <span className="text-sm text-slate-800 dark:text-neutral-200">{f.reason}</span>
                    <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                      ×{f.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Tool usage</h3>
            <ul className="space-y-2">
              {data.toolUsage.map((t) => (
                <li key={t.tool} className="flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-sky-500"
                      style={{ width: `${t.share}%` }}
                    />
                  </div>
                  <span className="w-24 text-right text-xs text-slate-600 dark:text-slate-400">
                    {t.tool} ({t.calls})
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </aside>
    </>
  );
}

export function AnalyticsDashboard() {
  const [dateFrom, setDateFrom] = useState("2026-03-12");
  const [dateTo, setDateTo] = useState("2026-03-18");
  const [agentId, setAgentId] = useState("all");
  const [teamId, setTeamId] = useState("all");
  const [taskType, setTaskType] = useState("All types");
  const [drillAgentId, setDrillAgentId] = useState<string | null>(null);

  const deltas = kpiDeltas();
  const daily = useMemo(
    () => getDailyForAgent(agentId === "all" ? "all" : agentId),
    [agentId],
  );
  const activity = useMemo(
    () => filterActivity(mockActivityFeed, { agentId, teamId, taskType }),
    [agentId, teamId, taskType],
  );
  const comparisonRows = useMemo(
    () => filterAgentRows(agentComparisonRows, agentId, teamId),
    [agentId, teamId],
  );
  const costRows = useMemo(
    () => filterCostRows(costPerAgent, agentId, teamId),
    [agentId, teamId],
  );

  const filtersActive =
    agentId !== "all" || teamId !== "all" || taskType !== "All types";

  const exportCsv = useCallback(() => {
    const k = analyticsKpi.current;
    const lines = [
      "Agent Analytics Export (mock)",
      `Range,${dateFrom},${dateTo}`,
      `TotalTasks,${k.totalTasks}`,
      `SuccessRate,${k.successRate}`,
      `AvgResponseMs,${k.avgResponseMs}`,
      `Tokens,${k.totalTokens}`,
      `CostUSD,${k.estimatedCostUsd}`,
      `TimeSavedHours,${k.timeSavedHours}`,
      "",
      "Agent,Role,Tasks,Success%,AvgMs,Tokens,Cost,Status",
      ...comparisonRows.map(
        (r) =>
          `${r.name},${r.role},${r.tasksCompleted},${r.successRate},${r.avgResponseMs},${r.tokenUsage},${r.costUsd},${r.status}`,
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `agent-analytics-${dateFrom}-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [comparisonRows, dateFrom, dateTo]);

  const onRowClick = (row: AgentComparisonRow) => {
    setDrillAgentId(row.id);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-sky-600 dark:text-sky-400">Insights</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Agent Analytics
          </h1>
          {filtersActive ? (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Charts &amp; tables reflect filters. KPIs are workspace totals (mock).
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-neutral-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
          >
            Export Report
          </button>
          <Link
            href="/workspace"
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-neutral-100 dark:text-slate-900 dark:hover:bg-white"
          >
            View Logs
          </Link>
        </div>
      </header>

      <div
        className={`${card} flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end`}
      >
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          To
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Agent
          <select
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="all">All agents</option>
            {analyticsAgents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Team
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            {analyticsTeams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Task type
          <select
            value={taskType}
            onChange={(e) => setTaskType(e.target.value)}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            {analyticsTaskTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-7">
          <KpiCard
            label="Total tasks completed"
            value={analyticsKpi.current.totalTasks.toLocaleString()}
            delta={deltas.totalTasks}
            sub=" "
          />
          <KpiCard
            label="Success rate"
            value={`${analyticsKpi.current.successRate}%`}
            delta={deltas.successRate}
            sub=" "
          />
          <KpiCard
            label="Avg response time"
            value={`${(analyticsKpi.current.avgResponseMs / 1000).toFixed(2)}s`}
            delta={deltas.avgResponseMs}
            invertDelta
            sub=" "
          />
          <KpiCard
            label="Total token usage"
            value={formatTokens(analyticsKpi.current.totalTokens)}
            delta={deltas.totalTokens}
            sub=" "
          />
          <KpiCard
            label="Estimated cost"
            value={`$${analyticsKpi.current.estimatedCostUsd.toFixed(2)}`}
            delta={deltas.estimatedCostUsd}
            invertDelta
            sub=" "
          />
          <KpiCard
            label="Active agents"
            value={String(analyticsKpi.current.activeAgents)}
            delta={deltas.activeAgents}
            sub=" "
          />
          <KpiCard
            label="Est. time saved"
            value={`${analyticsKpi.current.timeSavedHours.toFixed(1)} hrs`}
            delta={deltas.timeSavedHours}
            sub=" "
          />
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className={card}>
              <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
                Tasks over time
              </h2>
              <div className="h-56 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-slate-700" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip content={<ChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="tasks"
                      name="Tasks"
                      stroke="#0ea5e9"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className={card}>
              <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
                Success vs failure
              </h2>
              <div className="h-56 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-slate-700" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                    <Bar dataKey="success" name="Success" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="failed" name="Failed" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className={card}>
            <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
              Response time trend
            </h2>
            <div className="h-56 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-slate-700" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `${v}ms`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="avgMs"
                    name="Avg ms"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-1 xl:grid-cols-3">
            <div className={card}>
              <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
                Token usage over time
              </h2>
              <div className="h-56 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-slate-700" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      stroke="#94a3b8"
                      tickFormatter={(v) => (v >= 1e6 ? `${v / 1e6}M` : `${v / 1000}k`)}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="tokens"
                      name="Tokens"
                      stroke="#14b8a6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className={card}>
              <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
                Task type distribution
              </h2>
              <div className="h-56 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[...taskTypeDistribution]}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={2}
                    >
                      {taskTypeDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className={card}>
              <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
                Marketplace skills by category
              </h2>
              <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                Colors match category mapping (deterministic per label).
              </p>
              <div className="h-64 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[...categoryDistribution]}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={44}
                      outerRadius={80}
                      paddingAngle={1}
                    >
                      {categoryDistribution.map((entry, i) => (
                        <Cell key={`${entry.category}-${i}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className={card}>
            <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
              Cost per agent
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    <th className="pb-3 font-medium">Agent</th>
                    <th className="pb-3 font-medium">Tokens</th>
                    <th className="pb-3 font-medium">Est. cost</th>
                  </tr>
                </thead>
                <tbody>
                  {costRows.map((r) => (
                    <tr
                      key={r.agentId}
                      className={`border-b border-neutral-100 dark:border-slate-800 ${getCategoryRowAccentClasses(r.categoryLabel)}`}
                    >
                      <td className="py-3 font-medium text-slate-900 dark:text-white">{r.agent}</td>
                      <td className="py-3 text-slate-600 dark:text-slate-300">{r.tokens.toLocaleString()}</td>
                      <td className="py-3 text-slate-600 dark:text-slate-300">${r.costUsd.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={card}>
            <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
              Agent comparison
            </h2>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              Click a row for detailed analytics (task logs, tokens per request, failures, tools).
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    <th className="pb-3 font-medium">Agent</th>
                    <th className="pb-3 font-medium">Role</th>
                    <th className="pb-3 font-medium">Tasks</th>
                    <th className="pb-3 font-medium">Success</th>
                    <th className="pb-3 font-medium">Avg RT</th>
                    <th className="pb-3 font-medium">Tokens</th>
                    <th className="pb-3 font-medium">Cost</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => onRowClick(r)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onRowClick(r);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      className={`cursor-pointer border-b border-neutral-100 transition hover:bg-sky-50/50 dark:border-slate-800 dark:hover:bg-sky-950/20 ${getCategoryRowAccentClasses(r.categoryLabel)}`}
                    >
                      <td className="py-3 font-medium text-slate-900 dark:text-white">{r.name}</td>
                      <td className="py-3 text-slate-600 dark:text-slate-300">{r.role}</td>
                      <td className="py-3">{r.tasksCompleted}</td>
                      <td className="py-3">{r.successRate}%</td>
                      <td className="py-3">{(r.avgResponseMs / 1000).toFixed(2)}s</td>
                      <td className="py-3">{formatTokens(r.tokenUsage)}</td>
                      <td className="py-3">${r.costUsd.toFixed(2)}</td>
                      <td className="py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            r.status === "Active"
                              ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-400"
                              : r.status === "Degraded"
                                ? "bg-amber-500/15 text-amber-900 dark:text-amber-300"
                                : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={card}>
            <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Insights</h2>
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-rose-600 dark:text-rose-400">
                  Alerts
                </h3>
                <ul className="list-disc space-y-2 pl-4 text-sm text-slate-700 dark:text-slate-300">
                  {insightsPanel.alerts.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-sky-600 dark:text-sky-400">
                  Recommendations
                </h3>
                <ol className="list-decimal space-y-2 pl-4 text-sm text-slate-700 dark:text-slate-300">
                  {insightsPanel.recommendations.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ol>
              </div>
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                  Highlights
                </h3>
                <ul className="list-disc space-y-2 pl-4 text-sm text-slate-700 dark:text-slate-300">
                  {insightsPanel.highlights.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <aside className={`${card} lg:sticky lg:top-28 lg:self-start`}>
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Live activity</h2>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            Mock stream · filtered by selections above
          </p>
          <div
            className="max-h-[28rem] space-y-2 overflow-y-auto pr-1"
            aria-label="Activity feed"
          >
            {activity.length === 0 ? (
              <p className="text-sm text-slate-500">No activity matches filters.</p>
            ) : (
              activity.map((e) => (
                <div
                  key={e.id}
                  className="rounded-2xl border border-neutral-100 bg-neutral-50/60 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {e.agentName}
                    </span>
                    <StatusBadge status={e.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{e.task}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{formatTimeAgo(e.at)}</p>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      {drillAgentId ? (
        <AgentDrillPanel agentId={drillAgentId} onClose={() => setDrillAgentId(null)} />
      ) : null}
    </div>
  );
}
