import type { Destination } from './types'

// Libellés et helpers pour la destination des lignes (EDL / inventaire).

// Coalesce défensive : une ligne sans destination (donnée héritée) est traitée
// comme « les deux » — mieux vaut un élément en trop qu'un oubli.
export function destinationDe(ligne: { destination?: Destination }): Destination {
  return ligne.destination ?? 'les_deux'
}

export function inclutEdl(d: Destination): boolean {
  return d === 'edl' || d === 'les_deux'
}

export function inclutInventaire(d: Destination): boolean {
  return d === 'inventaire' || d === 'les_deux'
}

// Marqueur discret, non coloré, pour la ligne repliée (pas une pastille).
export const DEST_MARQUEUR: Record<Destination, string> = {
  edl: 'ÉDL',
  inventaire: 'INV',
  les_deux: 'ÉDL·INV',
  aucun: 'hors doc',
}

export const DEST_LIBELLE: Record<Destination, string> = {
  edl: 'État des lieux',
  inventaire: 'Inventaire',
  les_deux: 'Les deux',
  aucun: 'Aucun document',
}
