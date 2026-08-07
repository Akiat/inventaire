import { beforeEach, describe, it, expect } from 'vitest'
import { chargerImpression, type DonneesImpression, type PhotoNumerotee } from './donnees'
import { reinitialiser, seedReference, type Reference } from '../test/fixtures'

// Cherche la référence P-XXX d'une photo par son id (indépendant de l'ordre de
// numérotation, donc robuste aux ex æquo de createdAt).
function refDe(annexe: PhotoNumerotee[], photoId: string): string | undefined {
  return annexe.find((a) => a.photo.id === photoId)?.ref
}

function piece(data: DonneesImpression, pieceId: string) {
  return data.pieces.find((p) => p.piece.id === pieceId)
}

describe('chargerImpression — deux documents à partir d’une saisie', () => {
  let ref: Reference
  beforeEach(async () => {
    await reinitialiser()
    ref = await seedReference()
  })

  it('EDL : pièces, lignes, compteurs, clés et annexe filtrés pour l’état des lieux', async () => {
    const edl = (await chargerImpression(ref.constatId, 'edl'))!
    expect(edl).not.toBeNull()

    const ids = edl.pieces.map((p) => p.piece.id)
    expect(ids).toContain(ref.cuisineId)
    expect(ids).toContain(ref.chambreId)
    expect(ids).not.toContain(ref.placardId) // photo « inventaire » seule → hors EDL

    const cuisine = piece(edl, ref.cuisineId)!
    expect(cuisine.lignes.map((l) => l.ligne.id)).toEqual([ref.lignes.l1, ref.lignes.l2])
    expect(cuisine.photosPiece).toHaveLength(1) // vue d’ensemble EDL
    expect(cuisine.refsPhotosPiece).toHaveLength(1)

    // Compteurs et clés : EDL uniquement.
    expect(edl.compteurs).toHaveLength(1)
    expect(edl.compteurs[0].ref).toBeDefined()
    expect(edl.cles).toHaveLength(1)

    // Annexe : photos des lignes EDL + photo de pièce EDL + photo de compteur.
    expect(refDe(edl.annexe, ref.photos.l1a)).toBeDefined()
    expect(refDe(edl.annexe, ref.photos.l1b)).toBeDefined()
    expect(refDe(edl.annexe, ref.photos.cuisineVue)).toBeDefined()
    expect(refDe(edl.annexe, ref.photos.compteur)).toBeDefined()
    expect(refDe(edl.annexe, ref.photos.l3)).toBeUndefined() // ligne inventaire
    expect(refDe(edl.annexe, ref.photos.placardVue)).toBeUndefined()
    expect(edl.nbPhotos).toBe(4)

    expect(edl.mobilier).toHaveLength(0) // checklist mobilier = inventaire seulement
  })

  it('Inventaire : mobilier, lignes et annexe propres au document', async () => {
    const inv = (await chargerImpression(ref.constatId, 'inventaire'))!

    const ids = inv.pieces.map((p) => p.piece.id)
    expect(ids).toContain(ref.cuisineId)
    expect(ids).toContain(ref.placardId) // pièce sans ligne mais avec photo inventaire
    expect(ids).not.toContain(ref.chambreId) // lignes EDL seules

    const cuisine = piece(inv, ref.cuisineId)!
    expect(cuisine.lignes.map((l) => l.ligne.id)).toEqual([ref.lignes.l1, ref.lignes.l3])
    expect(cuisine.photosPiece).toHaveLength(0) // vue d’ensemble EDL, absente ici

    const placard = piece(inv, ref.placardId)!
    expect(placard.lignes).toHaveLength(0)
    expect(placard.photosPiece).toHaveLength(1)

    expect(refDe(inv.annexe, ref.photos.l1a)).toBeDefined()
    expect(refDe(inv.annexe, ref.photos.l3)).toBeDefined()
    expect(refDe(inv.annexe, ref.photos.placardVue)).toBeDefined()
    expect(refDe(inv.annexe, ref.photos.cuisineVue)).toBeUndefined() // photo EDL
    expect(refDe(inv.annexe, ref.photos.compteur)).toBeUndefined() // compteur = EDL
    expect(inv.nbPhotos).toBe(4)

    expect(inv.mobilier.length).toBeGreaterThan(0)
  })

  it('numérotation des photos globale et stable entre les deux documents', async () => {
    const edl = (await chargerImpression(ref.constatId, 'edl'))!
    const inv = (await chargerImpression(ref.constatId, 'inventaire'))!

    // Une même photo garde sa référence dans les deux documents.
    expect(refDe(inv.annexe, ref.photos.l1a)).toBe(refDe(edl.annexe, ref.photos.l1a))
    expect(refDe(inv.annexe, ref.photos.l1b)).toBe(refDe(edl.annexe, ref.photos.l1b))

    // Références uniques à l’intérieur d’un document.
    const refs = edl.annexe.map((a) => a.ref)
    expect(new Set(refs).size).toBe(refs.length)
  })
})
