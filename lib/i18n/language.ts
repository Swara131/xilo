/** Language fields for a label reading. English is the current output. */
export interface AnalysisLanguage {
  sourceLanguage: string | null;
  detectedLanguage: string | null;
  outputLanguage: string;
}

export const DEFAULT_ANALYSIS_LANGUAGE: AnalysisLanguage = {
  sourceLanguage: null,
  detectedLanguage: null,
  outputLanguage: "en",
};
