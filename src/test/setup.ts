// Installs an in-memory IndexedDB implementation on the global scope. Imported
// as a vitest setup file, so it runs before any test module pulls in Dexie.
import 'fake-indexeddb/auto'
