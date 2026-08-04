# Air Caraïbes — Vidéo destination Martinique

Pipeline de maquette (animatic + reel rythmé) pour la proposition créative.

## Contenu
- `AirCaraibes-Martinique-Proposition-Creative.pptx` — deck client (concept, storyboard, livrables)
- `animatic.html` — animatic interactif 90 s (ouvrir dans un navigateur)
- `beat.py` — synthèse de la piste percussions zouk/bèlè 104 BPM (`python3 beat.py` → beat.wav)
- `cards.html` + `shoot_cards.js` — cartes typographiques du reel (Playwright → stills/card*.jpg)
- `stills.js` — capture des fonds placeholder depuis l'animatic (stills/seq1..8.jpg)
- `build_reel.py` — montage rythmé ~23 s, cuts sur le beat (ffmpeg)
- `build_animatic.py` — animatic Ken Burns 90 s, fondus + VO (ffmpeg)

## Utilisation avec les images finales
1. Placer les 8 images (16:9) dans `stills/` sous les noms `seq1.jpg` … `seq8.jpg`
   (ordre : aile A350, porte créole, madras/bakoua, marché, Pelée, yole, ti-punch, cabine).
2. `node shoot_cards.js && python3 beat.py && python3 build_reel.py`
3. Résultat : `AirCaraibes-Reel-Rythme.mp4` (et `build_animatic.py` pour la version 90 s).

Prérequis : ffmpeg, node + playwright (Chromium), python3 + numpy.

## Images Higgsfield générées (bibliothèque du compte, 2K)
IDs des jobs : 5cf54c49, 74c9668c, 8aec5ac1, 5e849b4a, f4343af8, 88a29aea, 36f05b37, 38b47198
