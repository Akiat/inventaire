import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import type { Cle, Compteur, Constat, Logement, TypeConstat } from '../data/types'
import { BarreTitre } from '../components/BarreTitre'
import { ChampPhoto } from '../components/ChampPhoto'
import { SelecteurDestination } from '../components/SelecteurDestination'
import { ajouterPhotoCompteur, supprimerPhoto } from '../data/actions'
import { useDebouncedCallback } from '../lib/hooks'

export function EnTeteConstat() {
  const { constatId = '' } = useParams()
  const constat = useLiveQuery(() => db.constats.get(constatId), [constatId])
  const logement = useLiveQuery(
    () => (constat ? db.logements.get(constat.logementId) : undefined),
    [constat?.logementId]
  )

  if (!constat) {
    return (
      <div className="app">
        <BarreTitre titre="Constat introuvable" retour="/" />
      </div>
    )
  }

  return (
    <div className="app">
      <BarreTitre
        titre="En-tête du constat"
        retour="/"
        actions={
          <a className="btn discret" href={`#/constat/${constatId}/pieces`}>
            Pièces ›
          </a>
        }
      />
      <div className="contenu">
        <FormConstat constat={constat} />
        {logement && <FormLogement logement={logement} />}
        <FormRemarques constat={constat} />
        <FormCompteurs constat={constat} />
        <FormCles constat={constat} />
      </div>
    </div>
  )
}

// --- Constat : type, date, locataires, mandataire ---
function FormConstat({ constat }: { constat: Constat }) {
  const [type, setType] = useState<TypeConstat>(constat.type)
  const [date, setDate] = useState(constat.date)
  const [locataires, setLocataires] = useState<string[]>(
    constat.locataires.length ? constat.locataires : ['']
  )
  const [mandataire, setMandataire] = useState(constat.mandataire ?? '')
  const [nouvelleAdresse, setNouvelleAdresse] = useState(constat.nouvelleAdresse ?? '')
  const [dateEntree, setDateEntree] = useState(constat.dateConstatEntree ?? '')

  const ecrire = useDebouncedCallback((patch: Partial<Constat>) => {
    db.constats.update(constat.id, patch)
  }, 300)

  return (
    <section>
      <h2 className="sous-titre">Constat</h2>

      <label className="champ">
        <span className="lib">Type de constat</span>
        <select
          value={type}
          onChange={(e) => {
            const v = e.target.value as TypeConstat
            setType(v)
            db.constats.update(constat.id, { type: v })
          }}
        >
          <option value="entree">Entrée</option>
          <option value="sortie">Sortie</option>
        </select>
      </label>

      <label className="champ">
        <span className="lib">Date du constat</span>
        <input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value)
            db.constats.update(constat.id, { date: e.target.value })
          }}
        />
      </label>

      <div className="champ">
        <span className="lib">Locataires (nom et domicile)</span>
        <div className="pile">
          {locataires.map((loc, i) => (
            <div className="rangee-suppr" key={i}>
              <input
                type="text"
                value={loc}
                placeholder="Nom et adresse"
                onChange={(e) => {
                  const copie = [...locataires]
                  copie[i] = e.target.value
                  setLocataires(copie)
                  ecrire({ locataires: copie })
                }}
              />
              {locataires.length > 1 && (
                <button
                  className="btn-icone"
                  aria-label="Retirer ce locataire"
                  onClick={() => {
                    const copie = locataires.filter((_, j) => j !== i)
                    setLocataires(copie)
                    db.constats.update(constat.id, { locataires: copie })
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            className="btn discret"
            onClick={() => {
              const copie = [...locataires, '']
              setLocataires(copie)
            }}
          >
            + Ajouter un locataire
          </button>
        </div>
      </div>

      <label className="champ">
        <span className="lib">Mandataire (facultatif)</span>
        <input
          type="text"
          value={mandataire}
          placeholder="Nom et qualité"
          onChange={(e) => {
            setMandataire(e.target.value)
            ecrire({ mandataire: e.target.value })
          }}
        />
      </label>

      {/* Mentions propres au constat de sortie (décret 2016-382). */}
      {type === 'sortie' && (
        <>
          <label className="champ">
            <span className="lib">Date du constat d'entrée</span>
            <input
              type="date"
              value={dateEntree}
              onChange={(e) => {
                setDateEntree(e.target.value)
                db.constats.update(constat.id, { dateConstatEntree: e.target.value })
              }}
            />
          </label>
          <label className="champ">
            <span className="lib">Nouvelle adresse du locataire</span>
            <input
              type="text"
              value={nouvelleAdresse}
              placeholder="Adresse après départ"
              onChange={(e) => {
                setNouvelleAdresse(e.target.value)
                ecrire({ nouvelleAdresse: e.target.value })
              }}
            />
          </label>
        </>
      )}
    </section>
  )
}

// --- Remarques : texte libre ajouté au(x) document(s) ---
function FormRemarques({ constat }: { constat: Constat }) {
  const [texte, setTexte] = useState(constat.remarques ?? '')
  useEffect(() => setTexte(constat.remarques ?? ''), [constat.id])

  const ecrire = useDebouncedCallback((v: string) => {
    db.constats.update(constat.id, { remarques: v })
  }, 300)

  return (
    <section>
      <h2 className="sous-titre">Remarques</h2>
      <label className="champ">
        <span className="lib">Observations générales (facultatif)</span>
        <textarea
          value={texte}
          rows={3}
          placeholder="Texte libre ajouté au(x) document(s)…"
          onChange={(e) => {
            setTexte(e.target.value)
            ecrire(e.target.value)
          }}
        />
      </label>
      {texte.trim() && (
        <div style={{ marginTop: 4 }}>
          <span className="lib" style={{ display: 'block', marginBottom: 6 }}>
            Ce texte figure dans…
          </span>
          <SelecteurDestination
            valeur={constat.remarquesDestination ?? 'les_deux'}
            onChange={(d) => db.constats.update(constat.id, { remarquesDestination: d })}
          />
        </div>
      )}
    </section>
  )
}

// --- Logement ---
function FormLogement({ logement }: { logement: Logement }) {
  const [f, setF] = useState<Logement>(logement)
  // Resynchronise si l'entité change (rare, mais évite un état figé).
  useEffect(() => setF(logement), [logement.id])

  const ecrire = useDebouncedCallback((patch: Partial<Logement>) => {
    db.logements.update(logement.id, patch)
  }, 300)

  const champ = (cle: keyof Logement, libelle: string, placeholder = '') => (
    <label className="champ">
      <span className="lib">{libelle}</span>
      <input
        type="text"
        value={f[cle]}
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value
          setF((p) => ({ ...p, [cle]: v }))
          ecrire({ [cle]: v })
        }}
      />
    </label>
  )

  return (
    <section>
      <h2 className="sous-titre">Logement</h2>
      {champ('adresse', 'Adresse')}
      {champ('complement', 'Étage, bâtiment, n° de lot')}
      <div className="ligne-champs">
        {champ('surface', 'Surface (m²)')}
      </div>
      {champ('lots', 'Lots annexes', 'cave, balcon, parking…')}
      {champ('bailleurNom', 'Nom du bailleur')}
      {champ('bailleurAdresse', 'Domicile du bailleur')}
    </section>
  )
}

// --- Compteurs ---
function FormCompteurs({ constat }: { constat: Constat }) {
  const photos = useLiveQuery(
    () => db.photos.where('constatId').equals(constat.id).toArray(),
    [constat.id]
  )

  function maj(compteurs: Compteur[]) {
    db.constats.update(constat.id, { compteurs })
  }

  function modifier(i: number, patch: Partial<Compteur>) {
    const copie = constat.compteurs.map((c, j) => (j === i ? { ...c, ...patch } : c))
    maj(copie)
  }

  return (
    <section>
      <h2 className="sous-titre">Compteurs</h2>
      <div className="pile">
        {constat.compteurs.map((c, i) => {
          const photosCompteur = (photos ?? []).filter((p) => p.id === c.photoId)
          return (
            <div className="carte" key={i}>
              <div className="ligne-champs">
                <label className="champ" style={{ marginBottom: 8 }}>
                  <span className="lib">Type</span>
                  <input
                    type="text"
                    value={c.type}
                    placeholder="électricité, gaz, eau…"
                    onChange={(e) => modifier(i, { type: e.target.value })}
                  />
                </label>
              </div>
              <div className="ligne-champs">
                <label className="champ" style={{ marginBottom: 8 }}>
                  <span className="lib">N° compteur</span>
                  <input
                    type="text"
                    value={c.numero}
                    onChange={(e) => modifier(i, { numero: e.target.value })}
                  />
                </label>
                <label className="champ" style={{ marginBottom: 8 }}>
                  <span className="lib">Index</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={c.index}
                    onChange={(e) => modifier(i, { index: e.target.value })}
                  />
                </label>
              </div>
              <span className="lib">Photo du relevé</span>
              <ChampPhoto
                photos={photosCompteur}
                onAjouter={async (blob) => {
                  const id = await ajouterPhotoCompteur(blob, constat.id)
                  modifier(i, { photoId: id })
                }}
                onSupprimer={async (id) => {
                  await supprimerPhoto(id)
                  modifier(i, { photoId: undefined })
                }}
              />
              <button
                className="btn discret danger"
                style={{ marginTop: 8 }}
                onClick={() => {
                  if (c.photoId) supprimerPhoto(c.photoId)
                  maj(constat.compteurs.filter((_, j) => j !== i))
                }}
              >
                Retirer ce compteur
              </button>
            </div>
          )
        })}
        <button
          className="btn"
          onClick={() => maj([...constat.compteurs, { type: '', numero: '', index: '' }])}
        >
          + Ajouter un compteur
        </button>
      </div>
    </section>
  )
}

// --- Clés ---
function FormCles({ constat }: { constat: Constat }) {
  function maj(cles: Cle[]) {
    db.constats.update(constat.id, { cles })
  }
  function modifier(i: number, patch: Partial<Cle>) {
    maj(constat.cles.map((c, j) => (j === i ? { ...c, ...patch } : c)))
  }

  return (
    <section>
      <h2 className="sous-titre">Clés et moyens d'accès</h2>
      <div className="pile">
        {constat.cles.map((c, i) => (
          <div className="ligne-champs" key={i} style={{ alignItems: 'flex-end' }}>
            <label className="champ" style={{ marginBottom: 0, flex: 2 }}>
              <span className="lib">Libellé</span>
              <input
                type="text"
                value={c.libelle}
                placeholder="clé logement, badge…"
                onChange={(e) => modifier(i, { libelle: e.target.value })}
              />
            </label>
            <label className="champ" style={{ marginBottom: 0, flex: 1 }}>
              <span className="lib">Nombre</span>
              <input
                type="number"
                min={0}
                className="tnum"
                value={c.nombre}
                onChange={(e) => modifier(i, { nombre: Number(e.target.value) || 0 })}
              />
            </label>
            <button
              className="btn-icone"
              aria-label="Retirer"
              onClick={() => maj(constat.cles.filter((_, j) => j !== i))}
            >
              ✕
            </button>
          </div>
        ))}
        <button className="btn" onClick={() => maj([...constat.cles, { libelle: '', nombre: 1 }])}>
          + Ajouter une clé
        </button>
      </div>
    </section>
  )
}
