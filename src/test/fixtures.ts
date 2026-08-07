// Shared helpers for the IndexedDB-backed integration tests: a clean-slate
// reset, a fake image blob, and a reference dataset that exercises the tricky
// paths (mixed destinations, line/piece/meter photos, a photo-only piece).
import { db } from '../data/db'
import {
  ajouterPhoto,
  ajouterPhotoCompteur,
  ajouterPhotoPiece,
  creerConstat,
  creerLigne,
  creerPiece,
  majLigne,
} from '../data/actions'

export async function reinitialiser(): Promise<void> {
  await Promise.all(db.tables.map((t) => t.clear()))
}

export function blobFactice(): Blob {
  return new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' })
}

export interface Reference {
  constatId: string
  logementId: string
  cuisineId: string
  chambreId: string
  placardId: string
  lignes: { l1: string; l2: string; l3: string; l4: string; lChambre: string }
  photos: {
    l1a: string
    l1b: string
    l3: string
    cuisineVue: string
    placardVue: string
    compteur: string
  }
}

// Un constat d'entrée : cuisine (lignes aux quatre destinations + photos de
// ligne et une photo d'ensemble EDL), chambre (ligne EDL seule) et un placard
// sans ligne mais avec une photo d'ensemble « inventaire » (cas limite).
export async function seedReference(): Promise<Reference> {
  const constatId = await creerConstat('entree')
  const constat = await db.constats.get(constatId)
  const logementId = constat!.logementId
  await db.logements.update(logementId, {
    adresse: '1 rue du Test',
    surface: '40',
    bailleurNom: 'Bailleur Test',
    bailleurAdresse: '2 rue du Bailleur',
  })

  const compteur = await ajouterPhotoCompteur(blobFactice(), constatId)
  await db.constats.update(constatId, {
    locataires: ['Locataire A'],
    compteurs: [{ type: 'Électricité', numero: 'C-1', index: '1000', photoId: compteur }],
    cles: [{ libelle: 'Clé logement', nombre: 2 }],
  })

  const cuisineId = await creerPiece(constatId, 'cuisine')
  const l1 = await creerLigne(cuisineId, 'Plaque de cuisson', 'equipement', 'les_deux')
  const l2 = await creerLigne(cuisineId, 'Sol', 'sol', 'edl')
  const l3 = await creerLigne(cuisineId, 'Casseroles', 'vaisselle', 'inventaire')
  const l4 = await creerLigne(cuisineId, 'Note privée', 'autre', 'aucun')
  await majLigne(l1, { etat: 'neuf' })
  await majLigne(l3, { valeur: 50 })
  const l1a = await ajouterPhoto(blobFactice(), l1)
  const l1b = await ajouterPhoto(blobFactice(), l1)
  const l3photo = await ajouterPhoto(blobFactice(), l3)
  const cuisineVue = await ajouterPhotoPiece(blobFactice(), cuisineId) // destination EDL (défaut)

  const chambreId = await creerPiece(constatId, 'chambre')
  const lChambre = await creerLigne(chambreId, 'Sol', 'sol', 'edl')

  const placardId = await creerPiece(constatId, 'autre')
  await db.pieces.update(placardId, { photosDestination: 'inventaire' })
  const placardVue = await ajouterPhotoPiece(blobFactice(), placardId)

  return {
    constatId,
    logementId,
    cuisineId,
    chambreId,
    placardId,
    lignes: { l1, l2, l3, l4, lChambre },
    photos: { l1a, l1b, l3: l3photo, cuisineVue, placardVue, compteur },
  }
}
