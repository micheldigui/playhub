import './Layout.css';
import BarraLateral from '../Navegacao/BarraLateral';
import { ArrowLeft } from 'lucide-react';

const TITULOS_CABECALHO = {
  inicio:           'Dashboard',
  equipe:           'Área da Equipe',
  equipe_admin:     'Gestão da Equipe',
  perfil:           'Meu Perfil',
  perfil_esportivo: 'Perfil Esportivo',
  explorar:         'Descobrir Atletas e Times',
  sistema:          'Equipes do Sistema',
  configuracoes:    'Configurações',
  convite:          'Convite de Equipe',
};

const Layout = ({ children, telaAtiva, setTelaAtiva, abaEquipe, setAbaEquipe }) => {
  return (
    <div className="layout-raiz">
      <BarraLateral 
        ativo={telaAtiva} 
        setAtivo={setTelaAtiva} 
        abaEquipe={abaEquipe}
        setAbaEquipe={setAbaEquipe}
      />
      <main className="layout-conteudo">
        <header className="layout-cabecalho">
          <div className="cabecalho-info">
            {telaAtiva !== 'inicio' && (
              <button 
                className="btn-voltar-dashboard"
                onClick={() => setTelaAtiva('inicio')}
                title="Voltar ao Dashboard"
              >
                <ArrowLeft size={18} />
                <span>Dashboard</span>
              </button>
            )}
            <h2>{TITULOS_CABECALHO[telaAtiva] || 'Dashboard'}</h2>
          </div>
        </header>
        <section className="layout-secao">
          {children}
        </section>
      </main>
    </div>
  );
};

export default Layout;

