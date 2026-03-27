import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../servicos/supabase';
import { usarAutenticacao } from '../../contextos/AutenticacaoContexto';
import { usarEquipe } from '../../contextos/EquipeContexto';
import BannerInstalacaoApp from '../../componentes/Pwa/BannerInstalacaoApp';
import ModalInstalacaoApp from '../../componentes/Pwa/ModalInstalacaoApp';
import ModalDetalhesPartida from '../Equipe/tabs/modais/ModalDetalhesPartida';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import {
    Calendar, Users, DollarSign, Globe, Lock, MapPin,
    CheckCircle, AlertCircle, Activity, ChevronRight,
    Settings, User, Trophy, Search, Swords, BarChart2,
    ShieldCheck, Bell, Plus, X, GripHorizontal, Download
} from 'lucide-react';
import './Dashboard.css';

// ── Catálogo completo de atalhos disponíveis no sistema ──────────────────────
// roles: [] = todos, ['admin','sub_admin'] = só gestores
const CATALOGO_ATALHOS = [
    { id: 'perfil',           label: 'Meu Perfil',          emoji: '👤', icone: User,       tela: 'perfil',           roles: [] },
    { id: 'perfil_esportivo', label: 'Perfil Esportivo',    emoji: '🏆', icone: Trophy,     tela: 'perfil_esportivo', roles: [] },
    { id: 'explorar',         label: 'Explorar Times',       emoji: '🔍', icone: Search,     tela: 'explorar',         roles: [] },
    { id: 'equipe',           label: 'Minha Equipe',         emoji: '👥', icone: Users,      tela: 'equipe',           roles: [] },
    { id: 'partidas',         label: 'Partidas',             emoji: '📅', icone: Calendar,   tela: 'equipe',           roles: [] },
    { id: 'financeiro',       label: 'Financeiro',           emoji: '💰', icone: DollarSign, tela: 'equipe',           roles: [] },
    { id: 'disciplina',       label: 'Disciplina',           emoji: '⚖️', icone: ShieldCheck,tela: 'equipe',           roles: [] },
    { id: 'notificacoes',     label: 'Notificações',         emoji: '🔔', icone: Bell,       tela: 'equipe',           roles: [] },
    // Exclusivos p/ Admins
    { id: 'gestao_equipe',    label: 'Gestão da Equipe',     emoji: '⚙️', icone: Settings,   tela: 'equipe_admin',     roles: ['admin','sub_admin'] },
    { id: 'criar_partida',    label: 'Criar Partida',        emoji: '⚽', icone: Swords,     tela: 'equipe',           roles: ['admin','sub_admin'] },
];

const STORAGE_KEY_ATALHOS = 'playhub_atalhos_dashboard';

const Dashboard = ({ aoNavegar, setAbaEquipe }) => {
    const { dadosUsuario, alternarVisibilidadePerfil } = usarAutenticacao();
    const { equipes } = usarEquipe();
    const { isInstalled } = usePwaInstall();

    const [proximasPartidas, setProximasPartidas] = useState([]);
    const [partidaSelecionada, setPartidaSelecionada] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [alterandoPriv, setAlterandoPriv] = useState(false);

    // ── Financeiro por equipe ─────────────────────────────────────────────
    const [equipeFinSelecionada, setEquipeFinSelecionada] = useState(null);
    const [finDados, setFinDados] = useState(null);
    const [carregandoFin, setCarregandoFin] = useState(false);
    const [modalInstalacaoAberto, setModalInstalacaoAberto] = useState(false);

    // ── Atalhos personalizáveis ───────────────────────────────────────────
    const [modalAtalhosAberto, setModalAtalhosAberto] = useState(false);
    const [atalhosSelecionados, setAtalhosSelecionados] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_ATALHOS);
            return saved ? JSON.parse(saved) : ['perfil', 'explorar', 'equipe', 'partidas'];
        } catch { return ['perfil', 'explorar', 'equipe', 'partidas']; }
    });

    // papel máximo do usuário (para filtrar catálogo)
    const papelMaximo = equipes.some(e => e.papel === 'admin') ? 'admin'
        : equipes.some(e => e.papel === 'sub_admin') ? 'sub_admin' : 'jogador';

    const atalhosDisponiveis = CATALOGO_ATALHOS.filter(a =>
        a.roles.length === 0 || a.roles.includes(papelMaximo)
    );

    const salvarAtalhos = (lista) => {
        setAtalhosSelecionados(lista);
        localStorage.setItem(STORAGE_KEY_ATALHOS, JSON.stringify(lista));
    };

    const toggleAtalho = (id) => {
        setAtalhosSelecionados(prev => {
            const nova = prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id];
            localStorage.setItem(STORAGE_KEY_ATALHOS, JSON.stringify(nova));
            return nova;
        });
    };

    // ── Carga inicial (partidas) ──────────────────────────────────────────
    useEffect(() => {
        if (dadosUsuario && equipes) {
            carregarPartidas();
            if (equipes.length > 0 && !equipeFinSelecionada) {
                setEquipeFinSelecionada(equipes[0].id);
            }
        }
    }, [dadosUsuario, equipes]);

    useEffect(() => {
        if (equipeFinSelecionada && dadosUsuario) {
            carregarFinanceiroPorEquipe(equipeFinSelecionada);
        }
    }, [equipeFinSelecionada, dadosUsuario]);

    const carregarPartidas = async () => {
        setCarregando(true);
        try {
            if (equipes.length > 0) {
                const hoje = new Date().toISOString().split('T')[0];
                const daqui14 = new Date();
                daqui14.setDate(daqui14.getDate() + 14);
                const daqui14Str = daqui14.toISOString().split('T')[0];

                const equipeIds = equipes.map(e => e.id);
                const { data: partidasData } = await supabase
                    .from('partidas')
                    .select('*, equipes(id, nome, logo_url, regras)')
                    .in('equipe_id', equipeIds)
                    .gte('data', hoje)
                    .lte('data', daqui14Str)
                    .order('data', { ascending: true })
                    .limit(5);

                if (partidasData?.length > 0) {
                    const { data: inscricoes } = await supabase
                        .from('partidas_presencas')
                        .select('partida_id, status')
                        .eq('usuario_id', dadosUsuario.id)
                        .in('partida_id', partidasData.map(p => p.id));

                    setProximasPartidas(partidasData.map(p => ({
                        ...p,
                        minhaInscricao: (inscricoes || []).find(i => i.partida_id === p.id) || null
                    })));
                } else setProximasPartidas([]);
            }
        } catch (e) { console.error(e); }
        finally { setCarregando(false); }
    };

    const carregarFinanceiroPorEquipe = async (equipeId) => {
        setCarregandoFin(true);
        try {
            const periodo = new Date().toISOString().slice(0, 7); // YYYY-MM

            const [
                { data: config },
                { data: ciclo },
                { data: mensalidade },
                { data: avulsos },
                totalMembrosRes
            ] = await Promise.all([
                supabase.from('financeiro_config').select('*').eq('equipe_id', equipeId).maybeSingle(),
                supabase.from('ciclos_financeiros').select('*').eq('equipe_id', equipeId).eq('periodo', periodo).maybeSingle(),
                supabase.from('mensalidades').select('*').eq('equipe_id', equipeId).eq('usuario_id', dadosUsuario.id).eq('periodo', periodo).maybeSingle(),
                supabase.from('pagamentos_avulsos').select('*').eq('equipe_id', equipeId).eq('usuario_id', dadosUsuario.id),
                supabase.from('membros_equipe').select('id', { count: 'exact', head: true }).eq('equipe_id', equipeId).eq('status', 'ativo')
            ]);

            const valorMensalidade = mensalidade?.valor_configurado || config?.valor_mensalidade || 0;
            const statusMensalidade = mensalidade?.status || 'sem_registro';
            const custoCt = config?.custo_quadra || 0;
            
            const numMembros = totalMembrosRes.count || 1;
            const custoProporcionado = custoCt > 0 ? (custoCt / numMembros).toFixed(2) : null;

            // Data de vencimento
            const diaVenc = config?.dia_vencimento || 10;
            const hoje = new Date();
            const vencimento = new Date(hoje.getFullYear(), hoje.getMonth(), diaVenc);
            if (vencimento < hoje) vencimento.setMonth(vencimento.getMonth() + 1);
            const diasRestantes = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));

            const avulsosPendentes = (avulsos || []).filter(a => a.status === 'pendente');
            const totalAvulsosPendentes = avulsosPendentes.reduce((s, a) => s + Number(a.valor_pago), 0);

            setFinDados({
                valorMensalidade,
                statusMensalidade,
                custoProporcionado,
                diaVenc,
                diasRestantes,
                totalAvulsosPendentes,
                cicloStatus: ciclo?.status || 'inativo',
                chave_pix: config?.chave_pix || null,
            });
        } catch (e) {
            console.error('Erro financeiro:', e);
            setFinDados(null);
        } finally {
            setCarregandoFin(false);
        }
    };

    const handlePrivacidade = async () => {
        setAlterandoPriv(true);
        await alternarVisibilidadePerfil();
        setAlterandoPriv(false);
    };

    if (!dadosUsuario) return null;

    const primeiroNome = dadosUsuario.apelido || dadosUsuario.nome_completo?.split(' ')[0] || 'Atleta';
    const isPublico = dadosUsuario.perfil_publico;
    const horaAtual = new Date().getHours();
    const saudacao = horaAtual < 12 ? 'Bom dia' : horaAtual < 18 ? 'Boa tarde' : 'Boa noite';

    const equipeFinAtual = equipes.find(e => e.id === equipeFinSelecionada);
    
    // Injetar atalho de instalação dinamicamente
    let atalhosExibidos = CATALOGO_ATALHOS.filter(a => 
        atalhosSelecionados.includes(a.id) && (a.roles.length === 0 || a.roles.includes(papelMaximo))
    );

    if (!isInstalled) {
        atalhosExibidos = [
            ...atalhosExibidos,
            { id: 'instalar_pwa', label: 'Instalar App', emoji: '📲', icone: Download, action: () => setModalInstalacaoAberto(true), roles: [] }
        ];
    }

    return (
        <div className="dashboard-container">
            {/* === Header Hero === */}
            <header className="dash-hero">
                <div className="dash-hero-left">
                    <div className="dash-avatar-wrapper">
                        {dadosUsuario.foto_url
                            ? <img src={dadosUsuario.foto_url} alt="Perfil" className="dash-avatar" />
                            : <div className="dash-avatar-fallback">{primeiroNome.charAt(0).toUpperCase()}</div>}
                        <div className="dash-avatar-online"></div>
                    </div>
                    <div>
                        <p className="dash-saudacao-sub">{saudacao},</p>
                        <h1 className="dash-saudacao-nome">{primeiroNome}!</h1>
                    </div>
                </div>
                <button
                    className={`dash-priv-btn ${isPublico ? 'publico' : 'privado'} ${alterandoPriv ? 'loading' : ''}`}
                    onClick={handlePrivacidade} disabled={alterandoPriv}
                    title={isPublico ? 'Perfil público — clique para privatizar' : 'Perfil privado — clique para tornar público'}
                >
                    {isPublico ? <Globe size={15} /> : <Lock size={15} />}
                    <span>Perfil {isPublico ? 'Público' : 'Privado'}</span>
                </button>
            </header>

            <div style={{ padding: '0 20px' }}>
                <BannerInstalacaoApp local="dashboard" />
            </div>

            {carregando ? (
                <div className="dash-loading">
                    <Activity size={30} className="dash-spinner" />
                    <p>Carregando seu painel…</p>
                </div>
            ) : (
                <main className="dash-grid">

                    {/* === COLUNA ESQUERDA: Agenda === */}
                    <section className="bento-card card-agenda">
                        <div className="bento-top">
                            <div className="bento-titulo">
                                <span className="bento-icone blue"><Calendar size={17} /></span>
                                <h2>Próximos Jogos <span className="sub-hint">14 dias</span></h2>
                            </div>
                            <button className="bento-atalho" onClick={() => aoNavegar('equipe')}>Ir para Equipe <ChevronRight size={14} /></button>
                        </div>
                        {proximasPartidas.length > 0 ? (
                            <div className="agenda-lista">
                                {proximasPartidas.map(p => {
                                    const [, mes, dia] = p.data.split('-');
                                    const inscrita = p.minhaInscricao?.status === 'confirmado';
                                    const emEspera = p.minhaInscricao?.status === 'espera';
                                    
                                    // Regras de Inscrição
                                    const regras = p.equipes?.regras || {};
                                    const openDays = regras.registrationOpenDays || 7;
                                    const eventDate = new Date(`${p.data}T${p.hora}`);
                                    const openDate = new Date(eventDate.getTime() - (openDays * 24 * 60 * 60 * 1000));
                                    const agora = new Date();
                                    const aberta = agora >= openDate;

                                    return (
                                        <div 
                                            key={p.id} 
                                            className="agenda-item" 
                                            onClick={() => setPartidaSelecionada(p)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className="agenda-data">
                                                <strong>{dia}/{mes}</strong>
                                                <span>{p.hora?.substring(0, 5)}</span>
                                            </div>
                                            <div className="agenda-info" style={{ flex: 1 }}>
                                                <span className="agenda-equipe">{p.equipes?.nome}</span>
                                                <span className="agenda-local">
                                                    <MapPin size={11} /> {p.local_nome || p.local || 'Local a definir'}
                                                </span>
                                                {!aberta && (
                                                    <span style={{ fontSize: '10px', color: '#f59e0b', marginTop: '4px', display: 'block' }}>
                                                        Abre inscrição: {openDate.toLocaleDateString('pt-BR')} às {openDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                                {inscrita && <span className="badge confirmado">✓ Confirmado</span>}
                                                {emEspera && <span className="badge espera">Espera</span>}
                                                {aberta && !p.minhaInscricao && <span className="badge aviso">Participar</span>}
                                                {!aberta && <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b' }}>Em breve</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="bento-vazio">
                                <Calendar size={36} opacity={0.3} />
                                <p>Nenhum jogo nos próximos 14 dias.</p>
                            </div>
                        )}
                    </section>

                    {/* === COLUNA DIREITA === */}
                    <div className="dash-coluna">

                        {/* === CARD: Equipes === */}
                        <section className="bento-card card-equipes">
                            <div className="bento-top">
                                <div className="bento-titulo">
                                    <span className="bento-icone purple"><Users size={17} /></span>
                                    <h2>Minhas Equipes</h2>
                                </div>
                                <button className="bento-atalho" onClick={() => aoNavegar('explorar')}>Explorar +</button>
                            </div>
                            {equipes.length > 0 ? (
                                <div className="equipes-carrossel">
                                    {equipes.map(e => (
                                        <button key={e.id} className="equipe-chip" onClick={() => { 
                                            setAbaEquipe('minha-equipe');
                                            aoNavegar('equipe'); 
                                        }} title={e.nome}>
                                            <div className="equipe-chip-foto">
                                                {e.logo_url ? <img src={e.logo_url} alt={e.nome} /> : <span>{e.nome.charAt(0).toUpperCase()}</span>}
                                            </div>
                                            <div className="equipe-chip-info">
                                                <span className="equipe-chip-nome">{e.nome}</span>
                                                <span className="equipe-chip-papel">
                                                    {e.papel === 'admin' ? '👑 Admin' : e.papel === 'sub_admin' ? '⚡ Co-admin' : e.vinculo === 'mensalista' ? '📋 Mensalista' : '🎟 Avulso'}
                                                </span>
                                            </div>
                                            <ChevronRight size={14} className="equipe-chip-arrow" />
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="bento-vazio">
                                    <Users size={32} opacity={0.3} />
                                    <p>Entre em uma equipe ou crie a sua!</p>
                                </div>
                            )}
                        </section>

                        {/* === CARD: Financeiro por Equipe === */}
                        <section className="bento-card card-financeiro">
                            <div className="bento-top">
                                <div className="bento-titulo">
                                    <span className="bento-icone green"><DollarSign size={17} /></span>
                                    <h2>Situação Financeira</h2>
                                </div>
                                <button className="bento-atalho" onClick={() => {
                                    setAbaEquipe('minha-equipe');
                                    aoNavegar('equipe');
                                }}>Detalhes</button>
                            </div>

                            {/* Seletor de equipe */}
                            {equipes.length > 1 && (
                                <div className="fin-seletor-equipe">
                                    <select
                                        value={equipeFinSelecionada || ''}
                                        onChange={e => setEquipeFinSelecionada(e.target.value)}
                                        className="fin-select"
                                    >
                                        {equipes.map(e => (
                                            <option key={e.id} value={e.id}>{e.nome}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {equipes.length === 1 && equipeFinAtual && (
                                <div className="fin-equipe-unica">
                                    <div className="fin-equipe-chip-foto">
                                        {equipeFinAtual.logo_url
                                            ? <img src={equipeFinAtual.logo_url} alt={equipeFinAtual.nome} />
                                            : <span>{equipeFinAtual.nome.charAt(0)}</span>}
                                    </div>
                                    <span>{equipeFinAtual.nome}</span>
                                </div>
                            )}

                            {carregandoFin ? (
                                <div className="fin-loading"><Activity size={18} className="dash-spinner" /></div>
                            ) : finDados ? (
                                <div className="fin-detalhe">
                                    {/* Mensalidade */}
                                    <div className={`fin-item ${finDados.statusMensalidade === 'pago' ? 'ok' : finDados.statusMensalidade === 'pendente' ? 'alerta' : 'neutro'}`}>
                                        <div className="fin-item-left">
                                            <span className="fin-label">Mensalidade ({new Date().toLocaleString('pt-BR', { month: 'short' }).toUpperCase()})</span>
                                            {finDados.statusMensalidade === 'pendente' && (
                                                <span className="fin-venc">Vence em {finDados.diasRestantes}d (dia {finDados.diaVenc})</span>
                                            )}
                                        </div>
                                        <div className="fin-item-right">
                                            <strong>R$ {Number(finDados.valorMensalidade).toFixed(2)}</strong>
                                            <span className={`fin-badge ${finDados.statusMensalidade}`}>
                                                {finDados.statusMensalidade === 'pago' ? '✓ Pago' : finDados.statusMensalidade === 'pendente' ? 'Pendente' : 'Sem ciclo'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Quadra proporcional */}
                                    {finDados.custoProporcionado && (
                                        <div className="fin-item neutro">
                                            <div className="fin-item-left">
                                                <span className="fin-label">Sua cota da Quadra</span>
                                                <span className="fin-venc">Custo rateado por membro</span>
                                            </div>
                                            <div className="fin-item-right">
                                                <strong>R$ {finDados.custoProporcionado}</strong>
                                            </div>
                                        </div>
                                    )}

                                    {/* Avulsos pendentes */}
                                    {finDados.totalAvulsosPendentes > 0 && (
                                        <div className="fin-item perigo">
                                            <div className="fin-item-left">
                                                <span className="fin-label">Avulso(s) Pendente(s)</span>
                                            </div>
                                            <div className="fin-item-right">
                                                <strong>R$ {finDados.totalAvulsosPendentes.toFixed(2)}</strong>
                                            </div>
                                        </div>
                                    )}

                                    {/* Chave PIX */}
                                    {finDados.chave_pix && (
                                        <div className="fin-pix">
                                            <span>PIX: </span>
                                            <code>{finDados.chave_pix}</code>
                                        </div>
                                    )}

                                    {/* Status geral */}
                                    {(finDados.statusMensalidade !== 'pendente' && finDados.totalAvulsosPendentes === 0) ? (
                                        <div className="fin-status ok"><CheckCircle size={14} /> <span>Tudo em dia com esse time! 🎉</span></div>
                                    ) : (
                                        <div className="fin-status perigo"><AlertCircle size={14} /> <span>Você possui débitos neste time.</span></div>
                                    )}
                                </div>
                            ) : (
                                <div className="bento-vazio pequeno">
                                    <p>Sem dados financeiros para essa equipe ainda.</p>
                                </div>
                            )}
                        </section>

                        {/* === CARD: Atalhos Personalizáveis === */}
                        <section className="bento-card card-atalhos">
                            <div className="bento-top" style={{ marginBottom: '0.75rem' }}>
                                <div className="bento-titulo">
                                    <span className="bento-icone orange"><GripHorizontal size={17} /></span>
                                    <h2>Meus Atalhos</h2>
                                </div>
                                <button className="bento-atalho" onClick={() => setModalAtalhosAberto(true)}>
                                    <Settings size={13} /> Personalizar
                                </button>
                            </div>

                            {atalhosExibidos.length > 0 ? (
                                <div className="atalhos-win-grid">
                                    {atalhosExibidos.map(a => (
                                        <button key={a.id} className="atalho-win-btn" onClick={a.action ? a.action : () => aoNavegar(a.tela)}>
                                            <span className="atalho-win-emoji">{a.emoji}</span>
                                            <span className="atalho-win-label">{a.label}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="bento-vazio pequeno">
                                    <p>Nenhum atalho configurado.</p>
                                    <button className="bento-atalho" style={{ marginTop: '0.5rem' }} onClick={() => setModalAtalhosAberto(true)}>
                                        <Plus size={13} /> Adicionar
                                    </button>
                                </div>
                            )}
                        </section>

                    </div>
                </main>
            )}

            {/* === MODAL: Personalizar Atalhos === */}
            {modalAtalhosAberto && (
                <div className="modal-overlay" onClick={() => setModalAtalhosAberto(false)}>
                    <div className="modal-atalhos" onClick={e => e.stopPropagation()}>
                        <div className="modal-atalhos-header">
                            <h2>Personalizar Atalhos</h2>
                            <button onClick={() => setModalAtalhosAberto(false)} className="modal-fechar"><X size={20} /></button>
                        </div>
                        <p className="modal-sub">Selecione os atalhos que deseja exibir na tela inicial.</p>
                        {papelMaximo === 'jogador' && (
                            <p className="modal-aviso">⚡ Atalhos de gestão estão disponíveis apenas para admins e co-admins.</p>
                        )}
                        <div className="modal-atalhos-grid">
                            {atalhosDisponiveis.map(a => {
                                const selecionado = atalhosSelecionados.includes(a.id);
                                return (
                                    <button
                                        key={a.id}
                                        className={`modal-atalho-item ${selecionado ? 'selecionado' : ''}`}
                                        onClick={() => toggleAtalho(a.id)}
                                    >
                                        <span className="atalho-win-emoji">{a.emoji}</span>
                                        <span className="atalho-win-label">{a.label}</span>
                                        {selecionado && <div className="modal-check">✓</div>}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="modal-atalhos-footer">
                            <button className="btn-confirmar" onClick={() => setModalAtalhosAberto(false)}>Concluído</button>
                        </div>
                    </div>
                </div>
            )}

            {/* === MODAIS === */}
            {partidaSelecionada && (
                <ModalDetalhesPartida 
                    isOpen={!!partidaSelecionada}
                    partida={partidaSelecionada}
                    onClose={() => {
                        setPartidaSelecionada(null);
                        carregarPartidas(); // Recarregar para atualizar estado no dashboard
                    }}
                />
            )}

            {modalInstalacaoAberto && (
                <ModalInstalacaoApp aoFechar={() => setModalInstalacaoAberto(false)} />
            )}
        </div>
    );
};

export default Dashboard;
