import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { BarreTitre } from '../components/BarreTitre'
import {
  evaluerMentions,
  evaluerMobilier,
  type LignePiece,
  type ResultatMobilier,
} from '../data/conformite'
import { detacherLigne, etatLibelle, rattacherLigne } from '../data/actions'
import { metaType } from '../data/catalogue'
import { destinationDe, inclutInventaire } from '../data/destination'
import type { Piece } from '../data/types'

export function Conformite() {
  const { constatId = '' } = useParams()
  const [rattacherItem, setRattacherItem] = useState<string | null>(null)

  const constat = useLiveQuery(() => db.constats.get(constatId), [constatId])
  const logement = useLiveQuery(
    () => (constat ? db.logements.get(constat.logementId) : undefined),
    [constat?.logementId]
  )
  const pieces = useLiveQuery(
    () => db.pieces.where('constatId').equals(constatId).sortBy('ordre'),
    [constatId]
  )
  const lignes = useLiveQuery(async () => {
    const ps = await db.pieces.where('constatId').equals(constatId).toArray()
    const ids = ps.map((p) => p.id)
    if (!ids.length) return []
    return db.lignes.where('pieceId').anyOf(ids).sortBy('ordre')
  }, [constatId])

  const lignesPiece: LignePiece[] = useMemo(() => {
    if (!pieces || !lignes) return []
    const parId = new Map(pieces.map((p) => [p.id, p]))
    return lignes
      .map((ligne) => {
        const piece = parId.get(ligne.pieceId)
        return piece ? { ligne, piece } : null
      })
      .filter((x): x is LignePiece => !!x)
  }, [pieces, lignes])

  // Le mobilier obligatoire ne compte QUE les lignes dont la destination inclut
  // l'inventaire (cf. évolution deux documents).
  const lignesInventaire = useMemo(
    () => lignesPiece.filter((lp) => inclutInventaire(destinationDe(lp.ligne))),
    [lignesPiece]
  )

  const resMobilier = useMemo(
    () => (constat ? evaluerMobilier(lignesInventaire, constat.conformite) : []),
    [lignesInventaire, constat?.conformite]
  )

  const nbParPiece = useMemo(() => {
    const m = new Map<string, number>()
    for (const { piece } of lignesPiece) m.set(piece.id, (m.get(piece.id) ?? 0) + 1)
    return m
  }, [lignesPiece])

  const resMentions = useMemo(
    () => (constat ? evaluerMentions(constat, logement ?? undefined, pieces ?? [], nbParPiece) : []),
    [constat, logement, pieces, nbParPiece]
  )

  if (!constat) {
    return (
      <div className="app">
        <BarreTitre titre="Constat introuvable" retour="/" />
      </div>
    )
  }

  const manquantsMobilier = resMobilier.filter((r) => !r.satisfait).length
  const manquantsMentions = resMentions.filter((r) => !r.satisfait).length

  return (
    <div className="app">
      <BarreTitre titre="Conformité" retour={`/constat/${constatId}/pieces`} />
      <div className="contenu">
        <p className="meta">
          Garde-fou non bloquant. Le rattachement est automatique par mot-clé, ajustable à la main.
        </p>

        <div className="entre" style={{ marginTop: 12 }}>
          <h2 className="sous-titre" style={{ margin: 0 }}>
            Mobilier minimum
          </h2>
          <span className={`badge-conf ${manquantsMobilier ? 'ko' : 'ok'}`}>
            {manquantsMobilier ? `${manquantsMobilier} manquant${manquantsMobilier > 1 ? 's' : ''}` : 'Complet'}
          </span>
        </div>
        <p className="meta" style={{ marginTop: 0 }}>
          Décret n° 2015-981 du 31 juillet 2015.
        </p>

        {resMobilier.map((r) => (
          <ItemMobilierVue
            key={r.item.id}
            resultat={r}
            onDetacher={(ligneId, auto) => detacherLigne(constatId, r.item.id, ligneId, auto)}
            onRattacher={() => setRattacherItem(r.item.id)}
          />
        ))}

        <div className="entre" style={{ marginTop: 24 }}>
          <h2 className="sous-titre" style={{ margin: 0 }}>
            Mentions du constat
          </h2>
          <span className={`badge-conf ${manquantsMentions ? 'ko' : 'ok'}`}>
            {manquantsMentions ? `${manquantsMentions} manquant${manquantsMentions > 1 ? 's' : ''}` : 'Complet'}
          </span>
        </div>
        <p className="meta" style={{ marginTop: 0 }}>
          Décret n° 2016-382 du 30 mars 2016.
        </p>

        {resMentions.map((m) => (
          <div className="conf-item" key={m.id}>
            <div className="conf-tete">
              <span className={`coche ${m.satisfait ? 'oui' : 'non'}`} aria-hidden>
                {m.satisfait ? '✓' : '✕'}
              </span>
              <span className="conf-libelle">{m.libelle}</span>
            </div>
            {!m.satisfait && m.detail && <p className="conf-detail">{m.detail}</p>}
          </div>
        ))}
      </div>

      {rattacherItem && (
        <FeuilleRattachement
          lignesPiece={lignesInventaire}
          resultat={resMobilier.find((r) => r.item.id === rattacherItem)!}
          onBasculer={(ligneId, rattachee, auto) =>
            rattachee ? detacherLigne(constatId, rattacherItem, ligneId, auto) : rattacherLigne(constatId, rattacherItem, ligneId)
          }
          onFermer={() => setRattacherItem(null)}
        />
      )}
    </div>
  )
}

function ItemMobilierVue({
  resultat,
  onDetacher,
  onRattacher,
}: {
  resultat: ResultatMobilier
  onDetacher: (ligneId: string, auto: boolean) => void
  onRattacher: () => void
}) {
  const { item, lignes, satisfait, surchargeManuelle } = resultat
  return (
    <div className="conf-item">
      <div className="conf-tete">
        <span className={`coche ${satisfait ? 'oui' : 'non'}`} aria-hidden>
          {satisfait ? '✓' : '✕'}
        </span>
        <span className="conf-libelle">{item.libelle}</span>
        {surchargeManuelle && <span className="badge-manuel">ajusté</span>}
      </div>
      {item.aide && <p className="conf-detail">{item.aide}</p>}
      <div className="chips">
        {lignes.map(({ ligne, piece, auto }) => (
          <button
            key={ligne.id}
            className={`chip ${ligne.etat}`}
            onClick={() => onDetacher(ligne.id, auto)}
            title="Détacher"
          >
            <span>
              {piece.nom} · {ligne.designation}
            </span>
            <span className="chip-x" aria-hidden>
              ✕
            </span>
          </button>
        ))}
        <button className="chip creer" onClick={onRattacher}>
          + Rattacher
        </button>
      </div>
    </div>
  )
}

function FeuilleRattachement({
  lignesPiece,
  resultat,
  onBasculer,
  onFermer,
}: {
  lignesPiece: LignePiece[]
  resultat: ResultatMobilier
  onBasculer: (ligneId: string, dejaRattachee: boolean, auto: boolean) => void
  onFermer: () => void
}) {
  // Regroupe les lignes par pièce pour un choix rapide.
  const groupes = useMemo(() => {
    const map = new Map<string, { piece: Piece; lignes: LignePiece[] }>()
    for (const lp of lignesPiece) {
      const g = map.get(lp.piece.id) ?? { piece: lp.piece, lignes: [] }
      g.lignes.push(lp)
      map.set(lp.piece.id, g)
    }
    return [...map.values()]
  }, [lignesPiece])

  const rattachees = new Map(resultat.lignes.map((l) => [l.ligne.id, l.auto]))

  return (
    <div className="feuille-fond" onClick={onFermer}>
      <div className="feuille" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Rattacher une ligne">
        <div className="feuille-tete">
          <h2>{resultat.item.libelle}</h2>
          <button className="btn discret" onClick={onFermer}>
            Terminé
          </button>
        </div>
        <div className="feuille-corps">
          {groupes.length === 0 && <p className="vide">Aucune ligne dans ce constat.</p>}
          {groupes.map(({ piece, lignes }) => (
            <div key={piece.id} style={{ marginBottom: 12 }}>
              <div className="sous-titre" style={{ marginTop: 4 }}>
                {metaType(piece.type).icone} {piece.nom}
              </div>
              {lignes.map(({ ligne }) => {
                const estRattachee = rattachees.has(ligne.id)
                const auto = rattachees.get(ligne.id) ?? false
                return (
                  <button
                    key={ligne.id}
                    className="suggestion"
                    aria-pressed={estRattachee}
                    onClick={() => onBasculer(ligne.id, estRattachee, auto)}
                  >
                    <span className={`point-etat ${ligne.etat}`} aria-hidden />
                    <span style={{ flex: 1 }}>{ligne.designation}</span>
                    <span className="cat">{etatLibelle(ligne.etat)}</span>
                    <span style={{ width: 24, textAlign: 'center' }}>{estRattachee ? '✓' : '+'}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
