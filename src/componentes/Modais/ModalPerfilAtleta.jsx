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
import Modal from '../Modal/Modal';
import Botao from '../Botao/Botao';
import './ModalPerfilAtleta.css';

const formatarNome = (nomeCompleto) => {
    if (!nomeCompleto) return '';
    const partes = nomeCompleto.trim().split(/\s+/);
    const capitalizar = (p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
    if (partes.length === 1) return capitalizar(partes[0]);
    return `${capitalizar(partes[0])} ${capitalizar(partes[partes.length - 1])}`;
};

const formatarApelido = (apelido) => {
    if (!apelido) return 'atleta';
    return apelido.trim().split(/\s+/).map(p => 
        p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
    ).join('');
};

const ModalPerfilAtleta = ({ isOpen, onClose, idAtleta, equipeId = null, aoPassarBola = null }) => {
    const { dadosUsuario: eu, ehSuperAdmin } = usarAutenticacao();
    const { equipeAtiva, temPermissaoEquipe, getLabelVinculo } = usarEquipe();
    const { verificarSituacaoFinanceiraAtleta } = usarFinanceiro();
    const { matchesConfirmados } = usarNotificacoes();

    const [atleta, setAtleta] = useState(null);
    const [membro, setMembro] = useState(null);
    const [modalidades, setModalidades] = useState([]);
    const [financeiro, setFinanceiro] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [carregandoFin, setCarregandoFin] = useState(false);
    const [abaAtiva, setAbaAtiva] = useState('geral');
    const [erroSessao, setErroSessao] = useState(false);

    const carregarDados = useCallback(async () => {
        if (!idAtleta) return;
        setCarregando(true);
        try {
            // 1. Dados Básicos e Perfil
            const { data: user, error: errUser } = await supabase
                .from('usuarios')
                .select('*')
                .eq('id', idAtleta)
                .single();

            if (errUser) throw errUser;
            setAtleta(user);

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
        } catch (error) {
            console.error('Erro ao carregar perfil unificado:', error);
            // Detectar erro de sessão expirada (token inválido) para degradar graciosamente
            if (error?.message?.includes('Refresh Token') || error?.message?.includes('JWT') || error?.code === 'PGRST301') {
                setErroSessao(true);
            }
        } finally {
            setCarregando(false);
        }
    }, [idAtleta, equipeId, equipeAtiva, ehSuperAdmin, temPermissaoEquipe, verificarSituacaoFinanceiraAtleta]);

    useEffect(() => {
        if (isOpen && idAtleta) {
            carregarDados();
        }
    }, [isOpen, idAtleta, carregarDados]);

    if (!isOpen || !idAtleta) return null;

    const podeVerTudo = ehSuperAdmin || (membro && (equipeAtiva?.papel === 'admin' || equipeAtiva?.papel === 'sub_admin')) || idAtleta === eu?.id;
    const perfilPrivado = atleta && !atleta.perfil_publico && !podeVerTudo;
    const ehMatch = matchesConfirmados?.has(idAtleta);

    const calcularIdade = (dataNasc) => {
        if (!dataNasc) return null;
        const hoje = new Date();
        const nasc = new Date(dataNasc);
        let idade = hoje.getFullYear() - nasc.getFullYear();
        const m = hoje.getMonth() - nasc.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
        return idade;
    };

    const formatarApelido = (val) => {
        if (!val) return 'atleta';
        // Remove espaços e capitaliza cada palavra
        return val
            .split(' ')
            .filter(parte => parte.length > 0)
            .map(parte => parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase())
            .join('');
    };

    const handleAcaoBotao = () => {
        if (aoPassarBola) {
            aoPassarBola(atleta);
            onClose();
        }
    };

    return (
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
                                        <User size={48} color="#64748b" />
                                    </div>
                                )}
                                {membro?.papel === 'admin' && <div className="badge-cargo gold" title="Capitão"><Crown size={16} /></div>}
                                {membro?.papel === 'sub_admin' && <div className="badge-cargo silver" title="Vice-Capitão"><ShieldCheck size={16} /></div>}
                            </div>
                        </div>

                        <div className="perfil-info-basica">
                            <h2 className="perfil-nome">{formatarNome(atleta.nome_completo)}</h2>
                            <span className="perfil-apelido">@{formatarApelido(atleta.apelido)}</span>
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
                                                    <span className="valor">{calcularIdade(atleta.data_nascimento) ? `${calcularIdade(atleta.data_nascimento)} anos` : 'Não inf.'}</span>
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
                                    {/* WhatsApp:
                                        - Super Admin: sempre (suporte/operador da plataforma)
                                        - Match confirmado: se atleta consentiu compartilhar
                                        - Colega de equipe ativo: se atleta consentiu compartilhar
                                        - Externo sem match: nunca
                                    */}
                                    {(() => {
                                        const ehColega = membro?.status === 'ativo';
                                        const consentiu = atleta.compartilhar_whatsapp_match;
                                        // Super Admin bypassa a configuração de privacidade (operador da plataforma)
                                        const podeVerZap = atleta.telefone && (
                                            ehSuperAdmin ||
                                            (consentiu && (ehMatch || ehColega))
                                        );
                                        if (!podeVerZap) return null;
                                        return (
                                            <a
                                                href={`https://wa.me/55${atleta.telefone.replace(/\D/g, '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn-whatsapp-perfil"
                                                title={!consentiu && ehSuperAdmin ? 'Acesso administrativo (WhatsApp privado)' : undefined}
                                            >
                                                <MessageCircle size={18} />
                                                {!consentiu && ehSuperAdmin ? 'Zap (Admin)' : 'Conversar no Zap'}
                                            </a>
                                        );
                                    })()}

                                    {idAtleta !== eu?.id && aoPassarBola && (
                                        <Botao 
                                            onClick={handleAcaoBotao} 
                                            variant={ehMatch ? "secundario" : "primario"}
                                            style={{ 
                                                width: '100%', 
                                                marginTop: '8px', 
                                                background: ehMatch ? 'rgba(37, 211, 102, 0.1)' : undefined,
                                                color: ehMatch ? '#25D366' : undefined,
                                                borderColor: ehMatch ? 'rgba(37, 211, 102, 0.4)' : undefined
                                            }}
                                        >
                                            {ehMatch ? (
                                                <><MessageCircle size={16} /> ⚽ Match! Conversar</>
                                            ) : (
                                                <>⚽ Passar a Bola (Interesse)</>
                                            )}
                                        </Botao>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </Modal>
    );
};

export default ModalPerfilAtleta;
