import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, Trophy, MapPin, Users, Crown, ShieldCheck, 
  ChevronRight, MessageCircle, Info, Lock, Globe,
  Activity, Star, Clock
} from 'lucide-react';
import { supabase } from '../../servicos/supabase';
import { usarEquipe } from '../../contextos/EquipeContexto';
import { usarAutenticacao } from '../../contextos/AutenticacaoContexto';
import Modal from '../Modal/Modal';
import Botao from '../Botao/Botao';
import './ModalPerfilEquipe.css';

const ModalPerfilEquipe = ({ isOpen, onClose, idEquipe, aoVerAtleta = null }) => {
    const { usuario } = usarAutenticacao();
    const { solicitarIngresso, minhasSolicitacoes, equipes: minhasEquipes } = usarEquipe();
    
    const [equipe, setEquipe] = useState(null);
    const [lideranca, setLideranca] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [processandoSolicitacao, setProcessandoSolicitacao] = useState(false);
    const [abaAtiva, setAbaAtiva] = useState('geral');
    const [erroPrivacidade, setErroPrivacidade] = useState(null);

    const carregarDados = useCallback(async () => {
        if (!idEquipe) return;
        setCarregando(true);
        try {
            // 1. Dados da Equipe
            const { data: eq, error: errEq } = await supabase
                .from('equipes')
                .select(`
                    *,
                    admin:usuarios!equipes_admin_id_fkey (id, nome_completo, apelido, foto_url),
                    membros:membros_equipe(id, status)
                `)
                .eq('id', idEquipe)
                .single();

            if (errEq) throw errEq;
            setEquipe(eq);

            // 2. Buscar Liderança via RPC (Versão estável atual no seu banco)
            const { data: dataRpc, error: errorRpc } = await supabase.rpc('buscar_lideranca_equipe_publica', { p_equipe_id: idEquipe });

            let leadsOrdenados = [];

            if (!errorRpc && dataRpc) {
                // Tenta descobrir quem é público fazendo uma busca rápida
                const { data: checkPublic } = await supabase
                    .from('usuarios')
                    .select('id')
                    .in('id', dataRpc.map(m => m.usuario_id))
                    .eq('perfil_publico', true);
                
                const idsPublicos = new Set((checkPublic || []).map(u => u.id));

                leadsOrdenados = dataRpc.map(m => ({
                    id: `id-${m.usuario_id}`,
                    usuario_id: m.usuario_id,
                    papel: m.papel,
                    usuarios: {
                        id: m.usuario_id,
                        nome_completo: m.nome_completo,
                        apelido: m.apelido,
                        foto_url: m.foto_url,
                        ehPublico: idsPublicos.has(m.usuario_id) // Se não encontrou na lista de públicos, é PRIVADO
                    }
                }));
            } else {
                // Fallback padrão se a RPC falhar
                const { data: leads } = await supabase
                    .from('membros_equipe')
                    .select('id, usuario_id, papel, usuarios(id, nome_completo, apelido, foto_url, perfil_publico)')
                    .eq('equipe_id', idEquipe)
                    .eq('status', 'ativo')
                    .filter('papel', 'in', '("admin","sub_admin")');

                leadsOrdenados = (leads || [])
                    .filter(l => l.usuarios)
                    .map(l => ({
                        ...l,
                        papel: l.usuario_id === eq.admin_id ? 'admin' : l.papel,
                        usuarios: {
                            ...l.usuarios,
                            ehPublico: l.usuarios.perfil_publico
                        }
                    }));
            }

            // SEGURANÇA MÁXIMA: Se o capitão (dono) ainda não estiver na lista (problema de RLS no membros_equipe),
            // tentamos injetá-lo usando o join que veio no objeto 'equipe' (eq)
            const temCapitao = leadsOrdenados.some(l => l.papel === 'admin');
            if (!temCapitao && eq.admin_id) {
                const dadosAdmin = Array.isArray(eq.admin) ? eq.admin[0] : eq.admin;
                leadsOrdenados.unshift({
                    id: `fake-admin-${eq.admin_id}`,
                    usuario_id: eq.admin_id,
                    papel: 'admin',
                    usuarios: { 
                        id: eq.admin_id, 
                        nome_completo: dadosAdmin?.nome_completo || (dadosAdmin?.apelido || 'Novo Jogador'),
                        foto_url: dadosAdmin?.foto_url || null,
                        ehPublico: !!dadosAdmin?.nome_completo
                    }
                });
            }

            // Ordenação final
            leadsOrdenados.sort((a, b) => {
                const ordem = { 'admin': 1, 'sub_admin': 2 };
                return (ordem[a.papel] || 3) - (ordem[b.papel] || 3);
            });

            setLideranca(leadsOrdenados);
        } catch (error) {
            console.error('Erro ao carregar perfil de equipe:', error);
        } finally {
            setCarregando(false);
        }
    }, [idEquipe]);

    useEffect(() => {
        if (isOpen && idEquipe) {
            carregarDados();
        }
    }, [isOpen, idEquipe, carregarDados]);

    if (!isOpen || !idEquipe) return null;

    // Lógica de Solicitação
    const jaSolicitou = minhasSolicitacoes?.some(s => s.equipe_id === idEquipe);
    const jaEMembro = minhasEquipes?.some(e => e.id === idEquipe);

    const handleSolicitar = async () => {
        setProcessandoSolicitacao(true);
        const result = await solicitarIngresso(idEquipe);
        if (!result.sucesso) alert(result.erro);
        setProcessandoSolicitacao(false);
    };

    const qtdMembros = (equipe?.membros || []).filter(m => m.status === 'ativo').length;

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Perfil da Equipe"
            maxWidth="480px"
        >
            {erroPrivacidade && (
                <div className="alerta-privacidade-modal universal-perfil" style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    margin: '10px 15px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    animation: 'shake 0.4s ease-in-out'
                }}>
                    <Lock size={18} />
                    <span>{erroPrivacidade}</span>
                </div>
            )}
            <div className="perfil-equipe-container universal-perfil anima-entrada">
                {carregando ? (
                    <div className="loading-perfil-centrado">
                        <Trophy size={32} className="animate-spin" />
                        <p>Buscando ficha da equipe...</p>
                    </div>
                ) : !equipe ? (
                    <div className="erro-perfil">Equipe não encontrada.</div>
                ) : (
                    <>
                        {/* CABEÇALHO */}
                        <div className="perfil-header-capa equipe-capa">
                            <div className="perfil-avatar-wrapper">
                                {equipe.logo_url ? (
                                    <img src={equipe.logo_url} alt={equipe.nome} className="perfil-foto" />
                                ) : (
                                    <div className="perfil-foto-placeholder">
                                        <Trophy size={48} color="#64748b" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="perfil-info-basica">
                            <h2 className="perfil-nome">{equipe.nome}</h2>
                            <div className="perfil-badges-row">
                                <span className="badge-atleta-posicao">
                                    <Activity size={14} /> {equipe.modalidade}
                                </span>
                                {equipe.nivel && (
                                    <span className="badge-atleta-nivel">
                                        <Star size={14} /> {equipe.nivel}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* NAVEGAÇÃO DE ABAS */}
                        <div className="perfil-tabs-nav">
                            <button 
                                className={`tab-btn ${abaAtiva === 'geral' ? 'active' : ''}`}
                                onClick={() => setAbaAtiva('geral')}
                            >
                                <Info size={16} /> Geral
                            </button>
                            <button 
                                className={`tab-btn ${abaAtiva === 'lideranca' ? 'active' : ''}`}
                                onClick={() => setAbaAtiva('lideranca')}
                            >
                                <Crown size={16} /> Liderança
                            </button>
                        </div>

                        <div className="perfil-tab-content anima-slide">
                            {abaAtiva === 'geral' ? (
                                <>
                                    {/* SOBRE A EQUIPE */}
                                    <div className="perfil-secao">
                                        <h3 className="perfil-secao-titulo"><Globe size={16} /> Sobre o Time</h3>
                                        {equipe.observacoes ? (
                                            <p className="perfil-bio">"{equipe.observacoes}"</p>
                                        ) : (
                                            <p className="vazio-msg">Esta equipe ainda não definiu uma bio.</p>
                                        )}
                                    </div>

                                    {/* FICHA TÉCNICA DA EQUIPE */}
                                    <div className="perfil-secao">
                                        <h3 className="perfil-secao-titulo"><ShieldCheck size={16} /> Ficha da Equipe</h3>
                                        <div className="perfil-grid-dados">
                                            <div className="dado-item">
                                                <span className="label">Membros</span>
                                                <span className="valor">{qtdMembros} ativos</span>
                                            </div>
                                            <div className="dado-item">
                                                <span className="label">Sede</span>
                                                <span className="valor">
                                                    <MapPin size={12} /> {equipe.local_cidade || equipe.cidade}, {equipe.local_estado || equipe.estado}
                                                </span>
                                            </div>
                                            <div className="dado-item">
                                                <span className="label">Visibilidade</span>
                                                <span className="valor">
                                                    {equipe.visibilidade === 'publica' ? <><Globe size={12}/> Pública</> : <><Lock size={12}/> Privada</>}
                                                </span>
                                            </div>
                                            <div className="dado-item">
                                                <span className="label">Recrutamento</span>
                                                <span className="valor">{equipe.aceitando_membros ? '🔵 Aberto' : '🔴 Fechado'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* LIDERANÇA */}
                                    <div className="perfil-secao">
                                        <h3 className="perfil-secao-titulo"><Crown size={16} /> Capitão e Vices</h3>
                                        <div className="lideranca-lista">
                                            {lideranca.length > 0 ? (
                                                lideranca.map(lead => (
                                                    <div 
                                                        key={lead.id} 
                                                        className={`lider-card ${lead.papel} ${!lead.usuarios?.ehPublico && lead.usuarios?.id !== usuario?.id ? 'lider-privado' : ''}`}
                                                        onClick={() => {
                                                            setErroPrivacidade(null);

                                                            // Só permite ver o perfil se for o próprio usuário ou se o perfil for público
                                                            if (lead.usuarios?.ehPublico || lead.usuarios?.id === usuario?.id) {
                                                                aoVerAtleta?.(lead.usuarios);
                                                            } else {
                                                                setErroPrivacidade(`O perfil de ${lead.usuarios?.nome_completo || 'este gestor'} é privado. Por questões de privacidade, os dados esportivos e de contato estão restritos. 🔒`);
                                                                setTimeout(() => setErroPrivacidade(null), 6000);
                                                            }
                                                        }}
                                                    >
                                                        <div className="lider-avatar">
                                                            {lead.usuarios?.foto_url ? (
                                                                <img src={lead.usuarios.foto_url} alt={lead.usuarios.nome_completo} />
                                                            ) : (
                                                                <div className="lider-placeholder">{lead.usuarios?.nome_completo?.charAt(0) || '?'}</div>
                                                            )}
                                                            <div className={`badge-p-lead ${lead.papel}`}>
                                                                {lead.papel === 'admin' ? <Crown size={12} /> : <ShieldCheck size={12} />}
                                                            </div>
                                                        </div>
                                                        <div className="lider-info">
                                                            <strong>{lead.usuarios?.nome_completo}</strong>
                                                            <span>{lead.papel === 'admin' ? 'Capitão' : 'Vice-Capitão'}</span>
                                                        </div>
                                                        <ChevronRight size={18} color="#475569" className="lider-seta" />
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="vazio-msg">Informação de liderança não disponível.</p>
                                            )}
                                        </div>
                                        <p className="lideranca-dica">Clique em um gestor para ver o perfil e passar a bola! ⚽</p>
                                    </div>
                                </>
                            )}

                            {/* BOTÃO DE SOLICITAÇÃO (SEMPRE VISÍVEL SE NÃO MMBRO) */}
                            <div className="perfil-rodape-acoes">
                                {jaEMembro ? (
                                    <div className="tag-ja-membro">✓ Você faz parte desta equipe</div>
                                ) : jaSolicitou ? (
                                    <div className="tag-pendente">Solicitação em análise...</div>
                                ) : (
                                    <Botao 
                                        onClick={handleSolicitar} 
                                        disabled={processandoSolicitacao || !equipe.aceitando_membros}
                                        style={{ width: '100%', justifyContent: 'center' }}
                                    >
                                        <MessageCircle size={18} /> {processandoSolicitacao ? 'Enviando...' : 'Solicitar Ingresso'}
                                    </Botao>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default ModalPerfilEquipe;
