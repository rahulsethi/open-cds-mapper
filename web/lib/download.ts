// web/lib/download.ts

/** Trigger a browser download from a Blob. */
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Download any JS value as pretty-printed JSON. */
export function downloadJSON(data: unknown, filename = "ocmt_match_result.json") {
  const text = JSON.stringify(data, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  saveBlob(blob, filename);
}

/** Back-compat alias (some older snippets used camelCase). */
export const downloadJson = downloadJSON;

/**
 * Export rows to CSV.
 * - Drops fields whose key starts with "_" (e.g. internal helpers like "_raw").
 * - Infers headers from the first row.
 */
export function exportCSV<T extends Record<string, any>>(
  rows: T[],
  filename = "ocmt_matches.csv"
) {
  if (!rows || rows.length === 0) return;

  const cleaned = rows.map((r) => {
    const o: Record<string, any> = {};
    for (const k of Object.keys(r)) {
      if (!k.startsWith("_")) o[k] = (r as any)[k];
    }
    return o;
  });

  const headers = Object.keys(cleaned[0]);

  const escape = (val: any) => {
    if (val === null || val === undefined) return "";
    const s = String(val);
    // Quote if contains comma, quote, or newline
    if (/[",\n\r]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [
    headers.join(","),
    ...cleaned.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ].join("\r\n");

  const blob = new Blob([lines], { type: "text/csv;charset=utf-8" });
  saveBlob(blob, filename);
}

/** Back-compat alias (older code imported exportCsv). */
export const exportCsv = exportCSV;
