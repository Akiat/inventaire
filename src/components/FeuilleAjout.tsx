import { useMemo, useState } from 'react'
import type { Categorie, TypePiece } from '../data/types'
import { suggestionsPour } from '../data/catalogue'
import { designationsLocales } from '../lib/catalogueLocal'

const LIB_CAT: Record<Categorie, string> = {
  sol: 'Sol',
  mur: 'Mur',
  plafond: 'Plafond',
  menuiserie: 'Menuiserie',
  equipement: 'Équipement',
  mobilier: 'Mobilier',
  vaisselle: 'Vaisselle',
  entretien: 'Entretien',
  autre: 'Autre',
}

// Normalise pour la recherche (insensible casse et accents).
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

// Feuille qui monte du bas : recherche autofocus + suggestions du catalogue.
// Reste ouverte après un ajout pour enchaîner. Frappe libre = création + enrichissement.
export function FeuilleAjout({
  typePiece,
  onAjouter,
  onFermer,
}: {
  typePiece: TypePiece
  onAjouter: (designation: string, categorie: Categorie) => void
  onFermer: () => void
}) {
  const [recherche, setRecherche] = useState('')

  const base = useMemo(() => {
    const locales = designationsLocales(typePiece).map((d) => ({
      designation: d,
      categorie: 'autre' as Categorie,
      types: [typePiece] as TypePiece[],
    }))
    return [...locales, ...suggestionsPour(typePiece)]
  }, [typePiece])

  const filtrees = useMemo(() => {
    const q = norm(recherche)
    const vues = new Set<string>()
    const res: { designation: string; categorie: Categorie }[] = []
    for (const e of base) {
      const cle = norm(e.designation)
      if (vues.has(cle)) continue
      if (q && !cle.includes(q)) continue
      vues.add(cle)
      res.push({ designation: e.designation, categorie: e.categorie })
    }
    return res
  }, [base, recherche])

  const saisieLibre = recherche.trim()
  const dejaListee = filtrees.some((f) => norm(f.designation) === norm(saisieLibre))

  return (
    <div className="feuille-fond" onClick={onFermer}>
      <div className="feuille" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Ajouter une ligne">
        <div className="feuille-tete">
          <h2>Ajouter</h2>
          <button className="btn discret" onClick={onFermer}>
            Terminé
          </button>
        </div>
        <div className="feuille-corps">
          <input
            type="text"
            autoFocus
            inputMode="text"
            placeholder="Rechercher ou saisir…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            aria-label="Rechercher une désignation"
            style={{ marginBottom: 12 }}
          />

          {saisieLibre && !dejaListee && (
            <button
              className="suggestion creer"
              onClick={() => {
                onAjouter(saisieLibre, 'autre')
                setRecherche('')
              }}
            >
              <span>+ Créer « {saisieLibre} »</span>
            </button>
          )}

          {filtrees.map((f) => (
            <button
              key={f.designation}
              className="suggestion"
              onClick={() => {
                onAjouter(f.designation, f.categorie)
                setRecherche('')
              }}
            >
              <span style={{ flex: 1 }}>{f.designation}</span>
              <span className="cat">{LIB_CAT[f.categorie]}</span>
            </button>
          ))}

          {filtrees.length === 0 && !saisieLibre && (
            <p className="vide">Aucune suggestion pour ce type de pièce.</p>
          )}
        </div>
      </div>
    </div>
  )
}
