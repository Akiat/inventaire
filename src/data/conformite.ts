// Checklists de conformité (lot 1).
// - Mobilier minimum du meublé : décret n° 2015-981 du 31 juillet 2015.
// - Mentions du constat : décret n° 2016-382 du 30 mars 2016.
// Rattachement automatique par mot-clé sur la désignation, surchargeable à la
// main. Garde-fou non bloquant : on privilégie une détection large, l'humain
// tranche au vu des lignes rattachées.
import type { Cle, Compteur, Constat, Ligne, Logement, Piece, SurchargeMobilier, TypePiece } from './types'

export interface ItemMobilier {
  id: string
  libelle: string
  motsCles: string[]
  typesPiece?: TypePiece[] // restreint le rattachement à ces types de pièce
  aide?: string
}

// Écrits sans accents : la comparaison normalise des deux côtés.
export const MOBILIER_MINIMUM: ItemMobilier[] = [
  {
    id: 'literie',
    libelle: 'Literie avec couette ou couverture',
    motsCles: ['couette', 'couverture', 'literie'],
  },
  {
    id: 'occultation',
    libelle: 'Occultation des fenêtres (chambres)',
    motsCles: ['occultation', 'volet', 'store', 'rideau', 'persienne'],
    typesPiece: ['chambre'],
    aide: 'Dispositif dans les pièces à usage de chambre.',
  },
  { id: 'plaques', libelle: 'Plaques de cuisson', motsCles: ['plaque', 'cuisson'] },
  {
    id: 'four',
    libelle: 'Four ou four à micro-ondes',
    motsCles: ['four', 'micro-onde', 'microonde'],
  },
  {
    id: 'froid',
    libelle: 'Réfrigérateur et congélateur',
    motsCles: ['refrigerateur', 'frigo', 'congelateur', 'congel'],
    aide: 'Ou compartiment de congélation à ≤ −6 °C.',
  },
  {
    id: 'vaisselle',
    libelle: 'Vaisselle pour les repas',
    motsCles: ['assiette', 'verre', 'bol', 'tasse', 'couvert'],
  },
  {
    id: 'ustensiles',
    libelle: 'Ustensiles de cuisine',
    motsCles: ['casserole', 'poele', 'faitout', 'saladier', 'couteau', 'passoire', 'planche', 'plat', 'ustensile'],
  },
  {
    id: 'table',
    libelle: 'Table et sièges',
    motsCles: ['table', 'chaise', 'siege', 'tabouret', 'banc'],
  },
  {
    id: 'rangement',
    libelle: 'Étagères de rangement',
    motsCles: ['etagere', 'rangement', 'armoire', 'placard', 'penderie', 'commode'],
  },
  { id: 'luminaires', libelle: 'Luminaires', motsCles: ['luminaire', 'lampe', 'plafonnier', 'applique', 'eclairage'] },
  {
    id: 'entretien',
    libelle: 'Matériel d’entretien ménager',
    motsCles: ['aspirateur', 'balai', 'serpilliere', 'seau', 'raclette', 'pelle', 'entretien'],
  },
]

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export interface LignePiece {
  ligne: Ligne
  piece: Piece
}

export interface LigneRattachee extends LignePiece {
  auto: boolean // true = rattachée par mot-clé, false = ajoutée à la main
}

export interface ResultatMobilier {
  item: ItemMobilier
  lignes: LigneRattachee[] // lignes qui satisfont (auto ± surcharge), hors « absent »
  satisfait: boolean
  surchargeManuelle: boolean // au moins une ligne incluse/exclue à la main
}

// Lignes rattachées automatiquement à un item (mot-clé + type de pièce).
function rattachementAuto(item: ItemMobilier, lignes: LignePiece[]): LignePiece[] {
  const mots = item.motsCles.map(norm)
  return lignes.filter(({ ligne, piece }) => {
    if (ligne.etat === 'absent') return false
    if (item.typesPiece && !item.typesPiece.includes(piece.type)) return false
    const d = norm(ligne.designation)
    return mots.some((m) => d.includes(m))
  })
}

export function evaluerMobilier(
  lignes: LignePiece[],
  overrides: Record<string, SurchargeMobilier> | undefined
): ResultatMobilier[] {
  const parId = new Map(lignes.map((lp) => [lp.ligne.id, lp]))
  return MOBILIER_MINIMUM.map((item) => {
    const surcharge = overrides?.[item.id] ?? {}
    const exclus = new Set(surcharge.exclus ?? [])
    const inclus = surcharge.inclus ?? []

    const auto: LigneRattachee[] = rattachementAuto(item, lignes)
      .filter((lp) => !exclus.has(lp.ligne.id))
      .map((lp) => ({ ...lp, auto: true }))
    const dejaLa = new Set(auto.map((lp) => lp.ligne.id))
    const manuels: LigneRattachee[] = inclus
      .filter((id) => !dejaLa.has(id) && !exclus.has(id))
      .map((id) => parId.get(id))
      .filter((lp): lp is LignePiece => !!lp && lp.ligne.etat !== 'absent')
      .map((lp) => ({ ...lp, auto: false }))

    const effectives = [...auto, ...manuels]
    return {
      item,
      lignes: effectives,
      satisfait: effectives.length > 0,
      surchargeManuelle: inclus.length > 0 || exclus.size > 0,
    }
  })
}

// --- Mentions du constat (décret 2016-382) ---
export interface ResultatMention {
  id: string
  libelle: string
  satisfait: boolean
  detail?: string // ce qui manque, si manquant
}

function aUneValeur(s: string | undefined): boolean {
  return !!s && s.trim().length > 0
}

export function evaluerMentions(
  constat: Constat,
  logement: Logement | undefined,
  pieces: Piece[],
  nbLignesParPiece: Map<string, number>
): ResultatMention[] {
  const res: ResultatMention[] = []

  res.push({
    id: 'type-date',
    libelle: 'Type de constat et date',
    satisfait: aUneValeur(constat.date),
    detail: aUneValeur(constat.date) ? undefined : 'Date manquante.',
  })

  res.push({
    id: 'localisation',
    libelle: 'Localisation du logement',
    satisfait: aUneValeur(logement?.adresse),
    detail: aUneValeur(logement?.adresse) ? undefined : 'Adresse manquante.',
  })

  const locataires = constat.locataires.filter((l) => aUneValeur(l))
  const partiesOk = aUneValeur(logement?.bailleurNom) && aUneValeur(logement?.bailleurAdresse) && locataires.length > 0
  const manques: string[] = []
  if (!aUneValeur(logement?.bailleurNom)) manques.push('nom du bailleur')
  if (!aUneValeur(logement?.bailleurAdresse)) manques.push('domicile du bailleur')
  if (locataires.length === 0) manques.push('locataire(s)')
  res.push({
    id: 'parties',
    libelle: 'Identité et domicile des parties',
    satisfait: partiesOk,
    detail: partiesOk ? undefined : `Manque : ${manques.join(', ')}.`,
  })

  // Mandataire : mention facultative, requise seulement s'il y en a un.
  res.push({ id: 'mandataire', libelle: 'Mandataire (si applicable)', satisfait: true })

  const compteursOk = constat.compteurs.some((c: Compteur) => aUneValeur(c.type) && aUneValeur(c.index))
  res.push({
    id: 'compteurs',
    libelle: 'Relevés des compteurs',
    satisfait: compteursOk,
    detail: compteursOk ? undefined : 'Aucun compteur avec type et index.',
  })

  const clesOk = constat.cles.some((c: Cle) => aUneValeur(c.libelle))
  res.push({
    id: 'cles',
    libelle: 'Détail des clés et moyens d’accès',
    satisfait: clesOk,
    detail: clesOk ? undefined : 'Aucune clé renseignée.',
  })

  const piecesVides = pieces.filter((p) => (nbLignesParPiece.get(p.id) ?? 0) === 0)
  const descriptionOk = pieces.length > 0 && piecesVides.length === 0
  let detailDescription: string | undefined
  if (pieces.length === 0) detailDescription = 'Aucune pièce décrite.'
  else if (piecesVides.length > 0)
    detailDescription = `Pièce(s) sans ligne : ${piecesVides.map((p) => p.nom).join(', ')}.`
  res.push({
    id: 'description',
    libelle: 'Description pièce par pièce',
    satisfait: descriptionOk,
    detail: detailDescription,
  })

  res.push({ id: 'signatures', libelle: 'Emplacement des signatures', satisfait: true })

  // En sortie : nouvelle adresse du locataire + date du constat d'entrée.
  // Champs introduits au lot 4 : pour l'instant signalés à compléter.
  if (constat.type === 'sortie') {
    res.push({
      id: 'sortie',
      libelle: 'Nouvelle adresse et date du constat d’entrée',
      satisfait: false,
      detail: 'À compléter (constat de sortie, lot 4).',
    })
  }

  return res
}
