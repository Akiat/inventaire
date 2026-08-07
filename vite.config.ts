import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Déclaration minimale pour éviter @types/node (hors dépendances autorisées).
declare const process: { env: Record<string, string | undefined> }

// Base configurable si l'app est servie depuis un sous-répertoire (GitHub Pages).
// Surchargeable via la variable d'environnement BASE_PATH au build.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
})
