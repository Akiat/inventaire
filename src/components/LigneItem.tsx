import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import type { Etat, Ligne } from '../data/types'
import { SelecteurEtat } from './SelecteurEtat'
import { ChampPhoto } from './ChampPhoto'
import { ajouterPhoto, dupliquerLigne, majLigne, supprimerLigne, supprimerPhoto } from '../data/actions'
import { useDebouncedCallback } from '../lib/hooks'

// Une ligne d'inventaire : repliée (résumé) ou dépliée (édition complète).
// Tout se persiste au geste ; l'état et la quantité sans validation.
export function LigneItem({ ligne }: { ligne: Ligne }) {
  const [ouvert, setOuvert] = useState(false)
  const [obs, setObs] = useState(ligne.observations ?? '')

  const photos = useLiveQuery(
    () => db.photos.where('ligneId').equals(ligne.id).toArray(),
    [ligne.id]
  )
  const nbPhotos = photos?.length ?? 0

  const ecrireObs = useDebouncedCallback((v: string) => {
    majLigne(ligne.id, { observations: v })
  }, 300)

  function setEtat(e: Etat) {
    majLigne(ligne.id, { etat: e })
  }
  function setQte(q: number) {
    majLigne(ligne.id, { quantite: Math.max(1, q) })
  }

  return (
    <div className="ligne">
      <button className="ligne-tete" onClick={() => setOuvert((o) => !o)} aria-expanded={ouvert}>
        <span className={`point-etat ${ligne.etat}`} aria-hidden />
        <span className="desig">{ligne.designation}</span>
        {ligne.quantite > 1 && <span className="qte tnum">×{ligne.quantite}</span>}
        {nbPhotos > 0 && <span className="badge-photo">📷 {nbPhotos}</span>}
        <span aria-hidden>{ouvert ? '▾' : '▸'}</span>
      </button>

      {ouvert && (
        <div className="ligne-corps">
          <div className="sous-titre">État</div>
          <SelecteurEtat valeur={ligne.etat} onChange={setEtat} />

          <div className="entre" style={{ marginTop: 14 }}>
            <span className="sous-titre" style={{ margin: 0 }}>
              Quantité
            </span>
            <div className="stepper" role="group" aria-label="Quantité">
              <button aria-label="Diminuer" onClick={() => setQte(ligne.quantite - 1)}>
                −
              </button>
              <span className="valeur tnum">{ligne.quantite}</span>
              <button aria-label="Augmenter" onClick={() => setQte(ligne.quantite + 1)}>
                +
              </button>
            </div>
          </div>

          <div className="sous-titre">Photos</div>
          <ChampPhoto
            photos={photos ?? []}
            onAjouter={async (blob) => {
              await ajouterPhoto(blob, ligne.id)
            }}
            onSupprimer={(id) => supprimerPhoto(id)}
          />

          <div className="sous-titre">Observations</div>
          <textarea
            value={obs}
            placeholder="Détails, réserves… (dictée du clavier possible)"
            onChange={(e) => {
              setObs(e.target.value)
              ecrireObs(e.target.value)
            }}
          />

          <div className="ligne-champs" style={{ marginTop: 12 }}>
            <button className="btn" onClick={() => dupliquerLigne(ligne.id)}>
              Dupliquer
            </button>
            <button
              className="btn danger"
              onClick={() => {
                if (confirm(`Supprimer « ${ligne.designation} » ?`)) supprimerLigne(ligne.id)
              }}
            >
              Supprimer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
