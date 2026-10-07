/** Sections a later dashboard can render. Only Scan Food and Profile exist today. */
export const DASHBOARD_SECTIONS = [
  { id: "overview", label: "Overview", available: false },
  { id: "scan", label: "Scan Food", available: true, href: "/scanner" },
  { id: "reports", label: "My Reports", available: false },
  { id: "insights", label: "Diet Insights", available: false },
  { id: "profile", label: "Profile", available: true, href: "/onboarding" },
] as const;

export type DashboardSectionId = (typeof DASHBOARD_SECTIONS)[number]["id"];
