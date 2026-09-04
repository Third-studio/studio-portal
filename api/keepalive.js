// Ping quotidien de la base Supabase (cron Vercel, voir vercel.json).
// Évite la mise en pause automatique du projet Supabase (free tier : 7 jours sans requête).
// Lecture anonyme minimale : aucune donnée sensible exposée (RLS appliquée).
module.exports = async function handler(req, res) {
  const url = process.env.REACT_APP_SUPABASE_URL;
  const key = process.env.REACT_APP_SUPABASE_ANON_KEY;
  if (!url || !key) return res.status(500).json({ ok: false, error: "Variables Supabase manquantes" });
  try {
    const r = await fetch(`${url}/rest/v1/profiles?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    res.setHeader("Cache-Control", "no-store");
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status, at: new Date().toISOString() });
  } catch (e) {
    return res.status(502).json({ ok: false, error: String(e) });
  }
};
