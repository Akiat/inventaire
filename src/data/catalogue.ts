import type { Categorie, TypePiece } from './types'

// Catalogue de départ, en dur. Chaque entrée = une désignation, sa catégorie,
// et les types de pièce où elle est proposée ('toutes' = partout).
// L'ordre du tableau vaut ordre de fréquence : les plus courantes d'abord.

export interface EntreeCatalogue {
  designation: string
  categorie: Categorie
  types: TypePiece[] | 'toutes'
}

// Communes à toutes les pièces : bâti et second œuvre.
const COMMUNES: EntreeCatalogue[] = [
  { designation: 'Sol', categorie: 'sol', types: 'toutes' },
  { designation: 'Murs', categorie: 'mur', types: 'toutes' },
  { designation: 'Plafond', categorie: 'plafond', types: 'toutes' },
  { designation: 'Plinthes', categorie: 'menuiserie', types: 'toutes' },
  { designation: 'Porte', categorie: 'menuiserie', types: 'toutes' },
  { designation: 'Fenêtre', categorie: 'menuiserie', types: 'toutes' },
  { designation: 'Volet / store', categorie: 'menuiserie', types: 'toutes' },
  { designation: 'Radiateur', categorie: 'equipement', types: 'toutes' },
  { designation: 'Interrupteurs', categorie: 'equipement', types: 'toutes' },
  { designation: 'Prises', categorie: 'equipement', types: 'toutes' },
  { designation: 'Luminaire', categorie: 'equipement', types: 'toutes' },
  { designation: 'Détecteur de fumée', categorie: 'equipement', types: 'toutes' },
]

const SPECIFIQUES: EntreeCatalogue[] = [
  // Cuisine
  { designation: 'Plaque de cuisson', categorie: 'equipement', types: ['cuisine'] },
  { designation: 'Four', categorie: 'equipement', types: ['cuisine'] },
  { designation: 'Micro-ondes', categorie: 'equipement', types: ['cuisine'] },
  { designation: 'Hotte', categorie: 'equipement', types: ['cuisine'] },
  { designation: 'Réfrigérateur', categorie: 'equipement', types: ['cuisine'] },
  { designation: 'Congélateur', categorie: 'equipement', types: ['cuisine'] },
  { designation: 'Lave-vaisselle', categorie: 'equipement', types: ['cuisine'] },
  { designation: 'Évier', categorie: 'equipement', types: ['cuisine'] },
  { designation: 'Robinetterie', categorie: 'equipement', types: ['cuisine', 'sdb', 'wc'] },
  { designation: 'Plan de travail', categorie: 'mobilier', types: ['cuisine'] },
  { designation: 'Meubles hauts', categorie: 'mobilier', types: ['cuisine'] },
  { designation: 'Meubles bas', categorie: 'mobilier', types: ['cuisine'] },
  { designation: 'Poubelle', categorie: 'equipement', types: ['cuisine'] },
  { designation: 'Assiettes plates', categorie: 'vaisselle', types: ['cuisine'] },
  { designation: 'Assiettes creuses', categorie: 'vaisselle', types: ['cuisine'] },
  { designation: 'Bols', categorie: 'vaisselle', types: ['cuisine'] },
  { designation: 'Verres', categorie: 'vaisselle', types: ['cuisine'] },
  { designation: 'Tasses', categorie: 'vaisselle', types: ['cuisine'] },
  { designation: 'Couverts', categorie: 'vaisselle', types: ['cuisine'] },
  { designation: 'Casseroles', categorie: 'vaisselle', types: ['cuisine'] },
  { designation: 'Poêles', categorie: 'vaisselle', types: ['cuisine'] },
  { designation: 'Faitout', categorie: 'vaisselle', types: ['cuisine'] },
  { designation: 'Saladier', categorie: 'vaisselle', types: ['cuisine'] },
  { designation: 'Planche à découper', categorie: 'vaisselle', types: ['cuisine'] },
  { designation: 'Couteaux', categorie: 'vaisselle', types: ['cuisine'] },
  { designation: 'Passoire', categorie: 'vaisselle', types: ['cuisine'] },
  { designation: 'Essoreuse', categorie: 'vaisselle', types: ['cuisine'] },
  { designation: 'Plat à four', categorie: 'vaisselle', types: ['cuisine'] },
  { designation: 'Égouttoir', categorie: 'vaisselle', types: ['cuisine'] },
  { designation: 'Torchons', categorie: 'vaisselle', types: ['cuisine'] },

  // Chambre
  { designation: 'Sommier', categorie: 'mobilier', types: ['chambre'] },
  { designation: 'Matelas', categorie: 'mobilier', types: ['chambre'] },
  { designation: 'Couette', categorie: 'mobilier', types: ['chambre'] },
  { designation: 'Oreillers', categorie: 'mobilier', types: ['chambre'] },
  { designation: 'Protège-matelas', categorie: 'mobilier', types: ['chambre'] },
  { designation: 'Armoire', categorie: 'mobilier', types: ['chambre'] },
  { designation: 'Penderie', categorie: 'mobilier', types: ['chambre'] },
  { designation: 'Cintres', categorie: 'mobilier', types: ['chambre'] },
  { designation: 'Chevet', categorie: 'mobilier', types: ['chambre'] },
  { designation: 'Occultation', categorie: 'menuiserie', types: ['chambre'] },

  // Séjour
  { designation: 'Canapé', categorie: 'mobilier', types: ['sejour'] },
  { designation: 'Table', categorie: 'mobilier', types: ['sejour', 'cuisine'] },
  { designation: 'Chaises', categorie: 'mobilier', types: ['sejour', 'cuisine'] },
  { designation: 'TV', categorie: 'equipement', types: ['sejour'] },
  { designation: 'Meuble TV', categorie: 'mobilier', types: ['sejour'] },
  { designation: 'Étagères', categorie: 'mobilier', types: ['sejour', 'chambre'] },
  { designation: 'Rideaux', categorie: 'menuiserie', types: ['sejour', 'chambre'] },

  // Salle de bains
  { designation: 'Vasque', categorie: 'equipement', types: ['sdb'] },
  { designation: 'Douche / baignoire', categorie: 'equipement', types: ['sdb'] },
  { designation: 'Paroi', categorie: 'equipement', types: ['sdb'] },
  { designation: 'Miroir', categorie: 'equipement', types: ['sdb'] },
  { designation: 'Meuble', categorie: 'mobilier', types: ['sdb'] },
  { designation: 'Sèche-serviettes', categorie: 'equipement', types: ['sdb'] },
  { designation: 'VMC', categorie: 'equipement', types: ['sdb', 'wc'] },
  { designation: 'Porte-serviettes', categorie: 'equipement', types: ['sdb'] },

  // WC
  { designation: 'Cuvette', categorie: 'equipement', types: ['wc'] },
  { designation: 'Abattant', categorie: 'equipement', types: ['wc'] },
  { designation: 'Chasse', categorie: 'equipement', types: ['wc'] },
  { designation: 'Lave-mains', categorie: 'equipement', types: ['wc'] },
  { designation: 'Balai WC', categorie: 'entretien', types: ['wc'] },

  // Entretien (rattaché à buanderie et cuisine, faute de pièce dédiée)
  { designation: 'Aspirateur', categorie: 'entretien', types: ['buanderie', 'cuisine'] },
  { designation: 'Balai', categorie: 'entretien', types: ['buanderie', 'cuisine'] },
  { designation: 'Pelle', categorie: 'entretien', types: ['buanderie', 'cuisine'] },
  { designation: 'Serpillière', categorie: 'entretien', types: ['buanderie', 'cuisine'] },
  { designation: 'Seau', categorie: 'entretien', types: ['buanderie', 'cuisine'] },
  { designation: 'Raclette', categorie: 'entretien', types: ['buanderie', 'cuisine'] },

  // Buanderie
  { designation: 'Lave-linge', categorie: 'equipement', types: ['buanderie', 'sdb'] },
  { designation: 'Sèche-linge', categorie: 'equipement', types: ['buanderie'] },
  { designation: 'Étendoir', categorie: 'equipement', types: ['buanderie'] },
  { designation: 'Fer', categorie: 'equipement', types: ['buanderie'] },
  { designation: 'Table à repasser', categorie: 'equipement', types: ['buanderie'] },
]

export const CATALOGUE: EntreeCatalogue[] = [...COMMUNES, ...SPECIFIQUES]

// Métadonnées des types de pièce : libellé, icône (emoji système, aucune
// webfont), et nom pré-rempli à la création.
export interface MetaTypePiece {
  type: TypePiece
  libelle: string
  icone: string
  nomDefaut: string
}

export const TYPES_PIECE: MetaTypePiece[] = [
  { type: 'sejour', libelle: 'Séjour', icone: '🛋️', nomDefaut: 'Séjour' },
  { type: 'cuisine', libelle: 'Cuisine', icone: '🍳', nomDefaut: 'Cuisine' },
  { type: 'chambre', libelle: 'Chambre', icone: '🛏️', nomDefaut: 'Chambre' },
  { type: 'sdb', libelle: 'Salle de bains', icone: '🚿', nomDefaut: 'Salle de bains' },
  { type: 'wc', libelle: 'WC', icone: '🚽', nomDefaut: 'WC' },
  { type: 'entree', libelle: 'Entrée', icone: '🚪', nomDefaut: 'Entrée' },
  { type: 'couloir', libelle: 'Couloir', icone: '↔️', nomDefaut: 'Couloir' },
  { type: 'buanderie', libelle: 'Buanderie', icone: '🧺', nomDefaut: 'Buanderie' },
  { type: 'cave', libelle: 'Cave', icone: '📦', nomDefaut: 'Cave' },
  { type: 'balcon', libelle: 'Balcon', icone: '🌿', nomDefaut: 'Balcon' },
  { type: 'parking', libelle: 'Parking', icone: '🅿️', nomDefaut: 'Parking' },
  { type: 'autre', libelle: 'Autre', icone: '➕', nomDefaut: 'Pièce' },
]

export function metaType(type: TypePiece): MetaTypePiece {
  return TYPES_PIECE.find((t) => t.type === type) ?? TYPES_PIECE[TYPES_PIECE.length - 1]
}

// Suggestions pour un type de pièce donné : les spécifiques d'abord (plus
// pertinentes), puis les communes. Filtrées ensuite par la recherche.
export function suggestionsPour(type: TypePiece): EntreeCatalogue[] {
  const specifiques = SPECIFIQUES.filter((e) => e.types !== 'toutes' && (e.types as TypePiece[]).includes(type))
  return [...specifiques, ...COMMUNES]
}
