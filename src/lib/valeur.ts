// Valeurs indicatives : totaux et formatage (inventaire assurance, lot 2).
import type { Ligne } from '../data/types'

// Total = somme (valeur × quantité) des lignes qui portent une valeur.
export function totalValeur(lignes: Ligne[]): number {
  return lignes.reduce((s, l) => s + (l.valeur ?? 0) * (l.quantite || 1), 0)
}

export function formaterEuros(montant: number): string {
  return montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}
