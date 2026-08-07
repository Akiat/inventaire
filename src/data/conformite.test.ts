import { describe, it, expect } from 'vitest'
import { evaluerMentions, evaluerMobilier, type LignePiece } from './conformite'
import type { Constat, Ligne, Logement, Piece } from './types'

// Jeu de données de référence pour le rattachement de la checklist.
function piece(id: string, type: Piece['type']): Piece {
  return { id, constatId: 'c1', nom: type, type, ordre: 0 }
}
function ligne(p: Piece, designation: string, extra: Partial<Ligne> = {}): LignePiece {
  return {
    piece: p,
    ligne: {
      id: designation,
      pieceId: p.id,
      categorie: 'autre',
      designation,
      quantite: 1,
      etat: 'bon',
      destination: 'les_deux',
      ordre: 0,
      ...extra,
    },
  }
}

const cuisine = piece('p1', 'cuisine')
const chambre = piece('p2', 'chambre')

describe('evaluerMobilier — rattachement automatique', () => {
  const lignes: LignePiece[] = [
    ligne(cuisine, 'Plaque de cuisson'),
    ligne(cuisine, 'Réfrigérateur'),
    ligne(cuisine, 'Assiettes plates'),
    ligne(cuisine, 'Four', { etat: 'absent' }), // absent : ne satisfait pas
    ligne(chambre, 'Occultation'),
  ]
  const res = evaluerMobilier(lignes, undefined)
  const parId = (id: string) => res.find((r) => r.item.id === id)!

  it('rattache par mot-clé sur la désignation', () => {
    expect(parId('plaques').satisfait).toBe(true)
    expect(parId('plaques').lignes.map((l) => l.ligne.designation)).toContain('Plaque de cuisson')
    expect(parId('froid').satisfait).toBe(true)
    expect(parId('vaisselle').satisfait).toBe(true)
  })

  it('ignore les lignes à l’état « absent »', () => {
    expect(parId('four').satisfait).toBe(false)
  })

  it('restreint l’occultation aux chambres', () => {
    expect(parId('occultation').satisfait).toBe(true)
    // La même désignation en cuisine ne doit pas satisfaire l'item.
    const sansChambre = evaluerMobilier([ligne(cuisine, 'Volet / store')], undefined)
    expect(sansChambre.find((r) => r.item.id === 'occultation')!.satisfait).toBe(false)
  })
})

describe('evaluerMobilier — surcharge manuelle', () => {
  const lignes: LignePiece[] = [ligne(cuisine, 'Plaque de cuisson'), ligne(cuisine, 'Objet inconnu')]

  it('exclut une ligne auto-rattachée', () => {
    const res = evaluerMobilier(lignes, { plaques: { exclus: ['Plaque de cuisson'] } })
    expect(res.find((r) => r.item.id === 'plaques')!.satisfait).toBe(false)
  })

  it('rattache une ligne à la main (hors mot-clé)', () => {
    const res = evaluerMobilier(lignes, { plaques: { inclus: ['Objet inconnu'] } })
    const r = res.find((x) => x.item.id === 'plaques')!
    expect(r.satisfait).toBe(true)
    expect(r.lignes.some((l) => l.ligne.designation === 'Objet inconnu' && !l.auto)).toBe(true)
  })
})

describe('evaluerMentions', () => {
  const logementVide: Logement = {
    id: 'l1',
    adresse: '',
    complement: '',
    surface: '',
    lots: '',
    bailleurNom: '',
    bailleurAdresse: '',
  }
  const logementPlein: Logement = {
    ...logementVide,
    adresse: '1 rue du Test',
    bailleurNom: 'Bailleur',
    bailleurAdresse: '2 rue du Bail',
  }
  const base: Constat = {
    id: 'c1',
    logementId: 'l1',
    type: 'entree',
    date: '2026-01-01',
    locataires: [''],
    compteurs: [],
    cles: [],
    createdAt: 0,
  }
  const ok = (r: ReturnType<typeof evaluerMentions>, id: string) => r.find((m) => m.id === id)!.satisfait

  it('signale les mentions manquantes sur un constat vide', () => {
    const r = evaluerMentions(base, logementVide, [], new Map())
    expect(ok(r, 'localisation')).toBe(false)
    expect(ok(r, 'parties')).toBe(false)
    expect(ok(r, 'compteurs')).toBe(false)
    expect(ok(r, 'description')).toBe(false)
    expect(ok(r, 'type-date')).toBe(true) // date renseignée
  })

  it('valide un constat complet', () => {
    const constat: Constat = {
      ...base,
      locataires: ['Locataire, 3 rue Bis'],
      compteurs: [{ type: 'électricité', numero: 'A1', index: '1000' }],
      cles: [{ libelle: 'clé logement', nombre: 2 }],
    }
    const pieces: Piece[] = [cuisine]
    const r = evaluerMentions(constat, logementPlein, pieces, new Map([[cuisine.id, 3]]))
    expect(ok(r, 'localisation')).toBe(true)
    expect(ok(r, 'parties')).toBe(true)
    expect(ok(r, 'compteurs')).toBe(true)
    expect(ok(r, 'cles')).toBe(true)
    expect(ok(r, 'description')).toBe(true)
  })

  it('exige les mentions de sortie', () => {
    const sortie: Constat = { ...base, type: 'sortie' }
    const manquant = evaluerMentions(sortie, logementPlein, [], new Map())
    expect(ok(manquant, 'sortie')).toBe(false)
    const complet = evaluerMentions(
      { ...sortie, nouvelleAdresse: 'Ailleurs', dateConstatEntree: '2025-01-01' },
      logementPlein,
      [],
      new Map()
    )
    expect(ok(complet, 'sortie')).toBe(true)
  })
})
