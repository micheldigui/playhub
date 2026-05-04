import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, User, Trophy, Calendar, Star, DollarSign, 
  ShieldCheck, Crown, MessageCircle, MapPin, 
  Activity, Award, Clock, Lock, Share2
} from 'lucide-react';
import { usarEquipe } from '../../contextos/EquipeContexto';
import { usarAutenticacao } from '../../contextos/AutenticacaoContexto';
import { usarFinanceiro } from '../../contextos/FinanceiroContexto';
import { usarNotificacoes } from '../../contextos/NotificacoesContexto';
import { supabase } from '../../servicos/supabase';
import { buscarPerfilPublicoAtletaSeguro } from '../../servicos/perfisPublicos';
import Modal from '../Modal/Modal';
import Botao from '../Botao/Botao';
import ModalAjustePrivacidade from './ModalAjustePrivacidade';
import './ModalPerfilAtleta.css';

const formatarNome = (nomeCompleto) => {
    if (!nomeCompleto) return 'Atleta';
    const partes = nomeCompleto.trim().split(/\s+/);
    const capitalizar = (p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
    
    if (partes.length === 1) return capitalizar(partes[0]);
    
    const primeiro = capitalizar(partes[0]);
    const ultimo = capitalizar(partes[partes.length - 1]);
    return `${primeiro} ${ultimo}`;
};

const getIniciaisAtleta = (u) => {
    if (!u) return '??';
    const nome = u.nome_completo || '';
    const apelido = u.apelido || '';
    if (apelido) {
      const partes = apelido.trim().split(/[\s._-]+/);
      if (partes.length > 1) return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
      return apelido.substring(0, 2).toUpperCase();
    }
    if (!nome) return '??';
    const partes = nome.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
};

const formatarHandleAtleta = (u) => {
    if (!u) return '@Atleta';
    const texto = u.apelido || u.nome_completo?.split(' ')[0] || 'Atleta';
    const formatado = texto.trim().split(/\s+/).map(p => 
        p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
    ).join('');
    return `@${formatado}`;
};

const ModalPerfilAtleta = ({ isOpen, onClose, idAtleta, equipeId = null, aoPassarBola = null }) => {
    const { dadosUsuario: eu, ehSuperAdmin } = usarAutenticacao();
    const { equipeAtiva, temPermissaoEquipe, getLabelVinculo, equipes } = usarEquipe();
    const { verificarSituacaoFinanceiraAtleta } = usarFinanceiro();
    const { matchesConfirmados, matches } = usarNotificacoes();

    const [atleta, setAtleta] = useState(null);
    const [membro, setMembro] = useState(null);
    const [modalidades, setModalidades] = useState([]);
    const [financeiro, setFinanceiro] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [carregandoFin, setCarregandoFin] = useState(false);
    const [abaAtiva, setAbaAtiva] = useState('geral');
    const [erroSessao, setErroSessao] = useState(false);
    const [ehGestorDoAtleta, setEhGestorDoAtleta] = useState(false);
    const [mostrarAvisoPrivacidade, setMostrarAvisoPrivacidade] = useState(false);

    const carregarDados = useCallback(async () => {
        if (!idAtleta) return;
        setCarregando(true);
        try {
            // 1. Dados Básicos e Perfil
            let user = null;
            try {
                user = await buscarPerfilPublicoAtletaSeguro(idAtleta);
            } catch (rpcError) {
                // Mantem fallback legado enquanto a migration segura ainda nao foi aplicada.
            }

            if (!user) {
                const { data: userLegado, error: errUser } = await supabase
                    .from('usuarios')
                    .select('*')
                    .eq('id', idAtleta)
                    .maybeSingle();

                if (errUser) throw errUser;
                user = userLegado;
            }
            
            if (!user) {
                setAtleta(null); // Atleta não existe ou RLS bloqueou
            } else {
                setAtleta(user);
            }

            // 2. Modalidades Detalhadas
            const { data: mods } = await supabase
                .from('jogador_modalidades')
                .select('*')
                .eq('usuario_id', idAtleta);
            setModalidades(mods || []);

            // 3. Vínculo com Equipe (Se fornecido ou se tiver equipe ativa)
            const idEquipeRef = equipeId || equipeAtiva?.id;
            if (idEquipeRef) {
                const { data: member } = await supabase
                    .from('membros_equipe')
                    .select('*')
                    .eq('equipe_id', idEquipeRef)
                    .eq('usuario_id', idAtleta)
                    .maybeSingle();
                setMembro(member);

                // 4. Financeiro (Dono/Membro da equipe)
                // Só carrega se o atleta for realmente um MEMBRO desta equipe
                const podeVerFinanceiro = ehSuperAdmin || 
                                         (member && (equipeAtiva?.papel === 'admin' || equipeAtiva?.papel === 'sub_admin' || temPermissaoEquipe('gerenciar_financeiro')));
                
                if (podeVerFinanceiro) {
                    setCarregandoFin(true);
                    const status = await verificarSituacaoFinanceiraAtleta(idEquipeRef, idAtleta);
                    setFinanceiro(status);
                    setCarregandoFin(false);
                } else {
                    setFinanceiro(null);
                }
            } else {
                setMembro(null);
                setFinanceiro(null);
            }

            // 5. Verificação de Liderança Global (Gestor de qualquer time do atleta)
            const idsMinhasGeridas = equipes?.filter(e => e.papel === 'admin' || e.papel === 'sub_admin').map(e => e.id) || [];
            if (idsMinhasGeridas.length > 0) {
                const { data: v } = await supabase
                    .from('membros_equipe')
                    .select('equipe_id')
                    .eq('usuario_id', idAtleta)
                    .in('equipe_id', idsMinhasGeridas)
                    .eq('status', 'ativo');
                setEhGestorDoAtleta(v && v.length > 0);
            } else {
                setEhGestorDoAtleta(false);
            }
        } catch (error) {
            console.error('Erro ao carregar perfil unificado:', error);
            // Detectar erro de sessão expirada (token inválido) para degradar graciosamente
            if (error?.message?.includes('Refresh Token') || error?.message?.includes('JWT') || error?.code === 'PGRST301') {
                setErroSessao(true);
            }
        } finally {
            setCarregando(false);
        }
    }, [idAtleta, equipeId, equipeAtiva, ehSuperAdmin, temPermissaoEquipe, verificarSituacaoFinanceiraAtleta, equipes]);

    useEffect(() => {
        if (isOpen && idAtleta) {
            carregarDados();
        }
    }, [isOpen, idAtleta, carregarDados]);

    if (!isOpen || !idAtleta) return null;

    const podeVerTudo = ehSuperAdmin || (membro && (equipeAtiva?.papel === 'admin' || equipeAtiva?.papel === 'sub_admin')) || idAtleta === eu?.id;
    const perfilPrivado = atleta && !atleta.perfil_publico && !podeVerTudo;
    const idAtletaNormal = String(idAtleta || '').toLowerCase().trim();
    const ehMatch = matchesConfirmados?.has(idAtletaNormal);
    const jaEnviou = matches?.has(idAtletaNormal);

    const calcularIdade = (dataNasc) => {
        if (!dataNasc) return null;
        const hoje = new Date();
        const nasc = new Date(dataNasc);
        let idade = hoje.getFullYear() - nasc.getFullYear();
        const m = hoje.getMonth() - nasc.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
        return idade;
    };

    const formatarHandleLocal = (val, completo) => {
        if (!val && !completo) return '@Atleta';
        const texto = val || completo?.split(' ')[0] || 'Atleta';
        return '@' + texto
            .split(' ')
            .filter(parte => parte.length > 0)
            .map(parte => parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase())
            .join('');
    };

    const handleAcaoBotao = () => {
        // NOVA TRAVA: Só pode passar a bola se VOCÊ e o ATLETA forem públicos
        // (Se for apenas interesse sem contato, a regra pode ser mais leve, mas o user pediu trava estrita)
        if (!eu?.perfil_publico || !eu?.compartilhar_whatsapp_match) {
            setMostrarAvisoPrivacidade(true);
            return;
        }

        // Se o ALVO tem zap privado, não pode passar a bola (Regra de Ouro)
        if (!atleta?.compartilhar_whatsapp_match && eu.id !== atleta?.id) {
            alert('Este atleta não autorizou o compartilhamento de WhatsApp para Matches. 🛡️');
            return;
        }

        if (aoPassarBola) {
            aoPassarBola(atleta);
            onClose();
        }
    };

    return (
        <>
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={perfilPrivado ? "Perfil Privado" : "Perfil do Atleta"}
            maxWidth="450px"
        >
            <div className="perfil-atleta-container universal-perfil anima-entrada">
                {carregando ? (
                    <div className="loading-perfil-centrado">
                        <Clock size={32} className="animate-spin" />
                        <p>Buscando ficha técnica...</p>
                    </div>
                ) : erroSessao ? (
                    <div className="erro-perfil" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                        <Lock size={32} color="#64748b" style={{ marginBottom: '12px' }} />
                        <p style={{ color: '#f1f5f9', marginBottom: '8px' }}>Sessão expirada</p>
                        <p style={{ fontSize: '0.85rem' }}>Sua sessão expirou. Faça login novamente para continuar.</p>
                    </div>
                ) : !atleta ? (
                    <div className="erro-perfil">Atleta não encontrado.</div>
                ) : (
                    <>
                        {/* CABEÇALHO */}
                        <div className="perfil-header-capa">
                            <div className="perfil-avatar-wrapper">
                                {atleta.foto_url ? (
                                    <img src={atleta.foto_url} alt={atleta.nome_completo} className="perfil-foto" />
                                ) : (
                                    <div className="perfil-foto-placeholder">
                                        {getIniciaisAtleta(atleta)}
                                    </div>
                                )}
                                {membro?.papel === 'admin' && <div className="badge-cargo gold" title="Capitão"><Crown size={16} /></div>}
                                {membro?.papel === 'sub_admin' && <div className="badge-cargo silver" title="Vice-Capitão"><ShieldCheck size={16} /></div>}
                            </div>
                        </div>

                        <div className="perfil-info-basica">
                            <h2 className="perfil-nome">{formatarNome(atleta.nome_completo)}</h2>
                            <span className="perfil-apelido">{formatarHandleAtleta(atleta)}</span>
                        </div>

                        {/* NAVEGAÇÃO DE ABAS */}
                        {!perfilPrivado && (
                            <div className="perfil-tabs-nav">
                                <button 
                                    className={`tab-btn ${abaAtiva === 'geral' ? 'active' : ''}`}
                                    onClick={() => setAbaAtiva('geral')}
                                >
                                    <User size={16} /> Visão Geral
                                </button>
                                <button 
                                    className={`tab-btn ${abaAtiva === 'esportivo' ? 'active' : ''}`}
                                    onClick={() => setAbaAtiva('esportivo')}
                                >
                                    <Trophy size={16} /> Perfil Esportivo
                                </button>
                            </div>
                        )}

                        {perfilPrivado ? (
                            <div className="perfil-privado-box">
                                <Lock size={48} color="#64748b" />
                                <h3>ESTE PERFIL É PRIVADO</h3>
                                <p>Este craque prefere manter os dados de atleta em sigilo. Apenas membros autorizados da equipe podem ver.</p>
                            </div>
                        ) : (
                            <div className="perfil-tab-content anima-slide">
                                {abaAtiva === 'geral' ? (
                                    <>
                                        {/* BIOGRAFIA CURTA */}
                                        {modalidades[0]?.bio && (
                                            <div className="perfil-secao">
                                                <h3 className="perfil-secao-titulo"><Award size={16} /> Sobre o Atleta</h3>
                                                <p className="perfil-bio">"{modalidades[0].bio}"</p>
                                            </div>
                                        )}

                                        {/* DADOS TÉCNICOS */}
                                        <div className="perfil-secao">
                                            <h3 className="perfil-secao-titulo"><Trophy size={16} /> Ficha do Jogador</h3>
                                            <div className="perfil-grid-dados">
                                                {membro && (
                                                    <div className="dado-item">
                                                        <span className="label">Vínculo</span>
                                                        <span className="valor">{getLabelVinculo(membro.vinculo)}</span>
                                                    </div>
                                                )}
                                                <div className="dado-item">
                                                    <span className="label">Idade</span>
                                                    <span className="valor">{(atleta.idade ?? calcularIdade(atleta.data_nascimento)) ? `${atleta.idade ?? calcularIdade(atleta.data_nascimento)} anos` : 'Não inf.'}</span>
                                                </div>
                                                <div className="dado-item">
                                                    <span className="label">Cidade</span>
                                                    <span className="valor">
                                                        <MapPin size={12} /> {atleta.cidade || 'Não inf.'}
                                                    </span>
                                                </div>
                                                {membro && (
                                                    <div className="dado-item">
                                                        <span className="label">Entrou em</span>
                                                        <span className="valor">{new Date(membro.entrou_em).toLocaleDateString('pt-BR')}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* FINANCEIRO (ADMIN ONLY) */}
                                        {(financeiro || carregandoFin) && (
                                            <div className="perfil-secao admin-section">
                                                <div className="secao-header-admin">
                                                    <h3 className="perfil-secao-titulo"><DollarSign size={16} /> Gestão Financeira</h3>
                                                    <span className="tag-admin-only">Acesso Restrito</span>
                                                </div>
                                                
                                                {carregandoFin ? (
                                                    <div className="loading-financeiro"><Clock size={16} className="animate-spin" /> Atualizando status...</div>
                                                ) : (
                                                    <div className={`card-status-financeiro ${financeiro?.status}`}>
                                                        <div className="status-info">
                                                            <span className="status-label">Situação Atual</span>
                                                            <span className="status-valor">
                                                                {financeiro?.status === 'vencido' ? '🔴 MENSALIDADE VENCIDA' : 
                                                                 financeiro?.status === 'pendente' ? '🟡 PAGAMENTO PENDENTE' : '🟢 TUDO EM DIA (OK)'}
                                                            </span>
                                                            {financeiro?.ciclo && <span className="status-ciclo">Referente a: {financeiro.ciclo}</span>}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {/* RESUMO TÉCNICO NO TOPO DA ABA */}
                                        {modalidades.length > 0 && (
                                            <div className="perfil-badges-row tab-top">
                                                <span className="badge-atleta-posicao">
                                                    <Activity size={14} /> {modalidades[0].posicao || 'Atleta'}
                                                </span>
                                                <span className="badge-atleta-nivel">
                                                    <Star size={14} /> {modalidades[0].nivel_habilidade || 'Lazer'}
                                                </span>
                                            </div>
                                        )}

                                        {/* MODALIDADES */}
                                        <div className="perfil-secao">
                                            <h3 className="perfil-secao-titulo"><Activity size={16} /> Todas as Modalidades</h3>
                                            {modalidades.length > 0 ? (
                                                <div className="lista-mini-modalidades grid-full">
                                                    {modalidades.map(m => (
                                                        <div key={m.id} className="mini-card-modalidade destaque">
                                                            <strong>{m.modalidade}</strong>
                                                            <span className="pos">{m.posicao || 'Atleta'}</span>
                                                            <span className="nivel-tag">{m.nivel_habilidade}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="vazio-msg">Este atleta ainda não cadastrou modalidades.</p>
                                            )}
                                        </div>
                                    </>
                                )}

                                {/* AÇÕES E WHATSAPP - SEMPRE NO FINAL DA ABA ATIVA OU FORA DO SCROLL SE PREFERIR, 
                                    MAS AQUI COMO PARTE DO CONTENT PARA NÃO POLUIR O FOOTER FIXO SE NÃO QUISERMOS MUDAR O MODAL.JSX */}
                                <div className="perfil-rodape-acoes">
                                    {(() => {
                                        // Regras de acesso e labels contextuais (Regra de Ouro)
                                        const liberadoPeloMatch = ehMatch && eu?.compartilhar_whatsapp_match && atleta.compartilhar_whatsapp_match;
                                        const liberadoPelaGestao = atleta.telefone && (ehSuperAdmin || ehGestorDoAtleta);
                                        
                                        let motivoAcesso = "";
                                        if (liberadoPelaGestao && !liberadoPeloMatch) {
                                            motivoAcesso = ehSuperAdmin ? "🛡️ Acesso Administrativo" : "👑 Match por Gestão (Capitão/Vice)";
                                        } else if (liberadoPeloMatch) {
                                            motivoAcesso = "🔥 Match Confirmado!";
                                        }

                                        if (!liberadoPeloMatch && !liberadoPelaGestao) return null;

                                        // Se liberado pela gestão mas ainda não houve match, mostramos o zap mas mantemos o botão de interação abaixo
                                        // para que o admin possa participar do "jogo" de passar a bola.
                                        // No entanto, se o usuário quer que SÓ apareça se retribuir, vamos esconder o botão verde de destaque 
                                        // e mostrar apenas o link administrativo menor se não for match.
                                        
                                        if (liberadoPelaGestao && !liberadoPeloMatch) {
                                            return (
                                                <div className="admin-access-zap-only">
                                                    <div className="motivo-acesso-zap">{motivoAcesso}</div>
                                                    <Botao 
                                                        variant="minimal"
                                                        onClick={() => window.open(`https://wa.me/55${atleta.telefone.replace(/\D/g, '')}`, '_blank')}
                                                        style={{ width: '100%', gap: '8px', fontSize: '0.85rem', color: '#10b981' }}
                                                    >
                                                        <MessageCircle size={16} /> Entrar em contato (Gestor)
                                                    </Botao>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="whatsapp-wrapper">
                                                {motivoAcesso && <div className="motivo-acesso-zap">{motivoAcesso}</div>}
                                                <a
                                                    href={`https://wa.me/55${atleta.telefone.replace(/\D/g, '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn-whatsapp-perfil"
                                                >
                                                    <MessageCircle size={18} />
                                                    Conversar no Zap
                                                </a>
                                            </div>
                                        );
                                    })()}

                                    {(() => {
                                        // O botão de interação SÓ some se houver um MATCH REAL (regra de ouro) ou se for o próprio perfil
                                        const liberadoPeloMatch = ehMatch && eu?.compartilhar_whatsapp_match && atleta.compartilhar_whatsapp_match;
                                        
                                        if (liberadoPeloMatch) return null;
                                        if (idAtleta === eu?.id || !aoPassarBola) return null;

                                        return (
                                            <Botao 
                                                onClick={handleAcaoBotao} 
                                                variant={ehMatch ? "secundario" : "primario"}
                                                disabled={jaEnviou && !ehMatch}
                                                style={{ 
                                                    width: '100%', 
                                                    marginTop: '8px', 
                                                    background: ehMatch ? 'rgba(37, 211, 102, 0.1)' : 
                                                                !atleta?.compartilhar_whatsapp_match ? 'rgba(244, 63, 94, 0.05)' :
                                                                jaEnviou ? 'rgba(255, 255, 255, 0.05)' : undefined,
                                                    color: ehMatch ? '#25D366' : 
                                                           !atleta?.compartilhar_whatsapp_match ? '#f43f5e' :
                                                           jaEnviou ? '#94a3b8' : undefined,
                                                    borderColor: ehMatch ? 'rgba(37, 211, 102, 0.4)' : 
                                                                 !atleta?.compartilhar_whatsapp_match ? 'rgba(244, 63, 94, 0.2)' :
                                                                 jaEnviou ? 'rgba(255, 255, 255, 0.1)' : undefined
                                                }}
                                            >
                                                {jaEnviou ? (
                                                    <>✓ Bola Passada</>
                                                ) : !atleta?.compartilhar_whatsapp_match ? (
                                                    <><Lock size={16} /> WhatsApp Privado</>
                                                ) : (
                                                    <>⚽ Passar a Bola (Interesse)</>
                                                )}
                                            </Botao>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </Modal>

        <ModalAjustePrivacidade 
            isOpen={mostrarAvisoPrivacidade}
            onClose={() => setMostrarAvisoPrivacidade(false)}
            aoConcluir={() => {
                setMostrarAvisoPrivacidade(false);
                handleAcaoBotao();
            }}
        />
        </>
    );
};

export default ModalPerfilAtleta;
