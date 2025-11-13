"use client";

import React from "react";
import DataTable from "@/components/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { postMatch } from "@/lib/api";
import { MatchResponse, ResultRow, Explain } from "@/lib/types";
import { downloadCsv, downloadJson } from "@/lib/download";

export default function HomePage() {
  const [ecc, setEcc] = React.useState<File | null>(null);
  const [s4, setS4] = React.useState<File | null>(null);
  const [useSamples, setUseSamples] = React.useState(false);
  const [topK, setTopK] = React.useState(3);

  // A9: weights
  const [wName, setWName] = React.useState(0.6);
  const [wFields, setWFields] = React.useState(0.3);
  const [wKeys, setWKeys] = React.useState(0.1);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resp, setResp] = React.useState<MatchResponse | null>(null);
  const [rows, setRows] = React.useState<ResultRow[]>([]);
  const [explainFor, setExplainFor] = React.useState<ResultRow | null>(null);

  const columns: ColumnDef<ResultRow>[] = [
    { header: "Extractor", accessorKey: "extractor" },
    { header: "CDS View", accessorKey: "cds_view" },
    {
      header: "Score",
      accessorKey: "score",
      cell: ({ getValue }) => (getValue<number>() ?? 0).toFixed(3),
    },
    {
      header: "Name",
      accessorKey: "name_score",
      cell: ({ getValue }) => (getValue<number>() ?? 0).toFixed(3),
    },
    {
      header: "Fields",
      accessorKey: "field_overlap",
      cell: ({ getValue }) => (getValue<number>() ?? 0).toFixed(3),
    },
    {
      header: "Keys",
      accessorKey: "key_overlap",
      cell: ({ getValue }) => (getValue<number>() ?? 0).toFixed(3),
    },
    {
      header: "Explain",
      id: "explain",
      cell: ({ row }) => (
        <button
          className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
          onClick={() => setExplainFor(row.original)}
        >
          Details
        </button>
      ),
    },
  ];

  function flatten(r: MatchResponse): ResultRow[] {
    const out: ResultRow[] = [];
    for (const m of r.matches) {
      for (const c of m.candidates) {
        out.push({
          id: `${m.extractor_name}::${c.cds_view_name}`,
          extractor: m.extractor_name,
          extractor_text: m.extractor_text,
          cds_view: c.cds_view_name,
          cds_text: c.cds_view_text,
          score: c.score,
          name_score: c.name_score,
          field_overlap: c.field_overlap,
          key_overlap: c.key_overlap,
          shared_fields: c.shared_fields,
          shared_keys: c.shared_keys,
          explain: c.explain,
        });
      }
    }
    return out;
  }

  const canSubmit = useSamples || (!!ecc && !!s4);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setResp(null);
    setRows([]);
    setExplainFor(null);

    try {
      const result = await postMatch(
        useSamples ? {} : { ecc: ecc ?? undefined, s4: s4 ?? undefined },
        topK,
        { name: wName, fields: wFields, keys: wKeys }
      );
      setResp(result);
      setRows(flatten(result));
    } catch (err: any) {
      setError(err?.message ?? "Request failed");
    } finally {
      setLoading(false);
    }
  }

  const onReset = () => {
    setEcc(null);
    setS4(null);
    setResp(null);
    setRows([]);
    setError(null);
    setExplainFor(null);
  };

  const onDownloadJson = () => {
    if (!resp) return;
    downloadJson("ocmt_match_result.json", resp);
  };

  const onExportCsv = () => {
    if (!rows.length) return;
    const toExport = rows.map((r) => ({
      extractor: r.extractor,
      cds_view: r.cds_view,
      score: r.score,
      name_score: r.name_score,
      field_overlap: r.field_overlap,
      key_overlap: r.key_overlap,
      shared_fields: r.shared_fields ?? [],
      shared_keys: r.shared_keys ?? [],
    }));
    downloadCsv("ocmt_matches.csv", toExport as any[]);
  };

  const sum = wName + wFields + wKeys;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">OCMT</h1>
        <p className="text-xs text-gray-500">Hosting plan: Vercel (UI)</p>
      </header>

      <form
        onSubmit={onSubmit}
        className="rounded-xl border border-gray-200 bg-white p-4"
      >
        <h2 className="text-lg font-semibold">Upload CSVs</h2>
        <p className="mb-4 text-sm text-gray-600">
          Provide two CSVs: ECC/BW extractors and S/4 CDS views. Or tick{" "}
          <strong>Use server samples</strong>.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              ecc_extractors.csv
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setEcc(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full rounded-lg border border-gray-300 p-2"
              disabled={useSamples}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              s4_cds.csv
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setS4(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full rounded-lg border border-gray-300 p-2"
              disabled={useSamples}
            />
          </div>
        </div>

        {/* A9: Weights */}
        <div className="mt-6 rounded-lg border border-gray-200 p-3">
          <div className="mb-2 text-sm font-medium">Weights</div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm">
              <div className="mb-1">Name ({wName.toFixed(2)})</div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={wName}
                onChange={(e) => setWName(Number(e.target.value))}
                className="w-full"
              />
            </label>
            <label className="text-sm">
              <div className="mb-1">Fields ({wFields.toFixed(2)})</div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={wFields}
                onChange={(e) => setWFields(Number(e.target.value))}
                className="w-full"
              />
            </label>
            <label className="text-sm">
              <div className="mb-1">Keys ({wKeys.toFixed(2)})</div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={wKeys}
                onChange={(e) => setWKeys(Number(e.target.value))}
                className="w-full"
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-gray-600">
            Sum: <span className={sum > 0 ? "text-green-600" : "text-red-600"}>{sum.toFixed(2)}</span>{" "}
            (API normalizes these so the final weights sum to 1.0.)
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useSamples}
              onChange={(e) => {
                setUseSamples(e.target.checked);
                if (e.target.checked) {
                  setEcc(null);
                  setS4(null);
                }
              }}
            />
            Use server sample CSVs
          </label>

          <label className="flex items-center gap-2 text-sm">
            Top K:
            <select
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="rounded-md border border-gray-300 p-1"
            >
              {[1, 2, 3, 4, 5].map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className={`rounded-md px-4 py-2 text-white ${
              !canSubmit || loading
                ? "bg-gray-400"
                : "bg-black hover:bg-gray-800"
            }`}
          >
            {loading ? "Processing..." : "Submit"}
          </button>

          <button
            type="button"
            onClick={onReset}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            Reset
          </button>

          <button
            type="button"
            onClick={onDownloadJson}
            disabled={!resp}
            className={`rounded-md px-3 py-2 text-sm text-white ${
              resp ? "bg-indigo-600 hover:bg-indigo-700" : "bg-gray-400"
            }`}
          >
            Download JSON
          </button>

          <button
            type="button"
            onClick={onExportCsv}
            disabled={!rows.length}
            className={`rounded-md px-3 py-2 text-sm text-white ${
              rows.length ? "bg-teal-600 hover:bg-teal-700" : "bg-gray-400"
            }`}
          >
            Export CSV
          </button>

          <div className="text-xs text-gray-500">
            Selected: {ecc?.name ?? "none"} / {s4?.name ?? "none"}
          </div>
        </div>

        {error ? (
          <div className="mt-3 rounded-md bg-red-50 p-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </form>

      <section className="mt-6">
        <h2 className="mb-1 text-lg font-semibold">Results</h2>
        <p className="mb-3 text-sm text-gray-600">
          {resp
            ? `Extractors: ${resp.counts.extractors} · CDS Views: ${resp.counts.cds_views} · Method: ${resp.run_info.method}`
            : "No results yet."}
        </p>

        <DataTable<ResultRow>
          columns={columns}
          data={rows}
          caption="Click column headers to sort."
          emptyMessage="Run a match to see results."
        />
      </section>

      {/* A10: simple modal for explanation */}
      {explainFor ? (
        <ExplainModal row={explainFor} onClose={() => setExplainFor(null)} />
      ) : null}
    </main>
  );
}

function ExplainModal({ row, onClose }: { row: ResultRow; onClose: () => void }) {
  const ex: Explain | undefined = row.explain;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-5 shadow-2xl">
        <div className="mb-2 flex items-start justify-between">
          <h3 className="text-lg font-semibold">
            Why this match? <span className="text-sm text-gray-500">({row.extractor} → {row.cds_view})</span>
          </h3>
          <button
            onClick={onClose}
            className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        {!ex ? (
          <div className="text-sm text-gray-600">No explanation available.</div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="rounded-lg border p-3">
              <div className="font-medium">Score breakdown</div>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <div>
                  <div>Weights: name {ex.weights.name.toFixed(2)}, fields {ex.weights.fields.toFixed(2)}, keys {ex.weights.keys.toFixed(2)}</div>
                  <div>
                    Parts: name {ex.score_parts.name.toFixed(3)}, fields {ex.score_parts.fields.toFixed(3)}, keys {ex.score_parts.keys.toFixed(3)}
                  </div>
                </div>
                <div>
                  <div>Overall score: <span className="font-semibold">{row.score.toFixed(3)}</span></div>
                  <div>Name similarity: {row.name_score.toFixed(3)}</div>
                  <div>Field overlap: {row.field_overlap.toFixed(3)}</div>
                  <div>Key overlap: {row.key_overlap.toFixed(3)}</div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <div className="font-medium">Matched name terms</div>
              <div className="mt-1">
                {ex.name_terms.length ? (
                  <div className="flex flex-wrap gap-2">
                    {ex.name_terms.map((t) => (
                      <span key={t} className="rounded bg-gray-100 px-2 py-0.5 text-xs">
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-600">No obvious token overlap.</div>
                )}
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <div className="font-medium">Field overlap</div>
              <div className="mt-1 text-gray-700">
                Shared ({ex.field_overlap.shared.length}) of extractor {ex.field_overlap.extractor_total} vs CDS {ex.field_overlap.cds_total}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {ex.field_overlap.shared.map((f) => (
                  <span key={f} className="rounded bg-gray-100 px-2 py-0.5 text-xs">
                    {f}
                  </span>
                ))}
                {!ex.field_overlap.shared.length && <span className="text-xs text-gray-500">None</span>}
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <div className="font-medium">Key overlap</div>
              <div className="mt-1 text-gray-700">
                Shared ({ex.key_overlap.shared.length}) of extractor {ex.key_overlap.extractor_total} vs CDS {ex.key_overlap.cds_total}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {ex.key_overlap.shared.map((k) => (
                  <span key={k} className="rounded bg-gray-100 px-2 py-0.5 text-xs">
                    {k}
                  </span>
                ))}
                {!ex.key_overlap.shared.length && <span className="text-xs text-gray-500">None</span>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
