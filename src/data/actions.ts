// Actions métier : création, duplication, suppression en cascade.
// Toute écriture passe par ici pour rester cohérente (ordres, cascades, photos).
import type { Table, UpdateSpec } from 'dexie'
import { db, uid } from './db'
import type {
  Categorie,
  Constat,
  Destination,
  Etat,
  Ligne,
  ModelePiece,
  Photo,
  Piece,
  TypeConstat,
  TypePiece,
} from './types'
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

// Crée un constat de sortie par clonage d'un constat d'entrée : logement,
// pièces et lignes recopiés ; l'état d'entrée de chaque ligne est figé dans
// `etatEntree`, l'état de sortie démarre identique et reste à vérifier.
export async function creerConstatSortie(constatEntreeId: string): Promise<string | null> {
  const entree = await db.constats.get(constatEntreeId)
  if (!entree) return null
  const logementEntree = await db.logements.get(entree.logementId)
  const sortieId = uid()
  const logementId = uid()
  await db.transaction('rw', db.logements, db.constats, db.pieces, db.lignes, async () => {
    await db.logements.add(
      logementEntree
        ? { ...logementEntree, id: logementId }
        : { id: logementId, adresse: '', complement: '', surface: '', lots: '', bailleurNom: '', bailleurAdresse: '' }
    )
    await db.constats.add({
      id: sortieId,
      logementId,
      type: 'sortie',
      date: new Date().toISOString().slice(0, 10),
      locataires: [...entree.locataires],
      mandataire: entree.mandataire,
      // Compteurs : on garde type et numéro, l'index est un nouveau relevé.
      compteurs: entree.compteurs.map((c) => ({ type: c.type, numero: c.numero, index: '' })),
      cles: entree.cles.map((c) => ({ ...c })),
      createdAt: Date.now(),
      constatEntreeId,
      dateConstatEntree: entree.date,
      nouvelleAdresse: '',
    })
    const pieces = await db.pieces.where('constatId').equals(constatEntreeId).sortBy('ordre')
    for (const p of pieces) {
      const newPieceId = uid()
      await db.pieces.add({ id: newPieceId, constatId: sortieId, nom: p.nom, type: p.type, ordre: p.ordre })
      const lignes = await db.lignes.where('pieceId').equals(p.id).sortBy('ordre')
      for (const l of lignes) {
        await db.lignes.add({
          id: uid(),
          pieceId: newPieceId,
          categorie: l.categorie,
          designation: l.designation,
          quantite: l.quantite,
          etat: l.etat, // démarre à l'état d'entrée
          etatEntree: l.etat, // figé pour la comparaison
          destination: l.destination ?? 'les_deux',
          marqueModele: l.marqueModele,
          numeroSerie: l.numeroSerie,
          valeur: l.valeur,
          observations: l.observations,
          ordre: l.ordre,
          ligneEntreeId: l.id,
          verifiee: false,
        })
      }
    }
  })
  return sortieId
}

// Valide une ligne de sortie « Idem » : conforme à l'entrée, sans modification.
export async function validerIdem(ligneId: string): Promise<void> {
  await db.lignes.update(ligneId, { verifiee: true })
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
  categorie: Categorie,
  destination: Destination
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
      destination,
      ordre: suivant(existantes),
    })
  })
  return id
}

// Action groupée : bascule toutes les lignes d'une pièce vers une destination.
export async function basculerDestinationPiece(pieceId: string, destination: Destination): Promise<void> {
  await db.transaction('rw', db.lignes, async () => {
    const lignes = await db.lignes.where('pieceId').equals(pieceId).toArray()
    await Promise.all(lignes.map((l) => db.lignes.update(l.id, { destination })))
  })
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

// Duplique une pièce et toutes ses lignes (sans les photos : ce sont des
// preuves propres à un objet donné, les copier induirait en erreur).
export async function dupliquerPiece(pieceId: string): Promise<string | null> {
  const nouvelId = uid()
  let ok = false
  await db.transaction('rw', db.pieces, db.lignes, async () => {
    const src = await db.pieces.get(pieceId)
    if (!src) return
    const soeurs = await db.pieces.where('constatId').equals(src.constatId).toArray()
    await db.pieces.add({
      ...src,
      id: nouvelId,
      nom: `${src.nom} (copie)`,
      ordre: suivant(soeurs),
    })
    const lignes = await db.lignes.where('pieceId').equals(pieceId).sortBy('ordre')
    for (const l of lignes) {
      await db.lignes.add({ ...l, id: uid(), pieceId: nouvelId })
    }
    ok = true
  })
  return ok ? nouvelId : null
}

// Réordonnancement par échange d'`ordre` avec le voisin (boutons haut/bas).
async function deplacer<T extends { id: string; ordre: number }>(
  table: Table<T, string>,
  filtre: () => Promise<T[]>,
  id: string,
  sens: -1 | 1
): Promise<void> {
  await db.transaction('rw', table, async () => {
    const items = (await filtre()).sort((a, b) => a.ordre - b.ordre)
    const i = items.findIndex((x) => x.id === id)
    const j = i + sens
    if (i < 0 || j < 0 || j >= items.length) return
    const a = items[i]
    const b = items[j]
    // `ordre` existe sur tout T contraint ici ; le cast contourne la généricité.
    await table.update(a.id, { ordre: b.ordre } as unknown as UpdateSpec<T>)
    await table.update(b.id, { ordre: a.ordre } as unknown as UpdateSpec<T>)
  })
}

export function deplacerPiece(piece: Piece, sens: -1 | 1): Promise<void> {
  return deplacer(db.pieces, () => db.pieces.where('constatId').equals(piece.constatId).toArray(), piece.id, sens)
}

export function deplacerLigne(ligne: Ligne, sens: -1 | 1): Promise<void> {
  return deplacer(db.lignes, () => db.lignes.where('pieceId').equals(ligne.pieceId).toArray(), ligne.id, sens)
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
    if (pieceIds.length) await db.photos.where('pieceId').anyOf(pieceIds).delete()
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

// Photo d'ensemble d'une pièce (vue générale, non liée à une ligne).
export async function ajouterPhotoPiece(blob: Blob, pieceId: string): Promise<string> {
  const photo: Photo = { id: uid(), pieceId, blob, createdAt: Date.now() }
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
  return { neuf: 'Parfait', bon: 'Bon', usage: 'Usage', mauvais: 'Mauvais', absent: 'Absent' }[etat]
}

// --- Modèles de constat (lot 2) ---

// Enregistre la structure d'un constat (pièces + lignes) comme modèle réutilisable.
// Sans photos, sans état, sans données personnelles : un squelette de saisie.
export async function enregistrerModele(constatId: string, nom: string): Promise<string> {
  const id = uid()
  await db.transaction('rw', db.pieces, db.lignes, db.modeles, async () => {
    const pieces = await db.pieces.where('constatId').equals(constatId).sortBy('ordre')
    const modelePieces: ModelePiece[] = []
    for (const p of pieces) {
      const lignes = await db.lignes.where('pieceId').equals(p.id).sortBy('ordre')
      modelePieces.push({
        nom: p.nom,
        type: p.type,
        ordre: p.ordre,
        lignes: lignes.map((l) => ({
          categorie: l.categorie,
          designation: l.designation,
          quantite: l.quantite,
          destination: l.destination ?? 'les_deux',
          ordre: l.ordre,
        })),
      })
    }
    await db.modeles.add({ id, nom: nom.trim() || 'Modèle', createdAt: Date.now(), pieces: modelePieces })
  })
  return id
}

export async function creerConstatDepuisModele(modeleId: string, type: TypeConstat): Promise<string> {
  const modele = await db.modeles.get(modeleId)
  const constatId = await creerConstat(type)
  if (!modele) return constatId
  await db.transaction('rw', db.pieces, db.lignes, async () => {
    for (const mp of modele.pieces) {
      const pieceId = uid()
      await db.pieces.add({ id: pieceId, constatId, nom: mp.nom, type: mp.type, ordre: mp.ordre })
      for (const ml of mp.lignes) {
        await db.lignes.add({
          id: uid(),
          pieceId,
          categorie: ml.categorie,
          designation: ml.designation,
          quantite: ml.quantite,
          etat: 'bon', // état réinitialisé : le modèle ne présume pas de l'état
          destination: ml.destination ?? 'les_deux',
          ordre: ml.ordre,
        })
      }
    }
  })
  return constatId
}

export async function supprimerModele(id: string): Promise<void> {
  await db.modeles.delete(id)
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
