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
  // Mise à jour automatique : quand un nouveau service worker prend le contrôle,
  // on recharge une fois pour servir le code neuf. On n'attache le rechargement
  // que si une version contrôle déjà la page — au tout premier install il n'y a
  // pas de contrôleur, et la page est déjà à jour, inutile de recharger.
  if (navigator.serviceWorker.controller) {
    let rechargement = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (rechargement) return
      rechargement = true
      window.location.reload()
    })
  }

  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL || '/'
    navigator.serviceWorker
      .register(`${base}sw.js`)
      .then((registration) => {
        // Cherche une mise à jour au lancement, puis à chaque retour au premier
        // plan : sur iOS la PWA installée est souvent réveillée sans refaire de
        // navigation, donc sans cette vérification explicite elle reste périmée.
        registration.update().catch(() => {})
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') registration.update().catch(() => {})
        })
      })
      .catch(() => {
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
