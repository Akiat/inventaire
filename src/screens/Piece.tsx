import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { creerLigne, dupliquerPiece, supprimerPiece } from '../data/actions'
import type { Categorie } from '../data/types'
import { BarreTitre } from '../components/BarreTitre'
import { FeuilleAjout } from '../components/FeuilleAjout'
import { LigneItem } from '../components/LigneItem'
import { enrichir } from '../lib/catalogueLocal'
import { useDebouncedCallback } from '../lib/hooks'
import { formaterEuros, totalValeur } from '../lib/valeur'

export function Piece() {
  const { pieceId = '' } = useParams()
  const [params] = useSearchParams()
  const ligneCiblee = params.get('ligne') // recherche globale : ouvre cette ligne
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
  const total = totalValeur(lignes ?? [])

  async function ajouterLigne(designation: string, categorie: Categorie) {
    await creerLigne(pieceId, designation, categorie)
    // Frappe libre → enrichit le catalogue local du type de pièce.
    if (piece) enrichir(piece.type, designation)
  }

  async function dupliquer() {
    const id = await dupliquerPiece(pieceId)
    if (id) nav(`/piece/${id}`)
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

        <button className="btn pleine" onClick={dupliquer} style={{ marginBottom: 14 }}>
          ⧉ Dupliquer la pièce
        </button>

        <div className="entre">
          <h2 className="sous-titre" style={{ margin: 0 }}>
            Lignes {lignes ? `(${lignes.length})` : ''}
          </h2>
          {total > 0 && <span className="meta tnum">Valeur : {formaterEuros(total)}</span>}
        </div>

        {lignes && lignes.length === 0 && (
          <p className="vide">Aucune ligne. Touchez + pour commencer la saisie.</p>
        )}

        {lignes?.map((l, i) => (
          <LigneItem
            key={l.id}
            ligne={l}
            ouvertInitial={l.id === ligneCiblee}
            peutMonter={i > 0}
            peutDescendre={i < lignes.length - 1}
          />
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
