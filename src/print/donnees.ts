// Chargement et mise en forme d'un constat pour l'impression, orienté document.
// Un même constat produit deux documents : 'edl' (état des lieux) et
// 'inventaire' (mobilier). La numérotation des photos est GLOBALE et STABLE :
// une photo garde son numéro dans les deux documents ; chaque document
// n'annexe que les photos de ses propres lignes.
import { db } from '../data/db'
import type { Cle, Constat, Etat, Ligne, Logement, Photo, Piece } from '../data/types'
import { evaluerMentions, evaluerMobilier, type LignePiece } from '../data/conformite'
import { destinationDe, inclutEdl, inclutInventaire } from '../data/destination'
import { totalValeur } from '../lib/valeur'

export type DocType = 'edl' | 'inventaire'

export interface PhotoNumerotee {
  photo: Photo
  ref: string // P-001
  legende: string
}

export interface LigneImpression {
  ligne: Ligne
  refsPhotos: string[]
  photos: Photo[] // pour le mode « vignettes dans les tableaux »
  // Constat de sortie : comparaison avec l'entrée.
  etatEntree?: Etat
  modifie: boolean
  photosEntree: Photo[]
}

export interface PieceImpression {
  piece: Piece
  lignes: LigneImpression[]
  photosPiece: Photo[] // vue d'ensemble de la pièce (mode vignettes)
  refsPhotosPiece: string[] // références de ces photos (mode annexe)
}

export interface MobilierImpression {
  libelle: string
  satisfait: boolean
  refs: string[]
}

export interface DonneesImpression {
  doc: DocType
  estSortie: boolean
  constat: Constat
  logement: Logement | undefined
  pieces: PieceImpression[]
  compteurs: { type: string; numero: string; index: string; ref?: string }[]
  cles: Cle[]
  annexe: PhotoNumerotee[]
  nbPhotos: number
  mobilier: MobilierImpression[] // inventaire uniquement
  avertissements: string[]
  valeurs: { nom: string; total: number }[] // inventaire uniquement
  valeurGlobale: number
}

function formaterDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function ref(n: number): string {
  return `P-${String(n).padStart(3, '0')}`
}

// Entrée d'annexe globale, avec de quoi filtrer par document.
interface AnnexeGlobale extends PhotoNumerotee {
  ligneId?: string // photo de ligne
  pieceId?: string // photo d'ensemble de pièce
  estCompteur: boolean
}

function retientPourDoc(doc: DocType, l: Ligne): boolean {
  const d = destinationDe(l)
  return doc === 'edl' ? inclutEdl(d) : inclutInventaire(d)
}

// Les photos d'ensemble d'une pièce suivent leur propre destination (défaut 'edl').
function retientPhotosPiece(doc: DocType, piece: Piece): boolean {
  const d = piece.photosDestination ?? 'edl'
  return doc === 'edl' ? inclutEdl(d) : inclutInventaire(d)
}

export async function chargerImpression(constatId: string, doc: DocType): Promise<DonneesImpression | null> {
  const constat = await db.constats.get(constatId)
  if (!constat) return null
  const logement = await db.logements.get(constat.logementId)
  const pieces = await db.pieces.where('constatId').equals(constatId).sortBy('ordre')
  // Date affichée dans les légendes de l'annexe : celle du constat (les photos
  // sont prises pendant l'état des lieux), pas l'horodatage de capture.
  const dateConstat = formaterDate(constat.date)

  // 1) Numérotation GLOBALE de toutes les photos (indépendante du document).
  let compteur = 0
  const annexeGlobale: AnnexeGlobale[] = []
  const refsParLigne = new Map<string, string[]>()
  const photosParLigne = new Map<string, Photo[]>()
  const refsParPiece = new Map<string, string[]>()
  const photosParPiece = new Map<string, Photo[]>()
  const lignesParPiece = new Map<string, Ligne[]>()

  for (const piece of pieces) {
    const lignes = await db.lignes.where('pieceId').equals(piece.id).sortBy('ordre')
    lignesParPiece.set(piece.id, lignes)
    for (const ligne of lignes) {
      const photos = (await db.photos.where('ligneId').equals(ligne.id).toArray()).sort(
        (a, b) => a.createdAt - b.createdAt
      )
      const refs: string[] = []
      for (const photo of photos) {
        compteur += 1
        const r = ref(compteur)
        refs.push(r)
        annexeGlobale.push({
          photo,
          ref: r,
          legende: `${piece.nom} — ${ligne.designation} — ${dateConstat}`,
          ligneId: ligne.id,
          estCompteur: false,
        })
      }
      refsParLigne.set(ligne.id, refs)
      photosParLigne.set(ligne.id, photos)
    }
    // Photos d'ensemble de la pièce, numérotées à la suite de ses lignes.
    const photosPiece = (await db.photos.where('pieceId').equals(piece.id).toArray()).sort(
      (a, b) => a.createdAt - b.createdAt
    )
    const refsP: string[] = []
    for (const photo of photosPiece) {
      compteur += 1
      const r = ref(compteur)
      refsP.push(r)
      annexeGlobale.push({
        photo,
        ref: r,
        legende: `${piece.nom} — vue d'ensemble — ${dateConstat}`,
        pieceId: piece.id,
        estCompteur: false,
      })
    }
    refsParPiece.set(piece.id, refsP)
    photosParPiece.set(piece.id, photosPiece)
  }

  // Photos de compteur, numérotées à la suite (annexe EDL uniquement).
  const photosConstat = await db.photos.where('constatId').equals(constatId).toArray()
  const photosCompteur = new Map(photosConstat.map((p) => [p.id, p]))
  const compteurs = constat.compteurs.map((c) => {
    let r: string | undefined
    if (c.photoId && photosCompteur.has(c.photoId)) {
      compteur += 1
      r = ref(compteur)
      const photo = photosCompteur.get(c.photoId)!
      annexeGlobale.push({
        photo,
        ref: r,
        legende: `Compteur ${c.type || '—'} — index ${c.index || '—'} — ${dateConstat}`,
        estCompteur: true,
      })
    }
    return { type: c.type, numero: c.numero, index: c.index, ref: r }
  })

  // 2) Filtrage par document.
  const estSortie = constat.type === 'sortie'
  const piecesImpr: PieceImpression[] = []
  const lignesPieceDoc: LignePiece[] = [] // pour la conformité et les valeurs
  for (const piece of pieces) {
    const lignes = (lignesParPiece.get(piece.id) ?? []).filter((l) => retientPourDoc(doc, l))
    const photosPieceDoc = retientPhotosPiece(doc, piece) ? (photosParPiece.get(piece.id) ?? []) : []
    const refsPhotosPiece = photosPieceDoc.length ? (refsParPiece.get(piece.id) ?? []) : []
    // Pièce sans ligne ni photo d'ensemble pour ce document : omise.
    if (lignes.length === 0 && photosPieceDoc.length === 0) continue
    const lignesImpr: LigneImpression[] = []
    for (const ligne of lignes) {
      // Sortie : photos d'entrée (via la ligne d'origine) pour l'affichage « en regard ».
      const photosEntree =
        estSortie && ligne.ligneEntreeId
          ? (await db.photos.where('ligneId').equals(ligne.ligneEntreeId).toArray()).sort(
              (a, b) => a.createdAt - b.createdAt
            )
          : []
      lignesImpr.push({
        ligne,
        refsPhotos: refsParLigne.get(ligne.id) ?? [],
        photos: photosParLigne.get(ligne.id) ?? [],
        etatEntree: ligne.etatEntree,
        modifie: estSortie && ligne.etatEntree != null && ligne.etat !== ligne.etatEntree,
        photosEntree,
      })
    }
    piecesImpr.push({ piece, lignes: lignesImpr, photosPiece: photosPieceDoc, refsPhotosPiece })
    for (const ligne of lignes) lignesPieceDoc.push({ ligne, piece })
  }

  const idsLignesDoc = new Set(lignesPieceDoc.map((lp) => lp.ligne.id))
  const idsPiecesPhotosDoc = new Set(piecesImpr.filter((p) => p.photosPiece.length > 0).map((p) => p.piece.id))
  const annexe: PhotoNumerotee[] = annexeGlobale
    .filter((a) => {
      if (a.estCompteur) return doc === 'edl'
      if (a.pieceId) return idsPiecesPhotosDoc.has(a.pieceId)
      return a.ligneId != null && idsLignesDoc.has(a.ligneId)
    })
    .map(({ photo, ref: r, legende }) => ({ photo, ref: r, legende }))

  // 3) Conformité mobilier (inventaire uniquement) : ne compte QUE les lignes
  // dont la destination inclut l'inventaire — donc les lignes du document.
  let mobilier: MobilierImpression[] = []
  if (doc === 'inventaire') {
    const resMobilier = evaluerMobilier(lignesPieceDoc, constat.conformite)
    mobilier = resMobilier.map((m) => ({
      libelle: m.item.libelle,
      satisfait: m.satisfait,
      refs: m.lignes.map(({ piece, ligne }) => `${piece.nom} — ${ligne.designation}`),
    }))
  }

  // 4) Bandeau d'avertissement, propre au document.
  const nbLignesParPiece = new Map<string, number>()
  for (const { piece } of lignesPieceDoc)
    nbLignesParPiece.set(piece.id, (nbLignesParPiece.get(piece.id) ?? 0) + 1)
  const piecesDuDoc = piecesImpr.map((p) => p.piece)
  const resMentions = evaluerMentions(constat, logement, piecesDuDoc, nbLignesParPiece)
  // Compteurs et clés ne concernent que l'EDL.
  const mentionsDoc =
    doc === 'edl' ? resMentions : resMentions.filter((m) => m.id !== 'compteurs' && m.id !== 'cles')
  const avertissements = [
    ...mobilier.filter((m) => !m.satisfait).map((m) => m.libelle),
    ...mentionsDoc.filter((m) => !m.satisfait).map((m) => m.libelle),
  ]

  // 5) Valeurs indicatives (inventaire uniquement).
  let valeurs: { nom: string; total: number }[] = []
  if (doc === 'inventaire') {
    valeurs = piecesImpr
      .map(({ piece, lignes }) => ({ nom: piece.nom, total: totalValeur(lignes.map((l) => l.ligne)) }))
      .filter((v) => v.total > 0)
  }
  const valeurGlobale = valeurs.reduce((s, v) => s + v.total, 0)

  return {
    doc,
    estSortie,
    constat,
    logement,
    pieces: piecesImpr,
    compteurs,
    cles: constat.cles,
    annexe,
    nbPhotos: annexe.length,
    mobilier,
    avertissements,
    valeurs,
    valeurGlobale,
  }
}

// Compte les lignes incluses dans chaque document (écran Documents).
export async function compterLignesParDoc(constatId: string): Promise<{ edl: number; inventaire: number }> {
  const pieces = await db.pieces.where('constatId').equals(constatId).toArray()
  const ids = pieces.map((p) => p.id)
  const lignes = ids.length ? await db.lignes.where('pieceId').anyOf(ids).toArray() : []
  let edl = 0
  let inventaire = 0
  for (const l of lignes) {
    const d = destinationDe(l)
    if (inclutEdl(d)) edl += 1
    if (inclutInventaire(d)) inventaire += 1
  }
  return { edl, inventaire }
}

export { formaterDate }
