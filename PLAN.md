# Inventaire — app d'état des lieux et d'inventaire du mobilier

App web locale (PWA) pour réaliser sur téléphone l'inventaire du mobilier et l'état
des lieux d'un logement meublé, et en sortir un PDF conforme.

Usage réel : une personne seule, debout dans un appartement vide, téléphone à une
main, éventuellement sans réseau. Tout le reste découle de ça.

---

## Contraintes non négociables

1. **Aucun serveur.** Tout tourne dans le navigateur. Les données vivent dans
   IndexedDB, les photos aussi (Blob).
2. **Hors ligne.** Service worker, `manifest.json`, installable sur l'écran
   d'accueil iOS. Aucune webfont distante, aucun CDN à l'exécution.
3. **Pas de signature dans l'app.** Le PDF est produit non signé, avec des blocs
   de signature vides ; la signature passe par l'outil de signature électronique
   déjà utilisé pour le bail.
4. **Saisie en un tap.** Tout ce qui peut avoir une valeur par défaut en a une.
5. **Pas de perte de données.** Un bouton d'export de sauvegarde accessible en
   permanence, dès le V0.

## Stack

- Vite + React + TypeScript
- Dexie (IndexedDB)
- CSS écrit à la main, variables CSS, pas de framework UI
- PDF : vue HTML dédiée + `@page` CSS + `window.print()`.
  Safari iOS et Chrome savent exporter en PDF depuis la boîte d'impression.
  **Aucune librairie PDF.**
- Zéro dépendance en plus de celles listées ici sans raison explicite

---

# LOT 0 — V0 utilisable ce soir

Objectif : demain matin, l'app permet de faire l'inventaire complet d'un T3 et d'en
sortir un PDF présentable. Rien de plus. Les lots 1 à 4 viennent après.

## Modèle de données (Dexie)

```ts
Logement   { id, adresse, complement, surface, lots,
             bailleurNom, bailleurAdresse }
Constat    { id, logementId, type: 'entree' | 'sortie', date,
             locataires: string[],            // nom + adresse
             mandataire?: string,
             compteurs: Compteur[],           // { type, index, numero, photoId? }
             cles: Cle[] }                    // { libelle, nombre }
Piece      { id, constatId, nom, type, ordre }
Ligne      { id, pieceId, categorie, designation, quantite,
             etat, marqueModele?, numeroSerie?, valeur?, observations?, ordre }
Photo      { id, ligneId?, pieceId?, constatId?, blob, createdAt }
```

- `categorie` : `sol | mur | plafond | menuiserie | equipement | mobilier |
  vaisselle | entretien | autre`
- `etat` : `neuf | bon | usage | mauvais | absent`
- Ordonnancement par entier `ordre`, réindexé au drag (pas de drag au V0, mais
  garder le champ).

## Écrans du V0

1. **Accueil** — liste des constats, bouton « Nouveau constat », bouton
   « Exporter la sauvegarde ».
2. **En-tête du constat** — formulaire des mentions obligatoires (voir plus bas),
   compteurs, clés. Modifiable à tout moment, jamais bloquant.
3. **Pièces** — liste des pièces avec compteur de lignes et barre d'avancement,
   bouton `+` flottant. Créer une pièce = choisir un type dans une grille
   d'icônes, le nom est pré-rempli et éditable (« Chambre 1 », « Chambre 2 »…).
4. **Pièce** — le cœur de l'app. Voir ci-dessous.
5. **Aperçu / impression** — la vue PDF.

## Écran Pièce : la saisie

- Liste de lignes. Chaque ligne affiche : désignation, quantité si > 1, pastille
  d'état, nombre de photos.
- Bouton `+` flottant en bas à droite, dans le pouce.
- **Ajout d'une ligne** : une feuille qui monte du bas avec un champ de recherche
  autofocus. En dessous, les désignations du catalogue filtrées pour le type de
  pièce courant, les plus fréquentes en premier. Un tap sur une suggestion crée la
  ligne avec `etat = 'bon'`, `quantite = 1`, et **la feuille reste ouverte** pour
  enchaîner. La frappe libre crée aussi la ligne et enrichit le catalogue local.
- **État** : 5 boutons en ligne, `Neuf / Bon / Usage / Mauvais / Absent`,
  directement sur la ligne dépliée. Un tap, pas de menu, pas de validation.
- **Quantité** : stepper `− n +`, apparaît au dépli.
- **Photo** : `<input type="file" accept="image/*" capture="environment" multiple>`
  — surtout **pas** `getUserMedia`, qui exige HTTPS et une UI de capture à écrire.
  L'input ouvre l'appareil natif. Redimensionner à 1600 px de large max et
  réencoder en JPEG qualité 0.8 via canvas avant stockage (une photo iPhone brute
  fait 3 Mo, ça sature IndexedDB en 200 photos).
- **Observations** : `<textarea>`. La dictée du clavier iOS suffit, ne rien coder.
- **Dupliquer la ligne** et **Supprimer** dans le dépli.
- Sauvegarde à chaque frappe (debounce 300 ms). Aucun bouton « Enregistrer » nulle
  part dans l'app.

## Catalogue de départ (à écrire en dur, `src/data/catalogue.ts`)

Pour chaque type de pièce, une liste de désignations. Ordre de grandeur attendu :
20 à 40 entrées par type. Doit couvrir au minimum :

- **Toutes pièces** : sol, murs, plafond, plinthes, porte, fenêtre, volet /
  store, radiateur, interrupteurs, prises, luminaire, détecteur de fumée
- **Cuisine** : plaque de cuisson, four, micro-ondes, hotte, réfrigérateur,
  congélateur, lave-vaisselle, évier, robinetterie, plan de travail, meubles hauts,
  meubles bas, poubelle, assiettes plates, assiettes creuses, bols, verres, tasses,
  couverts, casseroles, poêles, faitout, saladier, planche à découper, couteaux,
  passoire, essoreuse, plat à four, égouttoir, torchons
- **Chambre** : sommier, matelas, couette, oreillers, protège-matelas, armoire,
  penderie, cintres, chevet, occultation
- **Séjour** : canapé, table, chaises, TV, meuble TV, étagères, rideaux
- **Salle de bains** : vasque, robinetterie, douche / baignoire, paroi, miroir,
  meuble, sèche-serviettes, VMC, porte-serviettes
- **WC** : cuvette, abattant, chasse, lave-mains, balai WC
- **Entretien** : aspirateur, balai, pelle, serpillière, seau, raclette
- **Buanderie** : lave-linge, sèche-linge, étendoir, fer, table à repasser
- **Cave / balcon / parking** : selon

## Mentions obligatoires de l'en-tête

Champs à prévoir, chacun avec un libellé clair et aucun jargon :

- Type de constat (entrée / sortie) et date
- Adresse et localisation du logement, surface, lots annexes (cave, balcon,
  parking)
- Nom et domicile du bailleur, nom des locataires
- Mandataire éventuel
- **Relevés des compteurs individuels** : type, numéro de compteur, index, photo
  du relevé
- **Détail et nature des clés et moyens d'accès** : libellé libre + nombre
  (clé logement, clé cave, badge, télécommande parking…)
- En mode sortie (lot 4) : nouvelle adresse du locataire + date du constat d'entrée

## Vue PDF (`/imprimer/:constatId`)

- Route dédiée, rendue en HTML, stylée par une feuille `@media print`.
- Format A4 portrait, marges 15 mm, `@page` avec numérotation
  « Page X / Y » — utiliser des compteurs CSS, pas de JS de pagination.
- Structure :
  1. En-tête : titre du document, type de constat, date, logement, parties
  2. Tableau des compteurs, tableau des clés
  3. Une section par pièce, tableau à colonnes
     `Désignation | Qté | État | Observations | Photos`
  4. Bloc de signature en fin de document : deux cadres vides, mention du nombre
     de pages et du nombre de photos annexées
  5. Annexe photos : grille 2 × 3 par page, chaque photo numérotée
     `P-012` et légendée `Pièce — Désignation — date de prise de vue`. Les
     numéros sont référencés dans la colonne Photos des tableaux.
- `break-inside: avoid` sur les lignes de tableau et les blocs photo.
- Un bouton « Imprimer / Exporter en PDF » qui appelle `window.print()`.

## Sauvegarde (dès le V0)

- Bouton « Exporter la sauvegarde » : produit un `.json` unique contenant tout,
  photos incluses en base64, et le fait télécharger.
- Bouton « Importer une sauvegarde » : remplace le contenu après confirmation.
- C'est laid et volumineux, c'est assumé : c'est l'assurance contre une purge du
  stockage par le navigateur. Le format ZIP vient au lot 5.
- Au premier lancement, appeler `navigator.storage.persist()`.

## Direction visuelle

L'app est un outil de terrain, pas une vitrine. Le parti pris : **carnet de
relevé**. Dense, lisible en plein soleil sur un balcon, aucune fioriture.

```css
--ink:      #12161B;  /* texte, en-têtes */
--paper:    #F7F6F3;  /* fond */
--surface:  #FFFFFF;  /* cartes, lignes */
--rule:     #D8D5CE;  /* filets */
--accent:   #1F5E7A;  /* bleu de plan, actions */
--neuf:     #0F6E5C;
--bon:      #3E8E4E;
--usage:    #B47712;
--mauvais:  #B33A28;
--absent:   #6B7280;
```

- Typographie : pile système uniquement (`-apple-system, BlinkMacSystemFont,
  'Segoe UI', system-ui, sans-serif`). Justification : l'app doit démarrer hors
  ligne, une webfont est un point de panne. Compenser par une échelle de tailles
  franche et des graisses tranchées, chiffres en `font-variant-numeric:
  tabular-nums` partout où il y a des index et des quantités.
- Cibles tactiles : 48 px minimum, actions primaires dans le tiers inférieur.
- Élément signature : le **sélecteur d'état**, cinq pastilles pleine largeur, la
  couleur remplit la pastille sélectionnée. C'est le geste répété cent fois dans
  la soirée, c'est là que va le soin.
- Pas d'animation au-delà des transitions d'état de 120 ms. `prefers-reduced-motion`
  respecté. Focus clavier visible.
- Libellés à l'infinitif ou à l'impératif, pas de « Soumettre ». Le bouton dit
  « Ajouter », le résultat dit « Ajouté ».

## Pièges connus, à traiter explicitement

- **Photos HEIC** : l'input `capture` renvoie souvent du HEIC sur iPhone. Le
  passage par `createImageBitmap` + canvas règle la conversion ; prévoir un
  message d'erreur clair si le décodage échoue au lieu de perdre la photo.
- **Purge du stockage iOS** : Safari peut évincer IndexedDB. D'où
  `storage.persist()`, l'installation sur l'écran d'accueil, et l'export de
  sauvegarde après chaque session.
- **Impression depuis la PWA installée** : sur iOS, la boîte d'impression est
  accessible via le partage. Vérifier que la route d'impression fonctionne aussi
  ouverte dans Safari, et laisser un lien pour ça.
- **Hébergement** : build statique servi en HTTPS (GitHub Pages ou équivalent) —
  requis pour le service worker et l'installation. Chemin de base à configurer
  dans `vite.config.ts` si sous-répertoire.

## Critères de fin du LOT 0

- [ ] Créer un constat, saisir l'en-tête, 6 pièces, 80 lignes avec états et
      quantités, sans jamais chercher un bouton
- [ ] Ajouter 3 photos à une ligne, les revoir, en supprimer une
- [ ] Fermer l'app, la rouvrir, tout est là
- [ ] Passer en mode avion, l'app démarre et fonctionne
- [ ] La vue d'impression sort un PDF A4 propre, paginé, avec l'annexe photos
      numérotée et référencée
- [ ] Exporter puis réimporter la sauvegarde restitue un état identique

---

# LOT 1 — Conformité

- Écran « Conformité » avec deux checklists dérivées de la réglementation, chaque
  item lié aux lignes du constat qui le satisfont :
  - **Mobilier minimum du meublé** (décret n° 2015-981 du 31 juillet 2015) :
    literie avec couette ou couverture ; dispositif d'occultation des fenêtres
    dans les chambres ; plaques de cuisson ; four ou four à micro-ondes ;
    réfrigérateur et congélateur, ou compartiment de congélation à température
    ≤ −6 °C ; vaisselle nécessaire à la prise des repas ; ustensiles de cuisine ;
    table et sièges ; étagères de rangement ; luminaires ; matériel d'entretien
    ménager adapté aux caractéristiques du logement.
  - **Mentions du constat** (décret n° 2016-382 du 30 mars 2016) : type de
    constat, date, localisation, identité et domicile des parties, mandataires,
    relevés des compteurs, détail des clés, description pièce par pièce de l'état
    des revêtements et équipements, emplacement des signatures ; en sortie, la
    nouvelle adresse du locataire et la date du constat d'entrée.
- Rattachement automatique par mot-clé sur la désignation, surchargeable à la main.
- Bandeau d'avertissement en tête de la vue d'impression tant qu'un point manque,
  jamais bloquant : c'est un garde-fou, pas un portier.
- La vue d'impression liste les catégories du mobilier obligatoire avec la
  référence de la ligne correspondante.

# LOT 2 — Confort de saisie

- Dupliquer une pièce entière avec ses lignes
- Réordonner pièces et lignes (drag, ou boutons haut/bas si le drag coûte trop cher)
- Recherche globale sur toutes les lignes d'un constat
- Champs marque/modèle, numéro de série, valeur indicative, repliés par défaut
- Total des valeurs indicatives par pièce et global, exportable — sert d'inventaire
  assurance
- Modèles de constat : enregistrer un constat comme modèle réutilisable

# LOT 3 — Qualité du PDF

- Page de garde, sommaire des pièces
- Emplacements de paraphe en pied de chaque page
- Choix : annexe photos, ou photos en vignettes dans les tableaux, ou sans photos
- Feuille de style d'impression relue à l'impression réelle, pas seulement à l'aperçu

# LOT 4 — Constat de sortie

- Créer un constat de sortie **par clonage** d'un constat d'entrée
- Chaque ligne se valide d'un tap sur « Idem » ou s'ouvre pour modification
- Filtre « Non encore vérifié » pour ne rien oublier
- Le PDF de sortie affiche `État à l'entrée → État à la sortie` et **ne surligne
  que les lignes qui ont changé**, avec les photos d'entrée et de sortie en regard
- Champs supplémentaires : nouvelle adresse du locataire, date du constat d'entrée

# LOT 5 — Robustesse

- Export ZIP (JSON + photos en fichiers), import du ZIP
- Indicateur de quota de stockage et alerte à 80 %
- Purge sélective des photos d'un constat archivé
- Tests : génération de la vue d'impression sur un jeu de données de référence,
  et rattachement de la checklist de conformité

---

## Méthode de travail attendue

Traiter les lots dans l'ordre. À la fin de chaque lot, s'arrêter : build, résumé
de ce qui est fait, liste de ce qui ne l'est pas, et attente de validation sur
iPhone réel avant d'enchaîner. Un lot = un commit.

Ne pas ajouter de dépendance, de page ou de champ qui ne soit pas dans ce
document sans le signaler d'abord.
