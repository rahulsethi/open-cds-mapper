// web/lib/api.ts
import { MatchResponse } from "./types";

// For browser-side fetches, env must be prefixed with NEXT_PUBLIC_*
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

type Weights = { name: number; fields: number; keys: number };

type PostArgs = {
  files: { ecc?: File | null; s4?: File | null };
  topK: number;
  weights?: Weights;
  useSamples: boolean;
};

export async function postMatch({
  files,
  topK,
  weights,
  useSamples,
}: PostArgs): Promise<MatchResponse> {
  // --- build query params (FastAPI expects top_k and weights in query) ---
  const params = new URLSearchParams();
  params.set("top_k", String(topK));
  if (weights) {
    params.set("w_name", String(weights.name));
    params.set("w_fields", String(weights.fields));
    params.set("w_keys", String(weights.keys));
  }

  const url = `${API_BASE}/match/?${params.toString()}`;

  // --- build body (FastAPI expects multipart form) ---
  const hasFiles = Boolean(files.ecc || files.s4);
  const form = new FormData();

  if (hasFiles) {
    if (files.ecc) form.append("ecc_csv", files.ecc);
    if (files.s4) form.append("s4_csv", files.s4);
    // we can include use_samples=false but it defaults to false on server
  } else if (useSamples) {
    // IMPORTANT: server reads this from the *form*, not the query
    form.append("use_samples", "true");
  } else {
    throw new Error("Provide both CSVs or tick ‘Use server sample CSVs’."); // client-side guard
  }

  const res = await fetch(url, { method: "POST", body: form });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || res.statusText);
  }
  return res.json();
}
