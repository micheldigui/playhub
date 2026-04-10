import { useState, useEffect, lazy, Suspense } from 'react'
import Layout from './componentes/Layout/Layout'
import PaginaAutenticacao from './paginas/Autenticacao/PaginaAutenticacao'
import { usarAutenticacao } from './contextos/AutenticacaoContexto'
import { PwaProvedor } from './contextos/PwaContexto'

// Code splitting via lazy loading para melhorar performance inicial
const PaginaPerfil = lazy(() => import('./paginas/Perfil/PaginaPerfil'))
const PaginaPerfilEsportivo = lazy(() => import('./paginas/PerfilEsportivo/PaginaPerfilEsportivo'))
const PaginaEquipe = lazy(() => import('./paginas/Equipe/PaginaEquipe'))
const PaginaExplorar = lazy(() => import('./paginas/Explorar/PaginaExplorar'))
const PaginaConvite = lazy(() => import('./paginas/Equipe/PaginaConvite'))
const PaginaAdminSistema = lazy(() => import('./paginas/Admin/PaginaAdminSistema'))
const EquipeAdminDashboard = lazy(() => import('./paginas/Equipe/Admin/EquipeAdminDashboard'))
const PaginaAdminUsuarios = lazy(() => import('./paginas/Admin/PaginaAdminUsuarios'))
const PaginaAdminEstatisticas = lazy(() => import('./paginas/Admin/PaginaAdminEstatisticas'))
const PaginaNotificacoes = lazy(() => import('./paginas/Notificacoes/PaginaNotificacoes'))
const Dashboard = lazy(() => import('./paginas/Inicio/Dashboard'))
const LandingPage = lazy(() => import('./paginas/Landing/LandingPage'))
const GerenciarEquipes = lazy(() => import('./paginas/Equipe/GerenciarEquipes'))
const PaginaConfiguracoes = lazy(() => import('./paginas/Configuracoes/PaginaConfiguracoes'))
const PaginaTermos = lazy(() => import('./paginas/Legal/PaginasLegais').then(m => ({ default: m.PaginaTermos })));
const PaginaPrivacidade = lazy(() => import('./paginas/Legal/PaginasLegais').then(m => ({ default: m.PaginaPrivacidade })));

const CarregandoTela = () => (
  <div style={{ 
    display: 'flex', alignItems: 'center', justifyContent: 'center', 
    flex: 1, color: '#64748b', fontSize: '0.9rem', gap: '8px' 
  }}>
    <div style={{ 
      width: '20px', height: '20px', border: '2px solid rgba(56,189,248,0.3)',
      borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 0.8s linear infinite'
    }} />
    Carregando...
  </div>
)

function App() {
  // Força o título correto da aba (limpeza de cache/metadados antigos)
  useEffect(() => {
    document.title = "PlayHub - Gestão de Equipes";
  }, []);

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

    // 2. Persistência de navegação
    const salva = localStorage.getItem('playhub_tela_ativa');
    if (salva) return salva;

    // 3. Default
    return 'inicio';
  })

  // Novo estado centralizado para saber qual seção da equipe o usuário está vendo
  const [abaEquipe, setAbaEquipe] = useState(() => {
    return localStorage.getItem('playhub_aba_equipe') || 'minha-equipe';
  });

  const [equipeConviteId, setEquipeConviteId] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/convite/')) {
        return path.split('/convite/')[1];
      }
    }
    return null;
  });
  
  const [querFazerLogin, setQuerFazerLogin] = useState(false);
  const [telaAuth, setTelaAuth] = useState('login');

  // Sincroniza a URL sem persistir a tela no localStorage
  useEffect(() => {
    if (telaAtiva === 'convite' && equipeConviteId) {
      window.history.replaceState(null, '', `/convite/${equipeConviteId}`);
    } else if (telaAtiva === 'inicio' && window.location.pathname !== '/') {
      window.history.replaceState(null, '', '/');
    }

    // Persistência da tela e aba
    localStorage.setItem('playhub_tela_ativa', telaAtiva);
    localStorage.setItem('playhub_aba_equipe', abaEquipe);
  }, [telaAtiva, equipeConviteId, abaEquipe]);

  if (!estaLogado) {
    // PRIMEIRO: verifica se o usuário clicou em login/cadastro (tem prioridade sobre convite)
    if (querFazerLogin) {
      return (
        <Suspense fallback={<CarregandoTela />}>
          <PaginaAutenticacao aoVoltar={() => setQuerFazerLogin(false)} telaInicial={telaAuth} />
        </Suspense>
      );
    }

    // DEPOIS: mostra a página de convite
    if (telaAtiva === 'convite') {
      return (
        <Suspense fallback={<CarregandoTela />}>
          <PaginaConvite 
            equipeId={equipeConviteId} 
            aoVoltar={() => setQuerFazerLogin(true)} 
            aoNavegar={(tela) => {
              if (tela === 'login' || tela === 'cadastro') {
                setTelaAuth(tela);
                setQuerFazerLogin(true);
              }
            }}
          />
        </Suspense>
      );
    }

    // Default: Landing Page para todos os acessos deslogados
    return (
      <Suspense fallback={<CarregandoTela />}>
        <LandingPage aoLogin={() => setQuerFazerLogin(true)} />
      </Suspense>
    );
  }

  const renderizarTela = () => {
    switch (telaAtiva) {
      case 'perfil':
        return <PaginaPerfil aoVoltar={() => setTelaAtiva('inicio')} />
      case 'perfil_esportivo':
        return <PaginaPerfilEsportivo aoVoltar={() => setTelaAtiva('inicio')} />
      case 'equipe':
        return (
          <PaginaEquipe 
            aoVoltar={() => setTelaAtiva('inicio')} 
            abrirGestao={() => setAbaEquipe('gestao')} 
            abaAtiva={abaEquipe}
            setAbaAtiva={setAbaEquipe}
          />
        )
      case 'equipe_admin':
        return <EquipeAdminDashboard aoVoltar={() => setTelaAtiva('equipe')} />
      case 'sistema':
        return <PaginaAdminSistema aoSelecionarEquipe={() => setTelaAtiva('equipe')} />
      case 'usuarios_sistema':
        return <PaginaAdminUsuarios />
      case 'estatisticas':
        return <PaginaAdminEstatisticas />
      case 'explorar':
        return <PaginaExplorar aoVoltar={() => setTelaAtiva('inicio')} />
      case 'notificacoes':
        return <PaginaNotificacoes 
          aoVoltar={() => setTelaAtiva('inicio')} 
          abrirEquipeTab={(aba) => {
            setTelaAtiva('equipe');
            setAbaEquipe(aba);
          }}
        />
      case 'convite':
        return <PaginaConvite equipeId={equipeConviteId} aoVoltar={() => setTelaAtiva('inicio')} aoNavegar={setTelaAtiva} />
      case 'minhas_equipes':
        return <GerenciarEquipes 
          aoVoltar={() => setTelaAtiva('inicio')} 
          aoNavegar={setTelaAtiva}
          setAbaEquipe={setAbaEquipe}
        />
      case 'configuracoes':
        return <PaginaConfiguracoes 
          aoVoltar={() => setTelaAtiva('inicio')} 
          aoNavegar={setTelaAtiva}
        />
      case 'termos':
        return <PaginaTermos aoVoltar={() => setTelaAtiva('configuracoes')} />
      case 'privacidade':
        return <PaginaPrivacidade aoVoltar={() => setTelaAtiva('configuracoes')} />
      case 'inicio':
      default:
        return <Dashboard 
          aoNavegar={setTelaAtiva} 
          setAbaEquipe={setAbaEquipe} 
        />
    }
  }

  return (
    <PwaProvedor>
      <Layout 
        telaAtiva={telaAtiva} 
        setTelaAtiva={setTelaAtiva}
        abaEquipe={abaEquipe}
        setAbaEquipe={setAbaEquipe}
      >
        <Suspense fallback={<CarregandoTela />}>
          {renderizarTela()}
        </Suspense>
      </Layout>
    </PwaProvedor>
  )
}

export default App
