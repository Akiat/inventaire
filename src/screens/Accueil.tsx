import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import {
  creerConstat,
  creerConstatDepuisModele,
  creerConstatSortie,
  supprimerConstat,
  supprimerModele,
} from '../data/actions'
import { exporterSauvegarde, importerSauvegarde } from '../lib/backup'

function formaterDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function Accueil() {
  const nav = useNavigate()
  const inputImport = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string>()

  const constats = useLiveQuery(() => db.constats.orderBy('createdAt').reverse().toArray(), [])
  const logements = useLiveQuery(() => db.logements.toArray(), [])
  const modeles = useLiveQuery(() => db.modeles.orderBy('createdAt').reverse().toArray(), [])

  async function nouveau() {
    const id = await creerConstat('entree')
    nav(`/constat/${id}`)
  }

  async function nouveauDepuisModele(modeleId: string) {
    const id = await creerConstatDepuisModele(modeleId, 'entree')
    nav(`/constat/${id}`)
  }

  async function supprimerUnModele(id: string, nom: string) {
    if (!confirm(`Supprimer le modèle « ${nom} » ?`)) return
    await supprimerModele(id)
  }

  async function surImport(fichier: File | undefined) {
    if (!fichier) return
    if (!confirm("Importer cette sauvegarde remplacera TOUT le contenu actuel. Continuer ?")) {
      if (inputImport.current) inputImport.current.value = ''
      return
    }
    try {
      await importerSauvegarde(fichier)
      setMsg('Sauvegarde importée.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Échec de l'import.")
    } finally {
      if (inputImport.current) inputImport.current.value = ''
    }
  }

  async function supprimer(id: string) {
    if (!confirm('Supprimer ce constat et toutes ses données ?')) return
    await supprimerConstat(id)
  }

  async function creerSortie(entreeId: string) {
    const id = await creerConstatSortie(entreeId)
    if (id) nav(`/constat/${id}/pieces`)
  }

  return (
    <div className="app">
      <header className="entete">
        <h1>Inventaire</h1>
      </header>

      <div className="contenu">
        <div className="pile" style={{ marginBottom: 20 }}>
          <button className="btn primaire pleine" onClick={nouveau}>
            + Nouveau constat
          </button>
          <div className="ligne-champs">
            <button className="btn" onClick={() => exporterSauvegarde()}>
              ↓ Exporter la sauvegarde
            </button>
            <button className="btn" onClick={() => inputImport.current?.click()}>
              ↑ Importer
            </button>
          </div>
          <input
            ref={inputImport}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => surImport(e.target.files?.[0])}
          />
          {msg && <p className="meta">{msg}</p>}
        </div>

        {modeles && modeles.length > 0 && (
          <>
            <h2 className="sous-titre">Modèles</h2>
            {modeles.map((m) => (
              <div key={m.id} className="carte">
                <div className="entre">
                  <div>
                    <div className="titre-carte">☆ {m.nom}</div>
                    <div className="meta tnum">
                      {m.pieces.length} pièce{m.pieces.length > 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="ligne-champs" style={{ flex: 'none' }}>
                    <button className="btn" onClick={() => nouveauDepuisModele(m.id)}>
                      Utiliser
                    </button>
                    <button
                      className="btn-icone"
                      aria-label="Supprimer le modèle"
                      onClick={() => supprimerUnModele(m.id, m.nom)}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        <h2 className="sous-titre">Constats</h2>

        {constats && constats.length === 0 && (
          <p className="vide">Aucun constat. Commencez par en créer un.</p>
        )}

        {constats?.map((c) => {
          const logement = logements?.find((l) => l.id === c.logementId)
          const titre = logement?.adresse?.trim() || 'Constat sans adresse'
          return (
            <div key={c.id} className="carte">
              <Link className="carte-lien" to={`/constat/${c.id}/pieces`}>
                <div className="titre-carte">{titre}</div>
                <div className="meta tnum">
                  {c.type === 'entree' ? 'Entrée' : 'Sortie'} · {formaterDate(c.date)}
                </div>
              </Link>
              <div className="ligne-champs" style={{ marginTop: 12 }}>
                <Link className="btn" to={`/constat/${c.id}`}>
                  En-tête
                </Link>
                <Link className="btn" to={`/constat/${c.id}/documents`}>
                  Documents
                </Link>
                <button className="btn-icone" aria-label="Supprimer" onClick={() => supprimer(c.id)}>
                  🗑
                </button>
              </div>
              {c.type === 'entree' && (
                <button
                  className="btn discret pleine"
                  style={{ marginTop: 8 }}
                  onClick={() => creerSortie(c.id)}
                >
                  → Créer le constat de sortie
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
