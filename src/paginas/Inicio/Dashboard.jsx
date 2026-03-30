import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../servicos/supabase';
import { usarAutenticacao } from '../../contextos/AutenticacaoContexto';
import { usarEquipe } from '../../contextos/EquipeContexto';
import BannerInstalacaoApp from '../../componentes/Pwa/BannerInstalacaoApp';
import ModalInstalacaoApp from '../../componentes/Pwa/ModalInstalacaoApp';
import ModalDetalhesPartida from '../Equipe/tabs/modais/ModalDetalhesPartida';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import CardsDadosAtleta from '../Equipe/componentes/CardsDadosAtleta';
import {
    Calendar, Users, DollarSign, Globe, Lock, MapPin,
    CheckCircle, AlertCircle, Activity, ChevronRight,
    Settings, User, Trophy, Search, Swords, BarChart2,
    ShieldCheck, Bell, Plus, X, GripHorizontal, Download, Phone, Crown, Wallet, Star, Unlock
} from 'lucide-react';
import InfoTooltip from '../../componentes/Tooltip/InfoTooltip';
import './Dashboard.css';

// ── Catálogo completo de atalhos ──────────────────────────────────────────────
// categoria: 'pessoal' | 'equipe'
// permissao: null = visível a todos do papel | 'nome_perm' = vice precisa ter essa permissão
const CATALOGO_ATALHOS = [
    // PESSOAIS (todos os usuários, sempre visíveis)
    { id: 'perfil',           categoria: 'pessoal', label: 'Meu Perfil',      emoji: '👤', icone: User,       tela: 'perfil',           roles: [],                   permissao: null },
    { id: 'perfil_esportivo', categoria: 'pessoal', label: 'Dados Atleta',    emoji: '🏆', icone: Trophy,     tela: 'perfil_esportivo', roles: [],                   permissao: null },
    { id: 'explorar',         categoria: 'pessoal', label: 'Explorar Times',  emoji: '🔍', icone: Search,     tela: 'explorar',         roles: [],                   permissao: null },
    { id: 'perfil_pub',       categoria: 'pessoal', label: 'Perfil Público',   emoji: '🌍', icone: Globe,      action: (nav) => { nav('perfil'); }, roles: [],  permissao: null },
    { id: 'notificacoes_globais', categoria: 'pessoal', label: 'Notificações', emoji: '🔔', icone: Bell,       tela: 'notificacoes', roles: [], permissao: null },
    
    // EQUIPE (filtrados por papel/permissão)
    { id: 'partidas',         categoria: 'equipe',  label: 'Próximos Jogos',  emoji: '📅', icone: Calendar,   action: (nav, set) => { set('agenda'); nav('equipe'); },           roles: [],                   permissao: null },
    { id: 'var_atleta',       categoria: 'equipe',  label: 'Histórico VAR',    emoji: '⚖️', icone: ShieldCheck, action: (nav, set) => { set('disciplina'); nav('equipe'); },        roles: [],                   permissao: null },
    { id: 'solicitacoes_eq',  categoria: 'equipe',  label: 'Solicitações',    emoji: '📥', icone: AlertCircle,action: (nav, set) => { set('solicitacoes'); nav('equipe'); },       roles: ['admin','sub_admin'],permissao: 'gerenciar_membros' },
    { id: 'meus_pagamentos',  categoria: 'equipe',  label: 'Mensalistas',     emoji: '💰', icone: DollarSign, action: (nav, set) => { set('financeiro-mensal'); nav('equipe'); },  roles: [],                   permissao: null },
    { id: 'financas_avulso',  categoria: 'equipe',  label: 'Avulsos',         emoji: '💸', icone: Wallet,     action: (nav, set) => { set('financeiro-avulsos'); nav('equipe'); }, roles: [],                   permissao: null },
    { id: 'criar_partida',    categoria: 'equipe',  label: 'Marcar Jogo',     emoji: '⚽', icone: Swords,     action: (nav, set) => { set('agenda'); nav('equipe'); },           roles: ['admin','sub_admin'], permissao: 'gerenciar_partidas' },
    { id: 'gerenciar_membros',categoria: 'equipe',  label: 'Membros',         emoji: '👥', icone: Users,      action: (nav, set) => { set('membros'); nav('equipe'); },           roles: ['admin','sub_admin'], permissao: 'gerenciar_membros' },
    { id: 'relatorios_eq',    categoria: 'equipe',  label: 'Análise & Rels',  emoji: '📊', icone: BarChart2,  action: (nav, set) => { set('financeiro-relatorios'); nav('equipe'); }, roles: ['admin','sub_admin'], permissao: 'ver_relatorios' },
    { id: 'regras_eq',        categoria: 'equipe',  label: 'Regras & Config', emoji: '⚙️', icone: Settings,   action: (nav, set) => { set('regras-config'); nav('equipe'); },    roles: ['admin','sub_admin'], permissao: null },
    { id: 'descobrir_atletas',categoria: 'equipe',  label: 'Buscar Atletas',  emoji: '🔍', icone: Globe,      action: (nav, set) => { set('descobrir'); nav('equipe'); },        roles: ['admin','sub_admin'], permissao: 'gerenciar_membros' },
    { id: 'permissoes_eq',    categoria: 'equipe',  label: 'Permissões',      emoji: '🛡️', icone: Crown,      action: (nav, set) => { set('permissoes'); nav('equipe'); },        roles: ['admin','sub_admin'], permissao: 'gerenciar_gestores' },
];

const STORAGE_PESSOAL  = 'playhub_atalhos_pessoal';
const STORAGE_EQUIPE   = 'playhub_atalhos_equipe';

// IDs padrão (todos habilitados por categoria)
const DEFAULTS_PESSOAL = ['perfil','perfil_esportivo','explorar','perfil_pub','notificacoes_globais'];
const DEFAULTS_EQUIPE  = ['partidas','var_atleta','solicitacoes_eq','meus_pagamentos','financas_avulso','criar_partida','gerenciar_membros','relatorios_eq','regras_eq','descobrir_atletas','permissoes_eq'];

const Dashboard = ({ aoNavegar, setAbaEquipe }) => {
    const { dadosUsuario, alternarVisibilidadePerfil, alternarWhatsAppMatch } = usarAutenticacao();
    const { equipes, getLabelVinculo, selecionarEquipe, equipeAtiva, carregando: carregandoEquipes } = usarEquipe();
    const { isInstalled } = usePwaInstall();

    const [proximasPartidas, setProximasPartidas] = useState([]);
    const [temMaisPartidas, setTemMaisPartidas] = useState(false);
    const [partidaSelecionada, setPartidaSelecionada] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [alterandoPriv, setAlterandoPriv] = useState(false);

    // ── Financeiro por equipe ─────────────────────────────────────────────
    const [equipeFinSelecionada, setEquipeFinSelecionada] = useState(null);
    const [finDados, setFinDados] = useState(null);
    const [carregandoFin, setCarregandoFin] = useState(false);
    const [modalInstalacaoAberto, setModalInstalacaoAberto] = useState(false);

    // ── Atalhos: dois conjuntos independentes com todos habilitados por padrão ──
    const [modalAtalhosAberto, setModalAtalhosAberto] = useState(false);
    const [modalCategoria, setModalCategoria]         = useState('pessoal'); // qual aba o modal abre

    const lerStorage = (key, defaults) => {
        try {
            const s = localStorage.getItem(key);
            // Se não existe ainda → devolver null para saber que são os defaults
            return s ? JSON.parse(s) : null;
        } catch { return null; }
    };

    const [atalhosPessoal, setAtalhosPessoal] = useState(() => {
        const dados = lerStorage(STORAGE_PESSOAL, DEFAULTS_PESSOAL);
        // Garante que o atalho novo 'notificacoes_globais' apareça para quem já tem storage cacheado antigo
        return (dados || DEFAULTS_PESSOAL).includes('notificacoes_globais') ? dados || DEFAULTS_PESSOAL : [...(dados || DEFAULTS_PESSOAL), 'notificacoes_globais'];
    });
    
    const [atalhosEquipe, setAtalhosEquipe] = useState(() => {
        const dados = lerStorage(STORAGE_EQUIPE, DEFAULTS_EQUIPE);
        // Atualiza 'notificacoes' antigo para o novo desmembrado 'solicitacoes_eq'
        const atualizado = (dados || DEFAULTS_EQUIPE).map(a => a === 'notificacoes' ? 'solicitacoes_eq' : a);
        return atualizado.includes('solicitacoes_eq') ? atualizado : [...atualizado, 'solicitacoes_eq'];
    });

    const toggleAtalho = (id, categoria) => {
        if (categoria === 'pessoal') {
            setAtalhosPessoal(prev => {
                const nova = prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id];
                localStorage.setItem(STORAGE_PESSOAL, JSON.stringify(nova));
                return nova;
            });
        } else {
            setAtalhosEquipe(prev => {
                const nova = prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id];
                localStorage.setItem(STORAGE_EQUIPE, JSON.stringify(nova));
                return nova;
            });
        }
    };

    const navegarParaEquipeFocada = (aba = 'minha-equipe') => {
        if (equipeFinSelecionada) {
            selecionarEquipe(equipeFinSelecionada);
            if (aba) setAbaEquipe(aba);
            aoNavegar('equipe');
        }
    };

    // ── Cargas de Dados ──────────────────────────────────────────────────
    useEffect(() => {
        if (dadosUsuario && equipes?.length > 0 && !equipeFinSelecionada) {
            setEquipeFinSelecionada(equipes[0].id);
        }
    }, [dadosUsuario, equipes]);

    // Efeito unificado para carregar tudo que depende da equipe selecionada
    useEffect(() => {
        if (!dadosUsuario || carregandoEquipes) return;

        if (equipes && equipes.length === 0) {
            setCarregando(false);
            return;
        }

        if (equipeFinSelecionada) {
            carregarPartidas();
            carregarFinanceiroPorEquipe(equipeFinSelecionada);
        }
    }, [equipeFinSelecionada, dadosUsuario, equipes, carregandoEquipes]);

    // Sincronia reversa: se o time mudar na barra lateral, o Dashboard foca nele também
    useEffect(() => {
        if (equipeAtiva?.id && equipeAtiva.id !== equipeFinSelecionada) {
            setEquipeFinSelecionada(equipeAtiva.id);
        }
    }, [equipeAtiva?.id]);

    const carregarPartidas = async () => {
        setCarregando(true);
        try {
            if (equipeFinSelecionada) {
                const hoje = new Date().toISOString().split('T')[0];
                const limitQuery = 16; // 15 + 1 para checar se tem mais

                const { data: partidasData } = await supabase
                    .from('partidas')
                    .select('*, equipes(id, nome, logo_url, regras)')
                    .eq('equipe_id', equipeFinSelecionada)
                    .gte('data', hoje)
                    .order('data', { ascending: true })
                    .limit(limitQuery);

                if (partidasData?.length > 0) {
                    const temMais = partidasData.length === limitQuery;
                    const partidasExibir = temMais ? partidasData.slice(0, 15) : partidasData;

                    const { data: inscricoes } = await supabase
                        .from('partidas_presencas')
                        .select('partida_id, status')
                        .eq('usuario_id', dadosUsuario.id)
                        .in('partida_id', partidasExibir.map(p => p.id));

                    setProximasPartidas(partidasExibir.map(p => ({
                        ...p,
                        minhaInscricao: (inscricoes || []).find(i => i.partida_id === p.id) || null
                    })));
                    setTemMaisPartidas(temMais);
                } else {
                    setProximasPartidas([]);
                    setTemMaisPartidas(false);
                }
            } else {
                setProximasPartidas([]);
                setTemMaisPartidas(false);
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

    const handleToggleWhatsApp = async () => {
        setAlterandoPriv(true);
        await alternarWhatsAppMatch();
        setAlterandoPriv(false);
    };

    if (!dadosUsuario) return null;

    const primeiroNome = dadosUsuario.apelido || dadosUsuario.nome_completo?.split(' ')[0] || 'Atleta';
    const isPublico = dadosUsuario.perfil_publico;
    const horaAtual = new Date().getHours();
    const saudacao = horaAtual < 12 ? 'Bom dia' : horaAtual < 18 ? 'Boa tarde' : 'Boa noite';

    const equipeFinAtual = equipes.find(e => e.id === equipeFinSelecionada);

    // papel do usuário na equipe ativa
    const papelNaEquipe = equipeFinAtual?.papel || 'jogador';
    const permsVice     = equipeFinAtual?.permissoes || [];

    // Filtra atalhos PESSOAIS visíveis (todos os do catálogo pessoal)
    const catalogoPessoal = CATALOGO_ATALHOS.filter(a => a.categoria === 'pessoal');
    const atalhosExibidosPessoal = catalogoPessoal.filter(a => atalhosPessoal.includes(a.id));

    // Filtra atalhos de EQUIPE: 1º filtra por cargo/perm, 2º aplica a escolha do usuário
    const catalogoEquipe = CATALOGO_ATALHOS.filter(a => {
        if (a.categoria !== 'equipe') return false;
        // Capitão vê tudo
        if (papelNaEquipe === 'admin') return true;
        // Vice vê se o atalho não exige papel ou se tem a permissão específica
        if (papelNaEquipe === 'sub_admin') {
            if (a.roles.length === 0) return true;              // todos os papéis
            if (a.permissao === null) return true;              // atalho admin sem permissão específica (ex: gestão)
            return permsVice.includes(a.permissao);            // vice precisa ter a permissão
        }
        // Jogador só vê atalhos sem restrição de cargo
        return a.roles.length === 0;
    });
    // Obs: financeiro só se equipe tem gestão_financeira
    const catalogoEquipeFiltrado = equipeFinAtual?.gestao_financeira
        ? catalogoEquipe
        : catalogoEquipe.filter(a => a.id !== 'meus_pagamentos' && a.id !== 'financeiro_admin');

    const atalhosExibidosEquipe = catalogoEquipeFiltrado.filter(a => atalhosEquipe.includes(a.id));

    // Atalho PWA dinâmico
    const atalhoInstalar = !isInstalled
        ? [{ id: 'instalar_pwa', categoria: 'pessoal', label: 'Instalar App', emoji: '📲', icone: Download, action: () => setModalInstalacaoAberto(true) }]
        : [];

    const atalhosExibidosPessoalFinal = [...atalhosExibidosPessoal, ...atalhoInstalar];

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

                
                <div className="dash-hero-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <div
                        className={`dash-priv-btn ${alterandoPriv ? 'loading' : ''}`}
                        onClick={!alterandoPriv ? handlePrivacidade : undefined}
                        role="button"
                        tabIndex="0"
                        style={{
                            borderColor: isPublico ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)',
                            color: isPublico ? '#10b981' : '#f43f5e',
                            background: isPublico ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
                            opacity: alterandoPriv ? 0.7 : 1,
                            cursor: alterandoPriv ? 'wait' : 'pointer'
                        }}
                    >
                        {isPublico ? <Unlock size={15} /> : <Lock size={15} />}
                        <span>Perfil</span>
                        <InfoTooltip texto={`Seu perfil está ${isPublico ? 'Público' : 'Privado'}. Quando público, outros times podem te encontrar na busca do PlayHub para convites.`} posicao="bottom-left" />
                    </div>
                    
                    <div
                        className={`dash-priv-btn ${alterandoPriv ? 'loading' : ''}`}
                        onClick={!alterandoPriv ? handleToggleWhatsApp : undefined}
                        role="button"
                        tabIndex="0"
                        style={{ 
                            borderColor: dadosUsuario.compartilhar_whatsapp_match ? 'rgba(37, 211, 102, 0.4)' : 'rgba(244, 63, 94, 0.4)',
                            color: dadosUsuario.compartilhar_whatsapp_match ? '#25D366' : '#f43f5e',
                            background: dadosUsuario.compartilhar_whatsapp_match ? 'rgba(37, 211, 102, 0.08)' : 'rgba(244, 63, 94, 0.08)',
                            opacity: alterandoPriv ? 0.7 : 1,
                            cursor: alterandoPriv ? 'wait' : 'pointer'
                        }}
                    >
                        {dadosUsuario.compartilhar_whatsapp_match ? <Unlock size={15} /> : <Lock size={15} />}
                        <span>WhatsApp</span>
                        <InfoTooltip texto={`Seu WhatsApp está ${dadosUsuario.compartilhar_whatsapp_match ? 'Liberado' : 'Oculto'}. Quando liberado, seu número aparece apenas após interesse mútuo (Match).`} posicao="bottom-left" />
                    </div>
                </div>
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
                    <section className="bento-card card-agenda" style={{ order: 2 }}>
                        <div className="bento-top">
                            <div className="bento-titulo">
                                <span className="bento-icone blue"><Calendar size={17} /></span>
                                <h2>Partidas ({equipeFinAtual?.nome || 'Nenhuma Equipe'})</h2>
                            </div>
                            <button className="bento-atalho" onClick={() => navegarParaEquipeFocada('agenda')}>Ver Agenda <ChevronRight size={14} /></button>
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
                                {temMaisPartidas && (
                                    <button 
                                        onClick={() => navegarParaEquipeFocada('agenda')}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: 'none',
                                            borderRadius: '12px',
                                            color: '#e2e8f0',
                                            cursor: 'pointer',
                                            marginTop: '8px',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        Carregar Mais Partidas...
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="bento-vazio">
                                <Calendar size={36} opacity={0.3} />
                                <p>Nenhuma partida agendada para {equipeFinAtual?.nome}.</p>
                            </div>
                        )}
                    </section>

                    {/* === COLUNA DIREITA === */}
                    <div className="dash-coluna">

                        {/* === CARD: Equipes === */}
                        <section className="bento-card card-equipes" style={{ order: 1 }}>
                            <div className="bento-top">
                                <div className="bento-titulo">
                                    <span className="bento-icone purple"><Users size={17} /></span>
                                    <h2>Minhas Equipes</h2>
                                </div>
                                <button className="bento-atalho" onClick={() => aoNavegar('explorar')}>Explorar +</button>
                            </div>
                            {equipes.length > 0 ? (
                                <div className="equipes-carrossel">
                                    {equipes.map(e => {
                                        const selecionada = e.id === equipeFinSelecionada;
                                        return (
                                            <div 
                                                key={e.id} 
                                                className={`equipe-chip ${selecionada ? 'selecionada' : ''}`} 
                                                onClick={() => {
                                                    setEquipeFinSelecionada(e.id);
                                                    selecionarEquipe(e.id); // Sincroniza globalmente
                                                }}
                                                title={`Clique para ver estatísticas de ${e.nome}`}
                                            >
                                                <div className="equipe-chip-foto">
                                                    {e.logo_url ? <img src={e.logo_url} alt={e.nome} /> : <span>{e.nome.charAt(0).toUpperCase()}</span>}
                                                </div>
                                                <div className="equipe-chip-info">
                                                    <span className="equipe-chip-nome">{e.nome}</span>
                                                    <span className="equipe-chip-papel">
                                                        {e.papel === 'admin' ? (
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <Crown size={12} fill="#fbbf24" color="#fbbf24" /> Capitão
                                                            </span>
                                                        ) : e.papel === 'sub_admin' ? (
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <Crown size={12} fill="#94a3b8" color="#94a3b8" /> Vice-Cap.
                                                            </span>
                                                        ) : (
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                {e.vinculo === 'mensalista' ? (
                                                                    <Star size={12} fill="#fbbf24" color="#fbbf24" />
                                                                ) : (
                                                                    <Star size={12} fill="#94a3b8" color="#94a3b8" />
                                                                )}
                                                                {getLabelVinculo(e.vinculo, e.gestao_financeira)}
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                                <button 
                                                    className="equipe-chip-arrow-btn" 
                                                    onClick={(ev) => {
                                                        ev.stopPropagation();
                                                        setAbaEquipe('minha-equipe');
                                                        aoNavegar('equipe');
                                                    }}
                                                    title="Entrar na página da equipe"
                                                >
                                                    <ChevronRight size={16} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bento-vazio">
                                    <Users size={32} opacity={0.3} />
                                    <p>Entre em uma equipe ou crie a sua!</p>
                                </div>
                            )}
                        </section>

                        {/* === CARD: Financeiro por Equipe === */}
                        <section className="bento-card card-financeiro" style={{ order: 4 }}>
                            <div className="bento-top">
                                <div className="bento-titulo">
                                    <span className="bento-icone green"><Activity size={17} /></span>
                                    <h2>Resumo Teu na Equipe</h2>
                                </div>
                                <button className="bento-atalho" onClick={() => navegarParaEquipeFocada('minha-equipe')}>Detalhes</button>
                            </div>

                            {/* Info de qual equipe está selecionada */}
                            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '-0.5rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                Focado em: <strong style={{color: 'var(--primaria)'}}>{equipeFinAtual?.nome}</strong>
                            </p>

                            {carregandoFin ? (
                                <div className="fin-loading"><Activity size={18} className="dash-spinner" /></div>
                            ) : (
                                <div style={{ marginTop: '1.25rem' }}>
                                    <CardsDadosAtleta equipeIdOpcional={equipeFinSelecionada} esconderIcones={true} />
                                    
                                    <div className="fin-acoes-wrap" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-1rem' }}>
                                        <button className="bento-atalho" onClick={() => navegarParaEquipeFocada('financeiro-mensal')}>
                                            Ver Detalhes Financeiros <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* === CARD: Acesso Rápido (Pessoal) === */}
                        <section className="bento-card card-atalhos" style={{ order: 5 }}>
                            <div className="bento-top" style={{ marginBottom: '0.75rem' }}>
                                <div className="bento-titulo">
                                    <span className="bento-icone orange"><GripHorizontal size={17} /></span>
                                    <h2>Acesso Rápido</h2>
                                </div>
                                <button className="bento-atalho" onClick={() => { setModalCategoria('pessoal'); setModalAtalhosAberto(true); }}>
                                    <Settings size={13} /> Personalizar
                                </button>
                            </div>

                            {atalhosExibidosPessoalFinal.length > 0 ? (
                                <div className="atalhos-win-grid">
                                    {atalhosExibidosPessoalFinal.map(a => (
                                        <button key={a.id} className="atalho-win-btn" onClick={() => {
                                            if (a.action) a.action(aoNavegar, setAbaEquipe);
                                            else aoNavegar(a.tela);
                                        }}>
                                            <span className="atalho-win-emoji">{a.emoji}</span>
                                            <span className="atalho-win-label">{a.label}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="bento-vazio pequeno">
                                    <p>Nenhum atalho ativo.</p>
                                    <button className="bento-atalho" style={{ marginTop: '0.5rem' }} onClick={() => { setModalCategoria('pessoal'); setModalAtalhosAberto(true); }}>
                                        <Plus size={13} /> Adicionar
                                    </button>
                                </div>
                            )}
                        </section>

                        {/* === CARD: Atalhos da Equipe === */}
                        {equipes.length > 0 && (
                            <section className="bento-card card-atalhos-equipe" style={{ order: (equipeFinAtual?.papel === 'admin' || equipeFinAtual?.papel === 'sub_admin') ? 3 : 6 }}>
                                <div className="bento-top" style={{ marginBottom: '0.75rem' }}>
                                    <div className="bento-titulo">
                                        <span className="bento-icone blue"><Users size={17} /></span>
                                        <div>
                                            <h2>Minha Equipe</h2>
                                            {equipeFinAtual && (
                                                <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: '500', display: 'block', marginTop: '-2px' }}>
                                                    {equipeFinAtual.nome}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button className="bento-atalho" onClick={() => { setModalCategoria('equipe'); setModalAtalhosAberto(true); }}>
                                        <Settings size={13} /> Personalizar
                                    </button>
                                </div>

                                {atalhosExibidosEquipe.length > 0 ? (
                                    <div className="atalhos-win-grid">
                                        {atalhosExibidosEquipe.map(a => (
                                            <button key={a.id} className="atalho-win-btn" onClick={() => {
                                                if (equipeFinSelecionada) selecionarEquipe(equipeFinSelecionada);
                                                if (a.action) a.action(aoNavegar, setAbaEquipe);
                                                else aoNavegar(a.tela);
                                            }}>
                                                <span className="atalho-win-emoji">{a.emoji}</span>
                                                <span className="atalho-win-label">{a.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bento-vazio pequeno">
                                        <p>Nenhum atalho de equipe ativo.</p>
                                        <button className="bento-atalho" style={{ marginTop: '0.5rem' }} onClick={() => { setModalCategoria('equipe'); setModalAtalhosAberto(true); }}>
                                            <Plus size={13} /> Adicionar
                                        </button>
                                    </div>
                                )}
                            </section>
                        )}

                    </div>
                </main>
            )}

            {/* === MODAL: Personalizar Atalhos === */}
            {modalAtalhosAberto && (() => {
                const isEquipe = modalCategoria === 'equipe';
                const catalogoModal  = isEquipe ? catalogoEquipeFiltrado : catalogoPessoal;
                const selecionados   = isEquipe ? atalhosEquipe : atalhosPessoal;
                const titulo         = isEquipe ? 'Atalhos da Equipe' : 'Acesso Rápido';

                return (
                    <div className="modal-overlay" onClick={() => setModalAtalhosAberto(false)}>
                        <div className="modal-atalhos" onClick={e => e.stopPropagation()}>
                            <div className="modal-atalhos-header">
                                <h2>Personalizar — {titulo}</h2>
                                <button onClick={() => setModalAtalhosAberto(false)} className="modal-fechar"><X size={20} /></button>
                            </div>
                            <p className="modal-sub">Ative ou desative os atalhos que deseja ver no painel.</p>
                            {isEquipe && papelNaEquipe === 'jogador' && (
                                <p className="modal-aviso">⚡ Atalhos de gestão aparecem apenas para Capitães e Vice-Capitães.</p>
                            )}
                            <div className="modal-atalhos-grid">
                                {catalogoModal.map(a => {
                                    const sel = selecionados.includes(a.id);
                                    return (
                                        <button
                                            key={a.id}
                                            className={`modal-atalho-item ${sel ? 'selecionado' : ''}`}
                                            onClick={() => toggleAtalho(a.id, modalCategoria)}
                                        >
                                            <span className="atalho-win-emoji">{a.emoji}</span>
                                            <span className="atalho-win-label">{a.label}</span>
                                            {sel && <div className="modal-check">✓</div>}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="modal-atalhos-footer">
                                <button className="btn-confirmar" onClick={() => setModalAtalhosAberto(false)}>Concluído</button>
                            </div>
                        </div>
                    </div>
                );
            })()}

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
