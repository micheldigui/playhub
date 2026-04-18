import { 
    UserCircle, Trophy, Globe, Bell, Calendar, 
    Shield, DollarSign, Wallet, Swords, Users, 
    BarChart2, Settings, Crown, CircleHelp, Youtube,
    Zap
} from 'lucide-react';

/**
 * Utilitário de formatação de nome (Primeiro + Último)
 */
export const formatarNome = (nomeCompleto) => {
    if (!nomeCompleto) return '';
    const partes = nomeCompleto.trim().split(/\s+/);
    const capitalizar = (p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
    if (partes.length === 1) return capitalizar(partes[0]);
    return `${capitalizar(partes[0])} ${capitalizar(partes[partes.length - 1])}`;
};

/**
 * Catálogo completo de atalhos do sistema
 */
export const CATALOGO_ATALHOS = [
    // PESSOAIS (sempre visíveis)
    { id: 'perfil',           categoria: 'pessoal', label: 'Meu Perfil',      emoji: '👤', icone: UserCircle, tela: 'perfil',           roles: [],                   permissao: null },
    { id: 'perfil_esportivo', categoria: 'pessoal', label: 'Perfil Esportivo', emoji: '🏆', icone: Trophy,     tela: 'perfil_esportivo', roles: [],                   permissao: null },
    { id: 'explorar',         categoria: 'pessoal', label: 'Explorar',         emoji: '🔍', icone: Globe,      tela: 'explorar',         roles: [],                   permissao: null },
    { id: 'perfil_pub',       categoria: 'pessoal', label: 'Perfil Público',   emoji: '🌍', icone: Globe,      action: (nav) => { nav('perfil'); }, roles: [],  permissao: null },
    { id: 'notificacoes_globais', categoria: 'pessoal', label: 'Notificações', emoji: '🔔', icone: Bell,       tela: 'notificacoes', roles: [], permissao: null },
    { id: 'guia_app',             categoria: 'pessoal', label: 'Guia do App',     emoji: '📖', icone: CircleHelp, action: () => window.dispatchEvent(new CustomEvent('abrir-guia-playhub', { detail: { aba: 'atleta' } })), roles: [], permissao: null },
    { id: 'tutoriais_video',      categoria: 'pessoal', label: 'Vídeos Tutoriais', emoji: '🎥', icone: Youtube,    action: () => window.dispatchEvent(new CustomEvent('abrir-guia-playhub', { detail: { aba: 'videos' } })), roles: [], permissao: null },
    
    // EQUIPE (filtrados por permissão)
    { id: 'partidas',         categoria: 'equipe',  label: 'Partidas',         emoji: '📅', icone: Calendar,   action: (nav, set, select, eqId) => { if (select && eqId) select(eqId); set('agenda'); nav('equipe'); },           roles: [],                   permissao: null },
    { id: 'var_atleta',       categoria: 'equipe',  label: 'Fair Play',        emoji: '⚖️', icone: Shield,     action: (nav, set, select, eqId) => { if (select && eqId) select(eqId); set('disciplina'); nav('equipe'); },        roles: [],                   permissao: null },
    { id: 'solicitacoes_eq',  categoria: 'equipe',  label: 'Solicitações G.',  emoji: '📥', icone: Bell,       action: (nav, set, select, eqId) => { if (select && eqId) select(eqId); set('solicitacoes'); nav('equipe'); },       roles: ['admin','sub_admin'],permissao: 'gerenciar_membros' },
    { id: 'meus_pagamentos',  categoria: 'equipe',  label: 'Mensalistas',     emoji: '💰', icone: DollarSign, action: (nav, set, select, eqId) => { if (select && eqId) select(eqId); set('financeiro-mensal'); nav('equipe'); },  roles: [],                   permissao: null },
    { id: 'financas_avulso',  categoria: 'equipe',  label: 'Avulsos',         emoji: '💸', icone: Wallet,     action: (nav, set, select, eqId) => { if (select && eqId) select(eqId); set('financeiro-avulsos'); nav('equipe'); }, roles: [],                   permissao: null },
    { id: 'criar_partida',    categoria: 'equipe',  label: 'Marcar Jogo',     emoji: '⚽', icone: Swords,     action: (nav, set, select, eqId, setNavProps) => { if (select && eqId) select(eqId); if (setNavProps) setNavProps({ abrirModalCriacaoPartida: true }); set('agenda'); nav('equipe'); },           roles: ['admin','sub_admin'], permissao: 'gerenciar_partidas' },
    { id: 'gerenciar_membros',categoria: 'equipe',  label: 'Membros & Cargos', emoji: '👥', icone: Users,      action: (nav, set, select, eqId) => { if (select && eqId) select(eqId); set('membros'); nav('equipe'); },           roles: ['admin','sub_admin'], permissao: 'gerenciar_membros' },
    { id: 'relatorios_eq',    categoria: 'equipe',  label: 'Relatórios',       emoji: '📊', icone: BarChart2,  action: (nav, set, select, eqId) => { if (select && eqId) select(eqId); set('financeiro-relatorios'); nav('equipe'); }, roles: ['admin','sub_admin'], permissao: 'ver_relatorios' },
    { id: 'regras_eq',        categoria: 'equipe',  label: 'Regras & Config', emoji: '⚙️', icone: Settings,   action: (nav, set, select, eqId) => { if (select && eqId) select(eqId); set('regras-config'); nav('equipe'); },    roles: ['admin','sub_admin'], permissao: 'gerenciar_equipe' },
    { id: 'descobrir_atletas',categoria: 'equipe',  label: 'Buscar Atletas',  emoji: '🔍', icone: Globe,      action: (nav, set, select, eqId) => { if (select && eqId) select(eqId); set('descobrir'); nav('equipe'); },        roles: ['admin','sub_admin'], permissao: 'gerenciar_membros' },
    { id: 'permissoes_eq',    categoria: 'equipe',  label: 'Permissões (Gestores)', emoji: '🛡️', icone: Crown,      action: (nav, set, select, eqId) => { if (select && eqId) select(eqId); set('permissoes'); nav('equipe'); },        roles: ['admin','sub_admin'], permissao: 'gerenciar_gestores' },
    { id: 'sorteio_global',   categoria: 'equipe',  label: 'Sorteio Global',   emoji: '⚡', icone: Zap,        action: (nav, set, select, eqId) => { if (select && eqId) select(eqId); nav('sorteio_v4'); },                      roles: ['admin','sub_admin'], permissao: 'gerenciar_partidas' },
    { id: 'ranking_mvp',      categoria: 'equipe',  label: 'Hall da Fama',     emoji: '🎖️', icone: Trophy,    action: (nav, _, select, eqId) => { if (select && eqId) select(eqId); nav('ranking_mvp'); },                      roles: [],                   permissao: null },
];

export const STORAGE_PESSOAL  = 'playhub_atalhos_pessoal';
export const STORAGE_EQUIPE   = 'playhub_atalhos_equipe';

export const DEFAULTS_PESSOAL = ['perfil','perfil_esportivo','explorar','perfil_pub','notificacoes_globais', 'guia_app', 'tutoriais_video'];
export const DEFAULTS_EQUIPE  = ['partidas','var_atleta','solicitacoes_eq','meus_pagamentos','financas_avulso','criar_partida','gerenciar_membros','relatorios_eq','regras_eq','descobrir_atletas','permissoes_eq', 'sorteio_global', 'ranking_mvp'];
