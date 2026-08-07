import { Routes, Route } from 'react-router-dom'
import { Accueil } from './screens/Accueil'
import { EnTeteConstat } from './screens/EnTeteConstat'
import { Pieces } from './screens/Pieces'
import { Piece } from './screens/Piece'
import { Conformite } from './screens/Conformite'
import { Imprimer } from './print/Imprimer'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Accueil />} />
      <Route path="/constat/:constatId" element={<EnTeteConstat />} />
      <Route path="/constat/:constatId/pieces" element={<Pieces />} />
      <Route path="/piece/:pieceId" element={<Piece />} />
      <Route path="/constat/:constatId/conformite" element={<Conformite />} />
      <Route path="/imprimer/:constatId" element={<Imprimer />} />
    </Routes>
  )
}
