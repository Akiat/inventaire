import { useEffect, useRef, useState } from 'react'

// Crée une object-URL pour un Blob et la révoque proprement au démontage.
export function useBlobUrl(blob: Blob | undefined | null): string | undefined {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!blob) {
      setUrl(undefined)
      return
    }
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}

// Débounce une valeur (persistance à la frappe, 300 ms par défaut).
export function useDebounce<T>(valeur: T, delai = 300): T {
  const [debounced, setDebounced] = useState(valeur)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(valeur), delai)
    return () => clearTimeout(t)
  }, [valeur, delai])
  return debounced
}

// Renvoie une fonction stable qui persiste `patch` après un délai d'inactivité.
// Utile pour les textarea/inputs contrôlés : on met à jour l'état local
// immédiatement, on écrit en base après le debounce.
export function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  delai = 300
): (...args: A) => void {
  const ref = useRef(fn)
  ref.current = fn
  const timer = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => () => clearTimeout(timer.current), [])
  return (...args: A) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => ref.current(...args), delai)
  }
}
