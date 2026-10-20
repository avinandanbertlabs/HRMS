type LeaveDecisionEmail = {
  to: string;
  applicantName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: "APPROVED" | "REJECTED";
  comment?: string | null;
};

/** Send a leave decision message through Resend when configured. */
export async function sendLeaveDecisionEmail(input: LeaveDecisionEmail): Promise<{
  sent: boolean;
  reason?: string;
}> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { sent: false, reason: "not_configured" };
  if (!input.to || !input.to.includes("@")) return { sent: false, reason: "invalid_recipient" };

  const approved = input.status === "APPROVED";
  const decision = approved ? "approved" : "rejected";
  const dateRange = `${input.startDate} to ${input.endDate}`;
  const safe = (value: string) => value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] ?? char);
  const html = `<p>Dear ${safe(input.applicantName)},</p><p>Your ${safe(input.leaveType)} request for <strong>${safe(dateRange)}</strong> has been <strong>${decision}</strong>.</p>${input.comment ? `<p>Approver comment: ${safe(input.comment)}</p>` : ""}<p>Regards,<br/>Bert Labs People Operations</p>`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: `Leave request ${decision}: ${input.startDate} – ${input.endDate}`,
      html,
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const details = await response.text().catch(() => "Email provider returned an error");
    return { sent: false, reason: `provider_${response.status}: ${details.slice(0, 300)}` };
  }
  return { sent: true };
}
