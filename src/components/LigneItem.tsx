import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import type { Destination, Etat, Ligne } from '../data/types'
import { SelecteurEtat } from './SelecteurEtat'
import { SelecteurDestination } from './SelecteurDestination'
import { ChampPhoto } from './ChampPhoto'
import { DEST_MARQUEUR, destinationDe } from '../data/destination'
import {
  ajouterPhoto,
  deplacerLigne,
  dupliquerLigne,
  etatLibelle,
  majLigne,
  supprimerLigne,
  supprimerPhoto,
  validerIdem,
} from '../data/actions'
import { useDebouncedCallback } from '../lib/hooks'

// Une ligne d'inventaire : repliée (résumé) ou dépliée (édition complète).
// Tout se persiste au geste ; l'état et la quantité sans validation.
export function LigneItem({
  ligne,
  ouvertInitial = false,
  peutMonter,
  peutDescendre,
  sortie = false,
}: {
  ligne: Ligne
  ouvertInitial?: boolean
  peutMonter: boolean
  peutDescendre: boolean
  sortie?: boolean
}) {
  const [ouvert, setOuvert] = useState(ouvertInitial)
  const [details, setDetails] = useState(
    !!(ligne.marqueModele || ligne.numeroSerie || ligne.valeur)
  )
  const [obs, setObs] = useState(ligne.observations ?? '')
  const [marque, setMarque] = useState(ligne.marqueModele ?? '')
  const [serie, setSerie] = useState(ligne.numeroSerie ?? '')
  const [valeur, setValeur] = useState(ligne.valeur != null ? String(ligne.valeur) : '')

  const photos = useLiveQuery(
    () => db.photos.where('ligneId').equals(ligne.id).toArray(),
    [ligne.id]
  )
  const nbPhotos = photos?.length ?? 0

  const ecrireObs = useDebouncedCallback((v: string) => majLigne(ligne.id, { observations: v }), 300)
  const ecrireMarque = useDebouncedCallback((v: string) => majLigne(ligne.id, { marqueModele: v }), 300)
  const ecrireSerie = useDebouncedCallback((v: string) => majLigne(ligne.id, { numeroSerie: v }), 300)
  const ecrireValeur = useDebouncedCallback((v: string) => {
    const n = parseFloat(v.replace(',', '.'))
    majLigne(ligne.id, { valeur: isNaN(n) ? undefined : n })
  }, 300)

  function setEtat(e: Etat) {
    // En sortie, choisir un état vaut vérification de la ligne.
    majLigne(ligne.id, sortie ? { etat: e, verifiee: true } : { etat: e })
  }
  const modifie = sortie && ligne.etatEntree != null && ligne.etat !== ligne.etatEntree
  function setDestination(d: Destination) {
    majLigne(ligne.id, { destination: d })
  }
  const dest = destinationDe(ligne)
  function setQte(q: number) {
    majLigne(ligne.id, { quantite: Math.max(1, q) })
  }

  const aVerifier = sortie && !ligne.verifiee

  return (
    <div className={`ligne ${aVerifier ? 'a-verifier' : ''} ${modifie ? 'modifie' : ''}`}>
      <div className="ligne-rangee">
        <button className="ligne-tete" onClick={() => setOuvert((o) => !o)} aria-expanded={ouvert}>
          <span className={`point-etat ${ligne.etat}`} aria-hidden />
          <span className="desig">{ligne.designation}</span>
          {ligne.quantite > 1 && <span className="qte tnum">×{ligne.quantite}</span>}
          {sortie && !ligne.verifiee && <span className="marque-verif">à vérifier</span>}
          {sortie && ligne.verifiee && modifie && <span className="marque-modif">modifié</span>}
          <span className={`marque-dest ${dest === 'aucun' ? 'hors' : ''}`}>{DEST_MARQUEUR[dest]}</span>
          {nbPhotos > 0 && <span className="badge-photo">📷 {nbPhotos}</span>}
          <span aria-hidden>{ouvert ? '▾' : '▸'}</span>
        </button>
        {sortie && !ligne.verifiee && (
          <button className="btn-idem" onClick={() => validerIdem(ligne.id)} aria-label="Identique à l'entrée">
            Idem
          </button>
        )}
      </div>

      {ouvert && (
        <div className="ligne-corps">
          {sortie && ligne.etatEntree != null && (
            <p className="rappel-entree">
              État à l'entrée : <strong>{etatLibelle(ligne.etatEntree)}</strong>
            </p>
          )}
          <div className="sous-titre">{sortie ? 'État à la sortie' : 'État'}</div>
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

          <div className="sous-titre">Document</div>
          <SelecteurDestination valeur={dest} onChange={setDestination} />

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

          {/* Champs repliés par défaut : marque/modèle, n° de série, valeur. */}
          {!details ? (
            <button className="btn discret" style={{ marginTop: 10 }} onClick={() => setDetails(true)}>
              + Détails (marque, n° série, valeur)
            </button>
          ) : (
            <>
              <label className="champ" style={{ marginTop: 10, marginBottom: 10 }}>
                <span className="lib">Marque / modèle</span>
                <input
                  type="text"
                  value={marque}
                  onChange={(e) => {
                    setMarque(e.target.value)
                    ecrireMarque(e.target.value)
                  }}
                />
              </label>
              <div className="ligne-champs">
                <label className="champ" style={{ marginBottom: 10 }}>
                  <span className="lib">N° de série</span>
                  <input
                    type="text"
                    value={serie}
                    onChange={(e) => {
                      setSerie(e.target.value)
                      ecrireSerie(e.target.value)
                    }}
                  />
                </label>
                <label className="champ" style={{ marginBottom: 10 }}>
                  <span className="lib">Valeur (€)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    className="tnum"
                    value={valeur}
                    onChange={(e) => {
                      setValeur(e.target.value)
                      ecrireValeur(e.target.value)
                    }}
                  />
                </label>
              </div>
            </>
          )}

          <div className="entre" style={{ marginTop: 12 }}>
            <div className="stepper" role="group" aria-label="Déplacer la ligne">
              <button aria-label="Monter" disabled={!peutMonter} onClick={() => deplacerLigne(ligne, -1)}>
                ↑
              </button>
              <button aria-label="Descendre" disabled={!peutDescendre} onClick={() => deplacerLigne(ligne, 1)}>
                ↓
              </button>
            </div>
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
