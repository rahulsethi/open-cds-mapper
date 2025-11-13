"use client";

import React from "react";

export type ResultRow = {
  extractor: string;
  cds_view: string;
  score: number;
  name: number;
  fields: number;
  keys: number;
  // keep the whole candidate to show in the modal
  details: {
    cds_view_name: string;
    cds_view_text: string;
    score: number;
    name_score: number;
    field_overlap: number;
    key_overlap: number;
    matched_name_terms?: string[];
    shared_fields: string[];
    shared_keys: string[];
  };
};

type Props = {
  rows: ResultRow[];
  onExplain: (row: ResultRow) => void;
};

export default function DataTable({ rows, onExplain }: Props) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
          <tr>
            <th className="px-4 py-3">Extractor</th>
            <th className="px-4 py-3">CDS View</th>
            <th className="px-4 py-3">Score</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Fields</th>
            <th className="px-4 py-3">Keys</th>
            <th className="px-4 py-3">Explain</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-5 text-gray-500">
                Run a match to see results.
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={`${r.extractor}-${r.cds_view}-${i}`} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono">{r.extractor}</td>
                <td className="px-4 py-3 font-mono">{r.cds_view}</td>
                <td className="px-4 py-3">{r.score.toFixed(3)}</td>
                <td className="px-4 py-3">{r.name.toFixed(3)}</td>
                <td className="px-4 py-3">{r.fields.toFixed(3)}</td>
                <td className="px-4 py-3">{r.keys.toFixed(3)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onExplain(r)}
                    className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
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
  );
}

