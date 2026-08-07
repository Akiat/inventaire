// Génère les icônes PNG (192, 512, 180) sans dépendance externe.
// Dessine un rendu approché de icon.svg : fond accent, carnet clair,
// tranche sombre à gauche, lignes bleues. Suffisant pour l'écran d'accueil.
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

const INK = [0x12, 0x16, 0x1b]
const PAPER = [0xf7, 0xf6, 0xf3]
const ACCENT = [0x1f, 0x5e, 0x7a]

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}

function png(size, draw) {
  // RGBA raw, une ligne = filtre 0 + size*4 octets
  const raw = Buffer.alloc(size * (size * 4 + 1))
  const px = (x, y, [r, g, b]) => {
    const row = y * (size * 4 + 1)
    raw[row] = 0
    const o = row + 1 + x * 4
    raw[o] = r
    raw[o + 1] = g
    raw[o + 2] = b
    raw[o + 3] = 255
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) px(x, y, draw(x, y))

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const idat = deflateSync(raw)
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Dessin proportionnel (coordonnées sur base 512).
function drawer(size) {
  const s = size / 512
  const inRect = (x, y, rx, ry, rw, rh) => x >= rx * s && x < (rx + rw) * s && y >= ry * s && y < (ry + rh) * s
  const lines = [
    [212, 150, 150, 20],
    [212, 210, 150, 20],
    [212, 270, 150, 20],
    [212, 330, 110, 20],
  ]
  return (x, y) => {
    // carnet clair
    if (inRect(x, y, 120, 96, 272, 320)) {
      // tranche sombre gauche
      if (inRect(x, y, 120, 96, 60, 320)) return INK
      for (const [lx, ly, lw, lh] of lines) if (inRect(x, y, lx, ly, lw, lh)) return ACCENT
      return PAPER
    }
    return ACCENT
  }
}

for (const [size, name] of [
  [192, 'icon-192.png'],
  [512, 'icon-512.png'],
  [180, 'icon-180.png'],
]) {
  writeFileSync(join(OUT, name), png(size, drawer(size)))
  console.log('écrit', name)
}
