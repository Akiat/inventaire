import { describe, it, expect } from 'vitest'
import { totalValeur, formaterEuros } from './valeur'
import type { Ligne } from '../data/types'

function ligne(valeur: number | undefined, quantite = 1): Ligne {
  return {
    id: 'x',
    pieceId: 'p',
    categorie: 'autre',
    designation: 'x',
    quantite,
    etat: 'bon',
    destination: 'inventaire',
    ordre: 0,
    valeur,
  }
}

describe('totalValeur', () => {
  it('somme valeur × quantité, en ignorant les lignes sans valeur', () => {
    expect(totalValeur([ligne(100), ligne(50, 3), ligne(undefined)])).toBe(250)
  })

  it('vaut 0 sans aucune valeur', () => {
    expect(totalValeur([ligne(undefined), ligne(undefined)])).toBe(0)
  })
})

describe('formaterEuros', () => {
  it('formate en euros sans décimales', () => {
    // Espace insécable inséré par Intl : on vérifie les éléments clés.
    const s = formaterEuros(1250)
    expect(s).toMatch(/1\s?250/)
    expect(s).toContain('€')
  })
})
