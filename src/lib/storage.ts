// Persistance du stockage : demande au navigateur de ne pas évincer IndexedDB.
// À appeler une fois au premier lancement. Silencieux si non supporté.

export async function demanderPersistance(): Promise<boolean> {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const dejaPersistant = await navigator.storage.persisted?.()
      if (dejaPersistant) return true
      return await navigator.storage.persist()
    }
  } catch {
    // ignore : best effort
  }
  return false
}

export async function estimationStockage(): Promise<{ usage: number; quota: number } | null> {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const { usage = 0, quota = 0 } = await navigator.storage.estimate()
      return { usage, quota }
    }
  } catch {
    // ignore
  }
  return null
}
