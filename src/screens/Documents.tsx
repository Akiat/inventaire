import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { compterLignesParDoc } from '../print/donnees'
import { BarreTitre } from '../components/BarreTitre'

export function Documents() {
  const { constatId = '' } = useParams()
  const constat = useLiveQuery(() => db.constats.get(constatId), [constatId])
  const compte = useLiveQuery(() => compterLignesParDoc(constatId), [constatId])

  if (!constat) {
    return (
      <div className="app">
        <BarreTitre titre="Constat introuvable" retour="/" />
      </div>
    )
  }

  const type = constat.type === 'entree' ? "d'entrée" : 'de sortie'

  const cartes = [
    {
      doc: 'edl',
      titre: `État des lieux ${type}`,
      desc: "Revêtements, menuiseries, équipements du logement. Compteurs et clés inclus.",
      n: compte?.edl ?? 0,
    },
    {
      doc: 'inventaire',
      titre: `Inventaire du mobilier ${type}`,
      desc: 'Le meublé : mobilier, literie, vaisselle, électroménager, avec quantités et valeurs.',
      n: compte?.inventaire ?? 0,
    },
  ]

  return (
    <div className="app">
      <BarreTitre titre="Documents" retour={`/constat/${constatId}/pieces`} />
      <div className="contenu">
        <p className="meta" style={{ marginTop: 0 }}>
          Deux documents autonomes, produits à partir de la même saisie. La destination de chaque
          ligne décide où elle apparaît.
        </p>

        {cartes.map((c) => (
          <div key={c.doc} className="carte">
            <div className="titre-carte">{c.titre}</div>
            <p className="meta" style={{ marginTop: 4 }}>
              {c.desc}
            </p>
            <div className="entre" style={{ marginTop: 10 }}>
              <span className="meta tnum">
                {c.n} ligne{c.n > 1 ? 's' : ''} incluse{c.n > 1 ? 's' : ''}
              </span>
              <Link className="btn primaire" to={`/imprimer/${constatId}/${c.doc}`}>
                Imprimer / PDF
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
