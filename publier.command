#!/bin/bash
# Publie les changements déjà committés : git push → Vercel redéploie (~1 min).
cd "$(dirname "$0")"
echo "Envoi vers GitHub…"
git push origin HEAD && echo "" && echo "✅ Poussé ! Vercel redéploie thirdone.studio (~1 min)." || echo "❌ Échec du push — vérifie ta connexion GitHub."
sleep 5
