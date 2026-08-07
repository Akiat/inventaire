// Catalogue local enrichi par la frappe libre. Stocké en localStorage,
// clé par type de pièce. Vient s'ajouter aux suggestions en dur.
import type { TypePiece } from '../data/types'

const CLE = 'inventaire.catalogueLocal'

type Store = Record<string, string[]>

function lire(): Store {
  try {
    return JSON.parse(localStorage.getItem(CLE) ?? '{}') as Store
  } catch {
    return {}
  }
}

function ecrire(store: Store): void {
  try {
    localStorage.setItem(CLE, JSON.stringify(store))
  } catch {
    // quota localStorage plein : sans gravité, on perd juste l'enrichissement
  }
}

export function designationsLocales(type: TypePiece): string[] {
  return lire()[type] ?? []
}

export function enrichir(type: TypePiece, designation: string): void {
  const d = designation.trim()
  if (!d) return
  const store = lire()
  const liste = store[type] ?? []
  if (liste.some((x) => x.toLowerCase() === d.toLowerCase())) return
  store[type] = [d, ...liste].slice(0, 100)
  ecrire(store)
}
