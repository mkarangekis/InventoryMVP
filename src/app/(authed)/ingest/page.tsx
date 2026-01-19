"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Location = { id: string; name: string };

type ImportRun = {
  id: string;
  location_id: string;
  location_name: string;
  source: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  error_summary: string | null;
};

export default function IngestPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [importRuns, setImportRuns] = useState<ImportRun[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [ordersFile, setOrdersFile] = useState<File | null>(null);
  const [itemsFile, setItemsFile] = useState<File | null>(null);
  const [modifiersFile, setModifiersFile] = useState<File | null>(null);
  const [voidsFile, setVoidsFile] = useState<File | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRuns = async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      return;
    }

    setRefreshing(true);
    const runsRes = await fetch("/api/ingest/runs", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (runsRes.ok) {
      const payload = (await runsRes.json()) as { runs: ImportRun[] };
      setImportRuns(payload.runs);
    }
    setRefreshing(false);
  };

  useEffect(() => {
    const load = async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        return;
      }

      const locationsRes = await fetch("/api/locations", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (locationsRes.ok) {
        const payload = (await locationsRes.json()) as {
          locations: Location[];
        };
        setLocations(payload.locations);
        const stored =
          typeof window !== "undefined"
            ? window.localStorage.getItem("barops.locationId")
            : null;
        setSelectedLocation(
          stored && payload.locations.some((loc) => loc.id === stored)
            ? stored
            : payload.locations[0]?.id ?? "",
        );
      }

      await loadRuns();
    };

    void load();
  }, []);

  useEffect(() => {
    const handleLocationChange = () => {
      if (typeof window !== "undefined") {
        const stored = window.localStorage.getItem("barops.locationId");
        if (stored && locations.some((loc) => loc.id === stored)) {
          setSelectedLocation(stored);
        }
      }
      void loadRuns();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("location-change", handleLocationChange);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("location-change", handleLocationChange);
      }
    };
  }, [locations]);

  useEffect(() => {
    if (!autoRefresh) {
      return;
    }
    const timer = setInterval(() => {
      void loadRuns();
    }, 8000);
    return () => clearInterval(timer);
  }, [autoRefresh]);

  const handleUpload = async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setUploadStatus("Not signed in.");
      return;
    }

    if (
      !selectedLocation ||
      !ordersFile ||
      !itemsFile ||
      !modifiersFile ||
      !voidsFile
    ) {
      setUploadStatus("Select a location and all four CSV files.");
      return;
    }

    setUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append("location_id", selectedLocation);
    formData.append("orders", ordersFile);
    formData.append("order_items", itemsFile);
    formData.append("modifiers", modifiersFile);
    formData.append("voids_comps", voidsFile);

    const response = await fetch("/api/ingest/csv", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!response.ok) {
      const message = await response.text();
      setUploadStatus(`Upload failed: ${message}`);
      setUploading(false);
      return;
    }

    const payload = (await response.json()) as {
      ok: boolean;
      jobResults?: {
        import?: { ok: boolean };
        usage: { ok: boolean };
        forecast: { ok: boolean };
        ordering: { ok: boolean };
      };
    };

    if (payload.jobResults) {
      const importRun = payload.jobResults.import?.ok
        ? "import ok"
        : "import failed";
      const usage = payload.jobResults.usage.ok ? "usage ok" : "usage failed";
      const forecast = payload.jobResults.forecast.ok
        ? "forecast ok"
        : "forecast failed";
      const ordering = payload.jobResults.ordering.ok
        ? "ordering ok"
        : "ordering failed";
      setUploadStatus(
        `CSV import completed. Jobs: ${importRun}, ${usage}, ${forecast}, ${ordering}.`,
      );
    } else {
      setUploadStatus("CSV import completed.");
    }
    setOrdersFile(null);
    setItemsFile(null);
    setModifiersFile(null);
    setVoidsFile(null);

    await loadRuns();

    setUploading(false);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">POS CSV Ingestion</h1>
        <p className="text-sm text-gray-500">Sample files: `seed/csv`</p>
      </div>

      <div className="rounded border border-gray-200 bg-white p-4">
        <div className="grid gap-3 text-sm">
          <label className="grid gap-1">
            <span className="text-xs text-gray-500">Location</span>
            <select
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={selectedLocation}
              onChange={(event) => setSelectedLocation(event.target.value)}
            >
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-gray-500">orders.csv</span>
            <input
              type="file"
              accept=".csv"
              onChange={(event) =>
                setOrdersFile(event.target.files?.[0] ?? null)
              }
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-gray-500">order_items.csv</span>
            <input
              type="file"
              accept=".csv"
              onChange={(event) =>
                setItemsFile(event.target.files?.[0] ?? null)
              }
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-gray-500">modifiers.csv</span>
            <input
              type="file"
              accept=".csv"
              onChange={(event) =>
                setModifiersFile(event.target.files?.[0] ?? null)
              }
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-gray-500">voids_comps.csv</span>
            <input
              type="file"
              accept=".csv"
              onChange={(event) =>
                setVoidsFile(event.target.files?.[0] ?? null)
              }
            />
          </label>
          <button
            className="w-fit rounded border border-gray-300 px-3 py-2 text-xs font-semibold"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Upload CSVs"}
          </button>
          {uploadStatus ? (
            <p className="text-xs text-gray-600">{uploadStatus}</p>
          ) : null}
        </div>
      </div>

      <div className="rounded border border-gray-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Recent imports</h2>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-600">
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
            onClick={loadRuns}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh now"}
          </button>
        </div>
        {importRuns.length === 0 ? (
          <p className="text-xs text-gray-600">No import runs yet.</p>
        ) : (
          <div className="mt-2 overflow-hidden rounded border border-gray-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-[11px] uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Location</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Started</th>
                  <th className="px-3 py-2">Finished</th>
                  <th className="px-3 py-2">Error</th>
                  <th className="px-3 py-2">View</th>
                </tr>
              </thead>
              <tbody>
                {importRuns.map((run) => (
                  <tr key={run.id} className="border-t">
                    <td className="px-3 py-2">{run.location_name}</td>
                    <td className="px-3 py-2">{run.status}</td>
                    <td className="px-3 py-2">
                      {run.started_at
                        ? new Date(run.started_at).toLocaleString()
                        : "-"}
                    </td>
                    <td className="px-3 py-2">
                      {run.finished_at
                        ? new Date(run.finished_at).toLocaleString()
                        : "-"}
                    </td>
                    <td className="px-3 py-2 text-red-600">
                      {run.error_summary ?? ""}
                    </td>
                    <td className="px-3 py-2">
                      <Link className="text-xs text-blue-600" href={`/ingest/${run.id}`}>
                        Details
                      </Link>
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
