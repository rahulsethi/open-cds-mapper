export interface Explain {
  weights: { name: number; fields: number; keys: number };
  score_parts: { name: number; fields: number; keys: number };
  name_terms: string[];
  field_overlap: { shared: string[]; extractor_total: number; cds_total: number };
  key_overlap: { shared: string[]; extractor_total: number; cds_total: number };
}

export interface Candidate {
  cds_view_name: string;
  cds_view_text: string;
  score: number;
  name_score: number;
  field_overlap: number;
  key_overlap: number;
  shared_fields: string[];
  shared_keys: string[];
  explain?: Explain;
}

export interface Match {
  extractor_name: string;
  extractor_text: string;
  candidates: Candidate[];
}

export interface MatchResponse {
  run_info: {
    top_k: number;
    weights: { name: number; fields: number; keys: number };
    method: string;
  };
  counts: { extractors: number; cds_views: number };
  matches: Match[];
}

/** Row shape for the table */
export interface ResultRow {
  id: string;
  extractor: string;
  extractor_text: string;
  cds_view: string;
  cds_text: string;
  score: number;
  name_score: number;
  field_overlap: number;
  key_overlap: number;
  shared_fields?: string[];
  shared_keys?: string[];
  explain?: Explain;
}
