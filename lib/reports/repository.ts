import type { FoodAnalysis } from "@/lib/types";
import type { PublicReport } from "./model";

export interface CreateReportResult {
  report: PublicReport;
  deleteToken: string;
}

/**
 * Storage for shared reports.
 * The app currently saves reports as local files.
 * A Supabase implementation can replace this without changing the routes.
 */
export interface ReportRepository {
  create(analysis: FoodAnalysis): Promise<CreateReportResult>;
  getPublic(id: string): Promise<PublicReport | null>;
  remove(id: string, deleteToken: string): Promise<boolean>;
}
