# État du projet — reprise de session

Document de passation pour une nouvelle session. À lire **après** `PLAN.md`
(périmètre, qui fait autorité) et `CLAUDE.md` (conventions). Ici : ce qui est
**fait**, comment c'est bâti, les décisions non écrites dans PLAN, les pièges.

## Résumé

App PWA hors ligne (Vite + React + TS + Dexie) pour l'inventaire du mobilier et
l'état des lieux d'un logement meublé. **Tous les lots du PLAN sont faits**
(0 → 5), plus une **évolution majeure « deux documents »** demandée en cours de
route. Zéro dépendance d'exécution hors de la liste autorisée.

- **Déployé** : https://akiat.github.io/inventaire/
- **Dépôt** : `Akiat/inventaire` (public), branche `main`, déploiement auto via
  GitHub Actions (`.github/workflows/deploy.yml`) à chaque push.
- **Données** : IndexedDB sur l'appareil. Un push ne touche jamais les données.

## Commandes

```bash
npm run dev      # dev (Vite)
npm run build    # tsc -b && vite build — DOIT passer à la fin de chaque lot
npm test         # vitest (18 tests)
npm run preview  # sert le build
```

Déploiement : `git push origin main` → Actions build (BASE_PATH auto = /inventaire/)
et publie sur Pages. Vérif : `gh run list --repo Akiat/inventaire --limit 1`.

## Ce qui est fait

- **LOT 0** : constats, pièces (grille d'icônes), saisie (sélecteur d'état 5
  pastilles, quantité, photos, observations), catalogue par type de pièce,
  persistance auto (debounce 300 ms), vue PDF, sauvegarde, service worker.
- **LOT 1** : écran Conformité — mobilier minimum (décret 2015-981) + mentions
  (décret 2016-382). Rattachement auto par mot-clé, surchargeable. Bandeau
  d'avertissement à l'impression.
- **LOT 2** : dupliquer une pièce, réordonner (boutons ↑/↓), recherche globale,
  champs marque/n° série/valeur repliés, totaux de valeur, modèles de constat.
- **LOT 3** : page de garde + sommaire, pied de paraphe (footer `position:fixed`),
  choix du mode photos.
- **LOT 4** : constat de sortie par clonage, validation « Idem » / filtre
  « à vérifier », mentions sortie, PDF comparatif entrée→sortie (colonnes,
  lignes modifiées surlignées, photos en regard).
- **LOT 5 (partiel, demandé réduit)** : export/import **ZIP** (writer/reader
  maison, méthode store, zéro dépendance) + import de l'ancien JSON base64 ;
  **tests** vitest ; indicateur d'espace de stockage + bouton de persistance.

### Évolution « deux documents » (majeure, hors numérotation des lots)

Une seule saisie produit **deux documents** : état des lieux (EDL) et inventaire
du mobilier. Chaque `Ligne` porte `destination: 'edl' | 'inventaire' | 'les_deux'
| 'aucun'`, initialisée depuis `destinationParDefaut` du catalogue (pas depuis la
catégorie), surchargeable. Détail dans `PLAN.md` (section « ÉVOLUTION »).

### Évolutions récentes (post-lots, validées iPhone)

- **Photos de pièce** : photo d'ensemble d'une pièce (non liée à une ligne), via
  `Photo.pieceId` déjà prévu au schéma. Destination **par pièce**
  (`Piece.photosDestination`, défaut `'edl'`). À l'impression : numérotation
  globale et stable, rendu sous le titre de section (références en mode annexe,
  vignettes sinon) et dans l'annexe, filtré selon la destination de la pièce.
- **Mise à jour automatique de la PWA** : `sw.js` versionné au build
  (`scripts/stamp-sw.mjs` injecte le SHA du commit dans le nom du cache, donc les
  octets changent à chaque déploiement) ; `main.tsx` appelle `registration.update()`
  au lancement et à chaque retour au premier plan, et recharge une fois quand le
  nouveau service worker prend la main.
- **État « Neuf » → « Parfait »** : simple renommage du libellé. La valeur interne
  reste `'neuf'` (couleur `--neuf`, historique des données), donc **aucune
  migration**.

## Architecture (src/)

- `data/types.ts` — types du domaine (Logement, Constat, Piece, Ligne, Photo,
  Modele, Destination…).
- `data/db.ts` — schéma Dexie. **v1** = 5 tables ; **v2** ajoute `modeles`.
- `data/catalogue.ts` — catalogue en dur (désignation, catégorie,
  `destinationParDefaut`, types de pièce) + méta des types de pièce.
- `data/destination.ts` — helpers destination. `destinationDe(ligne)` : repli
  d'une ligne sans destination sur le défaut catalogue selon la désignation,
  sinon `les_deux`.
- `data/conformite.ts` — définitions réglementaires + `evaluerMobilier`,
  `evaluerMentions` (fonctions **pures**, testées).
- `data/actions.ts` — toutes les écritures Dexie (création, duplication,
  réordonnancement, clonage sortie, conformité, modèles, photos de ligne / pièce
  / compteur). Les lectures+écritures d'`ordre` passent par des transactions
  (anti-course sur ajout en rafale). `etatLibelle` y traduit les états.
- `lib/` — `images.ts` (redim 1600px/JPEG 0.8, gestion HEIC), `backup.ts`
  (ZIP + JSON), `zip.ts` (ZIP maison), `storage.ts` (persist + estimate),
  `valeur.ts`, `hooks.ts` (useBlobUrl, debounce), `catalogueLocal.ts`.
- `screens/` — Accueil, EnTeteConstat, Pieces, Piece, Conformite, Documents.
- `components/` — BarreTitre, SelecteurEtat, SelecteurDestination, FeuilleAjout,
  ChampPhoto, LigneItem.
- `print/` — `donnees.ts` (charge + met en forme un document, orienté doc),
  `Imprimer.tsx` (rendu), `print.css` (isolée, `@media print`).

## Décisions clés (non toutes dans PLAN)

- **Zéro dépendance** hors liste autorisée. Le ZIP est écrit à la main plutôt
  que d'ajouter jszip. vitest est en **devDependency** (hors bundle), justifié
  par la demande de tests.
- **HashRouter** (pas de config serveur, marche sous sous-répertoire Pages).
- **Numérotation des photos globale et stable** au constat : une même photo
  garde son numéro dans les deux documents. Chaque document n'annexe que ses
  propres photos.
- **Mode photos** (impression) : `annexe` / `vignettes` / `les_deux`. Masqué en
  **sortie** (photos toujours en regard entrée/sortie).
- **Conformité mobilier** : ne compte que les lignes dont la destination inclut
  l'inventaire. État vide propre quand aucune ligne inventaire.
- **Clonage sortie** : `etatEntree` figé, `ligneEntreeId` pour retrouver les
  photos d'entrée, `verifiee` pour le suivi. Photos d'entrée non recopiées.
- **Photos de pièce** : destination portée **par la pièce** (`photosDestination`),
  pas par photo — une seule décision pour toutes les photos d'ambiance. Non
  recopiées à la duplication d'une pièce (comme les photos de ligne).
- **État « Parfait »** : renommage de libellé seulement, valeur interne `'neuf'`
  inchangée → pas de migration, historique préservé, couleur `--neuf` conservée.
- **PWA auto-update** : `sw.js` doit changer d'octets à chaque déploiement pour
  que le navigateur détecte la mise à jour → version tamponnée au build
  (`scripts/stamp-sw.mjs`, hors `src/`, `.mjs` pour éviter `@types/node`).

## Reste à faire (si on veut clore le LOT 5 complet)

- **Alerte quota à 80 %** : l'indicateur existe (Accueil), mais pas d'alerte
  active à 80 %. À ajouter si voulu.
- **Purge sélective des photos** d'un constat archivé : non fait.
- **Test de génération de la vue d'impression** sur jeu de référence : non fait
  car `chargerImpression` dépend d'IndexedDB ; demanderait `fake-indexeddb`
  (dépendance de dev) ou d'extraire une fonction pure. Les helpers purs dont
  dépend l'impression (conformité, destination, valeurs) sont testés.

## Pièges connus

- **Impression réelle** : le pied de paraphe (`position:fixed`) et la pagination
  `Page X / Y` (`@page` counters) dépendent du moteur d'impression Safari/Chrome.
  À valider sur iPhone réel (Partager → Imprimer), pas seulement à l'aperçu.
- **Dev server via l'outil navigateur** : le HMR passe mal par le proxy
  (WebSocket `ws://localhost:undefined`), le bundle peut être **périmé** et
  donner « No routes matched » / page blanche. Pour tester fidèlement, viser le
  **site déployé** plutôt que le dev server, ou redémarrer le serveur.
- **Service worker** : la mise à jour est désormais **automatique** (update au
  premier plan + rechargement au changement de contrôleur). MAIS le déploiement
  qui a *introduit* ce mécanisme reste servi par l'ancien SW qui l'ignore : ce
  passage-là exige encore un **force-quit** manuel de la PWA (une seule fois).
  Sur iOS, **supprimer/réajouter l'icône n'efface pas** les données de site (SW,
  caches, IndexedDB liés à l'origine) — ce n'est donc pas un reset. Reset fiable
  mais destructif : Réglages → Safari → Avancé → Données de sites (exporter le
  ZIP avant).
- **Persistance iOS** : `storage.persist()` n'est accordé que sous conditions
  (PWA installée sur l'écran d'accueil, engagement). Le bouton « Protéger le
  stockage » peut renvoyer « non » sur un simple onglet — normal.
- **Éviction iOS** : meilleur rempart = installer sur l'écran d'accueil +
  export ZIP régulier (filet de sécurité). Les données ne sont QUE sur l'appareil.

## Méthode

Un lot = un commit. À la fin : `npm run build` passe, résumé, et attente de
validation sur iPhone réel avant d'enchaîner. Messages/commits en français pour
le domaine métier, code en anglais (cf. CLAUDE.md).
