import { useState, useCallback, useEffect } from 'react';

// Formata "Primeiro Último" com iniciais maiúsculas
const formatarNome = (nomeCompleto) => {
  if (!nomeCompleto) return 'Atleta';
  const partes = nomeCompleto.trim().split(/\s+/);
  const capitalizar = (p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  
  if (partes.length === 1) return capitalizar(partes[0]);
  
  const primeiro = capitalizar(partes[0]);
  const ultimo = capitalizar(partes[partes.length - 1]);
  return `${primeiro} ${ultimo}`;
};

const formatarHandleAtleta = (u) => {
  if (!u) return '@Atleta';
  const texto = u.apelido || u.nome_completo?.split(' ')[0] || 'Atleta';
  const formatado = texto.trim().split(/\s+/).map(p => 
      p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
  ).join('');
  return `@${formatado}`;
};

const getIniciaisAtleta = (u) => {
    if (!u) return '??';
    if (u.apelido) {
        const partes = u.apelido.trim().split(/\s+/);
        if (partes.length > 1) return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
        return u.apelido.substring(0, 2).toUpperCase();
    }
    if (!u.nome_completo) return '??';
    const partes = u.nome_completo.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
};
import { usarEquipe } from '../../contextos/EquipeContexto';
import { usarAutenticacao } from '../../contextos/AutenticacaoContexto';
import { usarNotificacoes } from '../../contextos/NotificacoesContexto';
import { supabase } from '../../servicos/supabase';
import { rastrear } from '../../servicos/rastreamento';
import { Globe, MapPin, Trophy, Users, Search, ArrowLeft, Crown, User, Phone, MessageCircle, Ban, Lock } from 'lucide-react';
import Botao from '../../componentes/Botao/Botao';
import ModalPerfilAtleta from '../../componentes/Modais/ModalPerfilAtleta';
import ModalPerfilEquipe from '../../componentes/Modais/ModalPerfilEquipe';
import ModalAjustePrivacidade from '../../componentes/Modais/ModalAjustePrivacidade';
import './PaginaExplorar.css';

const MODALIDADES = [
  'Basquete',
  'Beach Tennis',
  'E-Sports',
  'Futebol de Campo',
  'Futebol Society',
  'Futsal',
  'Futevôlei',
  'Handebol',
  'Padel',
  'Tênis',
  'Vôlei de Areia / Praia',
  'Vôlei de Quadra',
];

const calcularIdade = (dataNascimento) => {
  if (!dataNascimento) return null;
  const hoje = new Date();
  const nascimento = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const m = hoje.getMonth() - nascimento.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }
  return idade;
};

const PaginaExplorar = ({ aoVoltar }) => {
  const [termoBusca, setTermoBusca] = useState('');
  const [modalidadeBusca, setModalidadeBusca] = useState('');
  const [cidadeBusca, setCidadeBusca] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const { solicitarIngresso, cancelarSolicitacaoIngresso, equipes: minhasEquipes, minhasSolicitacoes } = usarEquipe();
  const { usuario, dadosUsuario } = usarAutenticacao();
  const { matchesConfirmados, matches, carregarNotificacoes } = usarNotificacoes();
  
  const [abaAtiva, setAbaAtiva] = useState('equipes'); // 'equipes' ou 'atletas'
  const [pagina, setPagina] = useState(0);
  const [temMais, setTemMais] = useState(true);
  const ITENS_POR_PAGINA = 12;
  const [buscouUmaVez, setBuscouUmaVez] = useState(false);
  const [solicitadosGatilho, setSolicitadosGatilho] = useState({});
  const [processando, setProcessando] = useState(null);
  const [equipeSelecionada, setEquipeSelecionada] = useState(null);
  const [mostrarAvisoPrivacidade, setMostrarAvisoPrivacidade] = useState(false);
  const [atletaPendente, setAtletaPendente] = useState(null);
  const [atletaSelecionado, setAtletaSelecionado] = useState(null);
  const [idsColega, setIdsColega] = useState(new Set()); // atletas que já são da equipe do usuário

  // IDs de equipes onde o usuario já é membro ou já solicitou
  const idsMinhasEquipes = new Set((minhasEquipes || []).map((e) => e.id));
  const idsSolicitacoesEnviadas = new Set((minhasSolicitacoes || []).map((s) => s.id));


  const executarBusca = useCallback(async (novaBusca = true) => {
    setBuscando(true);
    setBuscouUmaVez(true);
    
    const novaPagina = novaBusca ? 0 : pagina + 1;
    const de = novaPagina * ITENS_POR_PAGINA;
    const ate = de + ITENS_POR_PAGINA - 1;

    try {
      let query;

      if (abaAtiva === 'equipes') {
        query = supabase
          .from('equipes')
          .select(`
            *,
            admin:usuarios!equipes_admin_id_fkey (
              id,
              nome_completo,
              apelido,
              foto_url
            ),
            membros:membros_equipe(id, status)
          `, { count: 'exact' })
          .eq('visibilidade', 'publica')
          .eq('status', 'ativo')
          .order('nome', { ascending: true });

        if (modalidadeBusca) query = query.eq('modalidade', modalidadeBusca);
        if (cidadeBusca)     query = query.ilike('local_cidade', `%${cidadeBusca}%`);
        if (termoBusca)      query = query.or(`nome.ilike.%${termoBusca}%,slug_convite.ilike.%${termoBusca}%`);
      } else {
        // Busca de Atletas - Apenas Maiores de 18 anos por segurança
        const hoje = new Date();
        const dataCorte = new Date(hoje.getFullYear() - 18, hoje.getMonth(), hoje.getDate())
          .toISOString().split('T')[0];

        query = supabase
          .from('usuarios')
          .select('*', { count: 'exact' })
          .eq('perfil_publico', true)
          .lte('data_nascimento', dataCorte) // Filtro de maioridade
          .order('nome_completo', { ascending: true });

        if (termoBusca) {
          query = query.or(`nome_completo.ilike.%${termoBusca}%,apelido.ilike.%${termoBusca}%`);
        }
        if (cidadeBusca) {
          query = query.ilike('cidade', `%${cidadeBusca}%`);
        }
        if (modalidadeBusca) {
          query = query.contains('esportes_interesse', [modalidadeBusca]);
        }
      }

      const { data, error, count } = await query.range(de, ate);
      if (error) throw error;

      const lista = data || [];

      // Para aba de atletas: detecta quais já são colegas de alguma equipe do usuário
      if (abaAtiva === 'atletas' && lista.length > 0 && minhasEquipes?.length > 0) {
        const minhasEquipeIds = minhasEquipes.map(e => e.id);
        const atletaIds = lista.map(a => a.id);
        const { data: colegas } = await supabase
          .from('membros_equipe')
          .select('usuario_id')
          .in('equipe_id', minhasEquipeIds)
          .in('usuario_id', atletaIds)
          .eq('status', 'ativo');
        const novosIds = new Set((colegas || []).map(c => c.usuario_id));
        setIdsColega(prev => novaBusca ? novosIds : new Set([...prev, ...novosIds]));
      } else if (novaBusca) {
        setIdsColega(new Set());
      }

      if (novaBusca) {
        setResultados(lista);
        rastrear.clique('explorar_realizou_busca', 'Realizou busca na tela Explorar', { aba: abaAtiva, termo: termoBusca || 'vazio' });
      } else {
        setResultados(prev => [...prev, ...lista]);
      }
      
      setPagina(novaPagina);
      setTemMais(count > (de + (data?.length || 0)));
    } catch (err) {
      console.error('Erro na busca:', err.message);
      if (novaBusca) setResultados([]);
    } finally {
      setBuscando(false);
    }
  }, [termoBusca, modalidadeBusca, cidadeBusca, pagina, abaAtiva]);

  // Dispara busca automática ao montar e ao trocar de aba (sem precisar clicar em Pesquisar)
  useEffect(() => {
    executarBusca(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abaAtiva]);

  const handleFormBusca = (e) => {
    e.preventDefault();
    executarBusca();
  };

  const handleCutucar = async (atletaAlvo) => {
    if (!usuario || !dadosUsuario) {
      alert('Carregando seus dados... Tente novamente em instantes ou certifique-se de estar logado.');
      return;
    }

    // NOVA TRAVA: Só pode passar a bola se o SEU perfil for público e whatsapp liberado
    if (!dadosUsuario.perfil_publico || !dadosUsuario.compartilhar_whatsapp_match) {
        setAtletaPendente(atletaAlvo);
        setMostrarAvisoPrivacidade(true);
        return;
    }

    const idadeEu = calcularIdade(dadosUsuario.data_nascimento);
    const idadeAlvo = calcularIdade(atletaAlvo.data_nascimento);

    // Se não tiver data de nascimento, vamos assumir que pode ser menor por segurança (ou avisar)
    if (idadeEu === null || idadeAlvo === null) {
        alert('Para interagir, ambos os atletas precisam ter a data de nascimento preenchida no perfil. 🛡️');
        return;
    }

    if (idadeEu < 18 || idadeAlvo < 18) {
      alert('Para segurança de todos, a interação direta ("Passar a bola") só é permitida entre maiores de 18 anos. 🛡️');
      return;
    }

    // Se já é um match histórico
    // Se ocorrer um Match Mútuo (ambos passaram a bola), o contato é liberado automaticamente
    if (matchesConfirmados?.has(atletaAlvo.id)) {
        if (atletaAlvo.telefone) {
            const numeroLimpo = atletaAlvo.telefone.replace(/\D/g, '');
            const msg = `Fala craque! Vi que demos match no PlayHub ⚽. Bora jogar?`;
            window.open(`https://api.whatsapp.com/send?phone=55${numeroLimpo}&text=${encodeURIComponent(msg)}`, '_blank');
        } else {
            alert('Vocês deram Match! ⚽ Mas este atleta ainda não cadastrou um número de WhatsApp.');
        }
        return;
    }

    try {
      const { error } = await supabase
        .from('interacoes')
        .insert({
          remetente_id: usuario.id,
          destinatario_id: atletaAlvo.id,
          tipo: 'bola'
        });
      
      if (error) {
        console.error('Erro Supabase:', error);
        throw error;
      }
      
      rastrear.clique('explorar_passou_bola', 'Passou a bola para um atleta como demonstração de interesse');
      alert('Você passou a bola para este atleta! ⚽');
      carregarNotificacoes(); // Atualiza instantaneamente os botões para match ou espera
    } catch (err) {
      console.error('Erro ao interagir:', err);
      // Se for duplicidade, apenas ignoramos o alerta de erro e atualizamos
      if (err.code === '23505' || err.message?.includes('duplicate key')) {
        carregarNotificacoes();
        return;
      }
      alert(`Erro ao passar a bola: ${err.message || 'Verifique sua conexão.'}`);
    }
  };

    const handleSolicitar = async (equipeId) => {
    setProcessando(equipeId);
    const result = await solicitarIngresso(equipeId);
    if (result.sucesso) {
      rastrear.clique('explorar_solicitou_ingresso', 'Solicitou ingresso numa equipe listada publicamente');
      setSolicitadosGatilho((prev) => ({ ...prev, [equipeId]: true }));
    } else {
      alert(result.erro);
    }
    setProcessando(null);
  };

  const handleCancelarSolicitacao = async (equipeId) => {
    const result = await cancelarSolicitacaoIngresso(equipeId);
    if (result.sucesso) {
      rastrear.clique('explorar_cancelou_solicitacao', 'Cancelou uma submissão pendente de ingresso');
      setSolicitadosGatilho((prev) => {
        const novo = { ...prev };
        delete novo[equipeId];
        return novo;
      });
      // Forçar atualização do contexto se necessário, mas o delete local já limpa o estado visual
    } else {
      alert(result.erro);
    }
  };

  const statusEquipe = (equipe) => {
    if (!usuario) return null;
    if (equipe.admin_id === usuario.id) return 'dono';
    if (idsMinhasEquipes.has(equipe.id)) return 'membro';
    return null;
  };

  return (
    <div className="pagina-explorar">
      <header className="explorar-header">
        <h1>
          <Globe size={32} />
          Explorar PlayHub
        </h1>
        <p>Encontre equipes, novos parceiros de jogo e expanda sua rede esportiva.</p>
      </header>

      <div className="explorar-abas">
        <button 
          className={`btn-aba ${abaAtiva === 'equipes' ? 'ativa' : ''}`}
          onClick={() => {
            setAbaAtiva('equipes');
            setResultados([]);
            setBuscouUmaVez(false);
          }}
        >
          <Trophy size={18} /> Equipes Públicas
        </button>
        <button 
          className={`btn-aba ${abaAtiva === 'atletas' ? 'ativa' : ''}`}
          onClick={() => {
            setAbaAtiva('atletas');
            setResultados([]);
            setBuscouUmaVez(false);
          }}
        >
          <Users size={18} /> Atletas (Perfil Público)
        </button>
      </div>

      <form className="explorar-filtros" onSubmit={handleFormBusca}>
        <div className="filtro-grupo">
          <Search size={18} />
          <input
            type="text"
            placeholder={abaAtiva === 'equipes' ? "Nome ou código do time..." : "Nome ou apelido do atleta..."}
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
          />
        </div>

        <div className="filtro-grupo filtro-select">
          <Trophy size={18} />
          <select
            value={modalidadeBusca}
            onChange={(e) => setModalidadeBusca(e.target.value)}
          >
            <option value="">{abaAtiva === 'equipes' ? 'Todas as Modalidades' : 'Interesse em...'}</option>
            {MODALIDADES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className="filtro-grupo">
          <MapPin size={18} />
          <input
            type="text"
            placeholder="Digite uma cidade..."
            value={cidadeBusca}
            onChange={(e) => setCidadeBusca(e.target.value)}
          />
        </div>

        <Botao type="submit" disabled={buscando} style={{ flexShrink: 0 }}>
          <Search size={16} /> {buscando ? 'Buscando...' : 'Pesquisar'}
        </Botao>
      </form>

      <div className="explorar-resultados">
        {buscando && resultados.length === 0 ? (
          <div className="explorar-vazio">
            <div className="loading-spinner" />
            <p>Buscando {abaAtiva === 'equipes' ? 'equipes' : 'atletas'}...</p>
          </div>
        ) : resultados.length > 0 ? (
          <div className="grade-explorar">
            {abaAtiva === 'equipes' ? (
              resultados.map((equipe) => {
                const meuStatus = statusEquipe(equipe);
                const nomeAdmin = formatarNome(equipe.admin?.nome_completo || equipe.admin?.apelido || 'Desconhecido');
                const qtdMembros = (equipe.membros || []).filter(m => m.status === 'ativo').length;
                return (
                  <div key={equipe.id} className={`card-explorar ${meuStatus ? 'card-explorar--meu' : ''} animacao-entrada`}>
                    {meuStatus && (
                      <div className={`tag-status-meu ${meuStatus === 'dono' ? 'tag-dono' : 'tag-membro'}`}>
                        {meuStatus === 'dono' ? <><Crown size={13} /> Sua Equipe (Capitão)</> : <><Trophy size={13} /> Você é Membro</>}
                      </div>
                    )}

                    <div className="card-explorar-topo">
                      {equipe.logo_url ? (
                        <img src={equipe.logo_url} alt={equipe.nome} className="logo-explorar" />
                      ) : (
                        <div className="logo-explorar-placeholder">
                          <Trophy size={28} />
                        </div>
                      )}
                      <div className="card-explorar-info">
                        <h4>{equipe.nome}</h4>
                        <span className="badge-mi">{equipe.modalidade}</span>
                      </div>
                    </div>

                    <div className="card-explorar-meta">
                      {equipe.local_cidade && (
                        <span><MapPin size={14} /> {equipe.local_cidade}{equipe.local_estado ? ` - ${equipe.local_estado}` : ''}</span>
                      )}
                      <span><Users size={14} /> {qtdMembros} {qtdMembros === 1 ? 'membro' : 'membros'}{equipe.nivel ? ` • ${equipe.nivel}` : ''}</span>
                      <span className="admin-do-time">
                        <Crown size={13} /> <b>Capitão:</b> {nomeAdmin}
                      </span>
                    </div>

                    {meuStatus ? (
                      <div className="tag-ja-membro" style={{ marginTop: 'auto' }}>
                        {meuStatus === 'dono' ? '👑 Você administra esta equipe' : '✓ Você já faz parte desta equipe'}
                      </div>
                    ) : (solicitadosGatilho[equipe.id] || idsSolicitacoesEnviadas.has(equipe.id)) ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: 'auto' }}>
                        <div className="tag-pendente" style={{ width: '100%', textAlign: 'center' }}>Solicitação Enviada ✓</div>
                        <button 
                            className="btn-cancelar-solicitacao" 
                            onClick={() => handleCancelarSolicitacao(equipe.id)}
                            style={{ 
                                background: 'none', 
                                border: 'none', 
                                color: '#f43f5e', 
                                fontSize: '0.75rem', 
                                textDecoration: 'underline', 
                                cursor: 'pointer',
                                padding: '4px'
                            }}
                        >
                            Desfazer Solicitação
                        </button>
                      </div>
                    ) : !equipe.aceitando_membros ? (
                      <div className="tag-recrutamento-fechado" style={{ 
                        marginTop: 'auto', 
                        padding: '12px', 
                        textAlign: 'center', 
                        background: 'rgba(244, 63, 94, 0.05)', 
                        border: '1px dashed rgba(244, 63, 94, 0.2)',
                        color: '#fb7185',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}>
                        <Ban size={14} style={{ marginBottom: '4px' }} /><br/>
                        Recrutamento fechado no momento
                      </div>
                    ) : (
                      <Botao
                        onClick={() => handleSolicitar(equipe.id)}
                        disabled={processando === equipe.id}
                        style={{ width: '100%', justifyContent: 'center', marginTop: 'auto' }}
                      >
                        {processando === equipe.id ? 'Aguarde...' : 'Solicitar Ingresso'}
                      </Botao>
                    )}

                    <Botao 
                      variant="minimal" 
                      style={{ width: '100%', padding: '6px', fontSize: '0.75rem', marginTop: '4px', opacity: 0.8 }}
                      onClick={() => setEquipeSelecionada(equipe)}
                    >
                      <Trophy size={12} /> Ver Ficha do Time
                    </Botao>
                  </div>
                )
              })
            ) : (
              resultados.map((atleta) => (
                <div key={atleta.id} className="card-atleta-explorar animacao-entrada">
                  <div className="atleta-topo">
                    {atleta.foto_url ? (
                      <img src={atleta.foto_url} alt={atleta.nome_completo} className="atleta-avatar" />
                    ) : (
                      <div className="atleta-avatar-placeholder">
                        {getIniciaisAtleta(atleta)}
                      </div>
                    )}
                    <div className="atleta-info">
                      <h4>{formatarNome(atleta.nome_completo)}</h4>
                      <div className="atleta-slug-idade">
                        <span>{formatarHandleAtleta(atleta)}</span>
                        {atleta.id === usuario.id && <span className="badge-voce">VOCÊ</span>}
                        {atleta.data_nascimento && (
                          <span className="badge-idade">{calcularIdade(atleta.data_nascimento)} anos</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="atleta-meta">
                    <span><MapPin size={14} /> {atleta.cidade || 'Local não inf.'}, {atleta.estado || '??'}</span>
                    <div className="lista-esportes-atleta">
                      {atleta.esportes_interesse?.slice(0, 3).map(esp => (
                        <span key={esp} className="tag-esporte">{esp}</span>
                      ))}
                    </div>
                  </div>
                  <div className="atleta-acoes">
                    <Botao
                      variant="minimal"
                      style={{ flex: 1, fontSize: '0.8rem', gap: '4px' }}
                      onClick={() => setAtletaSelecionado(atleta)}
                    >
                      <User size={14} /> Ver Perfil
                    </Botao>
                    {atleta.id === usuario.id ? (
                      <div style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: '6px', fontSize: '0.8rem', fontWeight: '700',
                        color: '#3498db', background: 'rgba(52, 152, 219, 0.1)',
                        border: '1px solid rgba(52, 152, 219, 0.25)', borderRadius: '8px',
                        padding: '6px 8px', cursor: 'pointer'
                      }} onClick={() => setAtletaSelecionado(atleta)}>
                        <User size={14}/> Meu Perfil
                      </div>
                    ) : idsColega.has(atleta.id) ? (
                      <div style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: '4px', fontSize: '0.75rem', fontWeight: '700',
                        color: '#10b981', background: 'rgba(16,185,129,0.1)',
                        border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px',
                        padding: '6px 8px'
                      }}>
                        ✓ Colega de Equipe
                      </div>
                    ) : (() => {
                          const idNormal = String(atleta.id).toLowerCase().trim();
                          const ehMatchMútuo = matchesConfirmados?.has(idNormal);
                          const euPasseiABola = matches?.has(idNormal);

                          return (
                            <Botao
                              variant="secundario"
                              onClick={() => {
                                if (atleta.id === usuario.id) {
                                  setAtletaSelecionado(atleta);
                                } else if (ehMatchMútuo) {
                                  const tel = atleta.telefone?.replace(/\D/g, '');
                                  if (tel) window.open(`https://wa.me/55${tel}`, '_blank');
                                } else {
                                  handleCutucar(atleta);
                                }
                              }}
                              style={{ 
                                flex: 1, 
                                fontSize: '0.8rem', 
                                gap: '4px',
                                background: atleta.id === usuario.id ? 'rgba(255, 255, 255, 0.05)' :
                                            ehMatchMútuo ? 'rgba(37, 211, 102, 0.15)' : 
                                            euPasseiABola ? 'rgba(255, 255, 255, 0.05)' : undefined,
                                color: atleta.id === usuario.id ? '#94a3b8' :
                                       ehMatchMútuo ? '#25D366' : 
                                       euPasseiABola ? '#94a3b8' : undefined,
                                borderColor: atleta.id === usuario.id ? 'rgba(255, 255, 255, 0.1)' :
                                             ehMatchMútuo ? 'rgba(37, 211, 102, 0.4)' : 
                                             euPasseiABola ? 'rgba(255, 255, 255, 0.1)' : undefined
                              }}
                              disabled={(euPasseiABola && !ehMatchMútuo) || (!atleta.compartilhar_whatsapp_match && atleta.id !== usuario.id)}
                              title={atleta.id === usuario.id ? 'Ver meu perfil' :
                                     ehMatchMútuo ? 'Match! Clique para conversar' : 
                                     !atleta.compartilhar_whatsapp_match ? 'O WhatsApp deste atleta está privado 🛡️' :
                                     euPasseiABola ? 'Você já passou a bola. Aguarde a retribuição!' : 'Passar a bola'}
                            >
                              {atleta.id === usuario.id ? <><User size={14}/> Meu Perfil</> :
                               ehMatchMútuo ? <><MessageCircle size={14}/> Conversar</> : 
                               !atleta.compartilhar_whatsapp_match ? <><Lock size={14}/> Bola Bloqueada</> :
                               euPasseiABola ? '✓ Bola Passada' : '⚽ Passar a bola'}
                            </Botao>
                          );
                        })()}
                  </div>
                </div>
              ))
            )}
            {temMais && (
              <div className="carregar-mais-explorar">
                <Botao 
                  variant="secundario" 
                  onClick={() => executarBusca(false)}
                  disabled={buscando}
                  style={{ minWidth: '220px' }}
                >
                  {buscando ? 'Carregando...' : 'Carregar mais itens'}
                </Botao>
              </div>
            )}
          </div>
        ) : buscouUmaVez ? (
          <div className="explorar-vazio">
            <Search size={48} strokeWidth={1} />
            <p>Nenhum {abaAtiva === 'equipes' ? 'time' : 'atleta'} encontrado com esses filtros.</p>
          </div>
        ) : (
          <div className="explorar-vazio">
            <Search size={48} strokeWidth={1} />
            <p>Use os filtros e clique em <strong>Pesquisar</strong> para encontrar {abaAtiva === 'equipes' ? 'equipes' : 'parceiros de jogo'}.</p>
          </div>
        )}
      </div>

      {equipeSelecionada && (
        <ModalPerfilEquipe 
          isOpen={!!equipeSelecionada}
          onClose={() => setEquipeSelecionada(null)}
          idEquipe={equipeSelecionada?.id}
          aoVerAtleta={(atleta) => {
            setEquipeSelecionada(null); // Fecha o modal da equipe
            setTimeout(() => setAtletaSelecionado(atleta), 100); // Abre o do atleta com delay suave
          }}
        />
      )}

      {atletaSelecionado && (
      <ModalPerfilAtleta 
        isOpen={!!atletaSelecionado}
        onClose={() => setAtletaSelecionado(null)}
        idAtleta={atletaSelecionado?.id}
        aoPassarBola={handleCutucar}
      />
      )}

      {/* Trava de Privacidade */}
      <ModalAjustePrivacidade 
        isOpen={mostrarAvisoPrivacidade}
        onClose={() => {
            setMostrarAvisoPrivacidade(false);
            setAtletaPendente(null);
        }}
        aoConcluir={() => {
            setMostrarAvisoPrivacidade(false);
            if (atletaPendente) {
                handleCutucar(atletaPendente);
            }
        }}
      />
    </div>
  );
};

export default PaginaExplorar;
