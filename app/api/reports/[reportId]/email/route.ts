import { NextResponse } from "next/server";
import { sendReportEmail } from "@/lib/email/send-report";
import { reports } from "@/lib/reports/file-store";

export const runtime = "nodejs";

function originFrom(request: Request): string {
  const host = request.headers.get("host");
  if (!host) return "";
  const proto = request.headers.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

export async function POST(request: Request, context: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await context.params;
  const report = await reports.getPublic(reportId);
  if (!report) {
    return NextResponse.json({ error: "This report is unavailable." }, { status: 404 });
  }

  let to = "";
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object" && "to" in body && typeof body.to === "string") {
      to = body.to.trim();
    }
  } catch {
    to = "";
  }
  if (to && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: "Enter a valid email address, or leave it blank to choose one in your email app." }, { status: 400 });
  }

  const product = report.product.name || "your food";
  const reportUrl = `${originFrom(request)}/report/${report.id}`;
  const text = [
    `Here is a food analysis report for ${product}.`,
    "",
    report.analysis.summary,
    "",
    `Open the report: ${reportUrl}`,
    "",
    "Anyone with this link can view this report.",
    "This report is for informational purposes only and is not a medical diagnosis or medical advice.",
  ].join("\n");

  const result = await sendReportEmail({
    to,
    subject: `xilo-food inspector Analysis Report - ${product}`,
    text: text.slice(0, 1800),
    reportUrl,
  });

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
