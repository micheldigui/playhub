import React, { useState, useEffect } from 'react';
import {
    TrendingUp, AlertCircle, BarChart2, Calendar,
    Loader2, Users, CheckCircle2, Trophy, Activity, ChevronLeft, ChevronRight
} from 'lucide-react';
import { usarFinanceiro } from '../../../contextos/FinanceiroContexto';
import { usarEquipe } from '../../../contextos/EquipeContexto';
import { supabase } from '../../../servicos/supabase';

// ── Componente de Histórico de Presenças (independente do módulo financeiro) ──
const HistoricoPresencas = ({ equipeId }) => {
    const [partidas, setPartidas] = useState([]);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        if (!equipeId) return;
        const carregar = async () => {
            setCarregando(true);
            try {
                // Busca as últimas 20 partidas com suas presenças
                const { data: partidasData, error } = await supabase
                    .from('partidas')
                    .select(`
                        id, data, hora, local_nome,
                        partidas_presencas (
                            frequencia,
                            usuarios ( id, nome_completo, foto_url )
                        )
                    `)
                    .eq('equipe_id', equipeId)
                    .order('data', { ascending: false })
                    .limit(20);

                if (error) throw error;

                setPartidas(partidasData || []);
            } catch (err) {
                console.error('Erro ao carregar histórico de presenças:', err);
            } finally {
                setCarregando(false);
            }
        };
        carregar();
    }, [equipeId]);

    if (carregando) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                <Loader2 className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
                Carregando presenças...
            </div>
        );
    }

    if (partidas.length === 0) {
        return (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                <Calendar size={40} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
                <p>Nenhuma partida registrada ainda.</p>
            </div>
        );
    }

    // Calcula ranking de frequência por jogador
    const rankingMap = {};
    partidas.forEach(partida => {
        (partida.partidas_presencas || []).forEach(p => {
            if (!p.usuarios) return;
            const uid = p.usuarios.id;
            if (!rankingMap[uid]) {
                rankingMap[uid] = {
                    id: uid,
                    nome: p.usuarios.nome_completo,
                    foto: p.usuarios.foto_url,
                    presencas: 0,
                    faltas: 0,
                    total: 0,
                };
            }
            rankingMap[uid].total++;
            if (p.frequencia === 'P') rankingMap[uid].presencas++;
            else if (p.frequencia === 'F') rankingMap[uid].faltas++;
        });
    });

    const ranking = Object.values(rankingMap)
        .sort((a, b) => b.presencas - a.presencas);

    const maxPresencas = Math.max(...ranking.map(r => r.presencas), 1);

    const formatarData = (data) => new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    
    const formatarNomeCurto = (nomeCompleto) => {
        if (!nomeCompleto) return 'Desconhecido';
        const partes = nomeCompleto.trim().split(' ');
        const primeiro = partes[0].charAt(0).toUpperCase() + partes[0].slice(1).toLowerCase();
        if (partes.length === 1) return primeiro;
        const ultimo = partes[partes.length - 1];
        return `${primeiro} ${ultimo.charAt(0).toUpperCase()}.`;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header */}
            <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ background: 'rgba(56,189,248,0.1)', padding: '10px', borderRadius: '12px' }}>
                        <Activity size={22} color="#38bdf8" />
                    </div>
                    <div>
                        <h3 style={{ color: '#f8fafc', fontWeight: '700', fontSize: '1.1rem' }}>Histórico de Presenças</h3>
                        <p style={{ color: '#64748b', fontSize: '0.85rem' }}>{partidas.length} partida(s) registrada(s)</p>
                    </div>
                </div>

                {/* Cards de resumo */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                    <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#10b981' }}>{partidas.length}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Partidas</div>
                    </div>
                    <div style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#38bdf8' }}>{ranking.length}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Atletas</div>
                    </div>
                    <div style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.15)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#a855f7' }}>
                            {ranking.length > 0 ? Math.round(ranking.reduce((a, r) => a + r.presencas, 0) / ranking.length) : 0}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Média P/Jogador</div>
                    </div>
                </div>
            </div>

            {/* Ranking de frequência */}
            <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px' }}>
                <h4 style={{ color: '#f8fafc', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Trophy size={18} color="#fbbf24" /> Ranking de Frequência
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {ranking.map((jogador, index) => {
                        const taxa = jogador.total > 0 ? Math.round((jogador.presencas / jogador.total) * 100) : 0;
                        const corMedal = index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : '#475569';
                        const largura = maxPresencas > 0 ? (jogador.presencas / maxPresencas) * 100 : 0;
                        return (
                            <div key={jogador.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ width: '24px', textAlign: 'center', fontSize: '0.85rem', fontWeight: '700', color: corMedal, flexShrink: 0 }}>
                                    {index + 1}
                                </span>
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', overflow: 'hidden', flexShrink: 0 }}>
                                    {jogador.foto
                                        ? <img src={jogador.foto} alt={jogador.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : <Users size={16} style={{ margin: '10px', color: '#475569' }} />}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ color: '#f1f5f9', fontSize: '0.875rem', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {formatarNomeCurto(jogador.nome)}
                                        </span>
                                        <span style={{ color: '#94a3b8', fontSize: '0.75rem', flexShrink: 0, marginLeft: '8px' }}>
                                            {jogador.presencas}P / {jogador.faltas}F
                                            <span style={{ color: taxa >= 70 ? '#10b981' : taxa >= 40 ? '#f59e0b' : '#f43f5e', marginLeft: '6px', fontWeight: '600' }}>
                                                {taxa}%
                                            </span>
                                        </span>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '100px', height: '5px' }}>
                                        <div style={{ width: `${largura}%`, height: '100%', background: taxa >= 70 ? 'linear-gradient(90deg,#10b981,#34d399)' : taxa >= 40 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#f43f5e,#fb7185)', borderRadius: '100px', transition: 'width 0.5s ease' }} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Últimas partidas */}
            <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px' }}>
                <h4 style={{ color: '#f8fafc', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={18} color="#38bdf8" /> Últimas Partidas
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {partidas.slice(0, 10).map(partida => {
                        const confirmados = (partida.partidas_presencas || []).filter(p => p.frequencia === 'P').length;
                        const faltaram = (partida.partidas_presencas || []).filter(p => p.frequencia === 'F').length;
                        const total = (partida.partidas_presencas || []).length;
                        return (
                            <div key={partida.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                <div style={{ background: 'rgba(56,189,248,0.1)', padding: '8px 12px', borderRadius: '8px', textAlign: 'center', flexShrink: 0 }}>
                                    <div style={{ color: '#38bdf8', fontSize: '0.75rem', fontWeight: '700' }}>{formatarData(partida.data)}</div>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ color: '#f1f5f9', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {partida.local_nome || 'Local não informado'}
                                    </div>
                                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{total} inscrito(s)</div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                    <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '3px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '600' }}>✓ {confirmados}</span>
                                    {faltaram > 0 && <span style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e', padding: '3px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '600' }}>✗ {faltaram}</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const FinanceiroDashboard = () => {
    const { buscarHistoricoCiclos, formatarPeriodoParaExibicao } = usarFinanceiro();
    const { equipeAtiva } = usarEquipe();

    const [historicoGlobal, setHistoricoGlobal] = useState([]);
    const [ciclosDisponiveis, setCiclosDisponiveis] = useState([]);
    const [indiceCicloAtivo, setIndiceCicloAtivo] = useState(0);

    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        if (equipeAtiva?.id) {
            carregarHistoricoGlobal();
        }
    }, [equipeAtiva]);

    const carregarHistoricoGlobal = async () => {
        setCarregando(true);
        // MENSALIDADES
        const dadosMensal = await buscarHistoricoCiclos(equipeAtiva.id, 24); 

        // AVULSOS (cruza com datas da pelada pra encaixar no mês exato)
        let dadosAvulsos = {};
        try {
            const { data, error } = await supabase
                .from('pagamentos_avulsos')
                .select('valor_pago, status, partidas(data)')
                .eq('equipe_id', equipeAtiva.id);
                
            if (!error && data) {
                data.forEach(p => {
                    const dataPartida = p.partidas?.data; 
                    if (dataPartida) {
                        const [ano, mes] = dataPartida.split('-');
                        const periodo = `${ano}-${mes}`;
                        
                        const val = Number(p.valor_pago) || Number(equipeAtiva.regras?.valor_avulso) || 0;
                        if (!dadosAvulsos[periodo]) {
                           dadosAvulsos[periodo] = { pagos: 0, pendentes: 0, total_valor: 0 };
                        }
                        
                        dadosAvulsos[periodo].total_valor += val;
                        if (p.status === 'pago') dadosAvulsos[periodo].pagos += val;
                        else dadosAvulsos[periodo].pendentes += val;
                    }
                });
            }
        } catch(err) {
            console.error('Erro avulsos', err);
        }

        // Criar chaves cronológicas blindadas contra buracos
        const todosPeriodosSet = new Set([
            ...(dadosMensal || []).map(m => m.periodo),
            ...Object.keys(dadosAvulsos)
        ]);
        
        let periodosOrdenados = Array.from(todosPeriodosSet).sort((a,b) => b.localeCompare(a));
        if (periodosOrdenados.length === 0) {
            const h = new Date();
            periodosOrdenados = [`${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}`];
        }

        // Fundir dados temporais
        const unificado = periodosOrdenados.map(p => {
            const mr = (dadosMensal || []).find(d => d.periodo === p) || { total: 0, pagos: 0, pendentes: 0, valorTotal: 0, valorRecebido: 0 };
            const ar = dadosAvulsos[p] || { pagos: 0, pendentes: 0, total_valor: 0 };
            return {
               periodo: p,
               mensalistas: mr,
               avulsos: ar,
               absoluto_total: mr.valorTotal + ar.total_valor,
               absoluto_recebido: mr.valorRecebido + ar.pagos,
               absoluto_pendente: (mr.valorTotal - mr.valorRecebido) + ar.pendentes
            };
        });

        setHistoricoGlobal(unificado);
        setCiclosDisponiveis(periodosOrdenados);
        setIndiceCicloAtivo(0);
        setCarregando(false);
    };

    const navegarCiclo = (direcao) => {
        const novoIndice = indiceCicloAtivo + direcao;
        if(novoIndice >= 0 && novoIndice < ciclosDisponiveis.length) {
            setIndiceCicloAtivo(novoIndice);
        }
    };

    const formatarMoeda = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

    if (carregando) {
        return (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                <Loader2 className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
                Carregando relatório temporal bi-focal...
            </div>
        );
    }

    if (historicoGlobal.length === 0) {
        return ( <HistoricoPresencas equipeId={equipeAtiva?.id} /> );
    }

    const cicloCorrente = historicoGlobal[indiceCicloAtivo] || historicoGlobal[0];
    const taxaAdimplenciaCiclo = cicloCorrente.absoluto_total > 0 
        ? Math.round((cicloCorrente.absoluto_recebido / cicloCorrente.absoluto_total) * 100) : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* SELETOR UI */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15,23,42,0.6)', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <button disabled={indiceCicloAtivo >= ciclosDisponiveis.length - 1} onClick={() => navegarCiclo(1)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: indiceCicloAtivo >= ciclosDisponiveis.length - 1 ? 'rgba(255,255,255,0.1)' : '#f8fafc', padding: '8px', borderRadius: '8px', cursor: indiceCicloAtivo >= ciclosDisponiveis.length - 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}>
                    <ChevronLeft size={20} />
                </button>
                <div style={{ textAlign: 'center' }}>
                    <h3 style={{ color: '#f8fafc', fontWeight: '700', fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                        <Calendar size={18} color="#38bdf8" /> 
                        Ciclo Corrente: {formatarPeriodoParaExibicao(cicloCorrente.periodo)}
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Métrica de arrecadação baseada neste ciclo exato</span>
                </div>
                <button disabled={indiceCicloAtivo <= 0} onClick={() => navegarCiclo(-1)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: indiceCicloAtivo <= 0 ? 'rgba(255,255,255,0.1)' : '#f8fafc', padding: '8px', borderRadius: '8px', cursor: indiceCicloAtivo <= 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}>
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* CARDS FOCADOS NO MES VIGENTE */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <div className="dash-card-premium" style={{ borderLeft: '5px solid #10b981', background: 'linear-gradient(145deg, rgba(16,185,129,0.1) 0%, rgba(15,23,42,0.6) 100%)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <span className="dash-label">Arrecadação Total do Ciclo</span>
                            <p className="dash-valor" style={{ color: '#10b981', fontSize: '1.8rem', marginBottom: '8px' }}>{formatarMoeda(cicloCorrente.absoluto_recebido)}</p>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#38bdf8' }} /> Mensalistas: <strong style={{ color: '#e2e8f0' }}>{formatarMoeda(cicloCorrente.mensalistas.valorRecebido)}</strong></span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} /> Jogos Avulsos: <strong style={{ color: '#e2e8f0' }}>{formatarMoeda(cicloCorrente.avulsos.pagos)}</strong></span>
                            </div>
                        </div>
                        <div style={{ background: 'rgba(16,185,129,0.2)', padding: '12px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
                            <TrendingUp size={24} color="#10b981" />
                        </div>
                    </div>
                </div>

                <div className="dash-card-premium" style={{ borderLeft: '5px solid #ef4444', background: 'linear-gradient(145deg, rgba(239,68,68,0.1) 0%, rgba(15,23,42,0.6) 100%)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <span className="dash-label" style={{ color: '#fca5a5' }}>Montante em Aberto ({formatarPeriodoParaExibicao(cicloCorrente.periodo)})</span>
                            <p className="dash-valor" style={{ color: '#ef4444', fontSize: '1.8rem', marginBottom: '8px' }}>
                                {cicloCorrente.absoluto_pendente > 0 ? `- ${formatarMoeda(cicloCorrente.absoluto_pendente)}` : formatarMoeda(0)}
                            </p>
                            <div style={{ fontSize: '0.75rem', color: '#fca5a5', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span>Mensalidades: <strong style={{ color: '#e2e8f0' }}>{formatarMoeda(cicloCorrente.mensalistas.valorTotal - cicloCorrente.mensalistas.valorRecebido)}</strong></span>
                                <span>Dívidas Avulsos: <strong style={{ color: '#e2e8f0' }}>{formatarMoeda(cicloCorrente.avulsos.pendentes)}</strong></span>
                            </div>
                        </div>
                        <div style={{ background: 'rgba(239,68,68,0.2)', padding: '12px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }}>
                            <AlertCircle size={24} color="#ef4444" />
                        </div>
                    </div>
                </div>

                <div className="dash-card-premium" style={{ borderLeft: '5px solid #38bdf8', background: 'linear-gradient(145deg, rgba(56,189,248,0.1) 0%, rgba(15,23,42,0.6) 100%)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <span className="dash-label">Saúde do Ciclo (Adimplência)</span>
                            <p className="dash-valor" style={{ color: '#38bdf8', fontSize: '1.8rem' }}>{taxaAdimplenciaCiclo}%</p>
                            <div style={{ marginTop: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', height: '8px', width: '160px' }}>
                                <div style={{ width: `${taxaAdimplenciaCiclo}%`, height: '100%', background: 'linear-gradient(90deg, #38bdf8, #818cf8)', borderRadius: '100px', boxShadow: '0 0 10px rgba(56,189,248,0.5)' }} />
                            </div>
                        </div>
                        <div style={{ background: 'rgba(56,189,248,0.2)', padding: '12px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(56,189,248,0.3)' }}>
                            <CheckCircle2 size={24} color="#38bdf8" />
                        </div>
                    </div>
                </div>
            </div>

            {/* TABELA DE BI-REGIONAL (Avulsos e Mensais por Ciclo) */}
            <div className="dash-card">
                <h4 style={{ fontWeight: '600', color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={18} color="#38bdf8" />
                    Histórico Expandido Bi-Regional
                </h4>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: '500' }}>Ciclo (Período)</th>
                                <th style={{ textAlign: 'center', padding: '8px 12px', color: '#64748b', fontWeight: '500' }}>Status Clientes</th>
                                <th style={{ textAlign: 'right', padding: '8px 12px', color: '#64748b', fontWeight: '500' }}>Recebido (R$)</th>
                                <th style={{ textAlign: 'right', padding: '8px 12px', color: '#64748b', fontWeight: '500' }}>Em Aberto (R$)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historicoGlobal.map(c => {
                                const mTotalPendente = c.mensalistas.valorTotal - c.mensalistas.valorRecebido;
                                return (
                                    <tr key={c.periodo} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s', background: cicloCorrente.periodo === c.periodo ? 'rgba(56,189,248,0.05)' : 'transparent' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                                        onMouseLeave={e => e.currentTarget.style.background = cicloCorrente.periodo === c.periodo ? 'rgba(56,189,248,0.05)' : 'transparent'}>
                                        <td style={{ padding: '10px 12px', color: cicloCorrente.periodo === c.periodo ? '#38bdf8' : '#f8fafc', fontWeight: '800', verticalAlign: 'top' }}>
                                            {formatarPeriodoParaExibicao(c.periodo)}
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'center', color: '#94a3b8', verticalAlign: 'top' }}>
                                            <span style={{ fontSize: '0.75rem', display:'block', marginBottom: '2px' }}>Fiéis: {c.mensalistas.total}</span>
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right', verticalAlign: 'top' }}>
                                            <div style={{ color: '#10b981', fontWeight: '600', marginBottom: '4px' }}>Bruto: {formatarMoeda(c.absoluto_recebido)}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Mensais: <strong style={{ color: '#94a3b8' }}>{formatarMoeda(c.mensalistas.valorRecebido)}</strong></div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Avulsos: <strong style={{ color: '#94a3b8' }}>{formatarMoeda(c.avulsos.pagos)}</strong></div>
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right', verticalAlign: 'top' }}>
                                            <div style={{ color: c.absoluto_pendente > 0 ? '#ef4444' : '#64748b', fontWeight: '600', marginBottom: '4px' }}>
                                                {c.absoluto_pendente > 0 ? `- ${formatarMoeda(c.absoluto_pendente)}` : formatarMoeda(0)}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Mensais: <strong style={{ color: '#fca5a5' }}>{formatarMoeda(mTotalPendente)}</strong></div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Avulsos: <strong style={{ color: '#fca5a5' }}>{formatarMoeda(c.avulsos.pendentes)}</strong></div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
                .dash-card {
                    background: rgba(15,23,42,0.6);
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 16px;
                    padding: 20px;
                }
                .dash-card-premium {
                    background: rgba(15,23,42,0.8);
                    border: 1px solid rgba(255,255,255,0.07);
                    border-radius: 20px;
                    padding: 24px;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                }
                .dash-card-premium:hover {
                    transform: translateY(-5px);
                    border-color: rgba(255,255,255,0.12);
                    box-shadow: 0 12px 24px rgba(0,0,0,0.4);
                }
                .dash-label {
                    color: #94a3b8;
                    font-size: 0.85rem;
                    display: block;
                    margin-bottom: 6px;
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 0.02em;
                }
                .dash-valor {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin: 0;
                }
            `}</style>

            {/* ── HISTÓRICO DE PRESENÇAS (sempre exibido junto ao financeiro) ── */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0' }}>
                <HistoricoPresencas equipeId={equipeAtiva?.id} />
            </div>
        </div>
    );
};

export default FinanceiroDashboard;
