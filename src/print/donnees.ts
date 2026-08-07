// Chargement et mise en forme des données d'un constat pour l'impression.
import { db } from '../data/db'
import type { Constat, Ligne, Logement, Photo, Piece } from '../data/types'

export interface PhotoNumerotee {
  photo: Photo
  ref: string // P-001
  legende: string // Pièce — Désignation — date
}

export interface LigneImpression {
  ligne: Ligne
  refsPhotos: string[]
}

export interface PieceImpression {
  piece: Piece
  lignes: LigneImpression[]
}

export interface DonneesImpression {
  constat: Constat
  logement: Logement | undefined
  pieces: PieceImpression[]
  compteurs: { type: string; numero: string; index: string; ref?: string }[]
  annexe: PhotoNumerotee[]
  nbPhotos: number
}

function formaterDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formaterDateMs(ms: number): string {
  return new Date(ms).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export async function chargerImpression(constatId: string): Promise<DonneesImpression | null> {
  const constat = await db.constats.get(constatId)
  if (!constat) return null
  const logement = await db.logements.get(constat.logementId)
  const pieces = await db.pieces.where('constatId').equals(constatId).sortBy('ordre')

  const toutesPhotos = await db.photos.where('constatId').equals(constatId).toArray()
  // Photos de compteur (rattachées au constat).
  const photosCompteur = new Map<string, Photo>()
  for (const p of toutesPhotos) photosCompteur.set(p.id, p)

  let compteur = 0
  const annexe: PhotoNumerotee[] = []
  const refParPhoto = new Map<string, string>()

  const piecesImpr: PieceImpression[] = []
  for (const piece of pieces) {
    const lignes = await db.lignes.where('pieceId').equals(piece.id).sortBy('ordre')
    const lignesImpr: LigneImpression[] = []
    for (const ligne of lignes) {
      const photos = (await db.photos.where('ligneId').equals(ligne.id).toArray()).sort(
        (a, b) => a.createdAt - b.createdAt
      )
      const refs: string[] = []
      for (const photo of photos) {
        compteur += 1
        const ref = `P-${String(compteur).padStart(3, '0')}`
        refParPhoto.set(photo.id, ref)
        refs.push(ref)
        annexe.push({
          photo,
          ref,
          legende: `${piece.nom} — ${ligne.designation} — ${formaterDateMs(photo.createdAt)}`,
        })
      }
      lignesImpr.push({ ligne, refsPhotos: refs })
    }
    piecesImpr.push({ piece, lignes: lignesImpr })
  }

  // Photos de compteur en fin d'annexe.
  const compteurs = constat.compteurs.map((c) => {
    let ref: string | undefined
    if (c.photoId && photosCompteur.has(c.photoId)) {
      compteur += 1
      ref = `P-${String(compteur).padStart(3, '0')}`
      const photo = photosCompteur.get(c.photoId)!
      annexe.push({
        photo,
        ref,
        legende: `Compteur ${c.type || '—'} — index ${c.index || '—'} — ${formaterDateMs(
          photo.createdAt
        )}`,
      })
    }
    return { type: c.type, numero: c.numero, index: c.index, ref }
  })

  return {
    constat,
    logement,
    pieces: piecesImpr,
    compteurs,
    annexe,
    nbPhotos: annexe.length,
  }
}

export { formaterDate }
