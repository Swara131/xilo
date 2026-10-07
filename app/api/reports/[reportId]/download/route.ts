import { NextResponse } from "next/server";
import { reports } from "@/lib/reports/file-store";
import { renderPrintableReport, reportFileName } from "@/lib/reports/printable";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await context.params;
  const report = await reports.getPublic(reportId);
  if (!report) {
    return NextResponse.json({ error: "This report is unavailable." }, { status: 404 });
  }
  return new NextResponse(renderPrintableReport(report), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${reportFileName(report)}"`,
      "Cache-Control": "no-store",
    },
  });
}
