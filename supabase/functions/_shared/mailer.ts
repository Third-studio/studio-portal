// supabase/functions/_shared/mailer.ts
// Envoi SMTP fiable : sujets encodés RFC 2047 (base64) et corps en base64 —
// contourne l'encodeur quoted-printable bugué de denomailer qui produisait
// des sujets "=?utf-8?Q?..." illisibles et des artefacts "=20" dans les mails.

import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const utf8b64 = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};

// Base64 découpé en lignes de 76 caractères (limite de longueur de ligne SMTP)
const b64lines = (s: string) => utf8b64(s).replace(/(.{76})/g, "$1\r\n");

// En-tête (sujet…) : encodage RFC 2047 "B" uniquement si non-ASCII
export const encodeHeader = (s: string) =>
  /^[\x20-\x7E]*$/.test(s) ? s : `=?UTF-8?B?${utf8b64(s)}?=`;

// Sujet : ASCII lisible garanti. denomailer corrompt les en-têtes RFC 2047
// (le "=" final devient "3d" → sujet illisible sur Gmail). On translittère :
// accents → lettres simples, tirets/guillemets typographiques → ASCII,
// emojis retirés. Les accents restent intacts dans le corps (base64 fiable).
const asciiSubject = (s: string) =>
  s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[—–]/g, "-").replace(/[«»“”]/g, '"').replace(/[’‘]/g, "'")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ").trim();

const stripHtml = (html: string) =>
  html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ").trim();

export async function sendMail({ to, subject, html, text, replyTo }: {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}) {
  const client = new SMTPClient({
    connection: {
      hostname: Deno.env.get("SMTP_HOST") || "smtp.hostinger.com",
      port: Number(Deno.env.get("SMTP_PORT") || "465"),
      tls: true,
      auth: {
        username: Deno.env.get("SMTP_USER")!,
        password: Deno.env.get("SMTP_PASS")!,
      },
    },
  });

  const fromName = Deno.env.get("FROM_NAME") || "Third-One Studio";
  const fromUser = Deno.env.get("SMTP_USER")!;
  const plain = text || (html ? stripHtml(html) : "");

  try {
    await client.send({
      from: `${fromName} <${fromUser}>`,
      to: Array.isArray(to) ? to : [to],
      replyTo: replyTo || fromUser,
      subject: asciiSubject(subject),
      // Parties MIME construites nous-mêmes en base64 → zéro corruption
      mimeContent: [
        {
          mimeType: 'text/plain; charset="utf-8"',
          content: b64lines(plain),
          transferEncoding: "base64",
        },
        ...(html
          ? [{
            mimeType: 'text/html; charset="utf-8"',
            content: b64lines(html),
            transferEncoding: "base64",
          }]
          : []),
      ],
    });
  } finally {
    try { await client.close(); } catch { /* déjà fermée */ }
  }
}
