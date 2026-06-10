#!/bin/bash
# Double-clique ce fichier : SQL + fonctions + mise en ligne du site, tout en un.
cd "$(dirname "$0")"
set -e

REF="ytmflrwfapxaeryehgal"

echo "════════════════════════════════════════════════════"
echo "  1/3 — Base de données (colonnes alias + company)"
echo "════════════════════════════════════════════════════"
echo "ℹ️  Si on te demande le mot de passe de la base, c'est"
echo "   le 'Database password' de Supabase (Settings → Database)."
npx supabase db push --linked || {
  echo ""
  echo "⚠️  Le SQL n'a pas pu être appliqué automatiquement."
  echo "   Pas grave : colle le contenu de supabase/sql/2026-06-10_chat_anonyme.sql"
  echo "   dans Supabase Studio → SQL Editor, puis relance ce script."
}

echo ""
echo "════════════════════════════════════════════════════"
echo "  2/3 — Déploiement des Edge Functions"
echo "════════════════════════════════════════════════════"
npx supabase functions deploy --project-ref "$REF"

echo ""
echo "════════════════════════════════════════════════════"
echo "  3/3 — Mise en ligne du site (git → Vercel)"
echo "════════════════════════════════════════════════════"
git add -A
git commit -m "feat: agent IA + chat anonymisé, suppression capture vocale, sécurité (CSP/HSTS) et design premium" || echo "(rien à committer)"
git push origin HEAD

echo ""
echo "✅ Terminé ! Vercel redéploie le site automatiquement (~1 min)."
echo ""
echo "Dernière étape manuelle (optionnelle) : renseigner les alias de l'équipe"
echo "dans Supabase Studio, ex :"
echo "  update profiles set alias='Chef de projet' where email='prenom@...';"
echo ""
read -p "Appuie sur Entrée pour fermer..."
