// Types du domaine. Vocabulaire réglementaire en français (cf. CLAUDE.md).

export type TypeConstat = 'entree' | 'sortie'

export type Categorie =
  | 'sol'
  | 'mur'
  | 'plafond'
  | 'menuiserie'
  | 'equipement'
  | 'mobilier'
  | 'vaisselle'
  | 'entretien'
  | 'autre'

export type Etat = 'neuf' | 'bon' | 'usage' | 'mauvais' | 'absent'

export type TypePiece =
  | 'cuisine'
  | 'chambre'
  | 'sejour'
  | 'sdb'
  | 'wc'
  | 'entree'
  | 'couloir'
  | 'buanderie'
  | 'cave'
  | 'balcon'
  | 'parking'
  | 'autre'

export interface Compteur {
  type: string // eau froide, eau chaude, électricité, gaz…
  numero: string
  index: string
  photoId?: string
}

export interface Cle {
  libelle: string
  nombre: number
}

export interface Logement {
  id: string
  adresse: string
  complement: string // étage, bâtiment, n° d'appartement
  surface: string
  lots: string // cave, balcon, parking…
  bailleurNom: string
  bailleurAdresse: string
}

export interface Constat {
  id: string
  logementId: string
  type: TypeConstat
  date: string // ISO yyyy-mm-dd
  locataires: string[]
  mandataire?: string
  compteurs: Compteur[]
  cles: Cle[]
  createdAt: number
}

export interface Piece {
  id: string
  constatId: string
  nom: string
  type: TypePiece
  ordre: number
}

export interface Ligne {
  id: string
  pieceId: string
  categorie: Categorie
  designation: string
  quantite: number
  etat: Etat
  marqueModele?: string
  numeroSerie?: string
  valeur?: number
  observations?: string
  ordre: number
}

export interface Photo {
  id: string
  ligneId?: string
  pieceId?: string
  constatId?: string
  blob: Blob
  createdAt: number
}
