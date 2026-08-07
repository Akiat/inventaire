import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { creerPiece } from '../data/actions'
import { TYPES_PIECE, metaType } from '../data/catalogue'
import type { TypePiece } from '../data/types'
import { BarreTitre } from '../components/BarreTitre'

export function Pieces() {
  const { constatId = '' } = useParams()
  const nav = useNavigate()
  const [choix, setChoix] = useState(false)

  const constat = useLiveQuery(() => db.constats.get(constatId), [constatId])
  const pieces = useLiveQuery(
    () => db.pieces.where('constatId').equals(constatId).sortBy('ordre'),
    [constatId]
  )
  const lignes = useLiveQuery(async () => {
    const ps = await db.pieces.where('constatId').equals(constatId).toArray()
    const ids = ps.map((p) => p.id)
    if (!ids.length) return [] as { pieceId: string }[]
    return db.lignes.where('pieceId').anyOf(ids).toArray()
  }, [constatId])

  const compteParPiece = new Map<string, number>()
  for (const l of lignes ?? []) compteParPiece.set(l.pieceId, (compteParPiece.get(l.pieceId) ?? 0) + 1)

  const total = pieces?.length ?? 0
  const commencees = (pieces ?? []).filter((p) => (compteParPiece.get(p.id) ?? 0) > 0).length
  const pct = total ? Math.round((commencees / total) * 100) : 0

  async function ajouter(type: TypePiece) {
    const id = await creerPiece(constatId, type)
    setChoix(false)
    nav(`/piece/${id}`)
  }

  const titre = constat?.type === 'sortie' ? 'Constat de sortie' : 'Constat d’entrée'

  return (
    <div className="app">
      <BarreTitre
        titre={titre}
        retour="/"
        actions={
          <Link className="btn discret" to={`/imprimer/${constatId}`}>
            PDF
          </Link>
        }
      />
      <div className="contenu">
        <div className="entre">
          <Link className="lien" to={`/constat/${constatId}`}>
            ✎ En-tête du constat
          </Link>
          <span className="meta tnum">
            {commencees}/{total} pièces
          </span>
        </div>
        <div className="entre" style={{ marginTop: 6 }}>
          <Link className="lien" to={`/constat/${constatId}/conformite`}>
            ✓ Conformité
          </Link>
        </div>
        <div className="avancement" aria-label={`Avancement ${pct}%`}>
          <span style={{ width: `${pct}%` }} />
        </div>

        <h2 className="sous-titre">Pièces</h2>

        {total === 0 && <p className="vide">Aucune pièce. Touchez + pour en ajouter une.</p>}

        {pieces?.map((p) => {
          const n = compteParPiece.get(p.id) ?? 0
          return (
            <Link key={p.id} className="carte carte-lien" to={`/piece/${p.id}`}>
              <div className="entre">
                <span className="titre-carte">
                  {metaType(p.type).icone} {p.nom}
                </span>
                <span className="meta tnum">{n} ligne{n > 1 ? 's' : ''}</span>
              </div>
            </Link>
          )
        })}
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
