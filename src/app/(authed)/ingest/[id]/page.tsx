"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

type ImportRun = {
  id: string;
  location_id: string;
  source: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  error_summary: string | null;
};

type ImportRow = {
  row_type: string;
  row_number: number;
  row_data: Record<string, string>;
};

export default function ImportRunDetailPage() {
  const params = useParams();
  const paramValue = params?.id;
  const runId =
    typeof paramValue === "string"
      ? paramValue
      : Array.isArray(paramValue)
        ? paramValue[0] ?? ""
        : "";
  const [run, setRun] = useState<ImportRun | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [limit, setLimit] = useState(200);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("all");
  const [query, setQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        setLoading(false);
        return;
      }

      if (!runId) {
        return;
      }

      const response = await fetch(`/api/ingest/runs/${runId}?limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const message = await response.text();
        setStatus(message);
        setLoading(false);
        return;
      }

      const payload = (await response.json()) as {
        run: ImportRun;
        rows: ImportRow[];
        limit: number;
      };

      setRun(payload.run);
      setRows(payload.rows);
      setLimit(payload.limit);
      setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [runId, limit]);

  useEffect(() => {
    if (!autoRefresh) {
      return;
    }
    const timer = setInterval(() => {
      void load();
    }, 8000);
    return () => clearInterval(timer);
  }, [autoRefresh, runId, limit]);

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      counts.set(row.row_type, (counts.get(row.row_type) ?? 0) + 1);
    }
    return counts;
  }, [rows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filterType !== "all" && row.row_type !== filterType) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      return JSON.stringify(row.row_data).toLowerCase().includes(normalizedQuery);
    });
  }, [rows, filterType, query]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Import Run Detail</h1>
        <Link className="text-sm text-gray-600" href="/dashboard">
          Back to dashboard
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-gray-600">Loading import run...</p>
      ) : status ? (
        <p className="text-sm text-red-600">{status}</p>
      ) : run ? (
        <div className="rounded border border-gray-200 bg-white p-4 text-sm">
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <p className="text-xs text-gray-500">Run ID</p>
              <p className="font-mono text-xs">{run.id}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <p className="font-semibold">{run.status}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Started</p>
              <p>
                {run.started_at
                  ? new Date(run.started_at).toLocaleString()
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Finished</p>
              <p>
                {run.finished_at
                  ? new Date(run.finished_at).toLocaleString()
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Source</p>
              <p>{run.source}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Errors</p>
              <p className="text-red-600">{run.error_summary ?? "-"}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Raw Rows (limit {limit})</h2>
          <div className="flex items-center gap-2 text-xs">
            <button
              className="rounded border border-gray-300 px-2 py-1"
              onClick={() => setLimit(200)}
            >
              200
            </button>
            <button
              className="rounded border border-gray-300 px-2 py-1"
              onClick={() => setLimit(500)}
            >
              500
            </button>
            <button
              className="rounded border border-gray-300 px-2 py-1"
              onClick={() => setLimit(1000)}
            >
              1000
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-600">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(event) => setAutoRefresh(event.target.checked)}
            />
            Auto-refresh
          </label>
          <button
            className="rounded border border-gray-300 px-2 py-1"
            onClick={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh now"}
          </button>
          <label className="flex items-center gap-2">
            <span>Type</span>
            <select
              className="rounded border border-gray-300 px-2 py-1 text-xs"
              value={filterType}
              onChange={(event) => setFilterType(event.target.value)}
            >
              <option value="all">All ({rows.length})</option>
              {Array.from(typeCounts.entries()).map(([type, count]) => (
                <option key={type} value={type}>
                  {type} ({count})
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span>Search</span>
            <input
              className="rounded border border-gray-300 px-2 py-1 text-xs"
              placeholder="json contains..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <span>Showing {filteredRows.length} rows</span>
        </div>

        {rows.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">No rows stored yet.</p>
        ) : (
          <div className="mt-3 overflow-hidden rounded border border-gray-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-[11px] uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Row #</th>
                  <th className="px-3 py-2">Data</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={`${row.row_type}-${row.row_number}`}
                    className="border-t align-top"
                  >
                    <td className="px-3 py-2">{row.row_type}</td>
                    <td className="px-3 py-2">{row.row_number}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-gray-700">
                      {JSON.stringify(row.row_data)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
