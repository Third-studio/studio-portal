// supabase/functions/ai-generate/index.ts
// Proxy Anthropic authentifié pour les générations ponctuelles du front
// (storyboard IA, captions CM, sync ClickUp). La clé API ne quitte jamais le
// serveur — avant, le front appelait api.anthropic.com sans clé (appels morts).
//
// Secrets : ANTHROPIC_API_KEY, CLAUDE_MODEL (optionnel), CLICKUP_MCP_TOKEN (optionnel)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rateLimit.ts";

// Appels Claude/heure : plus permissif pour l'équipe (ClickUp sync, storyboards)
// que pour un compte client (captions/brief) qui n'a pas de raison d'appeler en boucle.
const RATE_LIMITS: Record<string, number> = { client: 15, admin: 60, collaborateur: 60 };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ── Auth : session valide + rôle connu du portail
  const auth = req.headers.get("Authorization") || "";
  const jwt = auth.replace("Bearer ", "");
  if (!jwt) return json({ error: "Missing auth" }, 401);
  const { data: u } = await supabase.auth.getUser(jwt);
  if (!u?.user) return json({ error: "Invalid session" }, 401);
  const { data: profile } = await supabase.from("profiles")
    .select("role").eq("id", u.user.id).single();
  const role = profile?.role;
  if (!["admin", "collaborateur", "client"].includes(role ?? "")) {
    return json({ error: "Forbidden" }, 403);
  }

  const withinLimit = await checkRateLimit(supabase, "ai-generate", u.user.id, RATE_LIMITS[role as string], 60);
  if (!withinLimit) return json({ error: "Trop de requêtes, réessaie plus tard" }, 429);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "ANTHROPIC_API_KEY missing" }, 500);

  try {
    const body = await req.json().catch(() => ({}));

    // Entrées strictement bornées : pas de modèle libre, pas de MCP arbitraire.
    const rawMessages = Array.isArray(body.messages) ? body.messages.slice(0, 10) : [];
    const messages = rawMessages
      .filter((m: { role?: string; content?: unknown }) =>
        (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
      .map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content.slice(0, 8000),
      }));
    if (messages.length === 0) return json({ error: "messages required" }, 400);

    const payload: Record<string, unknown> = {
      model: Deno.env.get("CLAUDE_MODEL") || "claude-sonnet-4-20250514",
      max_tokens: Math.min(Number(body.max_tokens) || 500, 1024),
      messages,
    };
    if (typeof body.system === "string" && body.system.trim()) {
      payload.system = body.system.slice(0, 4000);
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    };

    // ClickUp = outil interne du studio : jamais pour un compte client.
    if (body.clickup === true && role === "client") {
      return json({ error: "Forbidden" }, 403);
    }
    if (body.clickup === true) {
      const mcp: Record<string, unknown> = {
        type: "url",
        url: "https://mcp.clickup.com/mcp",
        name: "clickup",
      };
      const clickupToken = Deno.env.get("CLICKUP_MCP_TOKEN");
      if (clickupToken) mcp.authorization_token = clickupToken;
      payload.mcp_servers = [mcp];
      headers["anthropic-beta"] = "mcp-client-2025-04-04";
    }

    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("anthropic error", res.status, data?.error?.message);
      return json({ error: data?.error?.message || "Génération impossible" }, 502);
    }
    return json({ content: data.content });
  } catch (e) {
    console.error("ai-generate", e);
    return json({ error: "Erreur interne" }, 500);
  }
});
