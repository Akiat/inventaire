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

// Décide dans quel(s) document(s) une ligne apparaît (une seule saisie, deux
// documents). 'aucun' = note personnelle, dans aucun document.
export type Destination = 'edl' | 'inventaire' | 'les_deux' | 'aucun'

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

// Surcharge manuelle du rattachement d'un item de mobilier obligatoire :
// lignes ajoutées ou retirées à la main par rapport au rattachement auto.
export interface SurchargeMobilier {
  inclus?: string[] // ids de lignes rattachées manuellement
  exclus?: string[] // ids de lignes auto-rattachées mais écartées
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
  // Texte libre ajouté au(x) document(s) (observations générales), avec sa
  // destination (défaut 'les_deux'). Absents sur les anciens constats.
  remarques?: string
  remarquesDestination?: Destination
  // Ajouté au lot 1. Absent sur les constats créés au lot 0 (traité comme {}).
  conformite?: Record<string, SurchargeMobilier>
  // Lot 4 — constat de sortie :
  constatEntreeId?: string // constat d'entrée cloné
  dateConstatEntree?: string // date du constat d'entrée (mention obligatoire)
  nouvelleAdresse?: string // nouvelle adresse du locataire (mention obligatoire)
}

export interface Piece {
  id: string
  constatId: string
  nom: string
  type: TypePiece
  ordre: number
  // Destination des photos d'ensemble de la pièce (vue générale, non liée à une
  // ligne). Absente sur les pièces créées avant cette évolution → 'edl'.
  photosDestination?: Destination
}

export interface Ligne {
  id: string
  pieceId: string
  categorie: Categorie
  designation: string
  quantite: number
  etat: Etat
  destination: Destination // dans quel(s) document(s) la ligne figure
  marqueModele?: string
  numeroSerie?: string
  valeur?: number
  observations?: string
  ordre: number
  // Lot 4 — constat de sortie (présents sur les lignes d'un constat de sortie) :
  etatEntree?: Etat // état relevé à l'entrée (figé au clonage)
  ligneEntreeId?: string // ligne d'entrée d'origine (pour ses photos)
  verifiee?: boolean // la ligne a été validée « Idem » ou modifiée
}

export interface Photo {
  id: string
  ligneId?: string
  pieceId?: string
  constatId?: string
  blob: Blob
  createdAt: number
}

// --- Modèles de constat réutilisables (lot 2) ---
// Squelette sans photos ni données personnelles : pièces et lignes seulement.
export interface ModeleLigne {
  categorie: Categorie
  designation: string
  quantite: number
  destination: Destination
  ordre: number
}

export interface ModelePiece {
  nom: string
  type: TypePiece
  ordre: number
  lignes: ModeleLigne[]
}

export interface Modele {
  id: string
  nom: string
  createdAt: number
  pieces: ModelePiece[]
}
