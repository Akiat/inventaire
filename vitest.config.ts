import { defineConfig } from 'vitest/config'

// Tests en environnement Node. Le setup installe le polyfill IndexedDB
// (fake-indexeddb) avant tout import de Dexie, ce qui permet de tester les
// écritures et la génération des documents d'impression sans navigateur.
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
  },
})
