import { useState, useEffect } from 'react';
import { usarEquipe } from '../../contextos/EquipeContexto';
import { usarAutenticacao } from '../../contextos/AutenticacaoContexto';
import { 
  Share2, MapPin, Trophy, Users, Globe, Lock, ArrowLeft, Search,
  MessageCircle, Clipboard, CheckCircle2, Edit2, Trash2, ExternalLink,
  Mail, Check, X, Crown, Link, Building2, Shield, Calendar, DollarSign, LogOut,
  ChevronDown, ChevronUp, Bell
} from 'lucide-react';
import ModalCriacaoEquipe from '../../componentes/Equipe/ModalCriacaoEquipe';
import Botao from '../../componentes/Botao/Botao';
import AgendaTab from './tabs/AgendaTab';
import FinanceiroTab from './tabs/FinanceiroTab';
import AbaPunicoes from './tabs/AbaPunicoes';
import './PaginaEquipe.css';

const PaginaEquipe = ({ aoVoltar, abrirGestao }) => {
  const { usuario, dadosUsuario, ehSuperAdmin } = usarAutenticacao();
  const { 
    equipes, equipeAtiva, selecionarEquipe, excluirEquipe,
    solicitarIngresso, carregarSolicitacoes, responderSolicitacao, buscarJogadores,
    enviarConvite, cancelarConvite, carregarConvitesRecebidos, responderConvite, carregarConvitesEnviados,
    convitesPendentesGlobais, sairDaEquipe, aceitarTransferenciaPosse, recusarTransferenciaPosse
  } = usarEquipe();
  
  // ── Todos os estados (ordem importa para o JS) ─────────────────
  const [abaAtiva, setAbaAtiva] = useState('minha-equipe');
  const [subAbaNotificacoes, setSubAbaNotificacoes] = useState('convites');

  const [redirecionouConvite, setRedirecionouConvite] = useState(false);

  // Auto-redirecionar para convites se o usuário não tiver equipe mas tiver convites pendentes (rodar só 1 vez)
  useEffect(() => {
    if (!equipeAtiva && convitesPendentesGlobais > 0 && abaAtiva === 'minha-equipe' && !redirecionouConvite) {
      setAbaAtiva('notificacoes');
      setSubAbaNotificacoes('convites');
      setRedirecionouConvite(true);
    }
  }, [equipeAtiva, convitesPendentesGlobais, abaAtiva, redirecionouConvite]);

  const [copiado, setCopiado] = useState(false);
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [solicitacoes, setSolicitacoes] = useState([]);

  // busca de jogadores
  const [termoBuscaJog, setTermoBuscaJog] = useState('');
  const [modalidadeBuscaJog, setModalidadeBuscaJog] = useState('');
  const [cidadeBuscaJog, setCidadeBuscaJog] = useState('');
  const [resultadosJog, setResultadosJog] = useState([]);
  const [buscando, setBuscando] = useState(false);

  // convites
  const [convitesRecebidos, setConvitesRecebidos] = useState([]);
  const [confirmandoSair, setConfirmandoSair] = useState(false);
  const [convitesEnviados, setConvitesEnviados] = useState([]);
  const [convitesEnviadosMap, setConvitesEnviadosMap] = useState({});
  const [modalConvite, setModalConvite] = useState(null); // { jogadorId, nome }
  const [msgConvite, setMsgConvite] = useState('');
  const [enviandoConvite, setEnviandoConvite] = useState(false);
  const [msgRespostaConvite, setMsgRespostaConvite] = useState({});

  const [expandidosRecebidos, setExpandidosRecebidos] = useState({});
  const [expandidosEnviados, setExpandidosEnviados] = useState({});

  const toggleExpandido = (tipo, id) => {
    if (tipo === 'recebidos') setExpandidosRecebidos(prev => ({...prev, [id]: !prev[id]}));
    else setExpandidosEnviados(prev => ({...prev, [id]: !prev[id]}));
  };

  // Busca dinâmica de jogadores com debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (abaAtiva === 'descobrir' && (termoBuscaJog || cidadeBuscaJog || modalidadeBuscaJog)) {
        handleBuscarJogadores();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [termoBuscaJog, cidadeBuscaJog, modalidadeBuscaJog, abaAtiva]);

  const handleBuscarJogadores = async () => {
    setBuscando(true);
    const data = await buscarJogadores({
      termo: termoBuscaJog,
      modalidade: modalidadeBuscaJog,
      cidade: cidadeBuscaJog,
    });
    setResultadosJog(data || []);
    setBuscando(false);
  };
  // Carregar solicitações se for admin ou sub_admin para o badge
  useEffect(() => {
    if (equipeAtiva?.id && (equipeAtiva?.papel === 'admin' || equipeAtiva?.papel === 'sub_admin' || ehSuperAdmin)) {
      obterSolicitacoes();
      obterConvitesEnviados();
    }
    // Carregar convites recebidos para qualquer usuário
    obterConvitesRecebidos();
  }, [equipeAtiva, ehSuperAdmin]);

  const obterSolicitacoes = async () => {
    const data = await carregarSolicitacoes(equipeAtiva.id);
    setSolicitacoes(data);
  };

  const obterConvitesRecebidos = async () => {
    const data = await carregarConvitesRecebidos();
    setConvitesRecebidos(data);
  };

  const obterConvitesEnviados = async () => {
    if (!equipeAtiva?.id) return;
    const data = await carregarConvitesEnviados(equipeAtiva.id);
    setConvitesEnviados(data);
    // Mapa jogadorId -> status para checar nos cards
    const mapa = {};
    data.forEach(c => { mapa[c.jogador?.id] = c.status; });
    setConvitesEnviadosMap(mapa);
  };

  const handleEnviarConvite = async () => {
    if (!modalConvite) return;
    setEnviandoConvite(true);
    const result = await enviarConvite(modalConvite.jogadorId, equipeAtiva.id, msgConvite);
    setEnviandoConvite(false);
    if (result.sucesso) {
      setConvitesEnviadosMap(prev => ({ ...prev, [modalConvite.jogadorId]: 'pendente' }));
      setModalConvite(null);
      setMsgConvite('');
      obterConvitesEnviados();
    } else {
      alert(result.erro);
    }
  };

  const handleCancelarConvite = async (conviteId, tipo = 'enviados') => {
    console.log(`[Lixeira] Iniciando deleção do convite ${conviteId} da aba ${tipo}...`);
    
    // Antigo window.confirm foi removido para evitar bloqueios invisíveis do navegador
    const result = await cancelarConvite(conviteId);
    
    if (result.sucesso) {
      console.log(`[Lixeira] Deleção de ${tipo} confirmada no servidor. Recarregando dados.`);
      if (tipo === 'enviados') obterConvitesEnviados();
      else if (tipo === 'recebidos') obterConvitesRecebidos();
    } else {
      console.error('[Lixeira] Falha RLS/Supabase:', result.erro);
      alert('Não foi possível excluir: ' + result.erro);
    }
  };

  const handleResponderConvite = async (conviteId, aceito) => {
    const msg = msgRespostaConvite[conviteId] || '';
    const result = await responderConvite(conviteId, aceito, msg);
    if (result.sucesso) {
      obterConvitesRecebidos();
    } else {
      alert(result.erro);
    }
  };

  const handlesRespostaMembro = async (membroId, aprovado) => {
    const result = await responderSolicitacao(membroId, aprovado);
    if (result.sucesso) {
      obterSolicitacoes();
    } else {
      alert(result.erro);
    }
  };


  const {
    nome, modalidade, nivel, cidade, estado, 
    visibilidade, logo_url, slug_convite
  } = equipeAtiva || {};

  // URL de convite (placeholder para produção)
  const urlConvite = slug_convite ? `${window.location.origin}/convite/${slug_convite}` : '';

  const copiarLink = () => {
    navigator.clipboard.writeText(urlConvite);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const convidarWhatsApp = () => {
    const mensagem = encodeURIComponent(
      `Fala galera! 🤘\n\nJunte-se à minha equipe *${nome}* no PlayHub!\n\nPara entrar, acesse o link:\n${urlConvite}`
    );
    window.open(`https://wa.me/?text=${mensagem}`, '_blank');
  };

  const handlesExcluir = async () => {
    if (!window.confirm('Tem certeza que deseja excluir esta equipe? Esta ação não pode ser desfeita.')) return;
    
    setExcluindo(true);
    const result = await excluirEquipe(equipeAtiva.id);
    setExcluindo(false);

    if (!result.sucesso) {
      alert(result.erro);
    }
  };

  return (
    <div className="pagina-equipe">
      {/* Botão Voltar */}
      {aoVoltar && (
        <button className="btn-voltar-explorar" onClick={aoVoltar}>
          <ArrowLeft size={18} /> Voltar ao Dashboard
        </button>
      )}

      {/* Cabeçalho da Gestão com Seletor de Equipe */}
      <header className="gestao-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', color: '#f1f5f9' }}>Área da Equipe</h2>
          {equipes?.length > 1 ? (
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Selecione qual equipe deseja visualizar ou administrar.</p>
          ) : (
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Administre seus atletas, convites e recados.</p>
          )}
        </div>
        
        {equipes?.length > 1 && (
          <div className="seletor-equipe" style={{ flexShrink: 0 }}>
            <select 
              value={equipeAtiva?.id || ''} 
              onChange={(e) => selecionarEquipe(e.target.value)}
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '0.6rem 2.5rem 0.6rem 1rem',
                borderRadius: '8px',
                outline: 'none',
                cursor: 'pointer',
                fontSize: '0.95rem',
                appearance: 'none',
                backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 1rem top 50%',
                backgroundSize: '0.65rem auto',
              }}
            >
              <option value="" disabled>Selecione uma equipe...</option>
              {equipes.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.nome} {eq.papel === 'admin' ? '(👑)' : eq.papel === 'sub_admin' ? '(🥈)' : ''}</option>
              ))}
            </select>
          </div>
        )}
      </header>

      {/* Banner de Manutenção Global */}
      {equipeAtiva?.gestao_global && (
        <div style={{ 
          background: 'rgba(56, 189, 248, 0.1)', 
          border: '1px solid rgba(56, 189, 248, 0.2)', 
          borderRadius: '12px', 
          padding: '1rem', 
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          color: '#38bdf8'
        }}>
          <Shield size={20} />
          <div style={{ flex: 1 }}>
            <strong style={{ display: 'block' }}>Modo de Manutenção (Super Admin)</strong>
            <span style={{ fontSize: '0.85rem' }}>Você está visualizando a equipe <strong>{equipeAtiva.nome}</strong> com acesso administrativo total para suporte técnico.</span>
          </div>
          <Botao variant="secundario" onClick={() => { localStorage.removeItem('playhub_equipe_ativa'); window.location.reload(); }} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
            Encerrar Manutenção
          </Botao>
        </div>
      )}

      {/* Banner de Transferência de Titularidade PENDENTE (Para quem RECEBE) */}
      {equipeAtiva?.admin_id_pendente === usuario?.id && (
        <div style={{ 
          background: 'rgba(16, 185, 129, 0.1)', 
          border: '1px solid rgba(16, 185, 129, 0.2)', 
          borderRadius: '12px', 
          padding: '1.25rem', 
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          color: '#10b981',
          flexWrap: 'wrap'
        }}>
          <Crown size={24} />
          <div style={{ flex: 1, minWidth: '200px' }}>
            <strong style={{ display: 'block', fontSize: '1.1rem', color: '#f1f5f9' }}>Solicitação de Titularidade</strong>
            <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Você foi convidado para assumir como o novo <strong>Capitão (Administrador Geral)</strong> desta equipe. Deseja aceitar esta responsabilidade?</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Botao variant="secundario" onClick={() => recusarTransferenciaPosse(equipeAtiva.id)} style={{ borderColor: 'rgba(244, 63, 94, 0.4)', color: '#f43f5e' }}>
              Recusar
            </Botao>
            <Botao onClick={() => aceitarTransferenciaPosse(equipeAtiva.id)} style={{ background: '#10b981', borderColor: '#10b981' }}>
              Aceitar Titularidade
            </Botao>
          </div>
        </div>
      )}

      {/* Aviso de Aguardando Aceite (Para gestão e dono atual) */}
      {equipeAtiva?.admin_id_pendente && equipeAtiva?.admin_id_pendente !== usuario?.id && (equipeAtiva?.papel === 'admin' || equipeAtiva?.gestao_global) && (
        <div style={{ 
          background: 'rgba(251, 191, 36, 0.1)', 
          border: '1px solid rgba(251, 191, 36, 0.2)', 
          borderRadius: '12px', 
          padding: '1rem', 
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          color: '#fbbf24'
        }}>
          <Mail size={20} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '0.9rem' }}>Aguardando o novo capitão aceitar a titularidade. Você pode cancelar esta solicitação a qualquer momento clicando abaixo.</span>
          </div>
          <button 
            onClick={() => recusarTransferenciaPosse(equipeAtiva.id)}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#f43f5e', 
              fontSize: '0.85rem', 
              cursor: 'pointer', 
              textDecoration: 'underline',
              padding: '0.5rem'
            }}
          >
            Cancelar Solicitação
          </button>
        </div>
      )}

      <nav className="equipe-abas">
        {/* Aba 1: Minha Equipe — todos */}
        <button 
          className={`aba ${abaAtiva === 'minha-equipe' ? 'ativa' : ''}`}
          onClick={() => setAbaAtiva('minha-equipe')}
        >
          <Trophy size={18} /> Minha Equipe
        </button>

        {/* Aba 2: Partidas (ex-Agenda) — todos os membros */}
        {equipeAtiva && (
          <button 
            className={`aba ${abaAtiva === 'agenda' ? 'ativa' : ''}`}
            onClick={() => setAbaAtiva('agenda')}
          >
            <Calendar size={18} /> Partidas
          </button>
        )}

        {/* Aba 3: Financeiro — todos, mas somente leitura para membros comuns */}
        {equipeAtiva && (
          <button 
            className={`aba ${abaAtiva === 'financeiro' ? 'ativa' : ''}`}
            onClick={() => setAbaAtiva('financeiro')}
          >
            <DollarSign size={18} /> Financeiro
          </button>
        )}

        {/* Aba 4: Atletas — apenas admin e co-admin da equipe selecionada (ou super admin em modo manutenção) */}
        {equipeAtiva && (equipeAtiva.papel === 'admin' || equipeAtiva.papel === 'sub_admin' || (ehSuperAdmin && equipeAtiva.gestao_global)) && (
          <button 
            className={`aba ${abaAtiva === 'descobrir' ? 'ativa' : ''}`}
            onClick={() => setAbaAtiva('descobrir')}
          >
            <Globe size={18} /> Atletas
          </button>
        )}

        {/* Aba de Disciplina (Punições e Ocorrências) */}
        {equipeAtiva && (
          <button 
            className={`aba ${abaAtiva === 'disciplina' ? 'ativa' : ''}`}
            onClick={() => setAbaAtiva('disciplina')}
            title="Advertências, Faltas e Punições"
          >
            <Shield size={18} /> Disciplina
          </button>
        )}

        {/* Aba Única de Notificações (Convites e Solicitações) */}
        <button 
          className={`aba ${abaAtiva === 'notificacoes' ? 'ativa' : ''}`}
          onClick={() => setAbaAtiva('notificacoes')}
        >
          <Bell size={18} /> Notificações
          {(convitesPendentesGlobais > 0 || solicitacoes.length > 0) && (
            <span className="notificacao-badge">{convitesPendentesGlobais + solicitacoes.length}</span>
          )}
        </button>
      </nav>


      {abaAtiva === 'minha-equipe' && (
        <>
          {equipeAtiva ? (
            <>
              <header className="equipe-cabecalho">
                <div className="equipe-logo-container">
                  {equipeAtiva.logo_url ? (
                    <img src={equipeAtiva.logo_url} alt={`Escudo ${equipeAtiva.nome}`} className="equipe-logo-grande" />
                  ) : (
                    <div className="equipe-logo-grande" style={{ background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trophy size={60} color="#475569" />
                    </div>
                  )}
                </div>
                
                <div className="equipe-info-topo">
                  <h1 className="equipe-nome">{equipeAtiva.nome}</h1>
                  <div className="equipe-badges">
                    <span className="badge badge-primaria">
                      <Trophy size={14} /> {equipeAtiva.modalidade}
                    </span>
                    <span className="badge">
                      <MapPin size={14} /> {equipeAtiva.local_cidade || equipeAtiva.cidade}, {equipeAtiva.local_estado || equipeAtiva.estado}
                    </span>
                    <span className="badge">
                      {equipeAtiva.visibilidade === 'publica' ? <Globe size={14} /> : <Lock size={14} />}
                      {equipeAtiva.visibilidade === 'publica' ? 'Pública' : 'Privada'}
                    </span>
                    {equipeAtiva.admin?.nome_completo && (
                      <span className="badge" style={{ background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.2)' }}>
                        <Crown size={14} /> Capitão: {equipeAtiva.admin.nome_completo}
                      </span>
                    )}
                  </div>

                  <div className="acoes-equipe">
                    <button className="btn-whatsapp" onClick={convidarWhatsApp}>
                      <MessageCircle size={18} />
                      Convidar no WhatsApp
                    </button>
                    <Botao variant="secundario" onClick={copiarLink} style={{ gap: '0.75rem' }}>
                      {copiado ? <CheckCircle2 size={18} color="#10b981" /> : <Clipboard size={18} />}
                      {copiado ? 'Copiado!' : 'Copiar Link'}
                    </Botao>
                    {equipeAtiva && (equipeAtiva.papel === 'admin' || equipeAtiva.papel === 'sub_admin' || (ehSuperAdmin && equipeAtiva.gestao_global)) && (
                      <Botao onClick={abrirGestao} style={{ gap: '0.5rem', background: 'linear-gradient(135deg, #0ea5e9, #2563eb)', border: 'none' }} title="Painel de Gestão da Equipe">
                        <Shield size={18} /> Gestão
                      </Botao>
                    )}
                    {/* Sair da Equipe — visível apenas para membros que não são o dono geral */}
                    {equipeAtiva.papel && equipeAtiva.papel !== 'admin' && (
                      <Botao
                        variant={confirmandoSair ? 'perigo' : 'secundario'}
                        onClick={async () => {
                          if (!confirmandoSair) {
                            setConfirmandoSair(true);
                            setTimeout(() => setConfirmandoSair(false), 3000); // Reseta após 3s
                            return;
                          }
                          const res = await sairDaEquipe(equipeAtiva.id);
                          if (!res.sucesso) alert('Erro ao sair: ' + res.erro);
                          setConfirmandoSair(false);
                        }}
                        style={{ 
                          gap: '0.5rem', 
                          borderColor: confirmandoSair ? '#f43f5e' : 'rgba(244,63,94,0.4)', 
                          color: '#f43f5e',
                          fontWeight: confirmandoSair ? 'bold' : 'normal'
                        }}
                        title={confirmandoSair ? "Clique novamente para confirmar" : "Sair da Equipe"}
                      >
                        <LogOut size={18} /> {confirmandoSair ? 'Confirmar Saída?' : 'Sair da Equipe'}
                      </Botao>
                    )}

                    {equipeAtiva.papel === 'admin' && (
                      <div className="acoes-admin">
                        <button className="btn-acao-icone" onClick={() => setModalEditarAberto(true)} title="Editar Equipe">
                          <Edit2 size={18} />
                        </button>
                        <button className="btn-acao-icone btn-perigo" onClick={handlesExcluir} disabled={excluindo} title="Excluir Equipe">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </header>

              <div className="grade-detalhes" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                <div className="card-detalhe">
                  <h3><Users size={20} color="var(--primaria)" /> Informações Gerais</h3>
                  <p><strong>Capitão:</strong> {equipeAtiva.admin?.nome_completo || 'Não definido'}</p>
                  <p><strong>Nível:</strong> {equipeAtiva.nivel || 'Não definido'}</p>
                  <p><strong>Status:</strong> Ativo</p>
                  <p><strong>Visibilidade:</strong> {equipeAtiva.visibilidade === 'publica' ? 'Pública' : 'Privada'}</p>
                </div>

                {equipeAtiva.link_grupo && (
                  <div className="card-detalhe">
                    <h3><MessageCircle size={20} color="#10b981" /> Grupo da Equipe</h3>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1rem' }}>
                      Acesse o grupo exclusivo da equipe.
                    </p>
                    <a href={equipeAtiva.link_grupo} target="_blank" rel="noopener noreferrer" className="btn-whatsapp" style={{ width: 'fit-content', textDecoration: 'none' }}>
                      <Link size={16} /> Acessar Grupo
                    </a>
                  </div>
                )}
                
                {equipeAtiva.local_nome && (
                  <div className="card-detalhe">
                    <h3><Building2 size={20} color="var(--primaria)" /> Sede da Equipe</h3>
                    <div style={{ padding: '0.5rem 0' }}>
                      <strong>{equipeAtiva.local_nome}</strong><br />
                      <span style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'block', marginTop: '0.3rem' }}>
                        {equipeAtiva.local_rua && `${equipeAtiva.local_rua}, `}
                        {equipeAtiva.local_numero && `${equipeAtiva.local_numero} `}
                        {equipeAtiva.local_complemento && `- ${equipeAtiva.local_complemento}`}<br />
                        {equipeAtiva.local_bairro && `${equipeAtiva.local_bairro}, `}
                        {equipeAtiva.local_cidade && `${equipeAtiva.local_cidade} - `}
                        {equipeAtiva.local_estado && equipeAtiva.local_estado}
                      </span>
                    </div>
                    {equipeAtiva.local_mapa_link && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <a href={equipeAtiva.local_mapa_link} target="_blank" rel="noopener noreferrer" className="link-mapa" style={{ display: 'inline-flex', padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                          <ExternalLink size={14} /> Ver no Mapa
                        </a>
                      </div>
                    )}
                  </div>
                )}

                <div className="card-detalhe">
                  <h3><Share2 size={20} color="var(--primaria)" /> Convite Público</h3>
                  <p style={{ fontSize: '0.85rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', margin: '0.5rem 0', wordBreak: 'break-all' }}>
                    {urlConvite}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Envie este link para que outros jogadores possam ver os detalhes da equipe e solicitar ingresso.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="lista-vazia" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
              <Trophy size={48} color="rgba(255,255,255,0.1)" style={{ marginBottom: '1rem' }} />
              <h2>Você não está em nenhuma equipe</h2>
              <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>Busque uma equipe pública na aba <strong>Descobrir</strong> ou crie a sua própria através do Início!</p>
              
              {convitesPendentesGlobais > 0 && (
                <div style={{ marginTop: '1rem', padding: '1.5rem', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', borderRadius: '12px', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f1f5f9' }}>
                    <Mail color="#f43f5e" size={20} />
                    <strong>Psiu! Você tem {convitesPendentesGlobais} {convitesPendentesGlobais === 1 ? 'convite pendente' : 'convites pendentes'}!</strong>
                  </div>
                  <Botao variant="primario" onClick={() => setAbaAtiva('convites')} style={{ background: '#f43f5e', borderColor: '#f43f5e' }}>
                    Ver Convites
                  </Botao>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {abaAtiva === 'agenda' && equipeAtiva && (
        <div style={{ marginTop: '2rem' }}>
          <AgendaTab />
        </div>
      )}
      
      {abaAtiva === 'financeiro' && equipeAtiva && (
        <div style={{ marginTop: '2rem' }}>
          <FinanceiroTab modoLeitura={equipeAtiva.papel !== 'admin' && equipeAtiva.papel !== 'sub_admin' && !ehSuperAdmin} />
        </div>
      )}


      {abaAtiva === 'descobrir' && (ehSuperAdmin || equipeAtiva?.papel === 'admin' || equipeAtiva?.papel === 'sub_admin') && (
        <div className="secao-descobrir">
          <header className="busca-header">
            <h2><Users size={28} /> Descobrir Jogadores</h2>
            <p>Encontre atletas da sua região para convidar para o time.</p>
          </header>

          <div className="barra-busca-equipe" style={{ flexWrap: 'wrap' }}>
            <div className="input-busca-grupo">
              <Users size={18} />
              <input
                type="text"
                placeholder="Nome ou apelido..."
                value={termoBuscaJog}
                onChange={(e) => setTermoBuscaJog(e.target.value)}
              />
            </div>
            <div className="input-busca-grupo">
              <Trophy size={18} />
              <select
                value={modalidadeBuscaJog}
                onChange={(e) => setModalidadeBuscaJog(e.target.value)}
                className="select-busca"
              >
                <option value="">Todas as Modalidades</option>
                <option value="Vôlei de Quadra">Vôlei de Quadra</option>
                <option value="Vôlei de Praia">Vôlei de Praia</option>
                <option value="Futevôlei">Futevôlei</option>
                <option value="Beach Tennis">Beach Tennis</option>
                <option value="Futsal">Futsal</option>
                <option value="Futebol Society">Futebol Society</option>
                <option value="Basquete">Basquete</option>
                <option value="Handebol">Handebol</option>
                <option value="Tênis">Tênis</option>
                <option value="Padel">Padel</option>
              </select>
            </div>
            <div className="input-busca-grupo">
              <MapPin size={18} />
              <input
                type="text"
                placeholder="Digite uma cidade..."
                value={cidadeBuscaJog}
                onChange={(e) => setCidadeBuscaJog(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
            <Botao onClick={handleBuscarJogadores} disabled={buscando}>
              <Search size={16} /> {buscando ? 'Buscando...' : 'Pesquisar Jogadores'}
            </Botao>
          </div>

          <div className="resultados-busca">
            {buscando ? (
              <div className="busca-vazia"><p>Buscando jogadores...</p></div>
            ) : resultadosJog.length > 0 ? (
              <div className="grade-resultados">
                {resultadosJog.map((jog) => (
                  <div key={jog.id} className="card-busca">
                    <div className="card-busca-topo">
                      {jog.foto_url ? (
                        <img src={jog.foto_url} alt={jog.apelido} className="logo-busca" style={{ borderRadius: '50%' }} />
                      ) : (
                        <div className="logo-busca-placeholder" style={{ borderRadius: '50%' }}>
                          <Users size={24} />
                        </div>
                      )}
                      <div className="card-busca-info">
                        <h4>{jog.nome_completo}</h4>
                        {jog.apelido && <span style={{ fontSize: '0.8rem', color: '#64748b' }}>@{jog.apelido}</span>}
                      </div>
                    </div>
                    <div className="card-busca-detalhes">
                      {jog.cidade && <span><MapPin size={14} /> {jog.cidade}{jog.estado ? ` - ${jog.estado}` : ''}</span>}
                      {jog.esportes_interesse?.length > 0 && (
                        <span style={{ flexWrap: 'wrap', gap: '4px' }}>
                          {jog.esportes_interesse.slice(0, 3).map(e => (
                            <span key={e} className="badge-modalidade">{e}</span>
                          ))}
                        </span>
                      )}
                    </div>
                    {equipeAtiva?.papel === 'admin' && (
                      <div style={{ marginTop: '0.8rem' }}>
                        {convitesEnviadosMap[jog.id] === 'pendente' ? (
                          <div className="tag-pendente">Convite Enviado ✓</div>
                        ) : convitesEnviadosMap[jog.id] === 'aceito' ? (
                          <div className="tag-ja-membro">Já é membro</div>
                        ) : (
                          <Botao variant="secundario" onClick={() => setModalConvite({ jogadorId: jog.id, nome: jog.nome_completo })} style={{ width: '100%', justifyContent: 'center' }}>
                            Convidar p/ Equipe
                          </Botao>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="busca-vazia">
                <p>{termoBuscaJog || cidadeBuscaJog || modalidadeBuscaJog
                  ? 'Nenhum jogador encontrado com esses filtros.'
                  : 'Use os filtros acima para encontrar atletas.'
                }</p>
              </div>
            )}
          </div>
        </div>
      )}

      {abaAtiva === 'notificacoes' && (
        <div style={{ padding: '0 1rem' }}>
          <header style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.6rem', color: '#f8fafc', marginBottom: '8px' }}>Central de Notificações</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Gerencie seus convites pendentes e solicitações da equipe em um só lugar.</p>
          </header>

          <div style={{ display: 'flex', gap: '4px', background: 'rgba(15,23,42,0.6)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', width: 'fit-content', marginBottom: '20px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setSubAbaNotificacoes('convites')} 
                style={{ background: subAbaNotificacoes === 'convites' ? 'rgba(56,189,248,0.15)' : 'transparent', border: subAbaNotificacoes === 'convites' ? '1px solid rgba(56,189,248,0.3)' : '1px solid transparent', color: subAbaNotificacoes === 'convites' ? '#38bdf8' : '#64748b', padding: '6px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                  <Mail size={15} /> Meus Convites {convitesPendentesGlobais > 0 && `(${convitesPendentesGlobais})`}
              </button>
              
              {equipeAtiva && (equipeAtiva.papel === 'admin' || equipeAtiva.papel === 'sub_admin' || (ehSuperAdmin && equipeAtiva.gestao_global)) && (
                <button 
                  onClick={() => setSubAbaNotificacoes('solicitacoes')} 
                  style={{ background: subAbaNotificacoes === 'solicitacoes' ? 'rgba(56,189,248,0.15)' : 'transparent', border: subAbaNotificacoes === 'solicitacoes' ? '1px solid rgba(56,189,248,0.3)' : '1px solid transparent', color: subAbaNotificacoes === 'solicitacoes' ? '#38bdf8' : '#64748b', padding: '6px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                    <Users size={15} /> Gestão da Equipe {solicitacoes.length > 0 && `(${solicitacoes.length})`}
                </button>
              )}
          </div>

          {subAbaNotificacoes === 'solicitacoes' && equipeAtiva && (equipeAtiva.papel === 'admin' || equipeAtiva.papel === 'sub_admin' || (ehSuperAdmin && equipeAtiva.gestao_global)) && (
            <div className="secao-solicitacoes animate-fade-in">
              <h3>Solicitações Pendentes</h3>
              <p style={{ color: '#64748b', marginBottom: '1rem', fontSize: '0.9rem' }}>Atletas querendo entrar no time.</p>
              
              <div className="lista-solicitacoes">
                {solicitacoes.length > 0 ? (
                  solicitacoes.map(sol => (
                    <div key={sol.id} className="item-solicitacao">
                      <div className="solicitacao-user">
                        <div className="user-avatar-mini">
                          {sol.usuarios.foto_url ? <img src={sol.usuarios.foto_url} alt={sol.usuarios.apelido} /> : <Users size={20} />}
                        </div>
                        <div className="user-info-mini">
                          <strong>{sol.usuarios.nome_completo} ({sol.usuarios.apelido})</strong>
                          <span>{sol.usuarios.cidade}, {sol.usuarios.estado}</span>
                        </div>
                      </div>
                      <div className="solicitacao-acoes">
                        <button className="btn-negar" onClick={() => handlesRespostaMembro(sol.id, false)}>Recusar</button>
                        <button className="btn-aceitar" onClick={() => handlesRespostaMembro(sol.id, true)}>Aceitar</button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="msg-vazia" style={{ padding: '2rem' }}>Nenhuma solicitação pendente no momento.</p>
                )}
              </div>

              <h3 style={{ marginTop: '2.5rem', marginBottom: '0.5rem', color: 'var(--texto-titulo)' }}>Convites Emitidos (Saindo)</h3>
              <p style={{ color: '#64748b', marginBottom: '1rem', fontSize: '0.9rem' }}>Jogadores que foram convidados por administradores do time.</p>
              <div className="lista-solicitacoes">
                {convitesEnviados.length > 0 ? (
                  convitesEnviados.map(conv => {
                    const resolvido = conv.status !== 'pendente';
                    const expandido = expandidosEnviados[conv.id];

                    if (resolvido && !expandido) {
                      return (
                        <div key={conv.id} className="item-solicitacao-resolvido" onClick={() => toggleExpandido('enviados', conv.id)} style={{ cursor: 'pointer', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div className="user-avatar-mini" style={{ width: 28, height: 28 }}>
                              {conv.jogador?.foto_url ? <img src={conv.jogador.foto_url} alt={conv.jogador.apelido} /> : <Users size={16} />}
                            </div>
                            <span style={{ fontSize: '0.9rem', color: '#f1f5f9' }}>Convite para <strong>{conv.jogador?.nome_completo}</strong></span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: conv.status === 'aceito' ? '#10b981' : '#f43f5e', background: conv.status === 'aceito' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)', padding: '4px 8px', borderRadius: '4px' }}>{conv.status.toUpperCase()}</span>
                            <ChevronDown size={18} color="#94a3b8" />
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={conv.id} className="item-solicitacao" style={{ marginBottom: '0.5rem' }}>
                        <div className="solicitacao-user">
                          <div className="user-avatar-mini">
                            {conv.jogador?.foto_url ? <img src={conv.jogador.foto_url} alt={conv.jogador.apelido} /> : <Users size={20} />}
                          </div>
                          <div className="user-info-mini">
                            <strong>{conv.jogador?.nome_completo} ({conv.jogador?.apelido})</strong>
                            <span>Status: <strong style={{ color: conv.status === 'pendente' ? '#fbbf24' : conv.status === 'aceito' ? '#10b981' : '#f43f5e' }}>{conv.status.toUpperCase()}</strong></span>
                            {conv.mensagem_resposta && <span style={{ fontStyle: 'italic', marginTop: '4px' }}>Resposta: "{conv.mensagem_resposta}"</span>}
                          </div>
                        </div>
                        {conv.status === 'pendente' ? (
                          <div className="solicitacao-acoes">
                            <button className="btn-negar" onClick={() => handleCancelarConvite(conv.id)}>Cancelar</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.75rem' }}>
                              <span><strong>Enviado:</strong> {new Date(conv.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                              {conv.respondido_em && <span><strong>Respondido:</strong> {new Date(conv.respondido_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', width: '100%', marginTop: '0.5rem' }}>
                              <button onClick={() => toggleExpandido('enviados', conv.id)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'center', flex: 1 }}>
                                <ChevronUp size={16} /> Ocultar detalhes
                              </button>
                              <button onClick={() => handleCancelarConvite(conv.id)} title="Limpar histórico" style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', color: '#f43f5e', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Trash2 size={14} /> Excluir
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="msg-vazia" style={{ padding: '2rem' }}>Nenhum convite enviado pela equipe.</p>
                )}
              </div>
            </div>
          )}

          {subAbaNotificacoes === 'convites' && (
            <div className="secao-solicitacoes animate-fade-in">
              <div className="grade-explorar" style={{ marginTop: '1rem' }}>
            {convitesRecebidos.length > 0 ? (
              convitesRecebidos.map(conv => {
                const resolvido = conv.status !== 'pendente';
                const expandido = expandidosRecebidos[conv.id];

                if (resolvido && !expandido) {
                  return (
                    <div key={conv.id} className="item-solicitacao-resolvido" onClick={() => toggleExpandido('recebidos', conv.id)} style={{ cursor: 'pointer', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '0.5rem', width: '100%', gridColumn: '1 / -1' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="logo-explorar-placeholder" style={{ width: 32, height: 32, minWidth: 32, borderRadius: '50%', padding: '2px', background: 'var(--bg-card)' }}>
                          {conv.equipes?.logo_url ? <img src={conv.equipes.logo_url} alt={conv.equipes.nome} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : <Trophy size={16} />}
                        </div>
                        <span style={{ fontSize: '0.9rem', color: '#f1f5f9' }}>Convite da equipe <strong>{conv.equipes?.nome}</strong></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: conv.status === 'aceito' ? '#10b981' : '#f43f5e', background: conv.status === 'aceito' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)', padding: '4px 8px', borderRadius: '4px' }}>{conv.status.toUpperCase()}</span>
                        <ChevronDown size={18} color="#94a3b8" />
                      </div>
                    </div>
                  );
                }

                return (
                 <div key={conv.id} className="card-explorar" style={{ marginBottom: resolvido ? '0.5rem' : '0' }}>
                  <div className="card-explorar-topo">
                    {conv.equipes?.logo_url ? (
                      <img src={conv.equipes.logo_url} alt={conv.equipes.nome} className="logo-explorar" />
                    ) : (
                      <div className="logo-explorar-placeholder">
                        <Trophy size={28} />
                      </div>
                    )}
                    <div className="card-explorar-info">
                      <h4>{conv.equipes?.nome}</h4>
                      <span className="badge-mi">{conv.equipes?.modalidade}</span>
                    </div>
                  </div>

                  <div className="card-explorar-meta">
                    {conv.equipes?.local_cidade && (
                      <span><MapPin size={14} /> {conv.equipes.local_cidade}{conv.equipes.local_estado ? ` - ${conv.equipes.local_estado}` : ''}</span>
                    )}
                    <span className="admin-do-time">
                      <Crown size={13} /> Convidado por: {conv.equipes?.admin?.nome_completo || 'Admin'}
                    </span>
                  </div>

                  {conv.mensagem_convite && (
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', fontStyle: 'italic', borderLeft: '3px solid var(--primaria)' }}>
                      "{conv.mensagem_convite}"
                    </div>
                  )}

                  {conv.status === 'pendente' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <input 
                        type="text" 
                        placeholder="Mensagem de resposta (opcional)..." 
                        value={msgRespostaConvite[conv.id] || ''}
                        onChange={(e) => setMsgRespostaConvite(prev => ({ ...prev, [conv.id]: e.target.value }))}
                        className="input-resposta"
                        style={{ padding: '0.5rem', borderRadius: '6px', background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.85rem' }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Botao variant="secundario" onClick={() => handleResponderConvite(conv.id, false)} style={{ flex: 1, justifyContent: 'center', borderColor: '#f43f5e', color: '#f43f5e' }}>Recusar</Botao>
                        <Botao onClick={() => handleResponderConvite(conv.id, true)} style={{ flex: 1, justifyContent: 'center', background: '#10b981', borderColor: '#10b981' }}>Aceitar</Botao>
                      </div>
                    </div>
                  ) : (
                    <>
                    <div className={conv.status === 'aceito' ? 'tag-ja-membro' : 'tag-pendente'} style={{ background: conv.status === 'recusado' ? 'rgba(244, 63, 94, 0.1)' : '', color: conv.status === 'recusado' ? '#f43f5e' : '', borderColor: conv.status === 'recusado' ? 'rgba(244, 63, 94, 0.2)' : '' }}>
                      {conv.status === 'aceito' ? 'Você aceitou o convite ✓' : 'Convite recusado ✗'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.75rem' }}>
                        <span><strong>Recebido:</strong> {new Date(conv.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        {conv.respondido_em && <span><strong>Respondido:</strong> {new Date(conv.respondido_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', width: '100%', marginTop: '0.5rem' }}>
                        <button onClick={() => toggleExpandido('recebidos', conv.id)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'center', flex: 1 }}>
                          <ChevronUp size={16} /> Ocultar detalhes
                        </button>
                        <button onClick={() => handleCancelarConvite(conv.id, 'recebidos')} title="Limpar histórico" style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', color: '#f43f5e', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Trash2 size={14} /> Excluir
                        </button>
                      </div>
                    </div>
                    </>
                  )}
                </div>
                );
              })
            ) : (
              <div className="explorar-vazio" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem' }}>
                <Mail size={48} strokeWidth={1} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                <p style={{ color: '#94a3b8' }}>Nenhum convite recebido no momento.</p>
              </div>
            )}
            </div>
          </div>
          )}
        </div>
      )}

      {/* ABA DISCIPLINA (Renderizado Fora do Container Notificações para isolamento de Contexto) */}
      {abaAtiva === 'disciplina' && equipeAtiva && (
        <div style={{ padding: '0 1rem' }}>
          <header style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#f8fafc', marginBottom: '4px' }}>Tribunal Disciplinar</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Controle de faltas em jogos, suspensões e punições automáticas geradas pela moderação.</p>
          </header>
          <AbaPunicoes />
        </div>
      )}

      {/* MODAIS GLOBAIS DA PÁGINA */}
      {modalEditarAberto && (
        <ModalCriacaoEquipe 
          isOpen={modalEditarAberto}
          onClose={() => setModalEditarAberto(false)}
          equipeParaEditar={equipeAtiva}
        />
      )}

      {modalConvite && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Convidar {modalConvite.nome}</h2>
              <button className="btn-fechar" onClick={() => setModalConvite(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', color: '#94a3b8' }}>Escreva uma mensagem de boas-vindas para o atleta.</p>
              <textarea 
                placeholder="Ex: E aí, bora jogar com a gente na próxima terça?"
                value={msgConvite}
                onChange={(e) => setMsgConvite(e.target.value)}
                rows={4}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', resize: 'vertical' }}
              />
            </div>
            <div className="modal-footer" style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <Botao variant="secundario" onClick={() => setModalConvite(null)} disabled={enviandoConvite}>Cancelar</Botao>
              <Botao onClick={handleEnviarConvite} disabled={enviandoConvite}>
                {enviandoConvite ? 'Enviando...' : 'Enviar Convite'}
              </Botao>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PaginaEquipe;
