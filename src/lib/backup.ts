// Sauvegarde complète en un fichier JSON unique, photos incluses en base64.
// Laid et volumineux, assumé : c'est l'assurance contre une purge du stockage.
// L'import remplace tout le contenu après confirmation (côté appelant).
import { db } from '../data/db'
import type { Logement, Constat, Piece, Ligne, Photo } from '../data/types'

interface PhotoSerialisee {
  id: string
  ligneId?: string
  pieceId?: string
  constatId?: string
  createdAt: number
  type: string
  base64: string
}

interface Sauvegarde {
  format: 'inventaire-backup'
  version: 1
  exporteLe: string
  logements: Logement[]
  constats: Constat[]
  pieces: Piece[]
  lignes: Ligne[]
  photos: PhotoSerialisee[]
}

function blobEnBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const res = reader.result as string
      // retire le préfixe data:...;base64,
      resolve(res.slice(res.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function base64EnBlob(base64: string, type: string): Blob {
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: type || 'image/jpeg' })
}

export async function exporterSauvegarde(): Promise<void> {
  const [logements, constats, pieces, lignes, photos] = await Promise.all([
    db.logements.toArray(),
    db.constats.toArray(),
    db.pieces.toArray(),
    db.lignes.toArray(),
    db.photos.toArray(),
  ])

  const photosSerialisees: PhotoSerialisee[] = await Promise.all(
    photos.map(async (p) => ({
      id: p.id,
      ligneId: p.ligneId,
      pieceId: p.pieceId,
      constatId: p.constatId,
      createdAt: p.createdAt,
      type: p.blob.type || 'image/jpeg',
      base64: await blobEnBase64(p.blob),
    }))
  )

  const sauvegarde: Sauvegarde = {
    format: 'inventaire-backup',
    version: 1,
    exporteLe: new Date().toISOString(),
    logements,
    constats,
    pieces,
    lignes,
    photos: photosSerialisees,
  }

  const blob = new Blob([JSON.stringify(sauvegarde)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const jour = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `inventaire-sauvegarde-${jour}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function importerSauvegarde(fichier: File): Promise<void> {
  const texte = await fichier.text()
  const data = JSON.parse(texte) as Sauvegarde
  if (data.format !== 'inventaire-backup') {
    throw new Error("Ce fichier n'est pas une sauvegarde Inventaire.")
  }

  const photos: Photo[] = (data.photos ?? []).map((p) => ({
    id: p.id,
    ligneId: p.ligneId,
    pieceId: p.pieceId,
    constatId: p.constatId,
    createdAt: p.createdAt,
    blob: base64EnBlob(p.base64, p.type),
  }))

  await db.transaction('rw', db.logements, db.constats, db.pieces, db.lignes, db.photos, async () => {
    await Promise.all([
      db.logements.clear(),
      db.constats.clear(),
      db.pieces.clear(),
      db.lignes.clear(),
      db.photos.clear(),
    ])
    await db.logements.bulkAdd(data.logements ?? [])
    await db.constats.bulkAdd(data.constats ?? [])
    await db.pieces.bulkAdd(data.pieces ?? [])
    await db.lignes.bulkAdd(data.lignes ?? [])
    await db.photos.bulkAdd(photos)
  })
}
