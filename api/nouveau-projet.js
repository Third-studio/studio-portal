// Route API Vercel (même domaine que le site) — création de projet via lien public.
// Les pare-feux d'entreprise bloquent souvent *.supabase.co : ici le navigateur du
// client ne parle qu'à thirdone.studio, et c'est ce serveur qui appelle Supabase.
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.REACT_APP_SUPABASE_ANON_KEY;

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ ok: false, error: "Configuration serveur manquante" });
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (req.method === "GET") {
    const token = str(req.query && req.query.token, 128);
    if (!token) return res.status(400).json({ valid: false, reason: "Token manquant" });
    const { data, error } = await supabase.rpc("get_project_invite", { invite_token: token });
    if (error) return res.status(500).json({ valid: false, reason: "Erreur serveur" });
    return res.status(200).json(data);
  }

  if (req.method === "POST") {
    const b = req.body || {};
    const token = str(b.token, 128);
    if (!token) return res.status(400).json({ ok: false, error: "Token manquant" });
    if (JSON.stringify(b).length > 60000) {
      return res.status(413).json({ ok: false, error: "Contenu trop volumineux" });
    }
    // Complément de brief sur un projet existant (page de suivi)
    if (b.note !== undefined) {
      const projectId = Number.parseInt(b.project_id, 10);
      if (!Number.isFinite(projectId)) {
        return res.status(400).json({ ok: false, error: "Projet manquant" });
      }
      const { data, error } = await supabase.rpc("add_invite_project_note", {
        invite_token: token,
        project_id: projectId,
        note: str(b.note, 2000),
      });
      if (error) return res.status(500).json({ ok: false, error: "Erreur serveur" });
      return res.status(200).json(data);
    }
    const contact = b.contact || {};
    const { data, error } = await supabase.rpc("create_project_from_invite", {
      invite_token: token,
      contact: {
        prenom: str(contact.prenom, 80),
        nom: str(contact.nom, 80),
        societe: str(contact.societe, 120),
        email: str(contact.email, 160),
      },
      brief: b.brief && typeof b.brief === "object" ? b.brief : {},
    });
    if (error) return res.status(500).json({ ok: false, error: "Erreur serveur" });
    return res.status(200).json(data);
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ ok: false, error: "Méthode non autorisée" });
};
