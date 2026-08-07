import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { creerPiece, deplacerPiece, enregistrerModele } from '../data/actions'
import { TYPES_PIECE, metaType } from '../data/catalogue'
import type { Ligne, Piece, TypePiece } from '../data/types'
import { BarreTitre } from '../components/BarreTitre'
import { formaterEuros, totalValeur } from '../lib/valeur'

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function Pieces() {
  const { constatId = '' } = useParams()
  const nav = useNavigate()
  const [choix, setChoix] = useState(false)
  const [recherche, setRecherche] = useState('')

  const constat = useLiveQuery(() => db.constats.get(constatId), [constatId])
  const pieces = useLiveQuery(
    () => db.pieces.where('constatId').equals(constatId).sortBy('ordre'),
    [constatId]
  )
  const lignes = useLiveQuery(async () => {
    const ps = await db.pieces.where('constatId').equals(constatId).toArray()
    const ids = ps.map((p) => p.id)
    if (!ids.length) return [] as Ligne[]
    return db.lignes.where('pieceId').anyOf(ids).toArray()
  }, [constatId])

  const lignesParPiece = useMemo(() => {
    const m = new Map<string, Ligne[]>()
    for (const l of lignes ?? []) {
      const arr = m.get(l.pieceId) ?? []
      arr.push(l)
      m.set(l.pieceId, arr)
    }
    return m
  }, [lignes])

  const total = pieces?.length ?? 0
  const commencees = (pieces ?? []).filter((p) => (lignesParPiece.get(p.id)?.length ?? 0) > 0).length
  const pct = total ? Math.round((commencees / total) * 100) : 0
  const valeurGlobale = totalValeur(lignes ?? [])

  // Recherche globale : lignes de toutes les pièces dont la désignation matche.
  const resultats = useMemo(() => {
    const q = norm(recherche.trim())
    if (!q || !pieces) return []
    const parPiece = new Map(pieces.map((p) => [p.id, p]))
    return (lignes ?? [])
      .filter((l) => norm(l.designation).includes(q))
      .map((l) => ({ ligne: l, piece: parPiece.get(l.pieceId) }))
      .filter((r): r is { ligne: Ligne; piece: Piece } => !!r.piece)
  }, [recherche, lignes, pieces])

  async function ajouter(type: TypePiece) {
    const id = await creerPiece(constatId, type)
    setChoix(false)
    nav(`/piece/${id}`)
  }

  async function enregistrerCommeModele() {
    const nom = prompt('Nom du modèle', 'Mon modèle de constat')
    if (nom === null) return
    await enregistrerModele(constatId, nom)
    alert('Modèle enregistré. Réutilisable depuis l’accueil.')
  }

  const titre = constat?.type === 'sortie' ? 'Constat de sortie' : 'Constat d’entrée'

  return (
    <div className="app">
      <BarreTitre
        titre={titre}
        retour="/"
        actions={
          <Link className="btn discret" to={`/constat/${constatId}/documents`}>
            Documents
          </Link>
        }
      />
      <div className="contenu">
        <div className="ligne-champs">
          <Link className="btn" to={`/constat/${constatId}`}>
            ✎ En-tête
          </Link>
          <Link className="btn" to={`/constat/${constatId}/conformite`}>
            ✓ Conformité
          </Link>
        </div>

        <input
          type="search"
          placeholder="Rechercher une ligne…"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          aria-label="Rechercher dans toutes les lignes"
          style={{ marginTop: 12 }}
        />

        {recherche.trim() ? (
          <div style={{ marginTop: 12 }}>
            <h2 className="sous-titre">
              Résultats ({resultats.length})
            </h2>
            {resultats.length === 0 && <p className="vide">Aucune ligne trouvée.</p>}
            {resultats.map(({ ligne, piece }) => (
              <Link
                key={ligne.id}
                className="ligne"
                to={`/piece/${piece.id}?ligne=${ligne.id}`}
                style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
              >
                <div className="ligne-tete" style={{ display: 'flex' }}>
                  <span className={`point-etat ${ligne.etat}`} aria-hidden />
                  <span className="desig">{ligne.designation}</span>
                  <span className="cat">{piece.nom}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <>
            <div className="entre" style={{ marginTop: 14 }}>
              <h2 className="sous-titre" style={{ margin: 0 }}>
                Pièces
              </h2>
              <span className="meta tnum">
                {commencees}/{total} pièces
              </span>
            </div>
            <div className="avancement" aria-label={`Avancement ${pct}%`} style={{ marginBottom: 6 }}>
              <span style={{ width: `${pct}%` }} />
            </div>
            {valeurGlobale > 0 && (
              <p className="meta tnum" style={{ marginTop: 0 }}>
                Valeur indicative totale : {formaterEuros(valeurGlobale)}
              </p>
            )}

            {total === 0 && <p className="vide">Aucune pièce. Touchez + pour en ajouter une.</p>}

            {pieces?.map((p, i) => {
              const desLignes = lignesParPiece.get(p.id) ?? []
              const n = desLignes.length
              const val = totalValeur(desLignes)
              return (
                <div className="carte" key={p.id} style={{ padding: 0, overflow: 'hidden' }}>
                  <div className="entre">
                    <Link
                      className="carte-lien"
                      to={`/piece/${p.id}`}
                      style={{ flex: 1, padding: 14 }}
                    >
                      <span className="titre-carte">
                        {metaType(p.type).icone} {p.nom}
                      </span>
                      <div className="meta tnum">
                        {n} ligne{n > 1 ? 's' : ''}
                        {val > 0 ? ` · ${formaterEuros(val)}` : ''}
                      </div>
                    </Link>
                    <div className="reorder">
                      <button
                        aria-label="Monter la pièce"
                        disabled={i === 0}
                        onClick={() => deplacerPiece(p, -1)}
                      >
                        ↑
                      </button>
                      <button
                        aria-label="Descendre la pièce"
                        disabled={i === total - 1}
                        onClick={() => deplacerPiece(p, 1)}
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            {total > 0 && (
              <button className="btn discret pleine" style={{ marginTop: 16 }} onClick={enregistrerCommeModele}>
                ☆ Enregistrer comme modèle
              </button>
            )}
          </>
        )}
      </div>

      <button className="fab" aria-label="Ajouter une pièce" onClick={() => setChoix(true)}>
        ＋
      </button>

      {choix && (
        <div className="feuille-fond" onClick={() => setChoix(false)}>
          <div className="feuille" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Type de pièce">
            <div className="feuille-tete">
              <h2>Type de pièce</h2>
              <button className="btn discret" onClick={() => setChoix(false)}>
                Annuler
              </button>
            </div>
            <div className="feuille-corps">
              <div className="grille-types">
                {TYPES_PIECE.map((t) => (
                  <button key={t.type} className="type-piece" onClick={() => ajouter(t.type)}>
                    <span className="ico">{t.icone}</span>
                    <span>{t.libelle}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
