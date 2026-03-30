import './Layout.css';
import BarraLateral from '../Navegacao/BarraLateral';
import { ArrowLeft } from 'lucide-react';
import ModalCriacaoEquipe from '../Equipe/ModalCriacaoEquipe';
import ModalInstalacaoApp from '../Pwa/ModalInstalacaoApp';
import { usarEquipe } from '../../contextos/EquipeContexto';
import { usarPwa } from '../../contextos/PwaContexto';

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
  const { equipeAtiva, modalCriacaoAberto, setModalCriacaoAberto } = usarEquipe();
  const { modalInstalacaoAberto, fecharModalInstalacao } = usarPwa();

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
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h2>{TITULOS_CABECALHO[telaAtiva] || 'Dashboard'}</h2>
              {(equipeAtiva && (telaAtiva === 'equipe' || telaAtiva === 'equipe_admin')) && abaEquipe !== 'minha-equipe' && (
                <span className="layout-cabecalho-equipe-nome">{equipeAtiva.nome}</span>
              )}
            </div>
          </div>
        </header>
        <section className="layout-secao">
          {children}
        </section>
      </main>

      <ModalCriacaoEquipe 
        isOpen={modalCriacaoAberto} 
        onClose={() => setModalCriacaoAberto(false)} 
      />

      {/* Modal Global de Instalação PWA */}
      {modalInstalacaoAberto && (
        <ModalInstalacaoApp aoFechar={fecharModalInstalacao} />
      )}
    </div>
  );
};

export default Layout;

