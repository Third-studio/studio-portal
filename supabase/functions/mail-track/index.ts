// supabase/functions/mail-track/index.ts
// Suivi des emails partis : GET ?k=o&id=<uuid> → pixel 1×1 (ouverture) ; GET ?k=c&id=<uuid> → redirection vers le bouton de l'email.
// Servi via www.thirdone.studio/t/o/<id>.gif et /t/c/<id> (rewrites Vercel). Déployé en --no-verify-jwt.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GIF = Uint8Array.from(atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"), (c) => c.charCodeAt(0));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FALLBACK = "https://www.thirdone.studio/client";

function clientOf(ua: string) {
  if (/GoogleImageProxy/i.test(ua)) return "Gmail";
  if (/YahooMailProxy/i.test(ua)) return "Yahoo";
  if (/Outlook|Microsoft Office|ms-office/i.test(ua)) return "Outlook";
  if (/iPhone|iPad/i.test(ua)) return "iPhone / iPad";
  if (/Macintosh/i.test(ua)) return "Mac";
  if (/Android/i.test(ua)) return "Android";
  if (/Windows/i.test(ua)) return "Windows";
  return "";
}

serve(async (req) => {
  const url = new URL(req.url);
  const kind = url.searchParams.get("k") === "c" ? "c" : "o";
  const id = (url.searchParams.get("id") || "").replace(/\.gif$/, "");
  let target: string | null = null;
  if (UUID.test(id)) {
    try {
      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data } = await admin.rpc("mail_track", { p_id: id, p_kind: kind, p_client: clientOf(req.headers.get("user-agent") || "") });
      if (typeof data === "string") target = data;
      else if (kind === "c") {
        const { data: row } = await admin.from("email_log").select("cta_url").eq("id", id).maybeSingle();
        target = row?.cta_url || null;
      }
    } catch (e) { console.error("mail-track", e); }
  }
  if (kind === "c") {
    const dest = target && /^https:\/\//.test(target) ? target : FALLBACK;
    return new Response(null, { status: 302, headers: { Location: dest, "Cache-Control": "no-store" } });
  }
  return new Response(GIF, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, no-cache, must-revalidate, private", "Pragma": "no-cache" } });
});
