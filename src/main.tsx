import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { App } from './App'
import { demanderPersistance } from './lib/storage'
import './styles.css'

// Demande de persistance au premier lancement (best effort, cf. purge iOS).
demanderPersistance()

// Service worker : hors ligne. HashRouter pour marcher sous n'importe quel
// sous-répertoire sans configuration serveur (GitHub Pages).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL || '/'
    navigator.serviceWorker.register(`${base}sw.js`).catch(() => {
      // hors ligne au premier chargement ou contexte non sécurisé : sans gravité
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>
)
