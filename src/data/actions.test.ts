import { beforeEach, describe, it, expect } from 'vitest'
import { db } from './db'
import {
  ajouterPhoto,
  creerConstat,
  creerConstatSortie,
  creerLigne,
  creerPiece,
  dupliquerPiece,
  supprimerConstat,
  supprimerPiece,
} from './actions'
import { blobFactice, reinitialiser, seedReference } from '../test/fixtures'

describe('actions — création', () => {
  beforeEach(reinitialiser)

  it('creerConstat crée un logement et un constat liés', async () => {
    const id = await creerConstat('entree')
    const constat = await db.constats.get(id)
    expect(constat?.type).toBe('entree')
    expect(await db.logements.get(constat!.logementId)).toBeDefined()
  })

  it('creerPiece numérote les pièces de même type', async () => {
    const cid = await creerConstat('entree')
    const p1 = await creerPiece(cid, 'chambre')
    const p2 = await creerPiece(cid, 'chambre')
    expect((await db.pieces.get(p1))?.nom).toBe('Chambre')
    expect((await db.pieces.get(p2))?.nom).toBe('Chambre 2')
  })

  it('creerLigne : état « bon » par défaut et ordre incrémental', async () => {
    const cid = await creerConstat('entree')
    const pid = await creerPiece(cid, 'cuisine')
    const l1 = await creerLigne(pid, 'Sol', 'sol', 'edl')
    const l2 = await creerLigne(pid, 'Mur', 'mur', 'edl')
    const a = await db.lignes.get(l1)
    const b = await db.lignes.get(l2)
    expect(a?.etat).toBe('bon')
    expect(b!.ordre).toBeGreaterThan(a!.ordre)
  })
})

describe('actions — duplication et clonage', () => {
  beforeEach(reinitialiser)

  it('dupliquerPiece recopie les lignes mais pas les photos', async () => {
    const cid = await creerConstat('entree')
    const pid = await creerPiece(cid, 'cuisine')
    const l = await creerLigne(pid, 'Plaque de cuisson', 'equipement', 'les_deux')
    await ajouterPhoto(blobFactice(), l)

    const newPid = await dupliquerPiece(pid)
    const lignes = await db.lignes.where('pieceId').equals(newPid!).toArray()
    expect(lignes).toHaveLength(1)
    expect(await db.photos.where('ligneId').equals(lignes[0].id).count()).toBe(0)
  })

  it('creerConstatSortie fige l’état d’entrée et ne recopie pas les photos', async () => {
    const ref = await seedReference()
    const sortieId = await creerConstatSortie(ref.constatId)
    const pieces = await db.pieces.where('constatId').equals(sortieId!).toArray()
    const lignes = await db.lignes.where('pieceId').anyOf(pieces.map((p) => p.id)).toArray()

    const clonee = lignes.find((l) => l.designation === 'Plaque de cuisson')!
    expect(clonee.etatEntree).toBe('neuf') // état figé de la ligne d’entrée
    expect(clonee.etat).toBe('neuf') // démarre identique
    expect(clonee.ligneEntreeId).toBe(ref.lignes.l1)
    expect(clonee.verifiee).toBe(false)

    // Aucune photo recopiée sur les lignes de sortie.
    expect(await db.photos.where('ligneId').anyOf(lignes.map((l) => l.id)).count()).toBe(0)
  })
})

describe('actions — cascades de suppression', () => {
  beforeEach(reinitialiser)

  it('supprimerConstat efface pièces, lignes et TOUTES les photos (ligne, pièce, compteur)', async () => {
    const ref = await seedReference()
    expect(await db.photos.count()).toBe(6) // 3 de ligne, 2 de pièce, 1 de compteur

    await supprimerConstat(ref.constatId)

    expect(await db.photos.count()).toBe(0)
    expect(await db.pieces.count()).toBe(0)
    expect(await db.lignes.count()).toBe(0)
    expect(await db.constats.count()).toBe(0)
  })

  it('supprimerPiece efface ses lignes et ses photos (ligne + pièce), pas celles des autres', async () => {
    const ref = await seedReference()
    await supprimerPiece(ref.cuisineId)

    expect(await db.pieces.get(ref.cuisineId)).toBeUndefined()
    expect(await db.lignes.where('pieceId').equals(ref.cuisineId).count()).toBe(0)
    // Restent : la photo de compteur (constat) et la vue du placard (autre pièce).
    expect(await db.photos.count()).toBe(2)
  })
})
