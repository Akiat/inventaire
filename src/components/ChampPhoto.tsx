import { useRef, useState } from 'react'
import type { Photo } from '../data/types'
import { preparerPhoto } from '../lib/images'
import { useBlobUrl } from '../lib/hooks'

function Vignette({ photo, onSupprimer }: { photo: Photo; onSupprimer: () => void }) {
  const url = useBlobUrl(photo.blob)
  return (
    <div className="photo-vignette">
      {url && <img src={url} alt="Photo" />}
      <button className="photo-suppr" aria-label="Supprimer la photo" onClick={onSupprimer}>
        ✕
      </button>
    </div>
  )
}

// Galerie de photos avec ajout via l'appareil natif (input capture) et
// suppression. Redimensionne chaque photo avant de la remettre à l'appelant.
export function ChampPhoto({
  photos,
  onAjouter,
  onSupprimer,
}: {
  photos: Photo[]
  onAjouter: (blob: Blob) => Promise<void> | void
  onSupprimer: (id: string) => Promise<void> | void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string>()

  async function traiter(fichiers: FileList | null) {
    if (!fichiers || fichiers.length === 0) return
    setErreur(undefined)
    setEnCours(true)
    try {
      for (const f of Array.from(fichiers)) {
        const blob = await preparerPhoto(f)
        await onAjouter(blob)
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Échec du traitement de la photo.')
    } finally {
      setEnCours(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <div className="photos-grille">
        {photos.map((p) => (
          <Vignette key={p.id} photo={p} onSupprimer={() => onSupprimer(p.id)} />
        ))}
        <button
          type="button"
          className="ajout-photo"
          onClick={() => inputRef.current?.click()}
          aria-label="Ajouter une photo"
          disabled={enCours}
        >
          {enCours ? '…' : '＋'}
        </button>
      </div>
      {erreur && (
        <p className="meta" style={{ color: 'var(--mauvais)', marginTop: 8 }}>
          {erreur}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        hidden
        onChange={(e) => traiter(e.target.files)}
      />
    </div>
  )
}
