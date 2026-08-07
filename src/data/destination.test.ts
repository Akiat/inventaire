import { describe, it, expect } from 'vitest'
import { destinationDe, inclutEdl, inclutInventaire } from './destination'

describe('destinationDe — repli sur le catalogue', () => {
  it('respecte une destination explicite', () => {
    expect(destinationDe({ destination: 'edl', designation: 'Peu importe' })).toBe('edl')
  })

  it('hérite du défaut du catalogue selon la désignation (ligne héritée)', () => {
    expect(destinationDe({ designation: 'Porte' })).toBe('edl')
    expect(destinationDe({ designation: 'Interrupteurs' })).toBe('edl')
    expect(destinationDe({ designation: 'Canapé' })).toBe('inventaire')
    expect(destinationDe({ designation: 'Plaque de cuisson' })).toBe('les_deux')
  })

  it('retombe sur « les deux » pour une désignation hors catalogue', () => {
    expect(destinationDe({ designation: 'Objet totalement inconnu' })).toBe('les_deux')
  })
})

describe('inclut EDL / inventaire', () => {
  it('classe correctement chaque destination', () => {
    expect(inclutEdl('edl')).toBe(true)
    expect(inclutEdl('les_deux')).toBe(true)
    expect(inclutEdl('inventaire')).toBe(false)
    expect(inclutEdl('aucun')).toBe(false)
    expect(inclutInventaire('inventaire')).toBe(true)
    expect(inclutInventaire('les_deux')).toBe(true)
    expect(inclutInventaire('edl')).toBe(false)
    expect(inclutInventaire('aucun')).toBe(false)
  })
})
