// Lecteur/écrivain ZIP minimal, sans dépendance. Méthode « store » (aucune
// compression) : les photos sont des JPEG déjà compressés, deflater n'apporte
// rien et coûterait une librairie. Suffisant pour empaqueter JSON + photos.

export interface FichierZip {
  nom: string
  data: Uint8Array
}

// CRC-32 (polynôme standard), table calculée une fois.
const TABLE_CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(data: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = TABLE_CRC[(c ^ data[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const enc = new TextEncoder()
const dec = new TextDecoder()

export function creerZip(fichiers: FichierZip[]): Blob {
  const chunks: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  for (const f of fichiers) {
    const nom = enc.encode(f.nom)
    const crc = crc32(f.data)
    const taille = f.data.length

    // En-tête local (30 octets + nom)
    const local = new Uint8Array(30 + nom.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true) // signature
    lv.setUint16(4, 20, true) // version nécessaire
    lv.setUint16(6, 0x0800, true) // drapeau : nom en UTF-8
    lv.setUint16(8, 0, true) // méthode : store
    lv.setUint16(10, 0, true) // heure
    lv.setUint16(12, 0, true) // date
    lv.setUint32(14, crc, true)
    lv.setUint32(18, taille, true) // taille compressée
    lv.setUint32(22, taille, true) // taille décompressée
    lv.setUint16(26, nom.length, true)
    lv.setUint16(28, 0, true) // extra
    local.set(nom, 30)

    chunks.push(local, f.data)

    // Entrée du répertoire central (46 octets + nom)
    const cd = new Uint8Array(46 + nom.length)
    const cv = new DataView(cd.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true) // version créatrice
    cv.setUint16(6, 20, true) // version nécessaire
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, 0, true) // méthode
    cv.setUint16(12, 0, true)
    cv.setUint16(14, 0, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, taille, true)
    cv.setUint32(24, taille, true)
    cv.setUint16(28, nom.length, true)
    cv.setUint16(30, 0, true) // extra
    cv.setUint16(32, 0, true) // commentaire
    cv.setUint16(34, 0, true) // disque
    cv.setUint16(36, 0, true) // attributs internes
    cv.setUint32(38, 0, true) // attributs externes
    cv.setUint32(42, offset, true) // position de l'en-tête local
    cd.set(nom, 46)
    central.push(cd)

    offset += local.length + taille
  }

  const tailleCentral = central.reduce((s, c) => s + c.length, 0)

  // Fin du répertoire central (22 octets)
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(4, 0, true)
  ev.setUint16(6, 0, true)
  ev.setUint16(8, fichiers.length, true)
  ev.setUint16(10, fichiers.length, true)
  ev.setUint32(12, tailleCentral, true)
  ev.setUint32(16, offset, true) // position du répertoire central
  ev.setUint16(20, 0, true)

  // Cast : TS 5.7 restreint BlobPart à ArrayBuffer, nos vues sont bien de ce type.
  return new Blob([...chunks, ...central, eocd] as BlobPart[], { type: 'application/zip' })
}

export async function lireZip(blob: Blob): Promise<Map<string, Uint8Array>> {
  const buf = new Uint8Array(await blob.arrayBuffer())
  const dv = new DataView(buf.buffer)
  const resultat = new Map<string, Uint8Array>()

  // Cherche la fin du répertoire central en repartant de la fin.
  let eocd = -1
  for (let i = buf.length - 22; i >= 0; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('Archive ZIP invalide.')

  const nbEntrees = dv.getUint16(eocd + 10, true)
  let p = dv.getUint32(eocd + 16, true) // début du répertoire central

  for (let n = 0; n < nbEntrees; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('Répertoire central corrompu.')
    const methode = dv.getUint16(p + 10, true)
    const tailleComp = dv.getUint32(p + 20, true)
    const nomLen = dv.getUint16(p + 28, true)
    const extraLen = dv.getUint16(p + 30, true)
    const commLen = dv.getUint16(p + 32, true)
    const posLocal = dv.getUint32(p + 42, true)
    const nom = dec.decode(buf.subarray(p + 46, p + 46 + nomLen))

    // Lit l'en-tête local pour connaître la taille exacte des champs nom/extra.
    const nomLocal = dv.getUint16(posLocal + 26, true)
    const extraLocal = dv.getUint16(posLocal + 28, true)
    const debutData = posLocal + 30 + nomLocal + extraLocal
    if (methode !== 0) throw new Error('Compression ZIP non prise en charge (store uniquement).')
    resultat.set(nom, buf.subarray(debutData, debutData + tailleComp))

    p += 46 + nomLen + extraLen + commLen
  }

  return resultat
}
