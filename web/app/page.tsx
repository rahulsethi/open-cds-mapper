// web/app/page.tsx
"use client";

import * as React from "react";
import DataTable from "@/components/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { postMatch } from "@/lib/api";
import { downloadJSON, exportCSV } from "@/lib/download";
import type { MatchResponse } from "@/lib/types";

type ResultRow = {
  extractor: string;
  cds_view: string;
  score: number;
  name: number;
  fields: number;
  keys: number;
  _raw?: any;
};

function flatten(resp: MatchResponse): ResultRow[] {
  const out: ResultRow[] = [];
  for (const m of resp.matches ?? []) {
    for (const c of m.candidates ?? []) {
      out.push({
        extractor: m.extractor_name,
        cds_view: c.cds_view_name,
        score: Number(c.score ?? 0),
        name: Number(c.name_score ?? 0),
        fields: Number(c.field_overlap ?? 0),
        keys: Number(c.key_overlap ?? 0),
        _raw: { m, c },
      });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}

const columns: ColumnDef<ResultRow>[] = [
  { header: "Extractor", accessorKey: "extractor" },
  { header: "CDS View", accessorKey: "cds_view" },
  { header: "Score", accessorKey: "score", cell: ({ getValue }) => Number(getValue<number>()).toFixed(3) },
  { header: "Name", accessorKey: "name", cell: ({ getValue }) => Number(getValue<number>()).toFixed(3) },
  { header: "Fields", accessorKey: "fields", cell: ({ getValue }) => Number(getValue<number>()).toFixed(3) },
  { header: "Keys", accessorKey: "keys", cell: ({ getValue }) => Number(getValue<number>()).toFixed(3) },
];

export default function HomePage() {
  // files
  const [ecc, setEcc] = React.useState<File | null>(null);
  const [s4, setS4] = React.useState<File | null>(null);

  // controls
  const [useSamples, setUseSamples] = React.useState(false);
  const [topK, setTopK] = React.useState(3);
  const [wName, setWName] = React.useState(0.6);
  const [wFields, setWFields] = React.useState(0.3);
  const [wKeys, setWKeys] = React.useState(0.1);
  const sum = (wName + wFields + wKeys).toFixed(2);

  // ui
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resp, setResp] = React.useState<MatchResponse | null>(null);
  const [rows, setRows] = React.useState<ResultRow[]>([]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!useSamples && (!ecc || !s4)) {
      setError("Provide both CSVs or tick ‘Use server sample CSVs’."); // quick client-side check
      return;
    }

    setLoading(true);
    try {
      const data = await postMatch({
        files: { ecc, s4 },
        topK,
        useSamples,
        weights: { name: wName, fields: wFields, keys: wKeys }, // server normalizes
      });
      setResp(data);
      setRows(flatten(data));
    } catch (err: any) {
      setResp(null);
      setRows([]);
      setError(err?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setEcc(null);
    setS4(null);
    setUseSamples(false);
    setTopK(3);
    setWName(0.6);
    setWFields(0.3);
    setWKeys(0.1);
    setResp(null);
    setRows([]);
    setError(null);
    (document.getElementById("ecc-file") as HTMLInputElement | null)?.value && ((document.getElementById("ecc-file") as HTMLInputElement).value = "");
    (document.getElementById("s4-file") as HTMLInputElement | null)?.value && ((document.getElementById("s4-file") as HTMLInputElement).value = "");
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">OCMT</h1>

      <section className="rounded-xl border p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-medium">Upload CSVs</h2>
        <p className="mb-4 text-sm text-gray-600">
          Provide two CSVs (ECC/BW extractors and S/4 CDS views). Or tick <strong>Use server samples</strong>.
        </p>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">ecc_extractors.csv</label>
              <input id="ecc-file" type="file" accept=".csv,text/csv" className="w-full rounded border p-2"
                     onChange={(e) => setEcc(e.target.files?.[0] ?? null)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">s4_cds.csv</label>
              <input id="s4-file" type="file" accept=".csv,text/csv" className="w-full rounded border p-2"
                     onChange={(e) => setS4(e.target.files?.[0] ?? null)} />
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-semibold">Weights</h3>

            <label className="block text-sm">Name ({wName.toFixed(2)})</label>
            <input type="range" min={0} max={1} step={0.01} value={wName} onChange={(e) => setWName(parseFloat(e.target.value))} className="w-full mb-3" />

            <label className="block text-sm">Fields ({wFields.toFixed(2)})</label>
            <input type="range" min={0} max={1} step={0.01} value={wFields} onChange={(e) => setWFields(parseFloat(e.target.value))} className="w-full mb-3" />

            <label className="block text-sm">Keys ({wKeys.toFixed(2)})</label>
            <input type="range" min={0} max={1} step={0.01} value={wKeys} onChange={(e) => setWKeys(parseFloat(e.target.value))} className="w-full" />

            <p className="mt-2 text-xs text-gray-600">
              Sum: <span className="font-mono">{sum}</span> (API normalizes to 1.0)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={useSamples} onChange={(e) => setUseSamples(e.target.checked)} />
              <span className="text-sm">Use server sample CSVs</span>
            </label>

            <label className="ml-2 flex items-center gap-2 text-sm">
              Top K:
              <select value={topK} onChange={(e) => setTopK(parseInt(e.target.value, 10))}
                      className="rounded border px-2 py-1">
                {[1, 2, 3, 5, 10].map((n) => (<option key={n} value={n}>{n}</option>))}
              </select>
            </label>

            <button type="submit" disabled={loading}
                    className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {loading ? "Processing..." : "Submit"}
            </button>

            <button type="button" onClick={reset} className="rounded border px-3 py-2 text-sm" disabled={loading}>
              Reset
            </button>

            <button type="button" onClick={() => resp && downloadJSON(resp, "ocmt_match_result.json")}
                    className="rounded border px-3 py-2 text-sm disabled:opacity-50" disabled={!resp}>
              Download JSON
            </button>

            <button type="button" onClick={() => rows.length && exportCSV(rows, "ocmt_matches.csv")}
                    className="rounded border px-3 py-2 text-sm disabled:opacity-50" disabled={!rows.length}>
              Export CSV
            </button>
          </div>

          {error && (
            <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
          )}
        </form>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-medium">Results</h2>
        {resp?.counts ? (
          <p className="mb-3 text-sm text-gray-600">
            Extractors: {resp.counts.extractors} · CDS Views: {resp.counts.cds_views} · Method: {resp.run_info?.method ?? "n/a"}
          </p>
        ) : (
          <p className="mb-3 text-sm text-gray-600">No results yet.</p>
        )}
        <div className="rounded-xl border p-2">
          <DataTable<ResultRow> data={rows} columns={columns} />
        </div>
      </section>
    </main>
  );
}
