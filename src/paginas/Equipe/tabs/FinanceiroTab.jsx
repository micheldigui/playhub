import React, { useState, useEffect } from 'react';
import { 
    DollarSign, 
    Calendar, 
    ChevronLeft, 
    ChevronRight, 
    User, 
    CheckCircle2, 
    XCircle, 
    AlertCircle, 
    Settings,
    Share2,
    TrendingUp,
    Plus,
    Trash2,
    X,
    Loader2,
    BarChart2,
    Clock,
    Wallet,
    CreditCard,
    Coins,
    Eye,
    MessageCircle
} from 'lucide-react';
import { usarFinanceiro } from '../../../contextos/FinanceiroContexto';
import { usarEquipe } from '../../../contextos/EquipeContexto';
import Botao from '../../../componentes/Botao/Botao';
import { rastrear } from '../../../servicos/rastreamento';
import FinanceiroDashboard from './FinanceiroDashboard';
import FinanceiroAvulsos from './FinanceiroAvulsos';

const FinanceiroTab = ({ abaExterna, modoLeitura = false, membrosIniciais = [] }) => {
    const { 
        configuracao, 
        carregarConfiguracao, 
        salvarConfiguracao,
        buscarMensalidadesCiclo,
        buscarDadosCiclo,
        registrarPagamentoMensalidade,
        removerMensalidade,
        removerCiclo,
        atualizarValoresMensalidadesCiclo,
        inicializarCiclo,
        obterCicloAtual,
        obterMesAtual,
        formatarPeriodoParaExibicao
    } = usarFinanceiro();
    
    const { equipeAtiva, atualizarRegrasEquipe, getLabelVinculo } = usarEquipe();
    
    // Estado principal
    const [periodoAtivo, setPeriodoAtivo] = useState('');
    const [mensalidades, setMensalidades] = useState([]);
    const [dadosCiclo, setDadosCiclo] = useState(null);
    const [todosMembros, setTodosMembros] = useState(membrosIniciais);
    const [carregando, setCarregando] = useState(true);
    const [processando, setProcessando] = useState(null);
    const [exibirConfig, setExibirConfig] = useState(false);
    const [modalImportarAberto, setModalImportarAberto] = useState(false);
    const [subAba, setSubAba] = useState(abaExterna || 'gestao'); 

    // Sincroniza membros se as props mudarem
    useEffect(() => {
        setTodosMembros(membrosIniciais);
    }, [membrosIniciais]);
    
    useEffect(() => {
        if (abaExterna) setSubAba(abaExterna);
    }, [abaExterna]);

    const [configLocal, setConfigLocal] = useState({
        valor_mensalidade: 50,
        dia_vencimento: 10,
        dia_tolerancia: 15,
        custo_quadra: 0,
        limite_vencimento_horas: 24,
        chave_pix: ''
    });

    // Inicializa o período ao montar
    useEffect(() => {
        if (equipeAtiva?.id) {
            const iniciar = async () => {
                try {
                    const cfg = await carregarConfiguracao(equipeAtiva.id);
                    if (cfg) {
                        setConfigLocal({
                            valor_mensalidade: cfg.valor_mensalidade || equipeAtiva.regras?.mensalidade || 50,
                            dia_vencimento: cfg.dia_vencimento || equipeAtiva.regras?.vencimento_dia || 10,
                            dia_tolerancia: cfg.dia_tolerancia || 15,
                            custo_quadra: cfg.custo_quadra || equipeAtiva.regras?.custo_quadra || 0,
                            limite_vencimento_horas: cfg.limite_vencimento_horas || equipeAtiva.regras?.horas_limite_pagamento || 24,
                            chave_pix: cfg.chave_pix || equipeAtiva.regras?.chave_pix || ''
                        });
                        setPeriodoAtivo(obterMesAtual());
                    } else {
                        setPeriodoAtivo(obterMesAtual());
                    }
                } catch (e) {
                    console.error('Erro ao iniciar FinanceiroTab:', e);
                }
            };
            iniciar();
        }
    }, [equipeAtiva?.id]);

    // Carrega dados quando o período ou equipe muda
    useEffect(() => {
        if (equipeAtiva?.id && periodoAtivo) {
            carregarDados();
        }
    }, [equipeAtiva?.id, periodoAtivo]);

    const carregarDados = async () => {
        if (!equipeAtiva?.id || !periodoAtivo) return;
        
        setCarregando(true);
        try {
            // Verificação de segurança antes de chamar
            if (typeof buscarDadosCiclo !== 'function') {
                console.error('ERRO: buscarDadosCiclo não é uma função no contexto financeiro!');
                setCarregando(false);
                return;
            }

            const [pagamentos, metaCiclo] = await Promise.all([
                buscarMensalidadesCiclo(equipeAtiva.id, periodoAtivo),
                buscarDadosCiclo(equipeAtiva.id, periodoAtivo)
            ]);
            
            setMensalidades(pagamentos || []);
            setDadosCiclo(metaCiclo?.success ? metaCiclo.data : null);
        } catch (error) {
            console.error('Erro ao carregar dados financeiros:', error);
        } finally {
            setCarregando(false);
        }
    };

    const navegarPeriodo = (direcao) => {
        if (!periodoAtivo) return;
        const [ano, mes] = periodoAtivo.split('-').map(Number);
        const data = new Date(ano, mes - 1 + direcao, 1);
        const novoAno = data.getFullYear();
        const novoMes = String(data.getMonth() + 1).padStart(2, '0');
        setPeriodoAtivo(`${novoAno}-${novoMes}`);
    };

    // Alterna pagamento entre pago e pendente
    const handleAlternarPagamento = async (pag) => {
        const novoStatus = pag.status === 'pago' ? 'pendente' : 'pago';
        setProcessando('pagamento_' + pag.id);
        
        const dados = {
            id: pag.id,
            equipe_id: equipeAtiva.id,
            usuario_id: pag.usuario_id,
            periodo: periodoAtivo,
            valor_configurado: pag.valor_configurado || configLocal.valor_mensalidade || 50,
            status: novoStatus
        };

        const res = await registrarPagamentoMensalidade(dados);
        if (res.success) {
            rastrear.clique('financeiro_alternar_pagamento_mensalista', 'Alternou pagamento do mensalista', { status: novoStatus, periodo: periodoAtivo });
            await carregarDados();
        } else {
            alert('Erro ao atualizar status: ' + res.error);
        }
        setProcessando(null);
    };

    // Inicializa o ciclo com TODOS os mensalistas atuais
    const handleInicializarCiclo = async () => {
        const mensalistas = todosMembros.filter(m => m.vinculo === 'mensalista');
        
        if (mensalistas.length === 0) {
            alert('Não há membros marcados como "Mensalista" nesta equipe.');
            return;
        }

        if (!window.confirm(`Deseja iniciar o ciclo de ${formatarPeriodoParaExibicao(periodoAtivo)} com ${mensalistas.length} atleta(s)?`)) return;
        
        setProcessando('inicializar');
        try {
            const res = await inicializarCiclo(equipeAtiva.id, periodoAtivo, mensalistas);
            if (res.success) {
                rastrear.clique('financeiro_inicializar_ciclo', 'Inicializou ciclo financeiro mensal', { qt_mensalistas: mensalistas.length, periodo: periodoAtivo });
                await carregarDados();
            } else {
                alert('Erro ao inicializar ciclo: ' + res.error);
            }
        } catch (error) {
            console.error('Erro fatal ao inicializar:', error);
            alert('Erro catastrófico ao inicializar: ' + error.message);
        } finally {
            setProcessando(null);
        }
    };

    // Adiciona um único mensalista ao ciclo já iniciado
    const handleAdicionarAoCiclo = async (membro) => {
        if (mensalidades.some(p => p.usuario_id === membro.usuario_id)) {
            alert(`${membro.usuarios?.nome_completo} já está neste ciclo.`);
            return;
        }
        
        setProcessando('adicionar_' + membro.usuario_id);
        const dados = {
            equipe_id: equipeAtiva.id,
            usuario_id: membro.usuario_id,
            periodo: periodoAtivo,
            valor_configurado: configLocal.valor_mensalidade || 50,
            status: 'pendente'
        };
        
        const res = await registrarPagamentoMensalidade(dados);
        if (res.success) {
            rastrear.clique('financeiro_adicionar_mensalista_ciclo', 'Adicionou mensalista manualmente ao ciclo', { periodo: periodoAtivo });
            await carregarDados();
        } else {
            alert('Erro ao adicionar: ' + res.error);
        }
        setProcessando(null);
    };

    // Estados de confirmação e hover
    const [confirmandoExclusao, setConfirmandoExclusao] = useState(null); // ID do pagamento
    const [hoverBotao, setHoverBotao] = useState(null); // 'remover_ID' | 'status_ID' | 'ciclo'

    const handleRemoverDoCiclo = async (pag) => {
        if (pag.status === 'pago') {
            alert('Não é possível remover atleta pago.');
            return;
        }

        // Se não houver confirmação ativa, ativa
        if (confirmandoExclusao !== pag.id) {
            setConfirmandoExclusao(pag.id);
            return;
        }
        
        setProcessando('remover_' + pag.id);
        const res = await removerMensalidade(pag.id);
        if (res.success) {
            rastrear.clique('financeiro_remover_mensalista_ciclo', 'Removeu mensalista do ciclo atual', { periodo: periodoAtivo });
            await carregarDados();
        } else {
            alert('Erro ao remover: ' + res.error);
        }
        setProcessando(null);
        setConfirmandoExclusao(null);
    };

    const handleRemoverCiclo = async () => {
        if (mensalidades.length > 0) {
            alert('Apenas ciclos vazios podem ser excluídos integralmente.');
            return;
        }
        
        // Confirmação in-line para o ciclo
        if (confirmandoExclusao !== 'ciclo_completo') {
            setConfirmandoExclusao('ciclo_completo');
            return;
        }

        setProcessando('remover_ciclo');
        const res = await removerCiclo(equipeAtiva.id, periodoAtivo);
        if (res.success) {
            rastrear.clique('financeiro_remover_ciclo_vazio', 'Apagou dados do ciclo financeiro', { periodo: periodoAtivo });
            await carregarDados();
        } else {
            alert('Erro ao excluir ciclo: ' + res.error);
        }
        setProcessando(null);
        setConfirmandoExclusao(null);
    };

    const handleSalvarConfig = async () => {
        setProcessando('salvando_config');
        try {
            const resGlobal = await salvarConfiguracao({
                equipe_id: equipeAtiva.id,
                ...configLocal
            });

            if (!resGlobal.success) throw new Error(resGlobal.error);

            await atualizarRegrasEquipe(equipeAtiva.id, {
                ...equipeAtiva.regras,
                mensalidade: Number(configLocal.valor_mensalidade),
                vencimento_dia: Number(configLocal.dia_vencimento),
                horas_limite_pagamento: Number(configLocal.limite_vencimento_horas),
                custo_quadra: Number(configLocal.custo_quadra),
                chave_pix: configLocal.chave_pix
            });

            if (mensalidades.length > 0) {
                const temPendentes = mensalidades.some(p => p.status === 'pendente');
                if (temPendentes) {
                    if (window.confirm(`Deseja aplicar R$ ${configLocal.valor_mensalidade} aos atletas pendentes deste mês?`)) {
                        await atualizarValoresMensalidadesCiclo(equipeAtiva.id, periodoAtivo, configLocal.valor_mensalidade);
                    }
                }
            }

            setExibirConfig(false);
            await carregarDados();
            rastrear.clique('financeiro_salvar_config_mensalistas', 'Atualizou as configs financeiras da equipe');
            alert('Configurações salvas e sincronizadas!');
        } catch (error) {
            console.error('Erro ao salvar config:', error);
            alert('Falha ao salvar regras: ' + error.message);
        } finally {
            setProcessando(null);
        }
    };

    const formatarMoeda = (valor) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

    // Primeiro nome + último sobrenome, iniciais maiúsculas
    const formatName = (fullName) => {
        if (!fullName) return 'Atleta';
        const parts = fullName.trim().toLowerCase().split(/\s+/);
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        const last  = parts[parts.length - 1].charAt(0).toUpperCase() + parts[parts.length - 1].slice(1);
        return `${first} ${last}`;
    };

    const formatarApelido = (apelido) => {
        if (!apelido) return '';
        return apelido.trim().split(/\s+/).map(p => 
            p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
        ).join('');
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

// Mapa usuario_id -> papel (admin | sub_admin | jogador)
    const mapaPapeis = React.useMemo(() => {
        const mapa = {};
        todosMembros.forEach(m => { if (m.usuario_id) mapa[m.usuario_id] = m.papel; });
        return mapa;
    }, [todosMembros]);

    // Nome sempre branco — apenas o badge de cargo leva cor
    const corNome = () => '#f8fafc';

    const resumo = React.useMemo(() => {
        return {
            totalRecebido: mensalidades.filter(m => m.status === 'pago').reduce((acc, m) => acc + Number(m.valor_configurado), 0),
            totalPendente: mensalidades.filter(m => m.status === 'pendente').reduce((acc, m) => acc + Number(m.valor_configurado), 0),
            pagosCount: mensalidades.filter(m => m.status === 'pago').length,
            totalMembros: mensalidades.length
        };
    }, [mensalidades]);

    const mensalistasNoCiclo = new Set(mensalidades.map(p => p.usuario_id));
    const mensalistasDisponiveis = React.useMemo(() => {
        return todosMembros
            .filter(m => m.vinculo === 'mensalista')
            .sort((a, b) => {
                const nomeA = a.usuarios?.nome_completo || '';
                const nomeB = b.usuarios?.nome_completo || '';
                return nomeA.localeCompare(nomeB);
            });
    }, [todosMembros]);

    const compartilharWhatsApp = () => {
        const custoQuadra = dadosCiclo?.custo_quadra_snapshot || configLocal.custo_quadra || 0;
        const saldo = resumo.totalRecebido - custoQuadra;
        const faltam = custoQuadra - resumo.totalRecebido;
        const labelVinculo = getLabelVinculo('mensalista');

        // Lógica de vencimento
        const hoje = new Date();
        const diaAtual = hoje.getDate();
        const mesAtual = hoje.getMonth() + 1;
        const anoAtual = hoje.getFullYear();
        const [anoCiclo, mesCiclo] = periodoAtivo.split('-').map(Number);
        
        const diaVencimento = configLocal.dia_vencimento || 10;
        const jaVenceu = (anoAtual > anoCiclo) || (anoAtual === anoCiclo && mesAtual > mesCiclo) || (anoAtual === anoCiclo && mesAtual === mesCiclo && diaAtual > diaVencimento);

        let msg = `*📊 RELATÓRIO FINANCEIRO - ${equipeAtiva.nome.toUpperCase()}*\n`;
        msg += `📅 *Ciclo:* ${formatarPeriodoParaExibicao(periodoAtivo)}\n\n`;
        
        msg += `🏟️ *Custo da Quadra:* ${formatarMoeda(custoQuadra)}\n`;
        msg += `💰 *Total Arrecadado:* ${formatarMoeda(resumo.totalRecebido)}\n`;
        
        if (saldo >= 0) {
            msg += `📈 *Saldo Atual:* ${formatarMoeda(saldo)}\n`;
        } else {
            msg += `📉 *Falta Arrecadar:* ${formatarMoeda(faltam)}\n`;
        }
        
        msg += `---------------------------\n\n`;

        const pagos = mensalidades.filter(m => m.status === 'pago');
        const pendentes = mensalidades.filter(m => m.status === 'pendente');

        msg += `*${labelVinculo.toUpperCase()}S (${mensalidades.length})*\n`;
        
        // Ordenar: pagos primeiro, depois o resto
        const listaOrdenada = [...mensalidades].sort((a, b) => {
            if (a.status === 'pago' && b.status !== 'pago') return -1;
            if (a.status !== 'pago' && b.status === 'pago') return 1;
            return 0;
        });

        listaOrdenada.forEach((p) => {
            let icon = '⚠️';
            if (p.status === 'pago') icon = '✅';
            else if (jaVenceu) icon = '🔴';
            
            const papel = mapaPapeis[p.usuario_id];
            const emojicargo = papel === 'admin' ? '👑 ' : papel === 'sub_admin' ? '🥈 ' : '';
            msg += `${icon} ${emojicargo}${formatName(p.usuarios?.nome_completo)}\n`;
        });

        msg += `\n---------------------------\n`;
        msg += `👉 _Relatório enviado via playhubapp.com.br_ 🚀`;

        rastrear.clique('financeiro_whatsapp_mensalistas', 'Enviou balanço financeiro via WhatsApp');
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
    };

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            


            {subAba === 'dashboard' ? <FinanceiroDashboard /> : 
             subAba === 'avulsos' ? <FinanceiroAvulsos membrosIniciais={todosMembros} /> : (
            <>
                <div style={{ background: 'rgba(15,23,42,0.6)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ background: 'rgba(56,189,248,0.1)', padding: '10px', borderRadius: '12px' }}><DollarSign color="#38bdf8" size={24} /></div>
                        <div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#f8fafc' }}>Gestão Financeira</h3>
                            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Ciclos de cobrança independentes</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <button onClick={() => navegarPeriodo(-1)} className="btn-icon" title="Mês Anterior"><ChevronLeft size={20} color="#94a3b8" /></button>
                        <div style={{ minWidth: '100px', textAlign: 'center', fontWeight: '600', color: '#f8fafc' }}>{formatarPeriodoParaExibicao(periodoAtivo)}</div>
                        <button onClick={() => navegarPeriodo(1)} className="btn-icon" title="Próximo Mês"><ChevronRight size={20} color="#94a3b8" /></button>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {modoLeitura ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.2)', color: '#94a3b8', padding: '6px 12px', borderRadius: '10px', fontSize: '0.8rem' }}>
                                <Eye size={14} /> Somente Visualização
                            </span>
                        ) : (
                            <>
                                <Botao variant="secundario" onClick={() => setExibirConfig(!exibirConfig)} active={exibirConfig} title="Regras Financeiras"><Settings size={18} /></Botao>
                                <Botao variant="secundario" onClick={compartilharWhatsApp} title="Enviar Relatório"><Share2 size={18} /></Botao>
                            </>
                        )}
                    </div>
                </div>

                {exibirConfig && (
                    <div style={{ background: 'rgba(15,23,42,0.4)', borderRadius: '16px', border: '1px solid rgba(56,189,248,0.2)', padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                        <div className="campo"><label><Coins size={14} /> Valor Mensalidade (R$)</label><input type="number" value={configLocal.valor_mensalidade} onChange={(e) => setConfigLocal({...configLocal, valor_mensalidade: e.target.value})} /></div>
                        <div className="campo"><label><Wallet size={14} /> Custo Total Quadra (R$)</label><input type="number" value={configLocal.custo_quadra} onChange={(e) => setConfigLocal({...configLocal, custo_quadra: e.target.value})} /></div>
                        <div className="campo"><label><Calendar size={14} /> Dia do Vencimento</label><input type="number" value={configLocal.dia_vencimento} onChange={(e) => setConfigLocal({...configLocal, dia_vencimento: e.target.value})} /></div>
                        <div className="campo"><label><Clock size={14} /> Limite (H antes vence)</label><input type="number" value={configLocal.limite_vencimento_horas} onChange={(e) => setConfigLocal({...configLocal, limite_vencimento_horas: e.target.value})} /></div>
                        <div className="campo" style={{ gridColumn: '1 / -1' }}><label><CreditCard size={14} /> Chave PIX do Gestor</label><input type="text" value={configLocal.chave_pix} onChange={(e) => setConfigLocal({...configLocal, chave_pix: e.target.value})} placeholder="Para cobranças no WhatsApp" /></div>
                        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}><Botao onClick={handleSalvarConfig} disabled={!!processando}>{processando === 'salvando_config' ? 'Salvando...' : 'Salvar Regras'}</Botao></div>
                    </div>
                )}

                {(() => {
                    const hoje = new Date();
                    const diaAtual = hoje.getDate();
                    const mesAtual = hoje.getMonth() + 1;
                    const anoAtual = hoje.getFullYear();
                    const [anoCiclo, mesCiclo] = periodoAtivo.split('-').map(Number);
                    const diaVencimento = configLocal.dia_vencimento || 10;
                    
                    const jaVenceu = (anoAtual > anoCiclo) || 
                                    (anoAtual === anoCiclo && mesAtual > mesCiclo) || 
                                    (anoAtual === anoCiclo && mesAtual === mesCiclo && diaAtual > diaVencimento);

                    return mensalidades.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                            <div className="card-financeiro"><TrendingUp size={20} color="#10b981" /><div><span className="label">Recebido</span><p className="valor">{formatarMoeda(resumo.totalRecebido)}</p></div></div>
                            <div className="card-financeiro">
                                <AlertCircle size={20} color={jaVenceu ? "#ef4444" : "#f59e0b"} />
                                <div>
                                    <span className="label">{jaVenceu ? 'Vencido' : 'Pendente'}</span>
                                    <p className="valor" style={{ color: jaVenceu ? "#ef4444" : "#f8fafc" }}>{formatarMoeda(resumo.totalPendente)}</p>
                                </div>
                            </div>
                            <div className="card-financeiro" title={`Custo salvo para este mês: R$ ${dadosCiclo?.custo_quadra_snapshot || configLocal.custo_quadra}`}><Plus size={20} color="#38bdf8" /><div><span className="label">Lucro do Ciclo</span><p className="valor">{formatarMoeda(resumo.totalRecebido - (dadosCiclo?.custo_quadra_snapshot || configLocal.custo_quadra))}</p></div></div>
                        </div>
                    );
                })()}

                <div style={{ background: 'rgba(15,23,42,0.6)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minHeight: '30px' }}>
                            <h4 style={{ fontWeight: '600', color: '#f8fafc', whiteSpace: 'nowrap' }}>{mensalidades.length > 0 ? `Atletas no Ciclo (${mensalidades.length})` : 'Status do Ciclo'}</h4>
                            <div style={{ minWidth: '180px', display: 'flex', alignItems: 'center', height: '28px', overflow: 'hidden' }}>
                                {hoverBotao && <span className="legenda-ativa animacao-entrada">{hoverBotao}</span>}
                            </div>
                        </div>
                        {!modoLeitura && (
                            mensalidades.length > 0 ? (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button 
                                        onClick={compartilharWhatsApp} 
                                        onMouseEnter={() => setHoverBotao('Compartilhar p/ Grupo')}
                                        onMouseLeave={() => setHoverBotao(null)}
                                        style={{ background: '#25D366', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: '10px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}
                                    ><MessageCircle size={16} fill="white" /> Compartilhar</button>
                                    <button 
                                        onClick={() => setModalImportarAberto(true)} 
                                        onMouseEnter={() => setHoverBotao('Adicionar Atleta')}
                                        onMouseLeave={() => setHoverBotao(null)}
                                        style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', padding: '6px 14px', borderRadius: '10px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    ><Plus size={16} /> Adicionar</button>
                                    <button 
                                        onClick={handleRemoverCiclo} 
                                        onMouseEnter={() => setHoverBotao(confirmandoExclusao === 'ciclo_completo' ? 'Clique para Confirmar' : 'Excluir Todo o Mês')}
                                        onMouseLeave={() => setHoverBotao(null)}
                                        style={{ 
                                            background: confirmandoExclusao === 'ciclo_completo' ? 'rgba(244,63,94,0.2)' : 'transparent', 
                                            border: confirmandoExclusao === 'ciclo_completo' ? '1px solid #f43f5e' : '1px solid rgba(244,63,94,0.3)', 
                                            color: '#f43f5e', padding: '6px 14px', borderRadius: '10px', fontSize: '0.8rem', 
                                            opacity: (mensalidades.length > 0 && confirmandoExclusao !== 'ciclo_completo') ? 0.3 : 1, 
                                            cursor: (mensalidades.length > 0 && confirmandoExclusao !== 'ciclo_completo') ? 'not-allowed' : 'pointer' 
                                        }} 
                                        disabled={mensalidades.length > 0 && confirmandoExclusao !== 'ciclo_completo'}
                                    >{confirmandoExclusao === 'ciclo_completo' ? 'Confirmar?' : <Trash2 size={16} />}</button>
                                </div>
                            ) : (
                                <button 
                                    onClick={handleRemoverCiclo} 
                                    onMouseEnter={() => setHoverBotao(confirmandoExclusao === 'ciclo_completo' ? 'Clique para Confirmar' : 'Remover Ciclo Vazio')}
                                    onMouseLeave={() => setHoverBotao(null)}
                                    style={{ 
                                        background: confirmandoExclusao === 'ciclo_completo' ? 'rgba(244,63,94,0.2)' : 'transparent', 
                                        border: confirmandoExclusao === 'ciclo_completo' ? '1px solid #f43f5e' : '1px solid rgba(244,63,94,0.3)', 
                                        color: '#f43f5e', padding: '6px 14px', borderRadius: '10px', fontSize: '0.8rem', cursor: 'pointer' 
                                    }}
                                >{confirmandoExclusao === 'ciclo_completo' ? 'Confirmar?' : <Trash2 size={16} />}</button>
                            )
                        )}
                    </div>

                    <div style={{ minHeight: '300px' }}>
                        {carregando ? (
                            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}><Loader2 className="animate-spin" style={{ margin: '0 auto 12px' }} /> Carregando...</div>
                        ) : mensalidades.length > 0 ? (
                            <div>
                                {(() => {
                                    const mensalidadesOrdenadas = [...mensalidades].sort((a, b) => {
                                        const papelA = mapaPapeis[a.usuario_id] || 'jogador';
                                        const papelB = mapaPapeis[b.usuario_id] || 'jogador';
                                        const pesoA = papelA === 'admin' ? 1 : papelA === 'sub_admin' ? 2 : 3;
                                        const pesoB = papelB === 'admin' ? 1 : papelB === 'sub_admin' ? 2 : 3;
                                        if (pesoA !== pesoB) return pesoA - pesoB;
                                        const nomeA = formatName(a.usuarios?.nome_completo);
                                        const nomeB = formatName(b.usuarios?.nome_completo);
                                        return nomeA.localeCompare(nomeB);
                                    });
                                    return mensalidadesOrdenadas.map((pag, index) => (
                                    <div key={pag.id} className="item-mensalidade">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ color: '#64748b', fontSize: '0.85rem', width: '20px', textAlign: 'right' }}>{index + 1}.</span>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {pag.usuarios?.foto_url ? (
                                                    <img src={pag.usuarios.foto_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <div className="avatar-iniciais-mini">
                                                        {getIniciaisAtleta(pag.usuarios)}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p style={{ color: '#f8fafc', fontWeight: '600', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    {formatName(pag.usuarios?.nome_completo)}
                                                    {mapaPapeis[pag.usuario_id] === 'admin'     && <span title="Capitão"     style={{ fontSize: '0.7rem', background: 'rgba(251,191,36,0.15)',  color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)',  padding: '1px 6px', borderRadius: '6px', fontWeight: '700' }}>Capitão</span>}
                                                    {mapaPapeis[pag.usuario_id] === 'sub_admin' && <span title="Vice-Capitão" style={{ fontSize: '0.7rem', background: 'rgba(16,185,129,0.15)',  color: '#10b981', border: '1px solid rgba(16,185,129,0.25)',  padding: '1px 6px', borderRadius: '6px', fontWeight: '700' }}>Vice</span>}
                                                </p>
                                                <p style={{ color: '#64748b', fontSize: '0.8rem' }}>{pag.usuarios?.apelido ? `@${formatarApelido(pag.usuarios.apelido)}` : '-'}</p>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                            <div style={{ textAlign: 'right' }}>
                                                {(() => {
                                                    const hoje = new Date();
                                                    const diaAtual = hoje.getDate();
                                                    const mesAtual = hoje.getMonth() + 1;
                                                    const anoAtual = hoje.getFullYear();
                                                    const [anoCiclo, mesCiclo] = periodoAtivo.split('-').map(Number);
                                                    const diaVencimento = configLocal.dia_vencimento || 10;
                                                    
                                                    const jaVenceu = (anoAtual > anoCiclo) || 
                                                                    (anoAtual === anoCiclo && mesAtual > mesCiclo) || 
                                                                    (anoAtual === anoCiclo && mesAtual === mesCiclo && diaAtual > diaVencimento);
                                                    
                                                    const statusTexto = pag.status === 'pago' ? 'Pago' : (jaVenceu ? 'Vencido' : 'Pendente');
                                                    const statusCor = pag.status === 'pago' ? '#10b981' : (jaVenceu ? '#ef4444' : '#f59e0b');

                                                    return (
                                                        <>
                                                            <p style={{ color: statusCor, fontWeight: '700', fontSize: '0.9rem' }}>{statusTexto}</p>
                                                            <p style={{ color: '#64748b', fontSize: '0.75rem' }}>{formatarMoeda(pag.valor_configurado)}</p>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                            {!modoLeitura && (
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <button 
                                                        onClick={() => handleAlternarPagamento(pag)} 
                                                        onMouseEnter={() => setHoverBotao(pag.status === 'pago' ? 'Marcar Pendente' : 'Marcar Pago')}
                                                        onMouseLeave={() => setHoverBotao(null)}
                                                        className="btn-toggle" 
                                                        disabled={!!processando}
                                                    >{pag.status === 'pago' ? <CheckCircle2 color="#10b981" size={28} /> : <XCircle color="#f59e0b" size={28} />}</button>
                                                    <button 
                                                        onClick={() => handleRemoverDoCiclo(pag)} 
                                                        onMouseEnter={() => setHoverBotao(confirmandoExclusao === pag.id ? 'Clique p/ Confirmar' : 'Remover do Ciclo')}
                                                        onMouseLeave={() => setHoverBotao(null)}
                                                        className={`btn-excluir ${confirmandoExclusao === pag.id ? 'confirmacao-ativa' : ''}`}
                                                        disabled={!!processando || (pag.status === 'pago' && confirmandoExclusao !== pag.id)} 
                                                        style={{ opacity: (!!processando || (pag.status === 'pago' && confirmandoExclusao !== pag.id)) ? 0.3 : 1 }}
                                                    >
                                                        {processando === 'remover_' + pag.id ? <Loader2 className="animate-spin" size={20} /> : confirmandoExclusao === pag.id ? <AlertCircle color="#f43f5e" size={22} /> : <Trash2 size={20} />}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                                })()}
                            </div>
                        ) : (
                            <div style={{ padding: '60px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                <Calendar size={48} color="#475569" />
                                <div>
                                    <h3 style={{ color: '#f1f5f9', marginBottom: '8px' }}>Ciclo não iniciado</h3>
                                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '320px', margin: '0 auto 24px' }}>Inicie o ciclo para importar todos os mensalistas ativos.</p>
                                    <Botao onClick={handleInicializarCiclo} disabled={!!processando} title="Importar Mensalistas">{processando === 'inicializar' ? <Loader2 className="animate-spin" size={18} /> : '🚀 Iniciar Ciclo com Mensalistas'}</Botao>
                                    <button onClick={() => setModalImportarAberto(true)} title="Adicionar individualmente" style={{ display: 'block', margin: '16px auto 0', background: 'transparent', border: 'none', color: '#64748b', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}>Escolher atletas específicos</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </>
            )}

            {modalImportarAberto && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '450px' }}>
                        <div className="modal-header"><h2>Adicionar ao Ciclo</h2><button onClick={() => setModalImportarAberto(false)} className="btn-fechar"><X size={20} /></button></div>
                        <div className="modal-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {mensalistasDisponiveis.length === 0 ? <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>Nenhum mensalista disponível.</p> : mensalistasDisponiveis.map(m => {
                                const jaNoCiclo = mensalistasNoCiclo.has(m.usuario_id);
                                return (
                                    <div key={m.id} style={{ padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {m.usuarios?.foto_url ? (
                                                    <img src={m.usuarios.foto_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <div className="avatar-iniciais-micro">
                                                        {getIniciaisAtleta(m.usuarios)}
                                                    </div>
                                                )}
                                            </div>
                                            <span style={{ 
                                                fontSize: '0.9rem', 
                                                color: jaNoCiclo ? '#f8fafc' : '#ef4444', 
                                                fontWeight: '500' 
                                            }}>
                                                {formatName(m.usuarios?.nome_completo)}
                                            </span>
                                        </div>
                                        <button onClick={() => !jaNoCiclo && handleAdicionarAoCiclo(m)} disabled={jaNoCiclo || !!processando} style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', cursor: jaNoCiclo ? 'default' : 'pointer' }}>{jaNoCiclo ? 'No ciclo' : '+ Adicionar'}</button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .btn-icon { background: transparent; border: none; cursor: pointer; padding: 6px; border-radius: 8px; }
                .btn-icon:hover { background: rgba(255,255,255,0.05); }
                .card-financeiro { background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 16px; }
                .card-financeiro .label { color: #94a3b8; font-size: 0.8rem; }
                .card-financeiro .valor { color: #f8fafc; font-size: 1.25rem; font-weight: 700; margin-top: 4px; }
                .item-mensalidade { padding: 12px 20px; border-bottom: 1px solid rgba(255,255,255,0.02); display: flex; align-items: center; justify-content: space-between; }
                .btn-toggle { background: transparent; border: none; cursor: pointer; transition: all 0.2s ease; opacity: 0.8; }
                .btn-toggle:hover { opacity: 1; filter: brightness(1.2); }
                .btn-excluir { background: transparent; border: none; color: #64748b; cursor: pointer; padding: 6px; border-radius: 8px; transition: all 0.2s ease; }
                .btn-excluir:hover:not(:disabled) { background: rgba(244,63,94,0.1); color: #f43f5e; }
                .btn-excluir.confirmacao-ativa { background: rgba(244,63,94,0.2); color: #f43f5e; animation: pulse 1.5s infinite; }
                .campo { display: flex; flex-direction: column; gap: 6px; }
                .campo label { font-size: 0.85rem; color: #94a3b8; display: flex; align-items: center; gap: 6px; }
                .campo input { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 10px; color: #fff; outline: none; }
                .campo input:focus { border-color: #38bdf8; }
                
                .avatar-iniciais-mini {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
                    color: #fff;
                    font-size: 0.85rem;
                    font-weight: 800;
                }

                .avatar-iniciais-micro {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
                    color: #fff;
                    font-size: 0.65rem;
                    font-weight: 800;
                }
                
                .legenda-ativa { 
                    background: #38bdf8; 
                    color: #0f172a; 
                    padding: 2px 10px; 
                    border-radius: 6px; 
                    font-size: 0.7rem; 
                    font-weight: 700; 
                    text-transform: uppercase;
                }

                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animacao-entrada { animation: fadeIn 0.3s ease-out; }
            `}</style>
        </div>
    );
};

export default FinanceiroTab;
