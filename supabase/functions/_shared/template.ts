// supabase/functions/_shared/template.ts
// Template email de marque Third-One — tables + styles inline (compatible
// Gmail/Outlook/Apple Mail, mobile et dark mode).

export const escapeHtml = (s: string) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const nl2html = (s: string) =>
  escapeHtml(s).split(/\n{2,}/).map((p) =>
    `<p style="margin:0 0 14px;">${p.replace(/\n/g, "<br>")}</p>`
  ).join("");

export function renderEmail({ preheader, kicker, title, contentHtml, rows, cta, footerNote }: {
  preheader?: string;
  kicker?: string;
  title?: string;
  contentHtml?: string;
  rows?: [string, string][];
  cta?: { label: string; url: string };
  footerNote?: string;
}) {
  const rowsHtml = rows && rows.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;width:100%;">
        ${rows.map(([k, v]) => `
        <tr>
          <td style="padding:7px 14px 7px 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:#8E8E93;white-space:nowrap;vertical-align:top;border-bottom:1px solid #F2F2F7;">${escapeHtml(k)}</td>
          <td style="padding:7px 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:#1D1D1F;border-bottom:1px solid #F2F2F7;">${v}</td>
        </tr>`).join("")}
      </table>`
    : "";

  const ctaHtml = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 4px;">
        <tr><td bgcolor="#00B4D8" style="border-radius:10px;background:linear-gradient(180deg,#0BC2E6,#00A8CA);">
          <a href="${cta.url}" style="display:inline-block;padding:13px 28px;font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:10px;">${escapeHtml(cta.label)}</a>
        </td></tr>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Third-One Studio</title></head>
<body style="margin:0;padding:0;background-color:#F4F5F8;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#F4F5F8" style="background-color:#F4F5F8;">
    <tr><td align="center" style="padding:36px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Wordmark -->
        <tr><td align="left" style="padding:0 6px 16px;">
          <span style="font-family:Helvetica,Arial,sans-serif;font-size:21px;font-weight:800;color:#162040;letter-spacing:-0.5px;">Third</span><span style="font-family:Helvetica,Arial,sans-serif;font-size:21px;font-weight:800;color:#00B4D8;letter-spacing:-0.5px;">One</span>
          <span style="font-family:Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;color:#8E8E93;letter-spacing:3px;">&nbsp;STUDIO</span>
        </td></tr>

        <!-- Carte -->
        <tr><td bgcolor="#FFFFFF" style="background-color:#FFFFFF;border:1px solid #E8E8ED;border-radius:16px;padding:34px 34px 30px;">
          ${kicker ? `<p style="margin:0 0 10px;font-family:Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;color:#00A8CA;text-transform:uppercase;letter-spacing:1.5px;">${escapeHtml(kicker)}</p>` : ""}
          ${title ? `<h1 style="margin:0 0 18px;font-family:Helvetica,Arial,sans-serif;font-size:22px;line-height:1.3;font-weight:800;color:#1D1D1F;">${escapeHtml(title)}</h1>` : ""}
          <div style="font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.65;color:#3A3A3C;">${contentHtml || ""}</div>
          ${rowsHtml}
          ${ctaHtml}
        </td></tr>

        <!-- Pied -->
        <tr><td align="center" style="padding:20px 6px 0;">
          <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:11px;line-height:1.8;color:#8E8E93;">
            Third-One Studio · Production audiovisuelle · Martinique<br>
            <a href="https://www.thirdone.studio" style="color:#00A8CA;text-decoration:none;">thirdone.studio</a>
            ${footerNote ? ` · ${escapeHtml(footerNote)}` : " · Notification automatique"}
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
