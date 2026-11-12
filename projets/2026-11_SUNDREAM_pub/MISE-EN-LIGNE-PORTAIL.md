# Sundream — mettre le storyboard sur le portail Third-One

Objectif : la cliente (Azilis) voit le storyboard dans son espace, avec les images, les
références (vidéos, GIF) et peut commenter plan par plan.

## 1. Déployer la migration (une fois)

`supabase/migrations/20261112120000_storyboard_images_commentaires.sql` (copie dans
`supabase/sql/`). Elle crée :

- le bucket public `storyboards` (images des plans, GIF de référence), écriture équipe ;
- la table `storyboard_comments` (commentaires par plan), RLS : la cliente lit et écrit sur
  ses propres projets, l'équipe voit tout.

Tant qu'elle n'est pas passée, l'app fonctionne quand même : les commentaires ne se chargent
pas et l'upload d'images échoue avec un message, rien ne casse.

## 2. Déployer le front

`publier.command` comme d'habitude. Les images du storyboard sont dans
`public/storyboards/sundream/` et sont servies par le portail lui-même
(`https://<portail>/storyboards/sundream/plan-1-navigation.jpg`, etc.).

## 3. Créer le projet et importer

1. Projets → nouveau projet « Sundream », client = Azilis (créer son compte si besoin).
2. Onglet **Storyboards** → **⬆ Importer un JSON** → charger
   `projets/2026-11_SUNDREAM_pub/storyboard-portail.json` (9 plans, images et liens déjà
   renseignés). Recommencer avec `storyboard-portail-planB.json` pour le plan B.
3. Sur chaque plan, **＋ Réf (lien ou GIF)** permet d'ajouter un lien ou de déposer le GIF
   récupéré sur eyecannndy (bouton ↓ sur le site). Le fichier est hébergé dans le bucket.
   **🖼 Image du plan** remplace la vignette.
4. Bouton **🔓 Ouvrir l'accès client** en haut du projet : sans ça, la cliente ne voit pas
   l'onglet Storyboards.

## 4. Côté cliente

Dans son espace, onglet Storyboards : chaque plan a son image, sa durée, l'indication caméra,
les boutons « ▶ référence », et une zone « Votre avis sur ce plan… ». Elle peut aussi
Approuver / demander une Révision sur l'ensemble. Les réponses de l'équipe apparaissent sous
le plan concerné, en bleu.
