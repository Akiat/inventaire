// Actions métier : création, duplication, suppression en cascade.
// Toute écriture passe par ici pour rester cohérente (ordres, cascades, photos).
import { db, uid } from './db'
import type { Categorie, Constat, Etat, Ligne, Photo, TypeConstat, TypePiece } from './types'
import { metaType } from './catalogue'

export async function creerConstat(type: TypeConstat): Promise<string> {
  const logementId = uid()
  await db.logements.add({
    id: logementId,
    adresse: '',
    complement: '',
    surface: '',
    lots: '',
    bailleurNom: '',
    bailleurAdresse: '',
  })
  const id = uid()
  const constat: Constat = {
    id,
    logementId,
    type,
    date: new Date().toISOString().slice(0, 10),
    locataires: [''],
    compteurs: [],
    cles: [],
    createdAt: Date.now(),
  }
  await db.constats.add(constat)
  return id
}

function suivant<T extends { ordre: number }>(items: T[]): number {
  return items.reduce((max, it) => Math.max(max, it.ordre), -1) + 1
}

export async function creerPiece(constatId: string, type: TypePiece): Promise<string> {
  const id = uid()
  const meta = metaType(type)
  // Lecture + écriture dans la même transaction : les ajouts rapides en
  // rafale se sérialisent, l'ordre reste cohérent (pas de course).
  await db.transaction('rw', db.pieces, async () => {
    const existantes = await db.pieces.where('constatId').equals(constatId).toArray()
    const meme = existantes.filter((p) => p.type === type)
    const nom = meme.length === 0 ? meta.nomDefaut : `${meta.nomDefaut} ${meme.length + 1}`
    await db.pieces.add({ id, constatId, nom, type, ordre: suivant(existantes) })
  })
  return id
}

export async function creerLigne(
  pieceId: string,
  designation: string,
  categorie: Categorie
): Promise<string> {
  const id = uid()
  await db.transaction('rw', db.lignes, async () => {
    const existantes = await db.lignes.where('pieceId').equals(pieceId).toArray()
    await db.lignes.add({
      id,
      pieceId,
      categorie,
      designation,
      quantite: 1,
      etat: 'bon',
      ordre: suivant(existantes),
    })
  })
  return id
}

export async function dupliquerLigne(ligneId: string): Promise<string | null> {
  const id = uid()
  let ok = false
  await db.transaction('rw', db.lignes, async () => {
    const src = await db.lignes.get(ligneId)
    if (!src) return
    const existantes = await db.lignes.where('pieceId').equals(src.pieceId).toArray()
    await db.lignes.add({ ...src, id, ordre: suivant(existantes) })
    ok = true
  })
  return ok ? id : null
}

export async function supprimerLigne(ligneId: string): Promise<void> {
  await db.transaction('rw', db.lignes, db.photos, async () => {
    await db.photos.where('ligneId').equals(ligneId).delete()
    await db.lignes.delete(ligneId)
  })
}

export async function supprimerPiece(pieceId: string): Promise<void> {
  await db.transaction('rw', db.pieces, db.lignes, db.photos, async () => {
    const lignes = await db.lignes.where('pieceId').equals(pieceId).toArray()
    const ids = lignes.map((l) => l.id)
    if (ids.length) await db.photos.where('ligneId').anyOf(ids).delete()
    await db.photos.where('pieceId').equals(pieceId).delete()
    await db.lignes.where('pieceId').equals(pieceId).delete()
    await db.pieces.delete(pieceId)
  })
}

export async function supprimerConstat(constatId: string): Promise<void> {
  await db.transaction('rw', db.constats, db.logements, db.pieces, db.lignes, db.photos, async () => {
    const constat = await db.constats.get(constatId)
    const pieces = await db.pieces.where('constatId').equals(constatId).toArray()
    const pieceIds = pieces.map((p) => p.id)
    const lignes = pieceIds.length
      ? await db.lignes.where('pieceId').anyOf(pieceIds).toArray()
      : []
    const ligneIds = lignes.map((l) => l.id)

    if (ligneIds.length) await db.photos.where('ligneId').anyOf(ligneIds).delete()
    await db.photos.where('constatId').equals(constatId).delete()
    if (ligneIds.length) await db.lignes.where('id').anyOf(ligneIds).delete()
    if (pieceIds.length) await db.pieces.where('id').anyOf(pieceIds).delete()
    await db.constats.delete(constatId)
    if (constat) await db.logements.delete(constat.logementId)
  })
}

export async function ajouterPhoto(blob: Blob, ligneId: string): Promise<string> {
  const photo: Photo = { id: uid(), ligneId, blob, createdAt: Date.now() }
  await db.photos.add(photo)
  return photo.id
}

export async function ajouterPhotoCompteur(blob: Blob, constatId: string): Promise<string> {
  const photo: Photo = { id: uid(), constatId, blob, createdAt: Date.now() }
  await db.photos.add(photo)
  return photo.id
}

export async function supprimerPhoto(photoId: string): Promise<void> {
  await db.photos.delete(photoId)
}

export async function majLigne(ligneId: string, patch: Partial<Ligne>): Promise<void> {
  await db.lignes.update(ligneId, patch)
}

export function etatLibelle(etat: Etat): string {
  return { neuf: 'Neuf', bon: 'Bon', usage: 'Usage', mauvais: 'Mauvais', absent: 'Absent' }[etat]
}

// --- Conformité (lot 1) : surcharge manuelle du rattachement mobilier ---

async function majSurcharge(
  constatId: string,
  itemId: string,
  transformer: (s: { inclus: string[]; exclus: string[] }) => void
): Promise<void> {
  await db.transaction('rw', db.constats, async () => {
    const constat = await db.constats.get(constatId)
    if (!constat) return
    const conformite = { ...(constat.conformite ?? {}) }
    const courant = conformite[itemId] ?? {}
    const etat = { inclus: [...(courant.inclus ?? [])], exclus: [...(courant.exclus ?? [])] }
    transformer(etat)
    conformite[itemId] = { inclus: etat.inclus, exclus: etat.exclus }
    await db.constats.update(constatId, { conformite })
  })
}

// Rattache une ligne à un item : forcée présente, annule une exclusion.
export async function rattacherLigne(constatId: string, itemId: string, ligneId: string): Promise<void> {
  await majSurcharge(constatId, itemId, (s) => {
    s.exclus = s.exclus.filter((id) => id !== ligneId)
    if (!s.inclus.includes(ligneId)) s.inclus.push(ligneId)
  })
}

// Détache une ligne d'un item. Si elle y était par mot-clé (auto), on l'exclut ;
// si elle avait été ajoutée à la main, on retire l'inclusion.
export async function detacherLigne(
  constatId: string,
  itemId: string,
  ligneId: string,
  auto: boolean
): Promise<void> {
  await majSurcharge(constatId, itemId, (s) => {
    s.inclus = s.inclus.filter((id) => id !== ligneId)
    if (auto && !s.exclus.includes(ligneId)) s.exclus.push(ligneId)
  })
}
