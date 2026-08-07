// Sauvegarde complète. Depuis le lot 5 : export en ZIP (un manifeste JSON + les
// photos en fichiers), bien plus léger que le JSON base64. L'import accepte le
// ZIP et, pour compatibilité, l'ancien JSON base64.
import { db } from '../data/db'
import type { Logement, Constat, Piece, Ligne, Photo, Modele } from '../data/types'
import { creerZip, lireZip } from './zip'

// --- Manifeste ZIP ---
interface PhotoManifeste {
  id: string
  ligneId?: string
  pieceId?: string
  constatId?: string
  createdAt: number
  type: string
  fichier: string // chemin dans l'archive
}

interface Manifeste {
  format: 'inventaire-backup-zip'
  version: 2
  exporteLe: string
  logements: Logement[]
  constats: Constat[]
  pieces: Piece[]
  lignes: Ligne[]
  modeles: Modele[]
  photos: PhotoManifeste[]
}

// --- Ancien format JSON base64 (import seulement) ---
interface PhotoBase64 {
  id: string
  ligneId?: string
  pieceId?: string
  constatId?: string
  createdAt: number
  type: string
  base64: string
}
interface SauvegardeJson {
  format: 'inventaire-backup'
  logements: Logement[]
  constats: Constat[]
  pieces: Piece[]
  lignes: Ligne[]
  photos: PhotoBase64[]
  modeles?: Modele[]
}

function extension(type: string): string {
  if (type.includes('png')) return 'png'
  if (type.includes('webp')) return 'webp'
  return 'jpg'
}

function base64EnBlob(base64: string, type: string): Blob {
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: type || 'image/jpeg' })
}

function telecharger(blob: Blob, nom: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nom
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function exporterSauvegarde(): Promise<void> {
  const [logements, constats, pieces, lignes, photos, modeles] = await Promise.all([
    db.logements.toArray(),
    db.constats.toArray(),
    db.pieces.toArray(),
    db.lignes.toArray(),
    db.photos.toArray(),
    db.modeles.toArray(),
  ])

  const fichiersPhotos = photos.map((p) => ({
    manifeste: {
      id: p.id,
      ligneId: p.ligneId,
      pieceId: p.pieceId,
      constatId: p.constatId,
      createdAt: p.createdAt,
      type: p.blob.type || 'image/jpeg',
      fichier: `photos/${p.id}.${extension(p.blob.type || 'image/jpeg')}`,
    } as PhotoManifeste,
    blob: p.blob,
  }))

  const manifeste: Manifeste = {
    format: 'inventaire-backup-zip',
    version: 2,
    exporteLe: new Date().toISOString(),
    logements,
    constats,
    pieces,
    lignes,
    modeles,
    photos: fichiersPhotos.map((f) => f.manifeste),
  }

  const enc = new TextEncoder()
  const fichiers = [
    { nom: 'inventaire.json', data: enc.encode(JSON.stringify(manifeste, null, 0)) },
    ...(await Promise.all(
      fichiersPhotos.map(async (f) => ({
        nom: f.manifeste.fichier,
        data: new Uint8Array(await f.blob.arrayBuffer()),
      }))
    )),
  ]

  const jour = new Date().toISOString().slice(0, 10)
  telecharger(creerZip(fichiers), `inventaire-sauvegarde-${jour}.zip`)
}

async function remplacerTout(
  data: {
    logements?: Logement[]
    constats?: Constat[]
    pieces?: Piece[]
    lignes?: Ligne[]
    modeles?: Modele[]
  },
  photos: Photo[]
): Promise<void> {
  await db.transaction('rw', [db.logements, db.constats, db.pieces, db.lignes, db.photos, db.modeles], async () => {
    await Promise.all([
      db.logements.clear(),
      db.constats.clear(),
      db.pieces.clear(),
      db.lignes.clear(),
      db.photos.clear(),
      db.modeles.clear(),
    ])
    await db.logements.bulkAdd(data.logements ?? [])
    await db.constats.bulkAdd(data.constats ?? [])
    await db.pieces.bulkAdd(data.pieces ?? [])
    await db.lignes.bulkAdd(data.lignes ?? [])
    await db.photos.bulkAdd(photos)
    await db.modeles.bulkAdd(data.modeles ?? [])
  })
}

export async function importerSauvegarde(fichier: File): Promise<void> {
  const estZip = fichier.name.toLowerCase().endsWith('.zip') || fichier.type === 'application/zip'
  if (estZip) {
    const entrees = await lireZip(fichier)
    const json = entrees.get('inventaire.json')
    if (!json) throw new Error("Archive invalide : inventaire.json manquant.")
    const manifeste = JSON.parse(new TextDecoder().decode(json)) as Manifeste
    if (manifeste.format !== 'inventaire-backup-zip') {
      throw new Error("Ce fichier n'est pas une sauvegarde Inventaire.")
    }
    const photos: Photo[] = (manifeste.photos ?? []).map((p) => {
      const bytes = entrees.get(p.fichier)
      if (!bytes) throw new Error(`Photo manquante dans l'archive : ${p.fichier}`)
      return {
        id: p.id,
        ligneId: p.ligneId,
        pieceId: p.pieceId,
        constatId: p.constatId,
        createdAt: p.createdAt,
        blob: new Blob([bytes as BlobPart], { type: p.type || 'image/jpeg' }),
      }
    })
    await remplacerTout(manifeste, photos)
    return
  }

  // Ancien format JSON base64.
  const data = JSON.parse(await fichier.text()) as SauvegardeJson
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
  await remplacerTout(data, photos)
}
