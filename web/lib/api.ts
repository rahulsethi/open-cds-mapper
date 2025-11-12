import { MatchResponse } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export async function postMatch(
  files: { ecc?: File; s4?: File },
  topK: number
): Promise<MatchResponse> {
  const url = `${API_BASE}/match/?top_k=${encodeURIComponent(topK)}`;
  const hasFiles = files.ecc || files.s4;

  const opts: RequestInit = { method: "POST" };

  if (hasFiles) {
    const form = new FormData();
    if (files.ecc) form.append("ecc_csv", files.ecc);
    if (files.s4) form.append("s4_csv", files.s4);
    opts.body = form;
  }

  const res = await fetch(url, opts);
  if (!res.ok) {
    let detail = await res.text();
    try {
      const j = JSON.parse(detail);
      detail = j.detail || detail;
    } catch {}
    throw new Error(detail || `Request failed with ${res.status}`);
  }
  return (await res.json()) as MatchResponse;
}
