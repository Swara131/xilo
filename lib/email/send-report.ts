export interface ReportEmail {
  to: string;
  subject: string;
  text: string;
  reportUrl: string;
}

export interface ReportEmailResult {
  sent: false;
  reason: "not_configured";
  mailto: string;
}

/**
 * No email provider is configured.
 * Callers open the returned mailto link in the person's own email app.
 * A later provider can send `message` and return { sent: true }.
 */
export async function sendReportEmail(message: ReportEmail): Promise<ReportEmailResult> {
  const recipient = message.to.trim();
  const href = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(message.subject)}&body=${encodeURIComponent(message.text)}`;
  return { sent: false, reason: "not_configured", mailto: href };
}
