import type { Destination } from '../data/types'

const SEGMENTS: { valeur: Destination; libelle: string }[] = [
  { valeur: 'edl', libelle: 'EDL' },
  { valeur: 'inventaire', libelle: 'Inventaire' },
  { valeur: 'les_deux', libelle: 'Les deux' },
]

// Sélecteur de destination : 3 positions, style neutre (ne concurrence pas le
// sélecteur d'état, coloré). La 4e valeur 'aucun' passe par un bouton discret.
export function SelecteurDestination({
  valeur,
  onChange,
}: {
  valeur: Destination
  onChange: (d: Destination) => void
}) {
  return (
    <div className="dest-bloc">
      <div className="dest-seg" role="group" aria-label="Destination du document">
        {SEGMENTS.map(({ valeur: v, libelle }) => (
          <button
            key={v}
            type="button"
            className="dest-opt"
            aria-pressed={valeur === v}
            onClick={() => onChange(v)}
          >
            {libelle}
          </button>
        ))}
      </div>
      {valeur === 'aucun' ? (
        <button type="button" className="dest-aucun actif" onClick={() => onChange('les_deux')}>
          Exclu des documents — réintégrer
        </button>
      ) : (
        <button type="button" className="dest-aucun" onClick={() => onChange('aucun')}>
          Exclure des documents
        </button>
      )}
    </div>
  )
}
