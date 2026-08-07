import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { creerLigne, supprimerPiece } from '../data/actions'
import type { Categorie } from '../data/types'
import { BarreTitre } from '../components/BarreTitre'
import { FeuilleAjout } from '../components/FeuilleAjout'
import { LigneItem } from '../components/LigneItem'
import { enrichir } from '../lib/catalogueLocal'
import { useDebouncedCallback } from '../lib/hooks'

export function Piece() {
  const { pieceId = '' } = useParams()
  const nav = useNavigate()
  const [ajout, setAjout] = useState(false)

  const piece = useLiveQuery(() => db.pieces.get(pieceId), [pieceId])
  const lignes = useLiveQuery(
    () => db.lignes.where('pieceId').equals(pieceId).sortBy('ordre'),
    [pieceId]
  )

  const [nom, setNom] = useState('')
  useEffect(() => {
    if (piece) setNom(piece.nom)
  }, [piece?.id])

  const ecrireNom = useDebouncedCallback((v: string) => {
    db.pieces.update(pieceId, { nom: v })
  }, 300)

  if (!piece) {
    return (
      <div className="app">
        <BarreTitre titre="Pièce introuvable" retour={-1} />
      </div>
    )
  }

  const retour = `/constat/${piece.constatId}/pieces`

  async function ajouterLigne(designation: string, categorie: Categorie) {
    await creerLigne(pieceId, designation, categorie)
    // Frappe libre → enrichit le catalogue local du type de pièce.
    if (piece) enrichir(piece.type, designation)
  }

  return (
    <div className="app">
      <BarreTitre
        titre={piece.nom}
        retour={retour}
        actions={
          <button
            className="btn-icone"
            aria-label="Supprimer la pièce"
            onClick={() => {
              if (confirm(`Supprimer la pièce « ${piece.nom} » et ses lignes ?`)) {
                supprimerPiece(pieceId).then(() => nav(retour))
              }
            }}
          >
            🗑
          </button>
        }
      />
      <div className="contenu">
        <label className="champ">
          <span className="lib">Nom de la pièce</span>
          <input
            type="text"
            value={nom}
            onChange={(e) => {
              setNom(e.target.value)
              ecrireNom(e.target.value)
            }}
          />
        </label>

        <h2 className="sous-titre">
          Lignes {lignes ? `(${lignes.length})` : ''}
        </h2>

        {lignes && lignes.length === 0 && (
          <p className="vide">Aucune ligne. Touchez + pour commencer la saisie.</p>
        )}

        {lignes?.map((l) => (
          <LigneItem key={l.id} ligne={l} />
        ))}
      </div>

      <button className="fab" aria-label="Ajouter une ligne" onClick={() => setAjout(true)}>
        ＋
      </button>

      {ajout && (
        <FeuilleAjout
          typePiece={piece.type}
          onAjouter={ajouterLigne}
          onFermer={() => setAjout(false)}
        />
      )}
    </div>
  )
}
