import { useState } from 'react';
import { 
  LayoutDashboard, Users, Settings, LogOut, Menu, X, 
  ChevronRight, UserCircle, Trophy, Globe, Building2, Shield, Bell,
  Calendar, DollarSign, ChevronDown, ShieldCheck, Wallet, BarChart2,
  Plus, SquarePlus, CircleHelp, Crown
} from 'lucide-react';
import './BarraLateral.css';
import { supabase } from '../../servicos/supabase';
import { usarEquipe } from '../../contextos/EquipeContexto';
import { usarAutenticacao } from '../../contextos/AutenticacaoContexto';
import { usarNotificacoes } from '../../contextos/NotificacoesContexto';
import BannerInstalacaoApp from '../../componentes/Pwa/BannerInstalacaoApp';
import ModalTutorial from '../Ajuda/ModalTutorial';

const BarraLateral = ({ ativo, setAtivo, abaEquipe, setAbaEquipe }) => {
  const [aberta, setAberta] = useState(false);
  const [menuEquipeExpandido, setMenuEquipeExpandido] = useState(true);
  const [modalTutorialAberto, setModalTutorialAberto] = useState(false);
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
  const { ehSuperAdmin, dadosUsuario, logout } = usarAutenticacao();
  
  // O usuário pediu para que solicitações de ingresso não fiquem na aba de equipe, mas sim na aba de Notificações Gerais.
  const totalNotificacoesEquipe = (convitesPendentesGlobais || 0) + (transferenciasPendentesGlobais || 0);

  const temPermissao = (perm) => {
    if (ehSuperAdmin && equipeAtiva?.gestao_global) return true;
    if (equipeAtiva?.papel === 'admin') return true;
    if (equipeAtiva?.papel === 'sub_admin' && equipeAtiva?.permissoes?.includes(perm)) return true;
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
        { id: 'minha-equipe', label: 'Minha Equipe', icone: Trophy },
        { id: 'agenda',       label: 'Partidas',      icone: Calendar },
        ...(equipeAtiva.gestao_financeira && temPermissao('gerenciar_financeiro') ? [{ id: 'financeiro-mensal', label: 'Mensalistas', icone: DollarSign }] : []),
        ...(equipeAtiva.gestao_financeira && temPermissao('gerenciar_financeiro') ? [{ id: 'financeiro-avulsos', label: 'Avulsos', icone: Wallet }] : []),
        ...(equipeAtiva.gestao_financeira && (temPermissao('ver_relatorios') || temPermissao('gerenciar_financeiro')) ? [{ id: 'financeiro-relatorios', label: 'Relatórios', icone: BarChart2 }] : []),
        { id: 'membros',      label: 'Membros & Cargos', icone: Users },
        ...(temPermissao('gerenciar_membros') ? [{ id: 'solicitacoes', label: 'Solicitações G.', icone: Bell }] : []),
        { id: 'disciplina', label: 'Fair Play', icone: Shield },
        ...(temPermissao('gerenciar_equipe') ? [{ id: 'regras-config', label: 'Regras & Config', icone: Settings }] : []),
        ...(temPermissao('gerenciar_membros') ? [{ id: 'descobrir', label: 'Buscar Atletas', icone: Globe }] : []),
        ...(equipeAtiva.papel === 'admin' || (ehSuperAdmin && equipeAtiva.gestao_global) ? [{ id: 'permissoes', label: 'Permissões (Gestores)', icone: Crown }] : []),
      ] : []
    },
    { id: 'perfil',           icone: UserCircle,       label: 'Meu Perfil' },
    { id: 'perfil_esportivo', icone: Trophy,           label: 'Perfil Esportivo' },
    { id: 'explorar',         icone: Globe,            label: 'Explorar' },
    ...(ehSuperAdmin ? [
      { id: 'sistema', icone: Building2, label: 'Equipes do Sistema' },
      { id: 'usuarios_sistema', icone: Shield, label: 'Usuários do Sistema' }
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
                  <span className="item-nav-icone"><Icone size={19} /></span>
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
                      const SubIcone = sub.icone;
                      const isSubAtivo = abaEquipe === sub.id && isActive;
                      return (
                        <button
                          key={sub.id}
                          className={`submenu-item ${isSubAtivo ? 'sub-ativo' : ''}`}
                          onClick={() => {
                            setAbaEquipe(sub.id);
                            setAtivo('equipe');
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
                <span className="usuario-nome">{dadosUsuario.apelido || dadosUsuario.nome_completo?.split(' ')[0]}</span>
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
      />
    </>
  );
};

export default BarraLateral;
