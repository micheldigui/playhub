import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AutenticacaoProvedor } from './contextos/AutenticacaoContexto'
import { EquipeProvedor } from './contextos/EquipeContexto'
import { PartidasProvider } from './contextos/PartidasContexto'
import { FinanceiroProvider } from './contextos/FinanceiroContexto'
import './estilos/global.css'

import { NotificacoesProvedor } from './contextos/NotificacoesContexto'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AutenticacaoProvedor>
      <EquipeProvedor>
        <PartidasProvider>
          <FinanceiroProvider>
            <NotificacoesProvedor>
              <App />
            </NotificacoesProvedor>
          </FinanceiroProvider>
        </PartidasProvider>
      </EquipeProvedor>
    </AutenticacaoProvedor>
  </React.StrictMode>,
)
