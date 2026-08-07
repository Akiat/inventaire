import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { Photo } from '../data/types'
import { etatLibelle } from '../data/actions'
import { formaterEuros } from '../lib/valeur'
import { useBlobUrl } from '../lib/hooks'
import { chargerImpression, formaterDate, type DocType, type DonneesImpression } from './donnees'
import './print.css'

function PhotoImg({ photo }: { photo: Photo }) {
  const url = useBlobUrl(photo.blob)
  return url ? <img src={url} alt="" /> : <div style={{ height: '78mm' }} />
}

export function Imprimer() {
  const { constatId = '', doc = 'edl' } = useParams()
  const typeDoc: DocType = doc === 'inventaire' ? 'inventaire' : 'edl'
  const [data, setData] = useState<DonneesImpression | null | undefined>(undefined)

  useEffect(() => {
    let vivant = true
    setData(undefined)
    chargerImpression(constatId, typeDoc).then((d) => {
      if (vivant) setData(d)
    })
    return () => {
      vivant = false
    }
  }, [constatId, typeDoc])

  if (data === undefined) return <div className="impr">Chargement…</div>
  if (data === null)
    return (
      <div className="impr">
        Constat introuvable. <a href="#/">Retour</a>
      </div>
    )

  const { constat, logement, pieces, compteurs, cles, annexe, nbPhotos, mobilier, avertissements, valeurs, valeurGlobale } =
    data
  const estEdl = typeDoc === 'edl'
  const typeLabel = constat.type === 'entree' ? "d'entrée" : 'de sortie'
  const titre = estEdl
    ? `Constat d'état des lieux ${typeLabel}`
    : `Inventaire et état du mobilier ${typeLabel}`
  const locataires = constat.locataires.filter((l) => l.trim())

  return (
    <div className="impr">
      <div className="barre-outils">
        <a className="btn" href={`#/constat/${constatId}/documents`}>
          ‹ Documents
        </a>
        <button className="btn primaire" onClick={() => window.print()}>
          Imprimer / Exporter en PDF
        </button>
        <span className="meta" style={{ color: '#666', fontSize: '9pt' }}>
          Depuis la PWA iOS : bouton Partager → Imprimer.
        </span>
      </div>

      {avertissements.length > 0 && (
        <div className="avert">
          <strong>Points de conformité à vérifier :</strong> {avertissements.join(' · ')}.
        </div>
      )}

      {/* En-tête du document — mentions complètes, document autonome. */}
      <div className="doc-entete">
        <h1>{titre}</h1>
        <div className="infos">
          <span className="cle">Date</span>
          <span className="tnum">{formaterDate(constat.date)}</span>
          <span className="cle">Logement</span>
          <span>
            {logement?.adresse || '—'}
            {logement?.complement ? `, ${logement.complement}` : ''}
          </span>
          <span className="cle">Surface</span>
          <span className="tnum">{logement?.surface ? `${logement.surface} m²` : '—'}</span>
          <span className="cle">Lots annexes</span>
          <span>{logement?.lots || '—'}</span>
          <span className="cle">Bailleur</span>
          <span>
            {logement?.bailleurNom || '—'}
            {logement?.bailleurAdresse ? `, ${logement.bailleurAdresse}` : ''}
          </span>
          <span className="cle">Locataire(s)</span>
          <span>{locataires.length ? locataires.join(' ; ') : '—'}</span>
          {constat.mandataire ? (
            <>
              <span className="cle">Mandataire</span>
              <span>{constat.mandataire}</span>
            </>
          ) : null}
        </div>
      </div>

      {/* Compteurs et clés : état des lieux uniquement. */}
      {estEdl && compteurs.length > 0 && (
        <>
          <h2>Relevés des compteurs</h2>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>N° compteur</th>
                <th>Index</th>
                <th>Photo</th>
              </tr>
            </thead>
            <tbody>
              {compteurs.map((c, i) => (
                <tr key={i}>
                  <td>{c.type || '—'}</td>
                  <td className="tnum">{c.numero || '—'}</td>
                  <td className="tnum">{c.index || '—'}</td>
                  <td className="refs">{c.ref ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {estEdl && cles.length > 0 && (
        <>
          <h2>Clés et moyens d'accès</h2>
          <table>
            <thead>
              <tr>
                <th>Libellé</th>
                <th>Nombre</th>
              </tr>
            </thead>
            <tbody>
              {cles.map((c, i) => (
                <tr key={i}>
                  <td>{c.libelle || '—'}</td>
                  <td className="tnum">{c.nombre}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Pièces */}
      {pieces.length === 0 && (
        <p style={{ fontStyle: 'italic', color: '#666' }}>Aucune ligne dans ce document.</p>
      )}
      {pieces.map(({ piece, lignes }) => (
        <section key={piece.id}>
          <h2>{piece.nom}</h2>
          <table>
            <thead>
              <tr>
                <th style={{ width: estEdl ? '32%' : '28%' }}>Désignation</th>
                <th style={{ width: '8%' }}>Qté</th>
                <th style={{ width: '14%' }}>État</th>
                <th>Observations</th>
                <th style={{ width: '14%' }}>Photos</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map(({ ligne, refsPhotos }) => (
                <tr key={ligne.id}>
                  <td>{ligne.designation}</td>
                  {/* EDL masque la quantité quand elle vaut 1 ; l'inventaire l'affiche toujours. */}
                  <td className="qte tnum">{estEdl ? (ligne.quantite > 1 ? ligne.quantite : '') : ligne.quantite}</td>
                  <td className="etat">{etatLibelle(ligne.etat)}</td>
                  <td>{ligne.observations || ''}</td>
                  <td className="refs">{refsPhotos.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      {/* Mobilier obligatoire : inventaire uniquement, en fin de document. */}
      {!estEdl && (
        <section>
          <h2>Mobilier obligatoire (meublé)</h2>
          <p className="meta" style={{ fontSize: '9pt', color: '#444', margin: '0 0 6px' }}>
            Décret n° 2015-981 du 31 juillet 2015.
          </p>
          <table>
            <thead>
              <tr>
                <th style={{ width: '32%' }}>Catégorie</th>
                <th style={{ width: '14%' }}>Présent</th>
                <th>Ligne(s) correspondante(s)</th>
              </tr>
            </thead>
            <tbody>
              {mobilier.map((m) => (
                <tr key={m.libelle}>
                  <td>{m.libelle}</td>
                  <td>{m.satisfait ? 'Oui' : 'Manquant'}</td>
                  <td>{m.refs.join(' ; ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Valeurs indicatives : inventaire uniquement. */}
      {!estEdl && valeurs.length > 0 && (
        <section>
          <h2>Valeurs indicatives</h2>
          <table>
            <thead>
              <tr>
                <th>Pièce</th>
                <th style={{ width: '30%' }}>Valeur</th>
              </tr>
            </thead>
            <tbody>
              {valeurs.map((v) => (
                <tr key={v.nom}>
                  <td>{v.nom}</td>
                  <td className="tnum">{formaterEuros(v.total)}</td>
                </tr>
              ))}
              <tr>
                <td>
                  <strong>Total</strong>
                </td>
                <td className="tnum">
                  <strong>{formaterEuros(valeurGlobale)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
          <p className="meta" style={{ fontSize: '9pt', color: '#444', margin: 0 }}>
            Estimations indicatives, hors valeur d'usage réelle.
          </p>
        </section>
      )}

      {/* Signatures */}
      <div className="signatures">
        <div className="cadre-signature">Le bailleur (ou son mandataire)</div>
        <div className="cadre-signature">Le(s) locataire(s)</div>
      </div>
      <p className="meta" style={{ fontSize: '9pt', color: '#444', marginTop: 8 }}>
        Document non signé, à faire signer via l'outil de signature électronique.
        {nbPhotos > 0 ? ` ${nbPhotos} photo(s) annexée(s).` : ' Aucune photo annexée.'}
      </p>

      {/* Annexe photos : grille 2 × 3 par page, du document courant. */}
      {annexe.length > 0 && (
        <section className="annexe">
          <h2>Annexe photographique</h2>
          <div className="annexe-grille">
            {annexe.map((a) => (
              <div className="photo-bloc" key={a.ref}>
                <PhotoImg photo={a.photo} />
                <div className="legende">
                  <span className="ref">{a.ref}</span> — {a.legende}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
