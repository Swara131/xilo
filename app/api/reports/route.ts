import { NextResponse } from "next/server";
import { reports } from "@/lib/reports/file-store";
import { isFoodAnalysis } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const analysis = body && typeof body === "object" && "analysis" in body ? body.analysis : null;
    if (!isFoodAnalysis(analysis)) {
      return NextResponse.json(
        { error: "We couldn't create your shareable report. Your analysis is still available." },
        { status: 400 },
      );
    }
    const created = await reports.create(analysis);
    return NextResponse.json(
      {
        id: created.report.id,
        deleteToken: created.deleteToken,
        expiresAt: created.report.expiresAt,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "We couldn't create your shareable report. Your analysis is still available." },
      { status: 500 },
    );
  }
}
