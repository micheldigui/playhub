import { useState } from 'react';
import { 
  LayoutDashboard, Users, Settings, LogOut, Menu, X, 
  ChevronRight, UserCircle, Trophy, Globe, Building2, Shield, Bell 
} from 'lucide-react';
import './BarraLateral.css';
import { supabase } from '../../servicos/supabase';
import { usarEquipe } from '../../contextos/EquipeContexto';
import { usarAutenticacao } from '../../contextos/AutenticacaoContexto';
import { usarNotificacoes } from '../../contextos/NotificacoesContexto';

const BarraLateral = ({ ativo, setAtivo }) => {
  const [aberta, setAberta] = useState(false);
  const { convitesPendentesGlobais, transferenciasPendentesGlobais, solicitacoesPendentesGlobais } = usarEquipe();
  const { contagemNaoLidas: bolasRecebidas } = usarNotificacoes();
  const { ehSuperAdmin, dadosUsuario } = usarAutenticacao();
  
  const totalNotificacoesEquipe = (convitesPendentesGlobais || 0) + (transferenciasPendentesGlobais || 0) + (solicitacoesPendentesGlobais || 0);

  const ITENS_NAV = [
    { id: 'inicio',           icone: LayoutDashboard, label: 'Início' },
    { id: 'notificacoes',     icone: Bell,            label: 'Notificações' },
    { id: 'equipe',           icone: Users,            label: 'Equipe' },
    { id: 'perfil',           icone: UserCircle,       label: 'Meu Perfil' },
    { id: 'perfil_esportivo', icone: Trophy,           label: 'Perfil Esportivo' },
    { id: 'explorar',         icone: Globe,            label: 'Explorar' },
    ...(ehSuperAdmin ? [
      { id: 'sistema', icone: Building2, label: 'Equipes do Sistema' },
      { id: 'usuarios_sistema', icone: Shield, label: 'Usuários do Sistema' }
    ] : []),
    { id: 'configuracoes',    icone: Settings,          label: 'Configurações' },
  ];

  const fazerLogout = async () => {
    await supabase.auth.signOut();
  };

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
              <img src="/icon.svg" alt="PlayHub" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '10px' }} />
            </div>
            <span className="logo-texto">PlayHub</span>
          </div>
          <button className="barra-fechar" onClick={() => setAberta(false)} aria-label="Fechar menu">
            <X size={20} />
          </button>
        </div>

        <nav className="navegacao">
          {ITENS_NAV.map(({ id, icone: Icone, label }) => (
            <button
              key={id}
              className={`item-nav ${ativo === id ? 'ativo' : ''}`}
              onClick={() => { setAtivo(id); setAberta(false); }}
            >
              <span className="item-nav-icone"><Icone size={19} /></span>
              <span className="item-nav-label">
                {label}
                {id === 'equipe' && totalNotificacoesEquipe > 0 && (
                  <span className="badge-nav-num">{totalNotificacoesEquipe}</span>
                )}
                {id === 'notificacoes' && bolasRecebidas > 0 && (
                  <span className="badge-nav-num" style={{ background: 'var(--primaria)', color: '#0f172a' }}>
                    {bolasRecebidas}
                  </span>
                )}
              </span>
              <ChevronRight size={14} className="item-nav-seta" />
            </button>
          ))}
        </nav>

        <div className="barra-rodape">
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
          <button className="botao-sair" onClick={fazerLogout}>
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default BarraLateral;
