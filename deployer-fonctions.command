#!/bin/bash
# Double-clique ce fichier pour déployer les 16 Edge Functions sur Supabase.
cd "$(dirname "$0")"

echo "════════════════════════════════════════════════"
echo "  Déploiement des Edge Functions — ThirdOne"
echo "════════════════════════════════════════════════"
echo ""

npx supabase functions deploy --project-ref ytmflrwfapxaeryehgal

echo ""
echo "════════════════════════════════════════════════"
echo "  Secrets configurés sur le projet :"
echo "════════════════════════════════════════════════"
npx supabase secrets list --project-ref ytmflrwfapxaeryehgal

echo ""
echo "⚠️  Si ANTHROPIC_API_KEY n'apparaît pas ci-dessus,"
echo "   project-radar / mail-classify / voice-capture ne marcheront pas."
echo "   Pour l'ajouter :"
echo "   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref ytmflrwfapxaeryehgal"
echo ""
read -p "Appuie sur Entrée pour fermer..."
