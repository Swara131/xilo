import { randomBytes, timingSafeEqual } from "crypto";
import { mkdir, readFile, rename, rm, writeFile } from "fs/promises";
import path from "path";
import { DEFAULT_ANALYSIS_LANGUAGE } from "@/lib/i18n/language";
import { isFoodAnalysis, type FoodAnalysis } from "@/lib/types";
import type { SharedReport } from "./model";
import type { CreateReportResult, ReportRepository } from "./repository";

const REPORT_DAYS = 30;
const DIRECTORY = path.join(process.cwd(), ".data", "reports");
const ID_PATTERN = /^[A-Za-z0-9_-]{20,24}$/;

function cleanText(value: string, limit: number): string {
  return value
    .replace(/sk-or-[a-z0-9-]+/gi, "")
    .replace(/sk-tinyfish-[a-z0-9_-]+/gi, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim()
    .slice(0, limit);
}

function snapshotAnalysis(analysis: FoodAnalysis): FoodAnalysis {
  return {
    productName: analysis.productName ? cleanText(analysis.productName, 160) : null,
    ingredients: analysis.ingredients.map((item) => cleanText(item, 120)).filter(Boolean).slice(0, 80),
    nutrition: {
      calories: analysis.nutrition.calories ? cleanText(analysis.nutrition.calories, 40) : null,
      protein: analysis.nutrition.protein ? cleanText(analysis.nutrition.protein, 40) : null,
      carbohydrates: analysis.nutrition.carbohydrates ? cleanText(analysis.nutrition.carbohydrates, 40) : null,
      sugar: analysis.nutrition.sugar ? cleanText(analysis.nutrition.sugar, 40) : null,
      fat: analysis.nutrition.fat ? cleanText(analysis.nutrition.fat, 40) : null,
      saturatedFat: analysis.nutrition.saturatedFat ? cleanText(analysis.nutrition.saturatedFat, 40) : null,
      sodium: analysis.nutrition.sodium ? cleanText(analysis.nutrition.sodium, 40) : null,
    },
    allergensDetected: analysis.allergensDetected.map((item) => cleanText(item, 80)).filter(Boolean).slice(0, 20),
    potentialConcerns: analysis.potentialConcerns.slice(0, 20).map((item) => ({
      title: cleanText(item.title, 160),
      why: cleanText(item.why, 400),
      userPreference: cleanText(item.userPreference, 160),
      severity: item.severity,
    })),
    preferenceConflicts: analysis.preferenceConflicts.map((item) => cleanText(item, 240)).filter(Boolean).slice(0, 20),
    positivePoints: analysis.positivePoints.map((item) => cleanText(item, 240)).filter(Boolean).slice(0, 8),
    overallAssessment: cleanText(analysis.overallAssessment, 600),
    assessmentStatus: analysis.assessmentStatus,
    summary: cleanText(analysis.summary, 800),
    ingredientExplanations: analysis.ingredientExplanations.slice(0, 40).map((item) => ({
      ingredient: cleanText(item.ingredient, 120),
      explanation: cleanText(item.explanation, 400),
      level: item.level,
      concern: item.concern ? cleanText(item.concern, 160) : null,
    })),
    alternativeCriteria: analysis.alternativeCriteria.map((item) => cleanText(item, 160)).filter(Boolean).slice(0, 8),
    labelNotes: analysis.labelNotes.map((item) => cleanText(item, 200)).filter(Boolean).slice(0, 8),
    webVerification: analysis.webVerification
      ? {
          verified: analysis.webVerification.verified,
          source: safeSource(analysis.webVerification.source),
          webFindings: cleanText(analysis.webVerification.webFindings, 400),
          matches: analysis.webVerification.matches,
          confidence: analysis.webVerification.confidence,
        }
      : null,
  };
}

function safeSource(source: { title: string; url: string } | null): { title: string; url: string } | null {
  if (!source) return null;
  try {
    const url = new URL(source.url);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return { title: cleanText(source.title, 200), url: url.toString().slice(0, 500) };
  } catch {
    return null;
  }
}

function filePath(id: string): string {
  if (!ID_PATTERN.test(id)) throw new Error("INVALID_REPORT_ID");
  return path.join(DIRECTORY, `${id}.json`);
}

function tokensMatch(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function readReport(id: string): Promise<SharedReport | null> {
  if (!ID_PATTERN.test(id)) return null;
  try {
    const raw = await readFile(filePath(id), "utf8");
    const parsed = JSON.parse(raw) as SharedReport;
    if (!parsed?.id || parsed.id !== id || !parsed.deleteToken || !parsed.analysis) return null;
    if (Date.parse(parsed.expiresAt) <= Date.now()) {
      await rm(filePath(id), { force: true });
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function toPublic(report: SharedReport): CreateReportResult["report"] {
  return {
    id: report.id,
    createdAt: report.createdAt,
    expiresAt: report.expiresAt,
    product: report.product,
    analysis: report.analysis,
    language: report.language,
  };
}

export function createFileReportRepository(): ReportRepository {
  return {
    async create(analysis) {
      if (!isFoodAnalysis(analysis)) throw new Error("INVALID_ANALYSIS");
      await mkdir(DIRECTORY, { recursive: true });
      const now = new Date();
      const safeAnalysis = snapshotAnalysis(analysis);
      const report: SharedReport = {
        id: randomBytes(16).toString("base64url"),
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + REPORT_DAYS * 24 * 60 * 60 * 1000).toISOString(),
        product: {
          name: safeAnalysis.productName,
          brand: null,
        },
        analysis: safeAnalysis,
        language: DEFAULT_ANALYSIS_LANGUAGE,
        deleteToken: randomBytes(24).toString("base64url"),
      };
      const destination = filePath(report.id);
      const temporary = `${destination}.tmp`;
      await writeFile(temporary, JSON.stringify(report), "utf8");
      await rename(temporary, destination);
      return { report: toPublic(report), deleteToken: report.deleteToken };
    },
    async getPublic(id) {
      const report = await readReport(id);
      return report ? toPublic(report) : null;
    },
    async remove(id, deleteToken) {
      const report = await readReport(id);
      if (!report || !tokensMatch(report.deleteToken, deleteToken)) return false;
      await rm(filePath(id), { force: true });
      return true;
    },
  };
}

export const reports = createFileReportRepository();
