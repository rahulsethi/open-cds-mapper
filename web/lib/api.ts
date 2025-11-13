import { MatchResponse } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export async function postMatch(
  files: { ecc?: File; s4?: File },
  topK: number,
  weights?: { name: number; fields: number; keys: number }
): Promise<MatchResponse> {
  const params = new URLSearchParams();
  params.set("top_k", String(topK));
  if (weights) {
    params.set("w_name", String(weights.name));
    params.set("w_fields", String(weights.fields));
    params.set("w_keys", String(weights.keys));
  }

  const url = `${API_BASE}/match/?${params.toString()}`;
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
      detail = (j as any).detail || detail;
    } catch {}
    throw new Error(detail || `Request failed with ${res.status}`);
  }
  return (await res.json()) as MatchResponse;
}
