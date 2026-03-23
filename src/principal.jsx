import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AutenticacaoProvedor } from './contextos/AutenticacaoContexto'
import { EquipeProvedor } from './contextos/EquipeContexto'
import { PartidasProvider } from './contextos/PartidasContexto'
import './estilos/global.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AutenticacaoProvedor>
      <EquipeProvedor>
        <PartidasProvider>
          <App />
        </PartidasProvider>
      </EquipeProvedor>
    </AutenticacaoProvedor>
  </React.StrictMode>,
)
