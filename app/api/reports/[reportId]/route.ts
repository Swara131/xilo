import { NextResponse } from "next/server";
import { reports } from "@/lib/reports/file-store";

export const runtime = "nodejs";

export async function DELETE(request: Request, context: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await context.params;
  let deleteToken = "";
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object" && "deleteToken" in body && typeof body.deleteToken === "string") {
      deleteToken = body.deleteToken;
    }
  } catch {
    deleteToken = "";
  }
  const removed = await reports.remove(reportId, deleteToken);
  if (!removed) {
    return NextResponse.json({ error: "This shared report could not be deleted." }, { status: 404 });
  }
  return NextResponse.json({ deleted: true }, { headers: { "Cache-Control": "no-store" } });
}
