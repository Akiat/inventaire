import Dexie, { type Table } from 'dexie'
import type { Logement, Constat, Piece, Ligne, Photo } from './types'

export class InventaireDB extends Dexie {
  logements!: Table<Logement, string>
  constats!: Table<Constat, string>
  pieces!: Table<Piece, string>
  lignes!: Table<Ligne, string>
  photos!: Table<Photo, string>

  constructor() {
    super('inventaire')
    this.version(1).stores({
      // Seules les colonnes indexées sont listées ; le reste vit dans l'objet.
      logements: 'id',
      constats: 'id, logementId, createdAt',
      pieces: 'id, constatId, ordre',
      lignes: 'id, pieceId, ordre',
      photos: 'id, ligneId, pieceId, constatId, createdAt',
    })
  }
}

export const db = new InventaireDB()

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}
