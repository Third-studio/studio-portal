-- 2026-08-14 — Bucket "moodboard" : aucune limite de type/taille côté serveur.
--
-- L'upload de moodboard (App.js, MoodboardPanel.addByFile) n'était contrôlé que
-- côté client (attribut `accept="image/*"` sur l'<input>, purement indicatif —
-- contournable par un appel direct à l'API storage avec l'anon key). Un fichier
-- arbitraire (HTML/SVG avec script, exécutable, fichier énorme) pouvait donc être
-- déposé et servi publiquement depuis le bucket (getPublicUrl), sous le domaine
-- de confiance du studio.
--
-- Le front a été durci en parallèle (whitelist MIME + 15 Mo max avant upload) ;
-- cette migration ajoute la même limite au niveau du bucket lui-même pour que la
-- restriction tienne même en cas d'appel direct à l'API contournant l'UI.
update storage.buckets
   set file_size_limit = 15728640, -- 15 Mo
       allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/avif']
 where id = 'moodboard';
