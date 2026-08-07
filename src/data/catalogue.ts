import type { Categorie, Destination, TypePiece } from './types'

// Catalogue de départ, en dur. Chaque entrée = une désignation, sa catégorie,
// sa destination par défaut (EDL / inventaire / les deux), et les types de pièce
// où elle est proposée ('toutes' = partout).
// L'ordre du tableau vaut ordre de fréquence : les plus courantes d'abord.
// La destination par défaut découle de la NATURE de l'élément, pas de la
// catégorie — cf. règles de l'évolution « deux documents ».

export interface EntreeCatalogue {
  designation: string
  categorie: Categorie
  destinationParDefaut: Destination
  types: TypePiece[] | 'toutes'
}

// Communes à toutes les pièces : bâti et second œuvre → état des lieux.
// Exception : le luminaire (fixe) relève des deux documents.
const COMMUNES: EntreeCatalogue[] = [
  { designation: 'Sol', categorie: 'sol', destinationParDefaut: 'edl', types: 'toutes' },
  { designation: 'Murs', categorie: 'mur', destinationParDefaut: 'edl', types: 'toutes' },
  { designation: 'Plafond', categorie: 'plafond', destinationParDefaut: 'edl', types: 'toutes' },
  { designation: 'Plinthes', categorie: 'menuiserie', destinationParDefaut: 'edl', types: 'toutes' },
  { designation: 'Porte', categorie: 'menuiserie', destinationParDefaut: 'edl', types: 'toutes' },
  { designation: 'Fenêtre', categorie: 'menuiserie', destinationParDefaut: 'edl', types: 'toutes' },
  { designation: 'Volet / store', categorie: 'menuiserie', destinationParDefaut: 'edl', types: 'toutes' },
  { designation: 'Radiateur', categorie: 'equipement', destinationParDefaut: 'edl', types: 'toutes' },
  { designation: 'Interrupteurs', categorie: 'equipement', destinationParDefaut: 'edl', types: 'toutes' },
  { designation: 'Prises', categorie: 'equipement', destinationParDefaut: 'edl', types: 'toutes' },
  { designation: 'Luminaire', categorie: 'equipement', destinationParDefaut: 'les_deux', types: 'toutes' },
  { designation: 'Détecteur de fumée', categorie: 'equipement', destinationParDefaut: 'edl', types: 'toutes' },
]

const SPECIFIQUES: EntreeCatalogue[] = [
  // Cuisine
  { designation: 'Plaque de cuisson', categorie: 'equipement', destinationParDefaut: 'les_deux', types: ['cuisine'] },
  { designation: 'Four', categorie: 'equipement', destinationParDefaut: 'les_deux', types: ['cuisine'] },
  { designation: 'Micro-ondes', categorie: 'equipement', destinationParDefaut: 'les_deux', types: ['cuisine'] },
  { designation: 'Hotte', categorie: 'equipement', destinationParDefaut: 'les_deux', types: ['cuisine'] },
  { designation: 'Réfrigérateur', categorie: 'equipement', destinationParDefaut: 'les_deux', types: ['cuisine'] },
  { designation: 'Congélateur', categorie: 'equipement', destinationParDefaut: 'les_deux', types: ['cuisine'] },
  { designation: 'Lave-vaisselle', categorie: 'equipement', destinationParDefaut: 'les_deux', types: ['cuisine'] },
  { designation: 'Évier', categorie: 'equipement', destinationParDefaut: 'edl', types: ['cuisine'] },
  { designation: 'Robinetterie', categorie: 'equipement', destinationParDefaut: 'edl', types: ['cuisine', 'sdb', 'wc'] },
  { designation: 'Plan de travail', categorie: 'mobilier', destinationParDefaut: 'edl', types: ['cuisine'] },
  { designation: 'Meubles hauts', categorie: 'mobilier', destinationParDefaut: 'edl', types: ['cuisine'] },
  { designation: 'Meubles bas', categorie: 'mobilier', destinationParDefaut: 'edl', types: ['cuisine'] },
  { designation: 'Poubelle', categorie: 'equipement', destinationParDefaut: 'inventaire', types: ['cuisine'] },
  { designation: 'Assiettes plates', categorie: 'vaisselle', destinationParDefaut: 'inventaire', types: ['cuisine'] },
  { designation: 'Assiettes creuses', categorie: 'vaisselle', destinationParDefaut: 'inventaire', types: ['cuisine'] },
  { designation: 'Bols', categorie: 'vaisselle', destinationParDefaut: 'inventaire', types: ['cuisine'] },
  { designation: 'Verres', categorie: 'vaisselle', destinationParDefaut: 'inventaire', types: ['cuisine'] },
  { designation: 'Tasses', categorie: 'vaisselle', destinationParDefaut: 'inventaire', types: ['cuisine'] },
  { designation: 'Couverts', categorie: 'vaisselle', destinationParDefaut: 'inventaire', types: ['cuisine'] },
  { designation: 'Casseroles', categorie: 'vaisselle', destinationParDefaut: 'inventaire', types: ['cuisine'] },
  { designation: 'Poêles', categorie: 'vaisselle', destinationParDefaut: 'inventaire', types: ['cuisine'] },
  { designation: 'Faitout', categorie: 'vaisselle', destinationParDefaut: 'inventaire', types: ['cuisine'] },
  { designation: 'Saladier', categorie: 'vaisselle', destinationParDefaut: 'inventaire', types: ['cuisine'] },
  { designation: 'Planche à découper', categorie: 'vaisselle', destinationParDefaut: 'inventaire', types: ['cuisine'] },
  { designation: 'Couteaux', categorie: 'vaisselle', destinationParDefaut: 'inventaire', types: ['cuisine'] },
  { designation: 'Passoire', categorie: 'vaisselle', destinationParDefaut: 'inventaire', types: ['cuisine'] },
  { designation: 'Essoreuse', categorie: 'vaisselle', destinationParDefaut: 'inventaire', types: ['cuisine'] },
  { designation: 'Plat à four', categorie: 'vaisselle', destinationParDefaut: 'inventaire', types: ['cuisine'] },
  { designation: 'Égouttoir', categorie: 'vaisselle', destinationParDefaut: 'inventaire', types: ['cuisine'] },
  { designation: 'Torchons', categorie: 'vaisselle', destinationParDefaut: 'inventaire', types: ['cuisine'] },

  // Chambre
  { designation: 'Sommier', categorie: 'mobilier', destinationParDefaut: 'inventaire', types: ['chambre'] },
  { designation: 'Matelas', categorie: 'mobilier', destinationParDefaut: 'inventaire', types: ['chambre'] },
  { designation: 'Couette', categorie: 'mobilier', destinationParDefaut: 'inventaire', types: ['chambre'] },
  { designation: 'Oreillers', categorie: 'mobilier', destinationParDefaut: 'inventaire', types: ['chambre'] },
  { designation: 'Protège-matelas', categorie: 'mobilier', destinationParDefaut: 'inventaire', types: ['chambre'] },
  { designation: 'Armoire', categorie: 'mobilier', destinationParDefaut: 'inventaire', types: ['chambre'] },
  { designation: 'Penderie', categorie: 'mobilier', destinationParDefaut: 'inventaire', types: ['chambre'] },
  { designation: 'Cintres', categorie: 'mobilier', destinationParDefaut: 'inventaire', types: ['chambre'] },
  { designation: 'Chevet', categorie: 'mobilier', destinationParDefaut: 'inventaire', types: ['chambre'] },
  { designation: 'Occultation', categorie: 'menuiserie', destinationParDefaut: 'les_deux', types: ['chambre'] },

  // Séjour
  { designation: 'Canapé', categorie: 'mobilier', destinationParDefaut: 'inventaire', types: ['sejour'] },
  { designation: 'Table', categorie: 'mobilier', destinationParDefaut: 'inventaire', types: ['sejour', 'cuisine'] },
  { designation: 'Chaises', categorie: 'mobilier', destinationParDefaut: 'inventaire', types: ['sejour', 'cuisine'] },
  { designation: 'TV', categorie: 'equipement', destinationParDefaut: 'inventaire', types: ['sejour'] },
  { designation: 'Meuble TV', categorie: 'mobilier', destinationParDefaut: 'inventaire', types: ['sejour'] },
  { designation: 'Étagères', categorie: 'mobilier', destinationParDefaut: 'inventaire', types: ['sejour', 'chambre'] },
  { designation: 'Rideaux', categorie: 'menuiserie', destinationParDefaut: 'inventaire', types: ['sejour', 'chambre'] },

  // Salle de bains
  { designation: 'Vasque', categorie: 'equipement', destinationParDefaut: 'edl', types: ['sdb'] },
  { designation: 'Douche / baignoire', categorie: 'equipement', destinationParDefaut: 'edl', types: ['sdb'] },
  { designation: 'Paroi', categorie: 'equipement', destinationParDefaut: 'edl', types: ['sdb'] },
  { designation: 'Miroir', categorie: 'equipement', destinationParDefaut: 'edl', types: ['sdb'] },
  { designation: 'Meuble', categorie: 'mobilier', destinationParDefaut: 'edl', types: ['sdb'] },
  { designation: 'Sèche-serviettes', categorie: 'equipement', destinationParDefaut: 'edl', types: ['sdb'] },
  { designation: 'VMC', categorie: 'equipement', destinationParDefaut: 'edl', types: ['sdb', 'wc'] },
  { designation: 'Porte-serviettes', categorie: 'equipement', destinationParDefaut: 'inventaire', types: ['sdb'] },

  // WC
  { designation: 'Cuvette', categorie: 'equipement', destinationParDefaut: 'edl', types: ['wc'] },
  { designation: 'Abattant', categorie: 'equipement', destinationParDefaut: 'edl', types: ['wc'] },
  { designation: 'Chasse', categorie: 'equipement', destinationParDefaut: 'edl', types: ['wc'] },
  { designation: 'Lave-mains', categorie: 'equipement', destinationParDefaut: 'edl', types: ['wc'] },
  { designation: 'Balai WC', categorie: 'entretien', destinationParDefaut: 'inventaire', types: ['wc'] },

  // Entretien (rattaché à buanderie et cuisine, faute de pièce dédiée)
  { designation: 'Aspirateur', categorie: 'entretien', destinationParDefaut: 'inventaire', types: ['buanderie', 'cuisine'] },
  { designation: 'Balai', categorie: 'entretien', destinationParDefaut: 'inventaire', types: ['buanderie', 'cuisine'] },
  { designation: 'Pelle', categorie: 'entretien', destinationParDefaut: 'inventaire', types: ['buanderie', 'cuisine'] },
  { designation: 'Serpillière', categorie: 'entretien', destinationParDefaut: 'inventaire', types: ['buanderie', 'cuisine'] },
  { designation: 'Seau', categorie: 'entretien', destinationParDefaut: 'inventaire', types: ['buanderie', 'cuisine'] },
  { designation: 'Raclette', categorie: 'entretien', destinationParDefaut: 'inventaire', types: ['buanderie', 'cuisine'] },

  // Buanderie
  { designation: 'Lave-linge', categorie: 'equipement', destinationParDefaut: 'les_deux', types: ['buanderie', 'sdb'] },
  { designation: 'Sèche-linge', categorie: 'equipement', destinationParDefaut: 'les_deux', types: ['buanderie'] },
  { designation: 'Étendoir', categorie: 'equipement', destinationParDefaut: 'inventaire', types: ['buanderie'] },
  { designation: 'Fer', categorie: 'equipement', destinationParDefaut: 'inventaire', types: ['buanderie'] },
  { designation: 'Table à repasser', categorie: 'equipement', destinationParDefaut: 'inventaire', types: ['buanderie'] },
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
