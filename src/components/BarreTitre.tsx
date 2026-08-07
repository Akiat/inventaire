import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

// Barre de titre collante avec bouton retour optionnel et zone d'actions.
export function BarreTitre({
  titre,
  sous,
  retour,
  actions,
}: {
  titre: string
  sous?: string
  retour?: string | number
  actions?: ReactNode
}) {
  const nav = useNavigate()
  return (
    <header className="entete">
      {retour !== undefined && (
        <button
          className="btn-icone"
          aria-label="Retour"
          onClick={() => (typeof retour === 'string' ? nav(retour) : nav(retour as number))}
        >
          ‹
        </button>
      )}
      <h1>
        {titre}
        {sous ? <span className="sous"> · {sous}</span> : null}
      </h1>
      {actions}
    </header>
  )
}
