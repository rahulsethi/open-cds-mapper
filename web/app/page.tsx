// web/app/page.tsx
"use client";

import * as React from "react";
import { postMatch } from "@/lib/api";
import type { MatchResponse, Candidate } from "@/lib/types";

type Row = {
  id: string;
  extractor: string;
  cds_view: string;
  score: number;
  name: number;
  fields: number;
  keys: number;
  candidate: Candidate;
};

function fmt(n: number) {
  return Number.isFinite(n) ? n.toFixed(3) : "0.000";
}

function downloadJson(filename: string, data: any) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCsv(filename: string, rows: Row[]) {
  const header = ["Extractor", "CDS View", "Score", "Name", "Fields", "Keys"].join(",");
  const lines = rows.map((r) =>
    [r.extractor, r.cds_view, fmt(r.score), fmt(r.name), fmt(r.fields), fmt(r.keys)].join(",")
  );
  const blob = new Blob([header + "\n" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function HomePage() {
  const [ecc, setEcc] = React.useState<File | null>(null);
  const [s4, setS4] = React.useState<File | null>(null);

  const [useSamples, setUseSamples] = React.useState(true);
  const [topK, setTopK] = React.useState(3);

  const [wName, setWName] = React.useState(0.6);
  const [wFields, setWFields] = React.useState(0.3);
  const [wKeys, setWKeys] = React.useState(0.1);

  const [busy, setBusy] = React.useState(false);
  const [banner, setBanner] = React.useState<string | null>(null);

  const [resp, setResp] = React.useState<MatchResponse | null>(null);
  const [rows, setRows] = React.useState<Row[]>([]);

  const [explainRow, setExplainRow] = React.useState<{
    extractor: string;
    cds_view: string;
    candidate: Candidate;
  } | null>(null);

  const weightSum = wName + wFields + wKeys;

  function respToRows(r: MatchResponse): Row[] {
    const out: Row[] = [];
    for (const m of r.matches || []) {
      const extractor = m.extractor_name;
      (m.candidates || []).forEach((c, idx) => {
        out.push({
          id: `${extractor}__${c.cds_view_name}__${idx}`,
          extractor,
          cds_view: c.cds_view_name,
          score: Number(c.score || 0),
          name: Number(c.name_score || 0),
          fields: Number(c.field_overlap || 0),
          keys: Number(c.key_overlap || 0),
          candidate: c,
        });
      });
    }
    return out.sort((a, b) => b.score - a.score);
  }

  async function onSubmit() {
    setBusy(true);
    setBanner(null);
    setExplainRow(null);
    try {
      const r = await postMatch({
        files: { ecc, s4 },
        topK,
        weights: { name: wName, fields: wFields, keys: wKeys },
        useSamples,
      });
      setResp(r);
      setRows(respToRows(r));
    } catch (e: any) {
      setResp(null);
      setRows([]);
      setBanner(e?.message || "Request failed");
    } finally {
      setBusy(false);
    }
  }

  function onReset() {
    setBanner(null);
    setResp(null);
    setRows([]);
    setEcc(null);
    setS4(null);
    setUseSamples(true);
    setTopK(3);
    setWName(0.6);
    setWFields(0.3);
    setWKeys(0.1);
    const eccInput = document.getElementById("eccFile") as HTMLInputElement | null;
    const s4Input = document.getElementById("s4File") as HTMLInputElement | null;
    if (eccInput) eccInput.value = "";
    if (s4Input) s4Input.value = "";
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-xl font-semibold mb-2">OCMT</h1>
      <p className="text-sm text-gray-500 mb-8">Hosting plan: Vercel (UI)</p>

      <section className="rounded-lg border p-4 mb-6">
        <h2 className="font-medium mb-4">Upload CSVs</h2>
        <p className="text-sm text-gray-600 mb-3">
          Provide two CSVs: ECC/BW extractors and S/4 CDS views. Or tick{" "}
          <button
            type="button"
            onClick={() => setUseSamples((v) => !v)}
            className="underline"
            title="Toggle server samples"
          >
            Use server samples
          </button>
          .
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">ecc_extractors.csv</label>
            <input
              id="eccFile"
              type="file"
              accept=".csv"
              onChange={(e) => setEcc(e.target.files?.[0] || null)}
              className="block w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">s4_cds.csv</label>
            <input
              id="s4File"
              type="file"
              accept=".csv"
              onChange={(e) => setS4(e.target.files?.[0] || null)}
              className="block w-full"
            />
          </div>
        </div>

        <div className="space-y-4 mb-2">
          <div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Name (0.60)</span>
              <span />
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={wName}
              onChange={(e) => setWName(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Fields (0.30)</span>
              <span />
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={wFields}
              onChange={(e) => setWFields(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Keys (0.10)</span>
              <span />
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={wKeys}
              onChange={(e) => setWKeys(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          <p className="text-xs text-gray-500">
            Sum: <span className={weightSum.toFixed(2) === "1.00" ? "" : "text-red-600"}>
              {weightSum.toFixed(2)}
            </span>{" "}
            (API normalizes these so the final weights sum to 1.0)
          </p>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useSamples}
              onChange={(e) => setUseSamples(e.target.checked)}
            />
            Use server sample CSVs
          </label>

          <label className="ml-auto text-sm">
            Top K:&nbsp;
            <select
              value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value, 10))}
              className="border rounded px-1 py-0.5"
            >
              {[1, 2, 3, 5, 10].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={onSubmit}
            disabled={busy}
            className="rounded bg-black text-white px-3 py-1 disabled:opacity-50"
          >
            {busy ? "Processing…" : "Submit"}
          </button>

          <button onClick={onReset} className="rounded border px-3 py-1">
            Reset
          </button>

          <button
            onClick={() => resp && downloadJson("ocmt_result.json", resp)}
            className="rounded border px-3 py-1"
            disabled={!resp}
          >
            Download JSON
          </button>
          <button
            onClick={() => exportCsv("ocmt_matches.csv", rows)}
            className="rounded border px-3 py-1"
            disabled={!rows.length}
          >
            Export CSV
          </button>
        </div>

        {banner && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
            {banner}
          </p>
        )}

        {resp && (
          <p className="text-xs text-gray-600 mt-2">
            Extractors: {resp.counts?.extractors ?? 0} · CDS Views:{" "}
            {resp.counts?.cds_views ?? 0} · Method: {resp.run_info?.method ?? "n/a"} ·{" "}
            Weights:&nbsp;name {fmt(resp.run_info?.weights?.name ?? 0)}, fields{" "}
            {fmt(resp.run_info?.weights?.fields ?? 0)}, keys{" "}
            {fmt(resp.run_info?.weights?.keys ?? 0)}
          </p>
        )}
      </section>

      <section>
        <h2 className="font-medium mb-3">Results</h2>

        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-3 py-2">Extractor</th>
                <th className="text-left px-3 py-2">CDS View</th>
                <th className="text-left px-3 py-2">Score</th>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Fields</th>
                <th className="text-left px-3 py-2">Keys</th>
                <th className="text-left px-3 py-2">Explain</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-gray-500" colSpan={7}>
                    Run a match to see results.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">{r.extractor}</td>
                    <td className="px-3 py-2">{r.cds_view}</td>
                    <td className="px-3 py-2">{fmt(r.score)}</td>
                    <td className="px-3 py-2">{fmt(r.name)}</td>
                    <td className="px-3 py-2">{fmt(r.fields)}</td>
                    <td className="px-3 py-2">{fmt(r.keys)}</td>
                    <td className="px-3 py-2">
                      <button
                        className="rounded border px-2 py-1"
                        onClick={() =>
                          setExplainRow({
                            extractor: r.extractor,
                            cds_view: r.cds_view,
                            candidate: r.candidate,
                          })
                        }
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Explain modal */}
      {explainRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">
                Why this match? ({explainRow.extractor} → {explainRow.cds_view})
              </h3>
              <button
                className="rounded border px-2 py-1"
                onClick={() => setExplainRow(null)}
              >
                Close
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="rounded border p-3">
                <p className="font-medium mb-1">Score breakdown</p>
                <p className="text-gray-700">
                  Weights: name {fmt(wName)}, fields {fmt(wFields)}, keys {fmt(wKeys)} ·
                  Overall score: {fmt(explainRow.candidate.score ?? 0)}
                </p>
                <p className="text-gray-700">
                  Name similarity: {fmt(explainRow.candidate.name_score ?? 0)} · Field
                  overlap: {fmt(explainRow.candidate.field_overlap ?? 0)} · Key overlap:{" "}
                  {fmt(explainRow.candidate.key_overlap ?? 0)}
                </p>
              </div>

              <div className="rounded border p-3">
                <p className="font-medium mb-2">Matched name terms</p>
                <div className="flex flex-wrap gap-2">
                  {(explainRow.candidate.matched_name_terms || []).length ? (
                    explainRow.candidate.matched_name_terms!.map((t, i) => (
                      <span key={i} className="rounded bg-gray-100 px-2 py-0.5">
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500">None</span>
                  )}
                </div>
              </div>

              <div className="rounded border p-3">
                <p className="font-medium mb-2">Field overlap</p>
                <div className="flex flex-wrap gap-2">
                  {(explainRow.candidate.shared_fields || []).length ? (
                    explainRow.candidate.shared_fields!.map((t, i) => (
                      <span key={i} className="rounded bg-gray-100 px-2 py-0.5">
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500">None</span>
                  )}
                </div>
              </div>

              <div className="rounded border p-3">
                <p className="font-medium mb-2">Key overlap</p>
                <div className="flex flex-wrap gap-2">
                  {(explainRow.candidate.shared_keys || []).length ? (
                    explainRow.candidate.shared_keys!.map((t, i) => (
                      <span key={i} className="rounded bg-gray-100 px-2 py-0.5">
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500">None</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
