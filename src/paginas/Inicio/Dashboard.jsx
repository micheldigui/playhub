import React, { useEffect, useState } from 'react';
import { supabase } from '../../servicos/supabase';
import { usarAutenticacao } from '../../contextos/AutenticacaoContexto';
import { usarEquipe } from '../../contextos/EquipeContexto';
import { rastrear } from '../../servicos/rastreamento';
import BannerInstalacaoApp from '../../componentes/Pwa/BannerInstalacaoApp';
import ModalInstalacaoApp from '../../componentes/Pwa/ModalInstalacaoApp';
import ModalDetalhesPartida from '../Equipe/tabs/modais/ModalDetalhesPartida';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { Activity as ActivityIcon, GripHorizontal as GripIcon, Users as UsersIcon, Download as DownloadIcon } from 'lucide-react';

// Constantes e Componentes Modulares
import { 
    formatarNome, CATALOGO_ATALHOS, STORAGE_PESSOAL, 
    STORAGE_EQUIPE, DEFAULTS_PESSOAL, DEFAULTS_EQUIPE 
} from './DashboardConstants';
import DashboardHeader from './componentes/DashboardHeader';
import SecaoAgendaDashboard from './componentes/SecaoAgendaDashboard';
import SecaoEquipesDashboard from './componentes/SecaoEquipesDashboard';
import SecaoFinanceiroDashboard from './componentes/SecaoFinanceiroDashboard';
import GradeAtalhos from './componentes/SecaoAtalhosDashboard';
import ModalAtalhosDashboard from './componentes/ModalAtalhosDashboard';

import './Dashboard.css';

const Dashboard = ({ aoNavegar, setAbaEquipe }) => {
    const { dadosUsuario, alternarVisibilidadePerfil, alternarWhatsAppMatch } = usarAutenticacao();
    const { equipes, getLabelVinculo, selecionarEquipe, equipeAtiva, carregando: carregandoEquipes } = usarEquipe();
    const { isInstalled } = usePwaInstall();

    const [proximasPartidas, setProximasPartidas] = useState([]);
    const [temMaisPartidas, setTemMaisPartidas] = useState(false);
    const [partidaSelecionada, setPartidaSelecionada] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [alterandoPriv, setAlterandoPriv] = useState(false);

    // Financeiro por equipe
    const [equipeFinSelecionada, setEquipeFinSelecionada] = useState(null);
    const [carregandoFin, setCarregandoFin] = useState(false);
    const [modalInstalacaoAberto, setModalInstalacaoAberto] = useState(false);

    // Atalhos
    const [modalAtalhosAberto, setModalAtalhosAberto] = useState(false);
    const [modalCategoria, setModalCategoria] = useState('pessoal');

    const [atalhosPessoal, setAtalhosPessoal] = useState(() => {
        try {
            const s = localStorage.getItem(STORAGE_PESSOAL);
            const ids = s ? JSON.parse(s) : DEFAULTS_PESSOAL;
            if (!ids.includes('guia_app')) ids.push('guia_app');
            if (!ids.includes('tutoriais_video')) ids.push('tutoriais_video');
            return ids;
        } catch { return DEFAULTS_PESSOAL; }
    });
    
    const [atalhosEquipe, setAtalhosEquipe] = useState(() => {
        try {
            const s = localStorage.getItem(STORAGE_EQUIPE);
            const dados = s ? JSON.parse(s) : DEFAULTS_EQUIPE;
            return dados.map(a => a === 'notificacoes' ? 'solicitacoes_eq' : a);
        } catch { return DEFAULTS_EQUIPE; }
    });

    // --- TELEMETRIA: Entrada na página ---
    useEffect(() => {
        if (dadosUsuario) {
            rastrear.pagina('Dashboard', { 
                usuario_nome: dadosUsuario.apelido || dadosUsuario.nome_completo,
                total_equipes: equipes?.length || 0
            });
        }
    }, [dadosUsuario?.id]);

    const toggleAtalho = (id, categoria) => {
        if (categoria === 'pessoal') {
            setAtalhosPessoal(prev => {
                const nova = prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id];
                localStorage.setItem(STORAGE_PESSOAL, JSON.stringify(nova));
                rastrear.clique(`toggle_atalho_${id}`, `Personalizou atalho pessoal: ${id}`);
                return nova;
            });
        } else {
            setAtalhosEquipe(prev => {
                const nova = prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id];
                localStorage.setItem(STORAGE_EQUIPE, JSON.stringify(nova));
                rastrear.clique(`toggle_atalho_eq_${id}`, `Personalizou atalho equipe: ${id}`);
                return nova;
            });
        }
    };

    const navegarParaEquipeFocada = (aba = 'minha-equipe') => {
        if (equipeFinSelecionada) {
            selecionarEquipe(equipeFinSelecionada);
            if (aba) setAbaEquipe(aba);
            aoNavegar('equipe');
            rastrear.clique('nav_equipe_focada', `Navegou para equipe focada: ${aba}`);
        }
    };

    // Cargas de Dados
    useEffect(() => {
        if (dadosUsuario && equipes?.length > 0 && !equipeFinSelecionada) {
            setEquipeFinSelecionada(equipes[0].id);
        }
    }, [dadosUsuario, equipes]);

    useEffect(() => {
        if (!dadosUsuario || carregandoEquipes) return;
        if (equipes && equipes.length === 0) {
            setCarregando(false);
            return;
        }
        if (equipeFinSelecionada) {
            carregarPartidas();
            setCarregandoFin(true); 
            setTimeout(() => setCarregandoFin(false), 500); 
        }
    }, [equipeFinSelecionada, dadosUsuario, equipes, carregandoEquipes]);

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
                const limitQuery = 16;

                const { data: partidasData, error } = await supabase
                    .from('partidas')
                    .select('*, equipes(id, nome, logo_url, regras)')
                    .eq('equipe_id', equipeFinSelecionada)
                    .gte('data', hoje)
                    .order('data', { ascending: true })
                    .limit(limitQuery);

                if (error) throw error;

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
            }
        } catch (e) { 
            console.error(e);
            rastrear.erro(`Falha ao carregar partidas no Dashboard: ${e.message}`, 'Dashboard.carregarPartidas', e);
        } finally { setCarregando(false); }
    };

    const handlePrivacidade = async () => {
        setAlterandoPriv(true);
        try {
            await alternarVisibilidadePerfil();
            rastrear.clique('toggle_privacidade', 'Alternou visibilidade do perfil');
        } catch (e) {
            rastrear.erro(`Erro ao alternar privacidade: ${e.message}`, 'Dashboard.handlePrivacidade', e);
        }
        setAlterandoPriv(false);
    };

    const handleToggleWhatsApp = async () => {
        setAlterandoPriv(true);
        try {
            await alternarWhatsAppMatch();
            rastrear.clique('toggle_whatsapp', 'Alternou visibilidade do WhatsApp');
        } catch (e) {
            rastrear.erro(`Erro ao alternar WhatsApp: ${e.message}`, 'Dashboard.handleToggleWhatsApp', e);
        }
        setAlterandoPriv(false);
    };

    if (!dadosUsuario) return null;

    const primeiroNome = dadosUsuario.apelido || (dadosUsuario.nome_completo ? formatarNome(dadosUsuario.nome_completo).split(' ')[0] : 'Atleta');
    const saudacao = new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite';
    const equipeFinAtual = equipes.find(e => e.id === equipeFinSelecionada);
    const papelNaEquipe = equipeFinAtual?.papel || 'jogador';
    const permsVice = equipeFinAtual?.permissoes || [];

    // Filtros de Atalhos
    const catPessoal = CATALOGO_ATALHOS.filter(a => a.categoria === 'pessoal');
    const atalhosExibidosPessoal = [...catPessoal.filter(a => atalhosPessoal.includes(a.id)), ...(!isInstalled ? [{ id: 'instalar', label: 'Instalar App', emoji: '📲', icone: DownloadIcon, action: () => setModalInstalacaoAberto(true) }] : [])];

    const catEquipe = CATALOGO_ATALHOS.filter(a => {
        if (a.categoria !== 'equipe') return false;
        
        // Se a gestão financeira da equipe estiver desativada, removemos atalhos financeiros de TODOS
        const idsFinanceiros = ['meus_pagamentos', 'financas_avulso', 'relatorios_eq'];
        if (!equipeFinAtual?.gestao_financeira && idsFinanceiros.includes(a.id)) return false;

        // Regras para Gestores (Capitão e Vice)
        if (papelNaEquipe === 'admin') return true;
        if (papelNaEquipe === 'sub_admin') {
            if (a.roles.length === 0 || a.permissao === null) return true;
            return permsVice.includes(a.permissao);
        }

        // Regras para Jogadores Comuns
        if (a.roles.length > 0) return false;
        if (papelNaEquipe === 'jogador') {
            // Se for mensalista, só vê mensalidades. Se for avulso, só vê avulsos.
            if (a.id === 'meus_pagamentos' && equipeFinAtual?.vinculo !== 'mensalista') return false;
            if (a.id === 'financas_avulso' && equipeFinAtual?.vinculo !== 'avulso') return false;
        }
        return true;
    });

    const atalhosExibidosEquipe = catEquipe.filter(a => atalhosEquipe.includes(a.id));

    return (
        <div className="dashboard-container">
            <DashboardHeader 
                dadosUsuario={dadosUsuario} primeiroNome={primeiroNome} saudacao={saudacao} 
                isPublico={dadosUsuario.perfil_publico} alterandoPriv={alterandoPriv} 
                handlePrivacidade={handlePrivacidade} handleToggleWhatsApp={handleToggleWhatsApp} 
            />

            <div style={{ padding: '0 20px' }}><BannerInstalacaoApp local="dashboard" /></div>

            {carregando ? (
                <div className="dash-loading"><ActivityIcon size={30} className="dash-spinner" /><p>Carregando seu painel…</p></div>
            ) : (
                <main className="dash-grid">
                    <SecaoAgendaDashboard 
                        proximasPartidas={proximasPartidas} equipeNome={equipeFinAtual?.nome} 
                        navegarParaEquipeFocada={navegarParaEquipeFocada} setPartidaSelecionada={setPartidaSelecionada}
                        temMaisPartidas={temMaisPartidas}
                    />

                    <div className="dash-coluna">
                        <SecaoEquipesDashboard 
                            equipes={equipes} equipeFinSelecionada={equipeFinSelecionada} 
                            setEquipeFinSelecionada={setEquipeFinSelecionada} selecionarEquipe={selecionarEquipe} 
                            setAbaEquipe={setAbaEquipe} aoNavegar={aoNavegar} getLabelVinculo={getLabelVinculo}
                        />

                        <SecaoFinanceiroDashboard 
                            equipeNome={equipeFinAtual?.nome} equipeId={equipeFinSelecionada}
                            carregandoFin={carregandoFin} navegarParaEquipeFocada={navegarParaEquipeFocada}
                        />

                        <GradeAtalhos 
                            titulo="Acesso Rápido" icone={GripIcon} corIcone="orange" categoria="pessoal"
                            atalhos={atalhosExibidosPessoal} setModalCategoria={setModalCategoria} 
                            setModalAtalhosAberto={setModalAtalhosAberto} aoNavegar={aoNavegar} setAbaEquipe={setAbaEquipe}
                        />

                        {equipes.length > 0 && (
                            <GradeAtalhos 
                                titulo="Minha Equipe" icone={UsersIcon} corIcone="blue" categoria="equipe"
                                equipeNome={equipeFinAtual?.nome} ordem={(papelNaEquipe === 'admin' || papelNaEquipe === 'sub_admin') ? 3 : 6}
                                atalhos={atalhosExibidosEquipe} setModalCategoria={setModalCategoria} 
                                setModalAtalhosAberto={setModalAtalhosAberto} aoNavegar={aoNavegar} setAbaEquipe={setAbaEquipe}
                            />
                        )}
                    </div>
                </main>
            )}

            <ModalAtalhosDashboard 
                aberto={modalAtalhosAberto} aoFechar={() => setModalAtalhosAberto(false)} 
                categoria={modalCategoria} catalogo={modalCategoria === 'equipe' ? catEquipe : catPessoal}
                selecionados={modalCategoria === 'equipe' ? atalhosEquipe : atalhosPessoal}
                toggleAtalho={toggleAtalho} papelNaEquipe={papelNaEquipe}
            />

            {partidaSelecionada && (
                <ModalDetalhesPartida isOpen={!!partidaSelecionada} partida={partidaSelecionada} 
                    onClose={() => { setPartidaSelecionada(null); carregarPartidas(); }} 
                />
            )}

            {modalInstalacaoAberto && <ModalInstalacaoApp aoFechar={() => setModalInstalacaoAberto(false)} />}
        </div>
    );
};

export default Dashboard;
