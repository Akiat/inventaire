# Conventions du projet

Lire `PLAN.md` avant toute chose. Il fait autorité sur le périmètre.
Lire ensuite `ETAT.md` : état d'avancement, architecture, décisions et pièges
(document de reprise pour une nouvelle session).

## Règles

- **Périmètre fermé.** Ne rien ajouter qui ne soit pas dans `PLAN.md` : pas de
  page, pas de champ, pas de dépendance, pas de « tant qu'on y est ». Si quelque
  chose manque manifestement, le signaler et attendre.
- **Dépendances autorisées** : `react`, `react-dom`, `react-router-dom`, `dexie`,
  `dexie-react-hooks`, `vite`, `typescript`. Toute autre dépendance doit être
  justifiée et validée avant installation.
- **Pas de serveur, pas d'API, pas de réseau à l'exécution.** Aucun `fetch` vers
  l'extérieur, aucune webfont distante, aucun script CDN.
- **Pas de librairie PDF.** L'export passe par une route HTML et
  `@media print` + `window.print()`.
- **Pas de librairie de composants ni de framework CSS.** CSS écrit à la main,
  couleurs et espacements uniquement via les variables définies dans `PLAN.md`.
- **Aucun bouton « Enregistrer ».** Toute saisie est persistée automatiquement.
- **TypeScript strict.** Pas de `any` sans commentaire justifiant.

## Structure

```
src/
  data/        schéma Dexie, catalogue, checklists de conformité
  screens/     un fichier par écran
  components/  composants partagés (SelecteurEtat, FeuilleAjout, ChampPhoto…)
  print/       vue d'impression et sa feuille de style, isolée du reste
  lib/         images (redimensionnement), export/import, storage
```

## Langue

Interface, libellés, noms de champs et messages **en français**. Code, noms de
variables et de fichiers en français aussi pour le domaine métier (`Piece`,
`Ligne`, `etat`, `constat`) — le vocabulaire réglementaire n'a pas de bonne
traduction et le mélange coûte plus cher que l'accent manquant.

Commentaires seulement là où l'intention n'est pas lisible dans le code, en
particulier sur les contraintes réglementaires et les contournements iOS.

## Rythme

Un lot de `PLAN.md` = un commit. À la fin de chaque lot : `npm run build` doit
passer, puis s'arrêter avec un résumé de ce qui est fait et de ce qui reste, et
attendre la validation sur iPhone réel.
