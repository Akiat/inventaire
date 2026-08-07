import type { Destination } from './types'
import { CATALOGUE } from './catalogue'

// Libellés et helpers pour la destination des lignes (EDL / inventaire).

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Table désignation → destination par défaut, bâtie une fois depuis le catalogue.
const DEFAUT_PAR_DESIGNATION = new Map(CATALOGUE.map((e) => [norm(e.designation), e.destinationParDefaut]))

// Repli pour une ligne sans destination explicite (donnée créée avant cette
// évolution) : on hérite du défaut du catalogue selon la désignation ; à défaut
// seulement, « les deux » (mieux vaut un élément en trop qu'un oubli).
export function destinationDe(ligne: { destination?: Destination; designation: string }): Destination {
  return ligne.destination ?? DEFAUT_PAR_DESIGNATION.get(norm(ligne.designation)) ?? 'les_deux'
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
