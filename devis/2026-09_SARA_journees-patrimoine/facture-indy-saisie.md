# Facture SARA — Journées du Patrimoine 2026 (rectificative)

## ⚠️ Correction

La facture **FAC-2026-09-001 (1 050,00 € HT)** produite le 21/09/2026 était **fausse**.
Elle avait été chiffrée à partir du tarif de 525 €/jour évoqué le 14 septembre, sans reprendre
le devis réellement envoyé et validé.

Le document de référence est le **devis D202609-11, version du 16/09/2026, à 700,00 € HT**
(livraison des photos retouchées sous 72 h), **validé par Jade Louis-Louisy le 16/09/2026 à
14 h 34**. La version du 14/09 a été remplacée par celle du 16/09 — c'est cette dernière qui fait foi.

Les fichiers erronés (`facture.pdf`, ainsi que le devis `devis.pdf` que j'avais rédigé à
1 050 € et qui n'a jamais été le devis officiel) ont été retirés du dossier pour éviter tout
envoi par mégarde. Ils restent consultables dans l'historique Git.

**À envoyer : `facture-rectificative.pdf` — FAC-2026-09-002, 700,00 € HT.**

## 1. En-tête

| Champ | Valeur |
|---|---|
| Numéro | FAC-2026-09-002 (numérotation auto Indy) |
| Mention obligatoire | **Annule et remplace la facture n° FAC-2026-09-001 du 21/09/2026** |
| Objet | Couverture photo — Journées du Patrimoine 2026, site SARA |
| Date d'émission | 21/09/2026 |
| Dates de prestation | 18 et 19/09/2026 |
| Échéance | 21/10/2026 (30 jours) |
| **Référence / n° de commande** | **4200017185** |
| Devis de référence | **D202609-11**, validé le 16/09/2026 |

## 2. Client

| Champ | Valeur |
|---|---|
| Raison sociale | SARA — Société Anonyme de la Raffinerie des Antilles |
| Adresse | BP 436 — 97292 Le Lamentin Cedex 2, Martinique |
| Envoi de la facture | fournisseurs@sara-ag.fr, avec Lydia Bertholo (Lydia.BERTHOLO@sara-ag.fr) en copie |
| Suivi projet | Jade Louis-Louisy, Samantha Dunon, Valérie Pavius |

## 3. Ligne

| Désignation | Qté | P.U. HT | Total HT |
|---|---|---|---|
| Couverture photo — Journées du Patrimoine des 18 et 19 septembre 2026. Présence d'environ 2 h chaque jour sur le créneau 8 h – 12 h : exposition photo, visites de la raffinerie, lycéens le vendredi, collaborateurs, familles et prestataires le samedi. Sélection et retouche des photos incluses, livraison sous 72 h. Conforme au devis D202609-11. | 1 | 700,00 € | 700,00 € |

Une seule ligne globale, pour coller exactement au devis validé (700 € HT) sans inventer une
ventilation par journée qui n'y figure pas.

## 4. Totaux

| | |
|---|---|
| Total HT | **700,00 €** |
| TVA 8,5 % | 59,50 € |
| **Net à payer TTC** | **759,50 €** |

> ⚠️ **À contrôler sur le PDF du devis D202609-11** : le mail annonce « 700 € HT », donc le HT
> est certain. En revanche je n'ai pas pu ouvrir la pièce jointe pour vérifier le taux de TVA
> appliqué. Si tu es en franchise en base, la facture doit porter « TVA non applicable,
> art. 293 B du CGI » et le net à payer devient **700,00 €**. Le régime doit être **identique à
> celui du devis validé**.

## 5. Le plus simple dans Indy

Ouvrir le devis **D202609-11** → *Transformer en facture*. Indy reprend le client, la ligne et
le montant validés. Il reste à :
1. saisir **4200017185** dans le champ Référence (il doit apparaître sur le PDF) ;
2. ajouter dans les notes : « Annule et remplace la facture n° FAC-2026-09-001 du 21/09/2026 ».

**Si la compta SARA a déjà enregistré la FAC-2026-09-001**, la mention « annule et remplace »
ne suffit pas : il faut émettre en plus un **avoir** du même montant pour solder la première
facture. Dis-moi et je te le génère.

## 6. Mail d'envoi, avec les excuses

**À :** fournisseurs@sara-ag.fr
**Cc :** Lydia.BERTHOLO@sara-ag.fr, jade.louis-louisy@sara-ag.fr
**Objet :** Facture rectificative FAC-2026-09-002 — Commande 4200017185 — annule et remplace la FAC-2026-09-001

```
Bonjour Madame Bertholo,

Je vous prie de bien vouloir m'excuser : la facture FAC-2026-09-001 que je vous ai
transmise comportait un montant erroné. Elle ne correspondait pas au devis D202609-11
validé le 16 septembre.

Veuillez trouver ci-joint la facture rectificative FAC-2026-09-002, qui annule et
remplace la précédente. Seule celle-ci est à prendre en compte ; je vous remercie de
ne pas donner suite à la première.

Numéro de commande : 4200017185
Prestation : couverture photo des Journées du Patrimoine, les 18 et 19 septembre 2026
Montant : 700,00 € HT — 759,50 € TTC, conformément au devis D202609-11
Échéance : 21/10/2026

Je suis désolé pour la confusion et le travail supplémentaire que cela occasionne à
vos équipes.

Je reste à votre disposition.

Bien cordialement,
Idriss Duleme — Third-One Studio
```

## 7. À vérifier avant envoi

- [ ] Montant et taux de TVA identiques à ceux du devis D202609-11 (ouvrir le PDF).
- [ ] Mention « Annule et remplace la facture n° FAC-2026-09-001 du 21/09/2026 » bien présente.
- [ ] N° de commande **4200017185** visible sur le PDF.
- [ ] Photos retouchées effectivement livrées (échéance annoncée : mardi 22/09).
- [ ] SIRET, n° de TVA intracommunautaire, IBAN et BIC renseignés.
- [ ] Envoi à fournisseurs@sara-ag.fr **avec Lydia Bertholo en copie**.
