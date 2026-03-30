import React, { useState, useEffect } from 'react';
import {
    TrendingUp, TrendingDown, DollarSign, Users, 
    CheckCircle2, AlertCircle, BarChart2, Calendar,
    ChevronDown, Loader2
} from 'lucide-react';
import { usarFinanceiro } from '../../../contextos/FinanceiroContexto';
import { usarEquipe } from '../../../contextos/EquipeContexto';

const FinanceiroDashboard = () => {
    const { buscarHistoricoCiclos, formatarPeriodoParaExibicao } = usarFinanceiro();
    const { equipeAtiva } = usarEquipe();

    const [historico, setHistorico] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [exibir, setExibir] = useState(6); // quantos ciclos exibir

    useEffect(() => {
        if (equipeAtiva?.id) {
            carregarHistorico();
        }
    }, [equipeAtiva]);

    const carregarHistorico = async () => {
        setCarregando(true);
        const dados = await buscarHistoricoCiclos(equipeAtiva.id, 12);
        setHistorico(dados);
        setCarregando(false);
    };

    const formatarMoeda = (v) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

    const formatarPorcentagem = (parte, total) =>
        total === 0 ? '0%' : `${Math.round((parte / total) * 100)}%`;

    // Métricas consolidadas (todos os ciclos)
    const totalGeral = historico.reduce((acc, c) => acc + c.valorTotal, 0);
    const totalRecebido = historico.reduce((acc, c) => acc + c.valorRecebido, 0);
    const totalPendente = totalGeral - totalRecebido;
    const taxaAdimplencia = totalGeral > 0 ? Math.round((totalRecebido / totalGeral) * 100) : 0;

    // Valor máximo para escala do gráfico
    const maxValor = Math.max(...historico.map(c => c.valorTotal), 1);

    const ciclosExibidos = [...historico].reverse().slice(-exibir);

    if (carregando) {
        return (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                <Loader2 className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
                Carregando histórico...
            </div>
        );
    }

    if (historico.length === 0) {
        return (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                <BarChart2 size={40} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
                <p>Nenhum ciclo registrado ainda.</p>
                <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>Inicie um ciclo na aba de gestão para visualizar o histórico aqui.</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* ── CARDS DE RESUMO GERAL ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <div className="dash-card-premium" style={{ borderLeft: '5px solid #10b981', background: 'linear-gradient(145deg, rgba(16,185,129,0.1) 0%, rgba(15,23,42,0.6) 100%)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <span className="dash-label">Arrecadação Total (Geral)</span>
                            <p className="dash-valor" style={{ color: '#10b981', fontSize: '1.8rem' }}>{formatarMoeda(totalRecebido)}</p>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total acumulado de todos os ciclos</span>
                        </div>
                        <div style={{ background: 'rgba(16,185,129,0.2)', padding: '12px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
                            <TrendingUp size={24} color="#10b981" />
                        </div>
                    </div>
                </div>

                <div className="dash-card-premium" style={{ borderLeft: '5px solid #f59e0b', background: 'linear-gradient(145deg, rgba(245,158,11,0.1) 0%, rgba(15,23,42,0.6) 100%)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <span className="dash-label">Montante em Aberto</span>
                            <p className="dash-valor" style={{ color: '#f59e0b', fontSize: '1.8rem' }}>{formatarMoeda(totalPendente)}</p>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Dívidas pendentes dos atletas</span>
                        </div>
                        <div style={{ background: 'rgba(245,158,11,0.2)', padding: '12px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(245,158,11,0.3)' }}>
                            <AlertCircle size={24} color="#f59e0b" />
                        </div>
                    </div>
                </div>

                <div className="dash-card-premium" style={{ borderLeft: '5px solid #38bdf8', background: 'linear-gradient(145deg, rgba(56,189,248,0.1) 0%, rgba(15,23,42,0.6) 100%)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <span className="dash-label">Índice de Adimplência</span>
                            <p className="dash-valor" style={{ color: '#38bdf8', fontSize: '1.8rem' }}>{taxaAdimplencia}%</p>
                            <div style={{ marginTop: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', height: '8px', width: '160px' }}>
                                <div style={{ width: `${taxaAdimplencia}%`, height: '100%', background: 'linear-gradient(90deg, #38bdf8, #818cf8)', borderRadius: '100px', boxShadow: '0 0 10px rgba(56,189,248,0.5)' }} />
                            </div>
                        </div>
                        <div style={{ background: 'rgba(56,189,248,0.2)', padding: '12px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(56,189,248,0.3)' }}>
                            <CheckCircle2 size={24} color="#38bdf8" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── GRÁFICO DE BARRAS ── */}
            <div className="dash-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h4 style={{ fontWeight: '600', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BarChart2 size={18} color="#38bdf8" />
                        Arrecadação por Ciclo
                    </h4>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem', color: '#64748b' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '2px', display: 'inline-block' }} /> Pago</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', background: 'rgba(245,158,11,0.3)', borderRadius: '2px', display: 'inline-block' }} /> Pendente</span>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '140px', padding: '0 4px' }}>
                    {ciclosExibidos.map(ciclo => {
                        const alturaTotal = (ciclo.valorTotal / maxValor) * 120;
                        const alturaRecebido = ciclo.valorTotal > 0 ? (ciclo.valorRecebido / ciclo.valorTotal) * alturaTotal : 0;
                        const alturaPendente = alturaTotal - alturaRecebido;

                        return (
                            <div key={ciclo.periodo} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{formatarMoeda(ciclo.valorRecebido).replace('R$\u00a0', 'R$')}</div>
                                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100px' }}>
                                    <div style={{ height: `${alturaPendente}px`, background: 'rgba(245,158,11,0.25)', borderRadius: '4px 4px 0 0', minHeight: alturaPendente > 0 ? '2px' : '0', transition: 'height 0.4s ease' }} />
                                    <div style={{ height: `${alturaRecebido}px`, background: 'linear-gradient(180deg, #10b981, rgba(16,185,129,0.6))', borderRadius: alturaRecebido === alturaTotal ? '4px 4px 0 0' : '0', minHeight: alturaRecebido > 0 ? '2px' : '0', transition: 'height 0.4s ease' }} />
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                    {formatarPeriodoParaExibicao(ciclo.periodo)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── TABELA HISTÓRICA ── */}
            <div className="dash-card">
                <h4 style={{ fontWeight: '600', color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={18} color="#38bdf8" />
                    Histórico de Ciclos
                </h4>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: '500' }}>Ciclo</th>
                                <th style={{ textAlign: 'center', padding: '8px 12px', color: '#64748b', fontWeight: '500' }}>Membros</th>
                                <th style={{ textAlign: 'center', padding: '8px 12px', color: '#64748b', fontWeight: '500' }}>Pagos</th>
                                <th style={{ textAlign: 'right', padding: '8px 12px', color: '#64748b', fontWeight: '500' }}>Recebido</th>
                                <th style={{ textAlign: 'right', padding: '8px 12px', color: '#64748b', fontWeight: '500' }}>Pendente</th>
                                <th style={{ textAlign: 'center', padding: '8px 12px', color: '#64748b', fontWeight: '500' }}>Adimpl.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historico.map(ciclo => {
                                const adimplencia = ciclo.total > 0 ? Math.round((ciclo.pagos / ciclo.total) * 100) : 0;
                                const corAdimplencia = adimplencia >= 80 ? '#10b981' : adimplencia >= 50 ? '#f59e0b' : '#f43f5e';

                                return (
                                    <tr key={ciclo.periodo} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ padding: '10px 12px', color: '#f8fafc', fontWeight: '500' }}>
                                            {formatarPeriodoParaExibicao(ciclo.periodo)}
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'center', color: '#94a3b8' }}>
                                            <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '12px' }}>{ciclo.total}</span>
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                            <span style={{ color: '#10b981' }}>{ciclo.pagos}</span>
                                            <span style={{ color: '#64748b' }}> / </span>
                                            <span style={{ color: '#f59e0b' }}>{ciclo.pendentes}</span>
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#10b981', fontWeight: '500' }}>
                                            {formatarMoeda(ciclo.valorRecebido)}
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#f59e0b' }}>
                                            {formatarMoeda(ciclo.valorTotal - ciclo.valorRecebido)}
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                            <span style={{ background: `${corAdimplencia}20`, color: corAdimplencia, padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600' }}>
                                                {adimplencia}%
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                <td style={{ padding: '10px 12px', color: '#94a3b8', fontWeight: '600' }}>Total Geral</td>
                                <td />
                                <td />
                                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#10b981', fontWeight: '700', fontSize: '1rem' }}>{formatarMoeda(totalRecebido)}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#f59e0b', fontWeight: '700' }}>{formatarMoeda(totalPendente)}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                    <span style={{ color: '#38bdf8', fontWeight: '700' }}>{taxaAdimplencia}%</span>
                                </td>
                            </tr>
                        </tfoot>
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
        </div>
    );
};

export default FinanceiroDashboard;
