import { describe, it, expect } from 'vitest'
import { creerZip, lireZip } from './zip'

describe('zip (store) — aller-retour', () => {
  it('restitue les fichiers à l’identique', async () => {
    const texte = new TextEncoder().encode('{"format":"test","n":42}')
    const binaire = new Uint8Array([0, 1, 2, 253, 254, 255, 128, 64])
    const blob = creerZip([
      { nom: 'inventaire.json', data: texte },
      { nom: 'photos/abc.jpg', data: binaire },
    ])
    expect(blob.type).toBe('application/zip')

    const entrees = await lireZip(blob)
    expect([...entrees.keys()].sort()).toEqual(['inventaire.json', 'photos/abc.jpg'])
    expect(entrees.get('inventaire.json')).toEqual(texte)
    expect(entrees.get('photos/abc.jpg')).toEqual(binaire)
  })

  it('gère les noms UTF-8 et les fichiers vides', async () => {
    const entrees = await lireZip(
      creerZip([{ nom: 'pièce-été.txt', data: new Uint8Array(0) }])
    )
    expect(entrees.get('pièce-été.txt')).toEqual(new Uint8Array(0))
  })

  it('rejette une archive invalide', async () => {
    await expect(lireZip(new Blob([new Uint8Array([1, 2, 3])]))).rejects.toThrow()
  })
})
