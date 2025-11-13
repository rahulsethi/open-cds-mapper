// web/app/page.tsx
"use client";

import * as React from "react";
import DataTable from "@/components/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { postMatch } from "@/lib/api";
import { MatchResponse, ResultRow, Explain } from "@/lib/types";
import { downloadCsv, downloadJson } from "@/lib/download";

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
    setError(null);
    setResp(null);
    setRows([]);
    setExplainFor(null);

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
