// web/lib/types.ts
export interface Candidate {
  cds_view_name: string;
  cds_view_text: string;
  score: number;
  name_score: number;
  field_overlap: number;
  key_overlap: number;
  matched_name_terms: string[];
  shared_fields: string[];
  shared_keys: string[];
}

export interface Match {
  extractor_name: string;
  extractor_text: string;
  candidates: Candidate[];
}

export interface MatchResponse {
  run_info: {
    top_k: number;
    method: string;
    weights: { name: number; fields: number; keys: number };
  };
  counts: { extractors: number; cds_views: number };
  matches: Match[];
}

export interface ResultRow {
  extractor: string;
  cdsView: string;
  score: number;
  name: number;
  fields: number;
  keys: number;
  details: Candidate; // used by the Explain dialog
}
