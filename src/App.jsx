import { useState } from 'react'
import Layout from './componentes/Layout/Layout'
import Botao from './componentes/Botao/Botao'
import ModalCriacaoEquipe from './componentes/Equipe/ModalCriacaoEquipe'
import PaginaAutenticacao from './paginas/Autenticacao/PaginaAutenticacao'
import PaginaPerfil from './paginas/Perfil/PaginaPerfil'
import PaginaPerfilEsportivo from './paginas/PerfilEsportivo/PaginaPerfilEsportivo'
import PaginaEquipe from './paginas/Equipe/PaginaEquipe'
import PaginaExplorar from './paginas/Explorar/PaginaExplorar'
import PaginaConvite from './paginas/Equipe/PaginaConvite'
import { usarAutenticacao } from './contextos/AutenticacaoContexto'
import { useEffect } from 'react'

function App() {
  const { estaLogado } = usarAutenticacao()
  const [modalAberto, setModalAberto] = useState(false)
  
  // Analisa URL na inicialização para capturar links de convite
  const pathInicial = () => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/convite/')) {
        return 'convite';
      }
    }
    return 'inicio';
  };

  const [telaAtiva, setTelaAtiva] = useState(pathInicial())
  const [equipeConviteId, setEquipeConviteId] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/convite/')) {
        return path.split('/convite/')[1];
      }
    }
    return null;
  });

  // Corrige a URL visualmente após carregar o estado
  useEffect(() => {
    if (telaAtiva === 'convite' && equipeConviteId) {
      window.history.replaceState(null, '', `/convite/${equipeConviteId}`);
    } else if (telaAtiva === 'inicio' && window.location.pathname !== '/') {
      window.history.replaceState(null, '', '/');
    }
  }, [telaAtiva, equipeConviteId]);

  if (!estaLogado) {
    return <PaginaAutenticacao />
  }

  const renderizarTela = () => {
    switch (telaAtiva) {
      case 'perfil':
        return <PaginaPerfil aoVoltar={() => setTelaAtiva('inicio')} />
      case 'perfil_esportivo':
        return <PaginaPerfilEsportivo aoVoltar={() => setTelaAtiva('inicio')} />
      case 'equipe':
        return <PaginaEquipe aoVoltar={() => setTelaAtiva('inicio')} />
      case 'explorar':
        return <PaginaExplorar aoVoltar={() => setTelaAtiva('inicio')} />
      case 'convite':
        return <PaginaConvite equipeId={equipeConviteId} aoVoltar={() => setTelaAtiva('inicio')} />
      case 'inicio':
      default:
        return (
          <div className="boas-vindas">
            <h1>Bem-vindo ao PlayHub</h1>
            <p>Sua nova plataforma de gestão multi-equipes rápida e profissional.</p>
            <div style={{ marginTop: '2rem' }}>
              <Botao onClick={() => setModalAberto(true)}>Criar Nova Equipe</Botao>
            </div>
          </div>
        )
    }
  }

  return (
    <Layout telaAtiva={telaAtiva} setTelaAtiva={setTelaAtiva}>
      {renderizarTela()}
      
      <ModalCriacaoEquipe
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        aoCriarSucesso={() => setTelaAtiva('equipe')}
      />
    </Layout>
  )
}

export default App
