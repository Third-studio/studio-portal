import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    // ── 1. Google Trends RSS (France + global)
    const rssUrls = [
      "https://trends.google.com/trends/trendingsearches/daily/rss?geo=FR",
      "https://trends.google.com/trends/trendingsearches/daily/rss?geo=US",
    ];

    const rssResults = await Promise.allSettled(
      rssUrls.map(url =>
        fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; TrendBot/1.0)" },
          signal: AbortSignal.timeout(8000),
        }).then(r => r.text())
      )
    );

    const allTitles: string[] = [];
    for (const r of rssResults) {
      if (r.status === "fulfilled") {
        const matches = [...r.value.matchAll(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/g)];
        allTitles.push(...matches.map(m => m[1]).filter(t => t.length > 3));
      }
    }

    const titles = [...new Set(allTitles)].slice(0, 30);

    if (titles.length === 0) throw new Error("Aucune tendance récupérée depuis Google Trends");

    // ── 2. Claude enrichit et crée les tendances social media
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2500,
        system: `Tu es expert en tendances social media. Réponds UNIQUEMENT en JSON valide, sans markdown, sans commentaires.
Format exact: [{"tag":"#HashTag","platform":"TikTok","niche":"Fitness","views":"1.2M","growth":"+156%","why":"Explication courte pourquoi ça explose (2-3 phrases)","hook":"Phrase d'accroche en POV pour commencer le contenu","plans":["Plan1","Plan2","Plan3","Plan4","Plan5"]}]
Plateformes possibles: TikTok, Instagram, LinkedIn, YouTube.
Niches possibles: Fitness, Beauty, Tech, Food, Business, Voyage, Lifestyle, Finance.`,
        messages: [
          {
            role: "user",
            content: `Voici les recherches tendance du jour (France + USA) : ${titles.join(", ")}

Analyse ces tendances et crée exactement 6 idées de contenu social media percutantes adaptées à la création vidéo/photo professionnelle. Mix les niches et plateformes. Estime des chiffres réalistes de vues et croissance. Les hashtags doivent être en français ou anglais selon ce qui performe mieux.`,
          },
        ],
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      throw new Error(`Claude API error ${claudeRes.status}: ${err}`);
    }

    const claudeData = await claudeRes.json();
    const rawText = claudeData.content?.[0]?.text ?? "";
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("Claude n'a pas retourné de JSON valide");

    const trends: Record<string, unknown>[] = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(trends) || trends.length === 0) throw new Error("Tableau de tendances vide");

    // ── 3. Upsert dans Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Désactive les tendances précédentes
    await supabase.from("trends").update({ active: false }).eq("active", true);

    // Insère les nouvelles
    const rows = trends.map(t => ({
      tag: t.tag,
      platform: t.platform,
      niche: t.niche,
      views: t.views,
      growth: t.growth,
      why: t.why,
      hook: t.hook,
      plans: t.plans,
      active: true,
      fetched_at: new Date().toISOString(),
    }));

    const { error: insertErr } = await supabase.from("trends").insert(rows);
    if (insertErr) throw new Error("Insert error: " + insertErr.message);

    return new Response(
      JSON.stringify({ ok: true, count: rows.length, sources: titles.slice(0, 5) }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("refresh-trends error:", msg);
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
