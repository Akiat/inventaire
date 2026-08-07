import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { basculerDestinationPiece, creerLigne, dupliquerPiece, supprimerPiece } from '../data/actions'
import type { Categorie, Destination } from '../data/types'
import { BarreTitre } from '../components/BarreTitre'
import { FeuilleAjout } from '../components/FeuilleAjout'
import { LigneItem } from '../components/LigneItem'
import { enrichir } from '../lib/catalogueLocal'
import { useDebouncedCallback } from '../lib/hooks'
import { formaterEuros, totalValeur } from '../lib/valeur'
import { DEST_LIBELLE, inclutEdl, inclutInventaire, destinationDe } from '../data/destination'

type Filtre = 'tout' | 'edl' | 'inventaire'

export function Piece() {
  const { pieceId = '' } = useParams()
  const [params] = useSearchParams()
  const ligneCiblee = params.get('ligne') // recherche globale : ouvre cette ligne
  const nav = useNavigate()
  const [ajout, setAjout] = useState(false)
  const [filtre, setFiltre] = useState<Filtre>('tout')
  const [bascule, setBascule] = useState(false)
  const [verifOnly, setVerifOnly] = useState(false)

  const piece = useLiveQuery(() => db.pieces.get(pieceId), [pieceId])
  const constat = useLiveQuery(
    () => (piece ? db.constats.get(piece.constatId) : undefined),
    [piece?.constatId]
  )
  const sortie = constat?.type === 'sortie'
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

  async function ajouterLigne(designation: string, categorie: Categorie, destination: Destination) {
    await creerLigne(pieceId, designation, categorie, destination)
    // Frappe libre → enrichit le catalogue local du type de pièce.
    if (piece) enrichir(piece.type, designation)
  }

  async function dupliquer() {
    const id = await dupliquerPiece(pieceId)
    if (id) nav(`/piece/${id}`)
  }

  async function toutBasculer(d: Destination) {
    await basculerDestinationPiece(pieceId, d)
    setBascule(false)
  }

  // Filtrage d'affichage (relecture avant génération d'un document).
  const visibles = (lignes ?? []).filter((l) => {
    if (verifOnly && l.verifiee) return false
    const d = destinationDe(l)
    if (filtre === 'edl') return inclutEdl(d)
    if (filtre === 'inventaire') return inclutInventaire(d)
    return true
  })
  const nbAVerifier = sortie ? (lignes ?? []).filter((l) => !l.verifiee).length : 0
  // Position dans l'ordre complet (le réordonnancement agit sur les vrais voisins).
  const rang = new Map((lignes ?? []).map((l, i) => [l.id, i]))
  const nbTotal = lignes?.length ?? 0

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

        <div className="ligne-champs" style={{ marginBottom: 14 }}>
          <button className="btn" onClick={dupliquer}>
            ⧉ Dupliquer
          </button>
          <button className="btn" onClick={() => setBascule(true)}>
            ⇄ Tout basculer
          </button>
        </div>

        <div className="entre">
          <h2 className="sous-titre" style={{ margin: 0 }}>
            Lignes {lignes ? `(${lignes.length})` : ''}
          </h2>
          {total > 0 && <span className="meta tnum">Valeur : {formaterEuros(total)}</span>}
        </div>

        {/* Filtre de relecture par document. */}
        <div className="dest-seg filtre" role="group" aria-label="Filtrer par document" style={{ marginBottom: 12 }}>
          {(['tout', 'edl', 'inventaire'] as Filtre[]).map((f) => (
            <button
              key={f}
              className="dest-opt"
              aria-pressed={filtre === f}
              onClick={() => setFiltre(f)}
            >
              {f === 'tout' ? 'Tout' : f === 'edl' ? 'EDL' : 'Inventaire'}
            </button>
          ))}
        </div>

        {/* Sortie : filtre « non encore vérifié ». */}
        {sortie && (
          <button
            className={`btn ${verifOnly ? 'primaire' : ''}`}
            style={{ width: '100%', marginBottom: 12 }}
            aria-pressed={verifOnly}
            onClick={() => setVerifOnly((v) => !v)}
          >
            {verifOnly ? '✓ ' : ''}À vérifier seulement{nbAVerifier > 0 ? ` (${nbAVerifier})` : ''}
          </button>
        )}

        {nbTotal === 0 && (
          <p className="vide">Aucune ligne. Touchez + pour commencer la saisie.</p>
        )}
        {nbTotal > 0 && visibles.length === 0 && (
          <p className="vide">Aucune ligne dans ce filtre.</p>
        )}

        {visibles.map((l) => {
          const i = rang.get(l.id) ?? 0
          return (
            <LigneItem
              key={l.id}
              ligne={l}
              ouvertInitial={l.id === ligneCiblee}
              peutMonter={i > 0}
              peutDescendre={i < nbTotal - 1}
              sortie={sortie}
            />
          )
        })}
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

      {bascule && (
        <div className="feuille-fond" onClick={() => setBascule(false)}>
          <div className="feuille" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Tout basculer">
            <div className="feuille-tete">
              <h2>Tout basculer en…</h2>
              <button className="btn discret" onClick={() => setBascule(false)}>
                Annuler
              </button>
            </div>
            <div className="feuille-corps">
              <p className="meta" style={{ marginTop: 0 }}>
                Applique la destination à toutes les lignes de la pièce.
              </p>
              {(['edl', 'inventaire', 'les_deux', 'aucun'] as Destination[]).map((d) => (
                <button key={d} className="suggestion" onClick={() => toutBasculer(d)}>
                  <span style={{ flex: 1 }}>{DEST_LIBELLE[d]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
