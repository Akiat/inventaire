import type { Etat } from '../data/types'

const ETATS: { etat: Etat; libelle: string }[] = [
  { etat: 'neuf', libelle: 'Neuf' },
  { etat: 'bon', libelle: 'Bon' },
  { etat: 'usage', libelle: 'Usage' },
  { etat: 'mauvais', libelle: 'Mauvais' },
  { etat: 'absent', libelle: 'Absent' },
]

// Cinq pastilles pleine largeur. Un tap suffit, pas de validation.
export function SelecteurEtat({
  valeur,
  onChange,
}: {
  valeur: Etat
  onChange: (e: Etat) => void
}) {
  return (
    <div className="selecteur-etat" role="group" aria-label="État">
      {ETATS.map(({ etat, libelle }) => (
        <button
          key={etat}
          type="button"
          className={`pastille ${etat}`}
          aria-pressed={valeur === etat}
          onClick={() => onChange(etat)}
        >
          {libelle}
        </button>
      ))}
    </div>
  )
}
