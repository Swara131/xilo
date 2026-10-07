/**
 * Future diet insights are informational summaries of saved analyses
 * and the preferences a person entered. They are not a diagnosis.
 */
export interface AnalysisHistoryEntry {
  reportId: string;
  createdAt: string;
  productName: string | null;
}

export interface DietInsight {
  id: string;
  statement: string;
  basedOn: "recorded-analyses" | "preferences";
}
