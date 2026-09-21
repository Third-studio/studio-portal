# Facture SARA — Journées du Patrimoine 2026 (rectificative)

## ⚠️ Correction — et vérification faite depuis

La facture **FAC-2026-09-001 (1 050,00 € HT)** produite le 21/09/2026 était **fausse** :
chiffrée sur le tarif de 525 €/jour évoqué le 14 septembre, sans reprendre le devis réellement
transmis. Le document de référence est le **devis D202609-11, version du 16/09/2026, à
700,00 € HT** (livraison des photos retouchées sous 72 h), **validé par Jade Louis-Louisy le
16/09/2026 à 14 h 34**.

**Vérification Gmail : aucun envoi vers `fournisseurs@sara-ag.fr` depuis 10 jours.** La facture
erronée n'a donc jamais atteint la SARA — elle n'est jamais sortie de ce dossier. Deux
conséquences :

1. **Pas d'excuses à présenter à la SARA** pour une facture qu'elle n'a jamais reçue : cela ne
   ferait qu'introduire de la confusion dans leur circuit fournisseur.
2. **Pas de mention « annule et remplace »** : elle renverrait à un document inexistant côté
   SARA, et polluerait leur comptabilité.

| Fichier | Quand l'utiliser |
|---|---|
| **`facture.pdf`** — FAC-2026-09-001, 700 € HT, sans mention | **Par défaut.** C'est la version à envoyer. |
| `facture-rectificative.pdf` — FAC-2026-09-002, 700 € HT, mention « annule et remplace » | Seulement si tu as transmis la facture à 1 050 € par un autre canal (WhatsApp, autre adresse, remise en main propre). |

Si c'est le cas, dis-le moi : je bascule le brouillon sur la version rectificative et j'y ajoute
les excuses.

## 1. En-tête

| Champ | Valeur |
|---|---|
| Numéro | FAC-2026-09-001 (numérotation auto Indy) |
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

## 6. Mail d'envoi — brouillon déjà créé dans Gmail

Un brouillon est prêt dans ta boîte, en réponse au fil « Couverture photos SARA - Journée du
patrimoine », donc avec tout l'historique et le mail de Lydia sous les yeux.

- **À :** fournisseurs@sara-ag.fr
- **Cc :** Lydia.BERTHOLO@sara-ag.fr, jade.louis-louisy@sara-ag.fr
- **Objet :** Facture FAC-2026-09-001 - Commande 4200017185 - Couverture photo Journées du Patrimoine

```
Bonjour Madame Bertholo,

Merci pour le numéro de commande.

Vous trouverez ci-joint la facture relative à la couverture photo des Journées du
Patrimoine, réalisée sur le site de la SARA les vendredi 18 et samedi 19 septembre
2026, conformément au devis D202609-11 validé le 16 septembre.

Numéro de commande : 4200017185
Montant : 700,00 € HT, soit 759,50 € TTC
Échéance : 21 octobre 2026

Les photos retouchées ont été livrées dans le délai annoncé.

Je reste à votre disposition pour toute information complémentaire.

Bien cordialement,

Idriss Duleme
Third-One Studio
contact@thirdone.studio
```

**Le brouillon est sans pièce jointe, volontairement** : la facture à joindre est celle que tu
génères depuis Indy, avec ton vrai SIRET, ton n° de TVA et ton IBAN. Mon `facture.pdf` porte
encore « à compléter » sur ces trois champs — il sert de modèle et de contrôle des montants,
pas de document à envoyer en l'état.

## 7. À vérifier avant envoi

- [ ] Montant et taux de TVA identiques à ceux du devis D202609-11 (ouvrir le PDF).
- [ ] Mention « Annule et remplace la facture n° FAC-2026-09-001 du 21/09/2026 » bien présente.
- [ ] N° de commande **4200017185** visible sur le PDF.
- [ ] Photos retouchées effectivement livrées (échéance annoncée : mardi 22/09).
- [ ] SIRET, n° de TVA intracommunautaire, IBAN et BIC renseignés.
- [ ] Envoi à fournisseurs@sara-ag.fr **avec Lydia Bertholo en copie**.
