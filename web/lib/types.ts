export type MatchResponse = {
  run_info: {
    top_k: number;
    weights: { name: number; fields: number; keys: number };
    method: string;
  };
  counts: { extractors: number; cds_views: number };
  matches: Array<{
    extractor_name: string;
    extractor_text: string;
    candidates: Array<{
      cds_view_name: string;
      cds_view_text: string;
      score: number;
      name_score: number;
      field_overlap: number;
      key_overlap: number;
      shared_fields: string[];
      shared_keys: string[];
    }>;
  }>;
};

export type ResultRow = {
  id: string;
  extractor: string;
  extractor_text: string;
  cds_view: string;
  cds_text: string;
  score: number;
  name_score: number;
  field_overlap: number;
  key_overlap: number;
  // extras (not shown in table but useful for export)
  shared_fields?: string[];
  shared_keys?: string[];
};
