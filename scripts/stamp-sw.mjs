// Stamps a build identifier into dist/sw.js so its bytes change on every
// deploy — the browser only detects a service-worker update when the file's
// content changes. Prefers the git commit SHA (stable per deploy), falls back
// to a timestamp outside a git checkout.
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const file = new URL('../dist/sw.js', import.meta.url)

let build
try {
  build = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim()
} catch {
  build = Date.now().toString(36)
}

const src = readFileSync(file, 'utf8')
if (!src.includes('__BUILD__')) {
  console.warn('stamp-sw: token __BUILD__ not found — already stamped?')
} else {
  writeFileSync(file, src.replace('__BUILD__', build))
  console.log('stamp-sw: sw.js stamped with build', build)
}
