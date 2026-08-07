// Redimensionnement et réencodage des photos avant stockage.
// Une photo iPhone brute pèse ~3 Mo ; on ramène à 1600 px de large max en
// JPEG 0.8. L'input `capture` renvoie souvent du HEIC : createImageBitmap le
// décode sur iOS. Si le décodage échoue, on lève une erreur claire plutôt que
// de perdre la photo silencieusement.

const LARGEUR_MAX = 1600
const QUALITE = 0.8

export async function preparerPhoto(fichier: File): Promise<Blob> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(fichier)
  } catch {
    throw new Error(
      "Impossible de lire cette photo (format non pris en charge, HEIC ?). " +
        "Réessayez, ou réglez l'appareil sur « Le plus compatible » (JPEG)."
    )
  }

  const ratio = bitmap.width > LARGEUR_MAX ? LARGEUR_MAX / bitmap.width : 1
  const largeur = Math.round(bitmap.width * ratio)
  const hauteur = Math.round(bitmap.height * ratio)

  const canvas = document.createElement('canvas')
  canvas.width = largeur
  canvas.height = hauteur
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error("Impossible de préparer la photo (canvas indisponible).")
  }
  ctx.drawImage(bitmap, 0, 0, largeur, hauteur)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', QUALITE)
  )
  if (!blob) throw new Error("Échec de l'encodage de la photo.")
  return blob
}
