import React, { useState, useEffect } from 'react';
import { Settings, Edit2, Trash2, Coins, Calendar, Clock, CreditCard, Wallet, ShieldAlert, Loader2 } from 'lucide-react';
import { usarEquipe } from '../../../contextos/EquipeContexto';
import { usarFinanceiro } from '../../../contextos/FinanceiroContexto';
import { usarAutenticacao } from '../../../contextos/AutenticacaoContexto';
import Botao from '../../../componentes/Botao/Botao';

const RegrasTab = ({ abrirEdicao, aoExcluir }) => {
    const { equipeAtiva, atualizarRegrasEquipe, temPermissaoEquipe } = usarEquipe();
    const { carregarConfiguracao, salvarConfiguracao } = usarFinanceiro();
    const { ehSuperAdmin, usuario } = usarAutenticacao();

    const [processando, setProcessando] = useState(null);
    const [configLocal, setConfigLocal] = useState({
        valor_mensalidade: 50,
        dia_vencimento: 10,
        dia_tolerancia: 15,
        custo_quadra: 0,
        limite_vencimento_horas: 24,
        chave_pix: ''
    });

    useEffect(() => {
        if (equipeAtiva?.id) {
            const carregar = async () => {
                const cfg = await carregarConfiguracao(equipeAtiva.id);
                if (cfg) {
                    setConfigLocal({
                        valor_mensalidade: cfg.valor_mensalidade || 50,
                        dia_vencimento: cfg.dia_vencimento || 10,
                        dia_tolerancia: cfg.dia_tolerancia || 15,
                        custo_quadra: cfg.custo_quadra || 0,
                        limite_vencimento_horas: cfg.limite_vencimento_horas || 24,
                        chave_pix: cfg.chave_pix || ''
                    });
                }
            };
            carregar();
        }
    }, [equipeAtiva?.id]);

    const handleSalvarRegras = async () => {
        setProcessando('salvando');
        try {
            // 1. Salva no financeiro_config
            const resFin = await salvarConfiguracao({
                equipe_id: equipeAtiva.id,
                ...configLocal
            });
            if (!resFin.success) throw new Error(resFin.error);

            // 2. Salva nas regras da equipe (JSONB)
            await atualizarRegrasEquipe(equipeAtiva.id, {
                ...equipeAtiva.regras,
                mensalidade: Number(configLocal.valor_mensalidade),
                vencimento_dia: Number(configLocal.dia_vencimento),
                horas_limite_pagamento: Number(configLocal.limite_vencimento_horas),
                custo_quadra: Number(configLocal.custo_quadra),
                chave_pix: configLocal.chave_pix
            });

            alert('Regras e configurações salvas com sucesso!');
        } catch (error) {
            alert('Erro ao salvar: ' + error.message);
        } finally {
            setProcessando(null);
        }
    };
    const ehDono = equipeAtiva.admin_id === usuario?.id || ehSuperAdmin;
    const podeEditar = ehDono || temPermissaoEquipe('gerenciar_equipe');

    return (
        <div className="animate-fade-in" style={{ padding: '0 1rem' }}>
            <header style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.6rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Settings size={28} color="var(--primaria)" /> Regras & Configurações
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Ajuste o funcionamento do time e os parâmetros financeiros.</p>
            </header>

            <div className="regras-grade" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                
                {/* ── CARD: DADOS DA EQUIPE ── */}
                <section style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ fontSize: '1.1rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <Edit2 size={18} color="#38bdf8" /> Informações Básicas
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '20px' }}>
                        Altere o nome, escudo, localização e visibilidade pública da sua equipe.
                    </p>
                    {podeEditar && (
                        <Botao onClick={abrirEdicao} style={{ width: '100%' }}>Editar Dados da Equipe</Botao>
                    )}
                </section>

                {/* ── CARD: REGRAS FINANCEIRAS ── */}
                <section style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '24px', gridRow: 'span 2' }}>
                    <h3 style={{ fontSize: '1.1rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <Coins size={18} color="#10b981" /> Parâmetros Financeiros
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="input-regras">
                            <label><Wallet size={14} /> Valor da Mensalidade (R$)</label>
                            <input disabled={!podeEditar} type="number" value={configLocal.valor_mensalidade} onChange={e => setConfigLocal({...configLocal, valor_mensalidade: e.target.value})} />
                        </div>
                        <div className="input-regras">
                            <label><Coins size={14} /> Custo por Partida (Sede/Quadra)</label>
                            <input disabled={!podeEditar} type="number" value={configLocal.custo_quadra} onChange={e => setConfigLocal({...configLocal, custo_quadra: e.target.value})} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div className="input-regras">
                                <label><Calendar size={14} /> Dia Vencimento</label>
                                <input disabled={!podeEditar} type="number" value={configLocal.dia_vencimento} onChange={e => setConfigLocal({...configLocal, dia_vencimento: e.target.value})} />
                            </div>
                            <div className="input-regras">
                                <label><Clock size={14} /> Horas de Limite</label>
                                <input disabled={!podeEditar} type="number" value={configLocal.limite_vencimento_horas} onChange={e => setConfigLocal({...configLocal, limite_vencimento_horas: e.target.value})} />
                            </div>
                        </div>
                        <div className="input-regras">
                            <label><CreditCard size={14} /> Chave PIX p/ Recebimento</label>
                            <input disabled={!podeEditar} type="text" value={configLocal.chave_pix} onChange={e => setConfigLocal({...configLocal, chave_pix: e.target.value})} placeholder="E-mail, CPF, Celuar..." />
                        </div>
                        
                        {podeEditar && (
                            <Botao 
                                onClick={handleSalvarRegras} 
                                disabled={!!processando} 
                                style={{ marginTop: '10px' }}
                            >
                                {processando === 'salvando' ? <Loader2 className="animate-spin" size={18} /> : 'Salvar Regras'}
                            </Botao>
                        )}
                    </div>
                </section>

                {/* ── CARD: PERIGO ── */}
                {ehDono && (
                    <section style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '16px', padding: '24px' }}>
                        <h3 style={{ fontSize: '1.1rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <ShieldAlert size={18} /> Zona de Perigo
                        </h3>
                        <p style={{ color: '#f87171', fontSize: '0.8rem', marginBottom: '20px' }}>
                            Ao excluir a equipe, todos os dados de partidas, financeiro e membros serão removidos permanentemente.
                        </p>
                        <Botao variant="secundario" onClick={aoExcluir} style={{ width: '100%', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                            Excluir Equipe Permanentemente
                        </Botao>
                    </section>
                )}
            </div>

            <style>{`
                .input-regras { display: flex; flex-direction: column; gap: 6px; }
                .input-regras label { font-size: 0.8rem; color: #94a3b8; display: flex; align-items: center; gap: 6px; }
                .input-regras input { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 10px; color: white; outline: none; transition: border-color 0.2s; }
                .input-regras input:focus { border-color: #38bdf8; }
            `}</style>
        </div>
    );
};

export default RegrasTab;
