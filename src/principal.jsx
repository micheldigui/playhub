import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AutenticacaoProvedor } from './contextos/AutenticacaoContexto'
import { EquipeProvedor } from './contextos/EquipeContexto'
import './estilos/global.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AutenticacaoProvedor>
      <EquipeProvedor>
        <App />
      </EquipeProvedor>
    </AutenticacaoProvedor>
  </React.StrictMode>,
)
