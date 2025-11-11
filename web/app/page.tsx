"use client";

import { useState } from "react";
import DataTable from "../components/DataTable";

export default function HomePage() {
  const [eccFile, setEccFile] = useState<File | null>(null);
  const [cdsFile, setCdsFile] = useState<File | null>(null);

  const disabled = true; // A4: keep disabled; logic comes later

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border p-5">
        <h1 className="text-xl font-semibold">Upload CSVs (stub)</h1>
        <p className="text-sm text-gray-600">
          Provide two CSVs: ECC/BW extractors and S/4 CDS views. Submit is disabled in A4.
        </p>
        <form onSubmit={(e) => e.preventDefault()} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">ecc_extractors.csv</span>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setEccFile(e.target.files?.[0] ?? null)}
              className="block w-full rounded-lg border p-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">s4_cds.csv</span>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCdsFile(e.target.files?.[0] ?? null)}
              className="block w-full rounded-lg border p-2"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={disabled}
              aria-disabled={disabled}
              title="Coming soon"
              className="rounded-lg bg-gray-300 px-4 py-2 font-medium text-gray-600 disabled:cursor-not-allowed"
            >
              Submit (disabled)
            </button>
            <div className="mt-2 text-xs text-gray-500">
              Selected: {eccFile?.name ?? "none"} / {cdsFile?.name ?? "none"}
            </div>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border p-5">
        <h2 className="text-lg font-semibold">Placeholder Table</h2>
        <p className="text-sm text-gray-600">
          This renders TanStack Table with sample columns and no data yet.
        </p>
        <div className="mt-4">
          <DataTable />
        </div>
      </section>
    </div>
  );
}
