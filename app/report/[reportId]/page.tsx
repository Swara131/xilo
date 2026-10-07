import type { Metadata } from "next";
import { SharedReportView } from "@/components/SharedReportView";
import { reports } from "@/lib/reports/file-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Food Analysis Report — xilo-food inspector",
  robots: { index: false, follow: false },
};

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const { reportId } = await params;
  const query = await searchParams;
  const report = await reports.getPublic(reportId);

  if (!report) {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl text-foreground">Report unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          This report is unavailable. It may have expired or been deleted.
        </p>
      </main>
    );
  }

  return (
    <main>
      <SharedReportView report={report} autoPrint={query.print === "1"} />
    </main>
  );
}
