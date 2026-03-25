import { useState, useEffect } from 'react'
import Layout from './componentes/Layout/Layout'
import PaginaAutenticacao from './paginas/Autenticacao/PaginaAutenticacao'
import PaginaPerfil from './paginas/Perfil/PaginaPerfil'
import PaginaPerfilEsportivo from './paginas/PerfilEsportivo/PaginaPerfilEsportivo'
import PaginaEquipe from './paginas/Equipe/PaginaEquipe'
import PaginaExplorar from './paginas/Explorar/PaginaExplorar'
import PaginaConvite from './paginas/Equipe/PaginaConvite'
import PaginaAdminSistema from './paginas/Admin/PaginaAdminSistema'
import EquipeAdminDashboard from './paginas/Equipe/Admin/EquipeAdminDashboard'
import PaginaAdminUsuarios from './paginas/Admin/PaginaAdminUsuarios'
import PaginaNotificacoes from './paginas/Notificacoes/PaginaNotificacoes'
import Dashboard from './paginas/Inicio/Dashboard'
import { usarAutenticacao } from './contextos/AutenticacaoContexto'

function App() {
  const { estaLogado } = usarAutenticacao()
  
  // Analisa URL na inicialização para capturar links de convite
  const pathInicial = () => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/convite/')) {
        return 'convite';
      }
    }
    return null;
  };

  const [telaAtiva, setTelaAtiva] = useState(() => {
    // 1. Prioridade para links de convite (URL direta)
    const inicial = pathInicial();
    if (inicial === 'convite') return 'convite';

    // 2. Tentar recuperar última tela salva
    const salva = localStorage.getItem('playhub_tela_ativa');
    if (salva && salva !== 'convite') return salva;

    // 3. Padrão: início
    return 'inicio';
  })

  const [equipeConviteId, setEquipeConviteId] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/convite/')) {
        return path.split('/convite/')[1];
      }
    }
    return null;
  });

  // Salva a tela ativa no localStorage e sincroniza a URL
  useEffect(() => {
    // Salva para persistir após F5 (exceto convite, que depende da URL)
    if (telaAtiva !== 'convite') {
      localStorage.setItem('playhub_tela_ativa', telaAtiva);
    }

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
        return <PaginaEquipe aoVoltar={() => setTelaAtiva('inicio')} abrirGestao={() => setTelaAtiva('equipe_admin')} />
      case 'equipe_admin':
        return <EquipeAdminDashboard aoVoltar={() => setTelaAtiva('equipe')} />
      case 'sistema':
        return <PaginaAdminSistema aoSelecionarEquipe={() => setTelaAtiva('equipe')} />
      case 'usuarios_sistema':
        return <PaginaAdminUsuarios />
      case 'explorar':
        return <PaginaExplorar aoVoltar={() => setTelaAtiva('inicio')} />
      case 'notificacoes':
        return <PaginaNotificacoes aoVoltar={() => setTelaAtiva('inicio')} />
      case 'convite':
        return <PaginaConvite equipeId={equipeConviteId} aoVoltar={() => setTelaAtiva('inicio')} />
      case 'inicio':
      default:
        return <Dashboard aoNavegar={setTelaAtiva} />
    }
  }

  return (
    <Layout telaAtiva={telaAtiva} setTelaAtiva={setTelaAtiva}>
      {renderizarTela()}
    </Layout>
  )
}

export default App
