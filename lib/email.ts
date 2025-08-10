type SellerStatus = "approved" | "rejected" | "pending"

export function renderSellerStatusEmail(
  status: SellerStatus,
  opts: { fullName?: string } = {},
): { subject: string; text: string; html: string } {
  const name = opts.fullName?.trim() || "Gamer"

  if (status === "approved") {
    const subject = "You're approved as a Seller — MLBB Market"
    const text = [
      `Hi ${name},`,
      "",
      "Great news! Your seller application has been approved. You can now post listings on MLBB Market.",
      "Head over to the dashboard and click “Post” to create your first listing.",
      "",
      "GLHF,",
      "MLBB Market Team",
    ].join("\n")

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#e5e7eb;background:#0a0a0a;padding:24px">
        <table width="100%" style="max-width:640px;margin:0 auto;background:#0b0b0b;border:1px solid #262626;border-radius:12px">
          <tr><td style="padding:24px">
            <h1 style="margin:0 0 12px;background:linear-gradient(90deg,#22d3ee,#d946ef,#34d399);-webkit-background-clip:text;background-clip:text;color:transparent;font-size:20px;">
              Seller Approved
            </h1>
            <p style="margin:0 0 12px;color:#d4d4d4">Hi ${name},</p>
            <p style="margin:0 0 12px;color:#d4d4d4">
              Great news! Your seller application has been approved. You can now post listings on MLBB Market.
            </p>
            <p style="margin:0 0 16px;color:#d4d4d4">
              Head over to the dashboard and click <b>“Post”</b> to create your first listing.
            </p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || ""}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#0a0a0a;border:1px solid rgba(34,211,238,.4);color:#67e8f9;text-decoration:none">Open MLBB Market</a>
            <p style="margin:16px 0 0;color:#a3a3a3">GLHF,<br/>MLBB Market Team</p>
          </td></tr>
        </table>
      </div>
    `
    return { subject, text, html }
  }

  if (status === "rejected") {
    const subject = "Seller application update — MLBB Market"
    const text = [
      `Hi ${name},`,
      "",
      "Thanks for applying. After review, we’re not able to approve your seller application at this time.",
      "You can reply to this email for more details, or re-apply later.",
      "",
      "MLBB Market Team",
    ].join("\n")
    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#e5e7eb;background:#0a0a0a;padding:24px">
        <table width="100%" style="max-width:640px;margin:0 auto;background:#0b0b0b;border:1px solid #262626;border-radius:12px">
          <tr><td style="padding:24px">
            <h1 style="margin:0 0 12px;background:linear-gradient(90deg,#d946ef,#22d3ee);-webkit-background-clip:text;background-clip:text;color:transparent;font-size:20px;">
              Application Update
            </h1>
            <p style="margin:0 0 12px;color:#d4d4d4">Hi ${name},</p>
            <p style="margin:0 0 12px;color:#d4d4d4">
              Thanks for applying. After review, we’re not able to approve your seller application at this time.
            </p>
            <p style="margin:0 0 16px;color:#a3a3a3">
              You can reply to this email for more details, or re-apply later.
            </p>
            <p style="margin:16px 0 0;color:#a3a3a3">MLBB Market Team</p>
          </td></tr>
        </table>
      </div>
    `
    return { subject, text, html }
  }

  // pending (or fallback)
  const subject = "Seller application received — MLBB Market"
  const text = [
    `Hi ${name},`,
    "",
    "We received your seller application and our team will review it shortly.",
    "You’ll receive another email when your status changes.",
    "",
    "MLBB Market Team",
  ].join("\n")
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#e5e7eb;background:#0a0a0a;padding:24px">
      <table width="100%" style="max-width:640px;margin:0 auto;background:#0b0b0b;border:1px solid #262626;border-radius:12px">
        <tr><td style="padding:24px">
          <h1 style="margin:0 0 12px;background:linear-gradient(90deg,#22d3ee,#34d399);-webkit-background-clip:text;background-clip:text;color:transparent;font-size:20px;">
            Application Received
          </h1>
          <p style="margin:0 0 12px;color:#d4d4d4">Hi ${name},</p>
          <p style="margin:0 0 12px;color:#d4d4d4">
            We received your seller application and our team will review it shortly.
          </p>
          <p style="margin:0 0 16px;color:#a3a3a3">
            You’ll receive another email when your status changes.
          </p>
          <p style="margin:16px 0 0;color:#a3a3a3">MLBB Market Team</p>
        </td></tr>
      </table>
    </div>
  `
  return { subject, text, html }
}
