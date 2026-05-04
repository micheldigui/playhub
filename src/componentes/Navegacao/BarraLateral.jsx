import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, Settings, LogOut, Menu, X, 
  ChevronRight, UserCircle, Trophy, Globe, Building2, Shield, Bell,
  Calendar, DollarSign, ChevronDown, ShieldCheck, Wallet, BarChart2,
  Plus, SquarePlus, CircleHelp, Crown, MessageCircle, Zap, Instagram,
  Swords
} from 'lucide-react';
import './BarraLateral.css';
import { supabase } from '../../servicos/supabase';
import { usarEquipe } from '../../contextos/EquipeContexto';
import { usarAutenticacao } from '../../contextos/AutenticacaoContexto';
import { usarNotificacoes } from '../../contextos/NotificacoesContexto';
import BannerInstalacaoApp from '../../componentes/Pwa/BannerInstalacaoApp';
import ModalTutorial from '../Ajuda/ModalTutorial';

const BarraLateral = ({ ativo, setAtivo, abaEquipe, setAbaEquipe, setDadosNavegacao }) => {
  const [aberta, setAberta] = useState(false);
  const [menuEquipeExpandido, setMenuEquipeExpandido] = useState(true);
  const [modalTutorialAberto, setModalTutorialAberto] = useState(false);
  const [abaTutorialInicial, setAbaTutorialInicial] = useState('atleta');
  const { 
    equipeAtiva, 
    equipes,
    selecionarEquipe,
    convitesPendentesGlobais, 
    transferenciasPendentesGlobais, 
    solicitacoesPendentesGlobais,
    podeCriarEquipe,
    setModalCriacaoAberto
  } = usarEquipe();
  const { contagemNaoLidas: bolasRecebidas } = usarNotificacoes();
  const { ehSuperAdmin, ehRootAdmin, temPermissao, dadosUsuario, logout } = usarAutenticacao();

  useEffect(() => {
    const handleAbrirGuia = (e) => {
      const abaDesejada = e.detail?.aba || 'atleta';
      setAbaTutorialInicial(abaDesejada);
      setModalTutorialAberto(true);
    };
    window.addEventListener('abrir-guia-playhub', handleAbrirGuia);
    return () => window.removeEventListener('abrir-guia-playhub', handleAbrirGuia);
  }, []);
  
  // O usuário pediu para que solicitações de ingresso não fiquem na aba de equipe, mas sim na aba de Notificações Gerais.
  const totalNotificacoesEquipe = (convitesPendentesGlobais || 0) + (transferenciasPendentesGlobais || 0);

  const temPermissaoEquipe = (perm) => {
    if (ehSuperAdmin && equipeAtiva?.gestao_global) return true;
    if (equipeAtiva?.papel === 'admin' || equipeAtiva?.papel === 'sub_admin') return true;
    return false;
  };

  const ITENS_NAV = [
    { id: 'notificacoes',     icone: Bell,             label: 'Notificações' },
    { 
      id: 'minhas_equipes',   
      icone: Trophy,          
      label: 'Minhas Equipes' 
    },
    { 
      id: 'equipe',           
      icone: Users,            
      label: 'Equipe',
      subItens: equipeAtiva ? [
        { id: 'header-jogar', label: 'JOGAR', tipo: 'header' },
        { id: 'minha-equipe', label: 'Painel Geral', icone: LayoutDashboard },
        { id: 'agenda',       label: 'Partidas (Agenda)',      icone: Calendar },
        { id: 'ranking_partidas',  label: 'Hall da Fama',    icone: Trophy },
        { id: 'disciplina',   label: 'Fair Play / Punições',       icone: Shield },
        ...(temPermissaoEquipe('gerenciar_partidas') ? [{ id: 'sorteio_global', label: 'Sorteio Rápido', icone: Zap }] : []),
        
        { id: 'header-elenco', label: 'ELENCO', tipo: 'header' },
        { id: 'membros',      label: 'Membros & Cargos', icone: Users },
        ...(temPermissaoEquipe('gerenciar_membros') ? [{ id: 'solicitacoes', label: 'Solicitações G.', icone: Bell }] : []),
        ...(temPermissaoEquipe('gerenciar_membros') ? [{ id: 'descobrir', label: 'Buscar Atletas', icone: Globe }] : []),
        
        ...(equipeAtiva.gestao_financeira && (temPermissaoEquipe('gerenciar_financeiro') || temPermissaoEquipe('ver_relatorios')) ? [
          { id: 'header-caixa', label: 'CAIXA', tipo: 'header' },
          ...(temPermissaoEquipe('gerenciar_financeiro') ? [{ id: 'financeiro-mensal', label: 'Mensalistas', icone: DollarSign }] : []),
          ...(temPermissaoEquipe('gerenciar_financeiro') ? [{ id: 'financeiro-avulsos', label: 'Avulsos', icone: Wallet }] : []),
          { id: 'financeiro-relatorios', label: 'Relatórios Financeiros', icone: BarChart2 }
        ] : []),
        
        { id: 'header-gestao', label: 'GESTÃO', tipo: 'header' },
        ...(temPermissaoEquipe('gerenciar_equipe') ? [{ id: 'regras-config', label: 'Regras & Config', icone: Settings }] : []),
        ...(equipeAtiva.papel === 'admin' || (ehSuperAdmin && equipeAtiva.gestao_global) ? [{ id: 'permissoes', label: 'Permissões e Níveis', icone: Crown }] : []),
      ] : []
    },
    { id: 'perfil',           icone: UserCircle,       label: 'Meu Perfil' },
    { id: 'perfil_esportivo', icone: Trophy,           label: 'Perfil Esportivo' },
    { id: 'explorar',         icone: Globe,            label: 'Explorar' },
    
    // Itens Administrativos com checagem de permissão Root ou Granular
    ...(ehRootAdmin || temPermissao('equipes') ? [
      { id: 'sistema', icone: Building2, label: 'Equipes do Sistema' }
    ] : []),
    ...(ehRootAdmin || temPermissao('usuarios') ? [
      { id: 'usuarios_sistema', icone: Shield, label: 'Usuários do Sistema' }
    ] : []),
    ...(ehRootAdmin || temPermissao('estatisticas') ? [
      { id: 'estatisticas', icone: BarChart2, label: 'Gestão & Estatísticas' }
    ] : []),
    
    { id: 'configuracoes',    icone: Settings,          label: 'Configurações' },
  ];


  return (
    <>
      <button className="hamburguer" onClick={() => setAberta(true)} aria-label="Abrir menu">
        <Menu size={22} />
      </button>

      {aberta && <div className="barra-overlay" onClick={() => setAberta(false)} />}

      <aside className={`barra-lateral ${aberta ? 'barra-aberta' : ''}`}>
        <div className="barra-topo">
          <div className="logotipo">
            <div className="logo-icone" style={{ background: 'transparent', boxShadow: 'none' }}>
              <img src="/icon_ph_oficial_cf.png" alt="PlayHub" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }} />
            </div>
            <span className="logo-texto">PlayHub</span>
          </div>
          <button className="barra-fechar" onClick={() => setAberta(false)} aria-label="Fechar menu">
            <X size={20} />
          </button>
        </div>

        <nav className="navegacao">
          <div key="inicio" className={`nav-item-container ${ativo === 'inicio' ? 'container-ativo' : ''}`}>
            <button className={`item-nav ${ativo === 'inicio' ? 'ativo' : ''}`} onClick={() => { setAtivo('inicio'); setAberta(false); }}>
              <span className="item-nav-icone"><LayoutDashboard size={19} /></span>
              <span className="item-nav-label">Início</span>
              <ChevronRight size={14} className="item-nav-seta" />
            </button>
          </div>

          {ITENS_NAV.filter(i => i.id !== 'inicio').map(({ id, icone: Icone, label, subItens }) => {
            const isEquipe = id === 'equipe';
            const isActive = ativo === id;
            const hasSubmenu = subItens && subItens.length > 0;

            return (
              <div key={id} className={`nav-item-container ${isActive ? 'container-ativo' : ''}`}>
                <button
                  className={`item-nav ${isActive ? 'ativo' : ''}`}
                  onClick={() => { 
                    if (isEquipe && hasSubmenu) {
                      setMenuEquipeExpandido(!menuEquipeExpandido);
                      // Se houver solicitações pendentes, abre direto nela
                      if (solicitacoesPendentesGlobais > 0) {
                        setAbaEquipe('solicitacoes');
                      }
                    }
                    setAtivo(id); 
                    if (!hasSubmenu) setAberta(false); 
                  }}
                >
                  <span className="item-nav-icone">
                    {id === 'perfil' ? (
                      <div className="mini-avatar-nav">
                        {dadosUsuario?.foto_url ? (
                          <img src={dadosUsuario.foto_url} alt="Perfil" />
                        ) : (
                          <Icone size={19} />
                        )}
                      </div>
                    ) : (
                      <Icone size={19} />
                    )}
                  </span>
                  <span className="item-nav-label">
            {id === 'equipe' && equipeAtiva ? equipeAtiva.nome : label}
            {id === 'equipe' && totalNotificacoesEquipe > 0 && (
              <span 
                className="badge-nav-num" 
                title="Acesse a aba 'Solicitações' para ver os pedidos pendentes"
                onClick={(e) => {
                    e.stopPropagation();
                    setAtivo('equipe');
                    setAbaEquipe('solicitacoes');
                    setMenuEquipeExpandido(true);
                    setAberta(false);
                }}
              >
                {totalNotificacoesEquipe}
              </span>
            )}
            {id === 'notificacoes' && bolasRecebidas > 0 && (
              <span className="badge-nav-num" style={{ background: 'var(--primaria)', color: '#0f172a' }}>
                {bolasRecebidas}
              </span>
            )}
          </span>
                  {hasSubmenu ? (
                    <ChevronDown size={14} className={`item-nav-seta ${menuEquipeExpandido ? 'girar' : ''}`} />
                  ) : (
                    <ChevronRight size={14} className="item-nav-seta" />
                  )}
                </button>

                {isEquipe && menuEquipeExpandido && hasSubmenu && (
                  <div className="submenu">
                    {subItens.map((sub) => {
                      if (sub.tipo === 'header') {
                        return (
                          <div key={sub.id} className="submenu-header">
                            {sub.label}
                          </div>
                        );
                      }
                      const SubIcone = sub.icone;
                      const isSubAtivo = abaEquipe === sub.id && isActive;
                      return (
                        <button
                          key={sub.id}
                          className={`submenu-item ${isSubAtivo ? 'sub-ativo' : ''}`}
                          onClick={() => {
                            if (sub.id === 'sorteio_global') {
                                setAtivo('sorteio_v4');
                            } else if (sub.id === 'ranking_partidas') {
                                setAtivo('ranking_partidas');
                            } else if (sub.id === 'agendar') {
                                setAbaEquipe('agenda');
                                setAtivo('equipe');
                                if (setDadosNavegacao) {
                                    setDadosNavegacao(prev => ({ ...prev, abrirModalCriacaoPartida: Date.now() }));
                                }
                            } else {
                                setAbaEquipe(sub.id);
                                setAtivo('equipe');
                            }
                            setAberta(false);
                          }}
                        >
                          <span className="submenu-icone"><SubIcone size={16} /></span>
                          <span className="submenu-label">{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ padding: '8px 16px', marginTop: '8px' }}>
            <BannerInstalacaoApp local="menu" aoClicarMenu={() => setAberta(false)} />
          </div>
        </nav>

        <div className="barra-rodape">
          <button 
            className="item-nav btn-ajuda-sidebar" 
            onClick={() => {
              setModalTutorialAberto(true);
              setAberta(false);
            }}
            style={{ width: '100%', marginBottom: '10px' }}
          >
            <span className="item-nav-icone"><CircleHelp size={19} /></span>
            <span className="item-nav-label">Guia do App</span>
          </button>
          
          <a 
            href="https://www.instagram.com/playhubapp"
            target="_blank"
            rel="noopener noreferrer"
            className="item-nav btn-instagram-sidebar" 
            style={{ 
              width: '100%', 
              marginBottom: '10px',
              textDecoration: 'none',
              color: '#f8fafc'
            }}
          >
            <span className="item-nav-icone" style={{ color: '#E1306C' }}><Instagram size={19} /></span>
            <span className="item-nav-label">Seguir Instagram</span>
          </a>

          {dadosUsuario && (
            <div className="usuario-logado">
              <div className="usuario-foto-container">
                {dadosUsuario.foto_url ? (
                  <img src={dadosUsuario.foto_url} alt="Perfil" className="usuario-foto-img" />
                ) : (
                  <span>{dadosUsuario.nome_completo?.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="usuario-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="usuario-nome">{dadosUsuario.apelido || dadosUsuario.nome_completo?.split(' ')[0]}</span>
                    {ehRootAdmin && <ShieldCheck size={14} color="#fbbf24" title="Super Admin Root" />}
                </div>
                <span className="usuario-email">{dadosUsuario.email}</span>
              </div>
            </div>
          )}
          <button className="botao-sair" onClick={logout}>
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>
      <ModalTutorial 
        isOpen={modalTutorialAberto} 
        onClose={() => setModalTutorialAberto(false)} 
        abaInicial={abaTutorialInicial}
      />
    </>
  );
};

export default BarraLateral;
