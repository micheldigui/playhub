import React, { useState, useEffect } from 'react';
import { Settings, ShieldAlert, Clock, Calendar, CheckSquare, MapPin, DollarSign, Link as LinkIcon, AlertCircle, Coins, Wallet, CalendarDays, Hourglass, CreditCard, Map } from 'lucide-react';
import { usarEquipe } from '../../../../contextos/EquipeContexto';
import Botao from '../../../../componentes/Botao/Botao';

const EquipeConfiguracoesTab = () => {
    const { equipeAtiva, atualizarRegrasEquipe } = usarEquipe();
    const [regras, setRegras] = useState({
        maxStrikes: 3,
        cancelDeadlineHours: 2,
        registrationCloseHours: 1,
        registrationOpenDays: 7,
        mensalistaPriority: false,
        mensalidade: 0,
        custo_quadra: 0,
        vencimento_dia: 10,
        horas_limite_pagamento: 48,
        chave_pix: ''
    });
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        if (equipeAtiva?.regras) {
            setRegras(equipeAtiva.regras);
        }
    }, [equipeAtiva]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setRegras(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : Number(value)
        }));
    };

    const handleSalvar = async () => {
        setSalvando(true);
        const result = await atualizarRegrasEquipe(equipeAtiva.id, regras);
        setSalvando(false);
        if (result.sucesso) {
            alert('Regras da equipe atualizadas com sucesso!');
        } else {
            alert('Erro ao salvar regras: ' + result.erro);
        }
    };

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Header com botão Salvar Global */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f8fafc', marginBottom: '8px' }}>
                        Configurações Globais
                    </h2>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                        Salve todas as alterações de regras, financeiro e locais de uma só vez.
                    </p>
                </div>
                <Botao onClick={handleSalvar} disabled={salvando} style={{ padding: '12px 24px', fontSize: '15px' }}>
                    {salvando ? 'Salvando...' : 'Salvar Alterações'}
                </Botao>
            </div>

            {/* CARD 1: Regras e Restrições */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '24px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '24px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Settings size={22} color="var(--primaria)" /> Regras e Restrições da Equipe
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                    
                    {/* Limite de Punições */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#94a3b8', marginBottom: '12px', fontWeight: '600' }}>
                            <ShieldAlert size={16} color="#ef4444" /> Limite de Punições (Strikes)
                        </label>
                        <input
                            type="number"
                            name="maxStrikes"
                            value={regras.maxStrikes || ''}
                            onChange={handleChange}
                            min="0"
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', outline: 'none' }}
                        />
                        <p style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>Atletas que atingirem esse limite serão bloqueados de confirmar presença presencialmente.</p>
                    </div>

                    {/* Prazo de Cancelamento */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#94a3b8', marginBottom: '12px', fontWeight: '600' }}>
                            <Clock size={16} color="#fbbf24" /> Prazo de Cancelamento Justificado (Horas)
                        </label>
                        <input
                            type="number"
                            name="cancelDeadlineHours"
                            value={regras.cancelDeadlineHours || ''}
                            onChange={handleChange}
                            min="0"
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', outline: 'none' }}
                        />
                        <p style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>Tempo limite antes da partida para o atleta "desconfirmar" sem levar strike.</p>
                    </div>

                    {/* Fim das inscrições */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#94a3b8', marginBottom: '12px', fontWeight: '600' }}>
                            <Clock size={16} color="#10b981" /> Fechamento das Inscrições (Horas antes)
                        </label>
                        <input
                            type="number"
                            name="registrationCloseHours"
                            value={regras.registrationCloseHours || ''}
                            onChange={handleChange}
                            min="0"
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', outline: 'none' }}
                        />
                        <p style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>Antecedência com a qual as listas de presença e espera são travadas.</p>
                    </div>

                    {/* Abertura das inscrições */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#94a3b8', marginBottom: '12px', fontWeight: '600' }}>
                            <Calendar size={16} color="#38bdf8" /> Abertura das Inscrições (Dias Antes)
                        </label>
                        <input
                            type="number"
                            name="registrationOpenDays"
                            value={regras.registrationOpenDays || ''}
                            onChange={handleChange}
                            min="0"
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', outline: 'none' }}
                        />
                        <p style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>Quantos dias antes do evento a lista será liberada para marcação de presença.</p>
                    </div>

                    {/* Prioridade Mensalista */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setRegras(prev => ({ ...prev, mensalistaPriority: !prev.mensalistaPriority }))}>
                            <div
                                style={{
                                    width: '44px',
                                    height: '24px',
                                    borderRadius: '20px',
                                    background: regras.mensalistaPriority ? 'var(--primaria)' : 'rgba(255,255,255,0.1)',
                                    position: 'relative',
                                    transition: 'all 0.3s'
                                }}
                            >
                                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'white', position: 'absolute', top: '3px', left: regras.mensalistaPriority ? '23px' : '3px', transition: 'all 0.3s' }} />
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CheckSquare size={18} color={regras.mensalistaPriority ? 'var(--primaria)' : '#94a3b8'} />
                                Prioridade para Mensalistas
                            </span>
                        </div>
                        <p style={{ fontSize: '11px', color: '#64748b', marginTop: '12px' }}>
                            Se ativado, os mensalistas terão preferência de vaga quando a lista ficar cheia (fura-fila).
                        </p>
                    </div>
                </div>
            </div>

            {/* CARD 2: Financeiro */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '24px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '24px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <DollarSign size={22} color="#10b981" /> Configurações Financeiras
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                    
                    {/* Mensalidade e Custo Quadra */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#94a3b8', marginBottom: '12px', fontWeight: '600' }}>
                            <Coins size={16} color="#10b981" /> Mensalidade Per Capita
                        </label>
                        <div style={{ position: 'relative', marginBottom: '16px' }}>
                            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: '600', fontSize: '14px' }}>R$</span>
                            <input
                                type="number"
                                name="mensalidade"
                                value={regras.mensalidade || ''}
                                onChange={handleChange}
                                min="0"
                                step="0.01"
                                style={{ width: '100%', padding: '12px 12px 12px 42px', borderRadius: '8px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', outline: 'none' }}
                            />
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#94a3b8', marginBottom: '12px', fontWeight: '600' }}>
                            <Wallet size={16} color="#f59e0b" /> Custo Total da Quadra
                        </label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: '600', fontSize: '14px' }}>R$</span>
                            <input
                                type="number"
                                name="custo_quadra"
                                value={regras.custo_quadra || ''}
                                onChange={handleChange}
                                min="0"
                                step="0.01"
                                style={{ width: '100%', padding: '12px 12px 12px 42px', borderRadius: '8px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', outline: 'none' }}
                            />
                        </div>
                    </div>

                    {/* Vencimento e Limite */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#94a3b8', marginBottom: '12px', fontWeight: '600' }}>
                            <CalendarDays size={16} color="#3b82f6" /> Dia do Vencimento
                        </label>
                        <input
                            type="number"
                            name="vencimento_dia"
                            value={regras.vencimento_dia || ''}
                            onChange={handleChange}
                            min="1"
                            max="31"
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', outline: 'none', marginBottom: '16px' }}
                        />

                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#94a3b8', marginBottom: '12px', fontWeight: '600' }}>
                            <Hourglass size={16} color="#ef4444" /> Limite (Hor. antes do Vencimento)
                        </label>
                        <input
                            type="number"
                            name="horas_limite_pagamento"
                            value={regras.horas_limite_pagamento || ''}
                            onChange={handleChange}
                            min="0"
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', outline: 'none' }}
                        />
                        <p style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>Quantas horas de margem antes do <b>fim</b> do dia de vencimento o atleta tem para enviar o comprovante.</p>
                    </div>

                    {/* PIX do Gestor */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#94a3b8', marginBottom: '12px', fontWeight: '600' }}>
                            <CreditCard size={16} color="#8b5cf6" /> Chave PIX do Gestor
                        </label>
                        <input
                            type="text"
                            name="chave_pix"
                            value={regras.chave_pix || ''}
                            onChange={handleChange}
                            placeholder="Telefone, CPF, E-mail..."
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', outline: 'none' }}
                        />
                        <p style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>Essa chave será mostrada para os atletas quitarem suas mensalidades e partidas avulsas.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EquipeConfiguracoesTab;
