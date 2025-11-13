// web/lib/api.ts
import type { MatchResponse } from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") || "http://localhost:8000";

type Weights = { name: number; fields: number; keys: number };

export async function postMatch({
  files,
  topK,
  weights,
  useSamples,
}: {
  files: { ecc?: File | null; s4?: File | null };
  topK: number;
  weights: Weights;
  useSamples: boolean;
}): Promise<MatchResponse> {
  const params = new URLSearchParams();
  params.set("top_k", String(topK));
  params.set("w_name", String(weights.name));
  params.set("w_fields", String(weights.fields));
  params.set("w_keys", String(weights.keys));

  const url = `${API_BASE}/match/?${params.toString()}`;

  const body = new FormData();
  const hasFiles = !!files.ecc || !!files.s4;

  if (hasFiles) {
    if (files.ecc) body.append("ecc_csv", files.ecc);
    if (files.s4) body.append("s4_csv", files.s4);
  } else {
    body.append("use_samples", String(useSamples));
  }

  const res = await fetch(url, { method: "POST", body });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}
