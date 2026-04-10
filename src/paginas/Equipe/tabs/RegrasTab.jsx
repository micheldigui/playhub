import React, { useState, useEffect } from 'react';
import { Settings, Edit2, Trash2, Coins, Calendar, Clock, CreditCard, Wallet, ShieldAlert, Loader2 } from 'lucide-react';
import { usarEquipe } from '../../../contextos/EquipeContexto';
import { usarFinanceiro } from '../../../contextos/FinanceiroContexto';
import { usarAutenticacao } from '../../../contextos/AutenticacaoContexto';
import { rastrear } from '../../../servicos/rastreamento';
import Botao from '../../../componentes/Botao/Botao';

const RegrasTab = ({ abrirEdicao, aoExcluir }) => {
    const { 
        equipeAtiva, 
        atualizarRegrasEquipe, 
        atualizarConfiguracoesEquipe,
        temPermissaoEquipe 
    } = usarEquipe();
    const { carregarConfiguracao, salvarConfiguracao } = usarFinanceiro();
    const { ehSuperAdmin, usuario } = usarAutenticacao();

    const [processando, setProcessando] = useState(null);
    const [configLocal, setConfigLocal] = useState({
        valor_mensalidade: 50,
        dia_vencimento: 10,
        dia_tolerancia: 15,
        custo_quadra: 0,
        limite_vencimento_horas: 24,
        chave_pix: '',
        suspenso_amarelos: 3,
        horas_limite_cancelamento: 24,
        horas_limite_inscricao: 2,
        dias_abertura_inscricao: 7,
        prioridade_mensalista: true
    });

    useEffect(() => {
        if (equipeAtiva?.id) {
            const carregar = async () => {
                const cfg = await carregarConfiguracao(equipeAtiva.id);
                if (cfg) {
                    setConfigLocal({
                        valor_mensalidade: (cfg.valor_mensalidade !== 50 && cfg.valor_mensalidade !== 0) ? cfg.valor_mensalidade : (equipeAtiva.regras?.mensalidade || cfg.valor_mensalidade || 50),
                        dia_vencimento: (cfg.dia_vencimento !== 10) ? cfg.dia_vencimento : (equipeAtiva.regras?.vencimento_dia || 10),
                        dia_tolerancia: cfg.dia_tolerancia || 15,
                        custo_quadra: cfg.custo_quadra ? cfg.custo_quadra : (equipeAtiva.regras?.custo_quadra || 0),
                        limite_vencimento_horas: cfg.limite_vencimento_horas !== 24 ? cfg.limite_vencimento_horas : (equipeAtiva.regras?.horas_limite_pagamento || 24),
                        chave_pix: cfg.chave_pix ? cfg.chave_pix : (equipeAtiva.regras?.chave_pix || ''),
                        suspenso_amarelos: equipeAtiva.regras?.suspenso_amarelos || 3,
                        horas_limite_cancelamento: equipeAtiva.regras?.horas_limite_cancelamento || 24,
                        horas_limite_inscricao: equipeAtiva.regras?.horas_limite_inscricao || 2,
                        dias_abertura_inscricao: equipeAtiva.regras?.dias_abertura_inscricao || 7,
                        prioridade_mensalista: equipeAtiva.regras?.prioridade_mensalista !== undefined ? equipeAtiva.regras.prioridade_mensalista : true
                    });
                }
            };
            carregar();
        }
    }, [equipeAtiva?.id]);

    const handleSalvarRegras = async () => {
        setProcessando('salvando');
        try {
            const ehOutroTime = equipeAtiva && equipeAtiva.admin_id !== usuario?.id;
            const necessitaBypass = ehSuperAdmin && ehOutroTime;

            // 1. Salva no financeiro_config
            const resFin = await salvarConfiguracao({
                equipe_id: equipeAtiva.id,
                valor_mensalidade: configLocal.valor_mensalidade,
                dia_vencimento: configLocal.dia_vencimento,
                dia_tolerancia: configLocal.dia_tolerancia,
                custo_quadra: configLocal.custo_quadra,
                limite_vencimento_horas: configLocal.limite_vencimento_horas,
                chave_pix: configLocal.chave_pix
            }, necessitaBypass);
            if (!resFin.success) throw new Error(resFin.error);

            // 2. Salva nas regras da equipe (JSONB)
            await atualizarRegrasEquipe(equipeAtiva.id, {
                ...equipeAtiva.regras,
                mensalidade: Number(configLocal.valor_mensalidade),
                vencimento_dia: Number(configLocal.dia_vencimento),
                horas_limite_pagamento: Number(configLocal.limite_vencimento_horas),
                custo_quadra: Number(configLocal.custo_quadra),
                chave_pix: configLocal.chave_pix,
                suspenso_amarelos: Number(configLocal.suspenso_amarelos),
                horas_limite_cancelamento: Number(configLocal.horas_limite_cancelamento),
                horas_limite_inscricao: Number(configLocal.horas_limite_inscricao),
                dias_abertura_inscricao: Number(configLocal.dias_abertura_inscricao),
                prioridade_mensalista: configLocal.prioridade_mensalista
            });

            rastrear.clique('equipe_alterou_regras', 'Capitao personalizou as regras de operacao do clube local');
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

                {/* ── CARD: CONFIGURAÇÕES DE MÓDULOS ── */}
                <section style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ fontSize: '1.1rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <Settings size={18} color="var(--primaria)" /> Módulos & Recrutamento
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="item-toggle-regras" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <div style={{ flex: 1 }}>
                                <strong style={{ color: '#f1f5f9', fontSize: '0.9rem', display: 'block', marginBottom: '4px' }}>Módulo Financeiro</strong>
                                <p style={{ color: '#94a3b8', fontSize: '0.75rem', lineHeight: '1.3' }}>Habilita Mensalidades, Rateio e Caixa na barra lateral.</p>
                            </div>
                            <label className="switch-regras">
                                <input 
                                    type="checkbox" 
                                    checked={equipeAtiva.gestao_financeira} 
                                    onChange={(e) => atualizarConfiguracoesEquipe(equipeAtiva.id, { gestao_financeira: e.target.checked })}
                                    disabled={!podeEditar}
                                />
                                <span className="slider-regras"></span>
                            </label>
                        </div>

                        <div className="item-toggle-regras" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <strong style={{ color: '#f1f5f9', fontSize: '0.9rem', display: 'block', marginBottom: '4px' }}>Aceitando Membros</strong>
                                <p style={{ color: '#94a3b8', fontSize: '0.75rem', lineHeight: '1.3' }}>Permite que novos atletas solicitem ingresso no time.</p>
                            </div>
                            <label className="switch-regras">
                                <input 
                                    type="checkbox" 
                                    checked={equipeAtiva.aceitando_membros} 
                                    onChange={(e) => atualizarConfiguracoesEquipe(equipeAtiva.id, { aceitando_membros: e.target.checked })}
                                    disabled={!podeEditar}
                                />
                                <span className="slider-regras"></span>
                            </label>
                        </div>
                    </div>
                </section>
                
                {/* ── CARD: REGRAS DE JOGO ── */}
                <section style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ fontSize: '1.1rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <ShieldAlert size={18} color="#f43f5e" /> Regras de Jogo & Puncionamento
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="input-regras">
                            <label>Suspensão por Amarelos (Qtd)</label>
                            <input disabled={!podeEditar} type="number" value={configLocal.suspenso_amarelos} onChange={e => setConfigLocal({...configLocal, suspenso_amarelos: e.target.value})} />
                        </div>

                        <div className="item-toggle-regras" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <strong style={{ color: '#f1f5f9', fontSize: '0.9rem', display: 'block', marginBottom: '4px' }}>
                                    {equipeAtiva.gestao_financeira ? 'Prioridade Mensalista' : 'Prioridade Jogadores Fixos'}
                                </strong>
                                <p style={{ color: '#94a3b8', fontSize: '0.75rem', lineHeight: '1.3' }}>
                                    {equipeAtiva.gestao_financeira 
                                        ? 'Dá prioridade na lista de confirmados para quem paga mensalidade.'
                                        : 'Dá prioridade na lista de confirmados para os jogadores definidos como fixos.'}
                                </p>
                            </div>
                            <label className="switch-regras">
                                <input 
                                    type="checkbox" 
                                    checked={configLocal.prioridade_mensalista} 
                                    onChange={(e) => setConfigLocal({...configLocal, prioridade_mensalista: e.target.checked})}
                                    disabled={!podeEditar}
                                />
                                <span className="slider-regras"></span>
                            </label>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div className="input-regras">
                                <label><Clock size={14} /> Limite Cancelar (h)</label>
                                <input disabled={!podeEditar} type="number" value={configLocal.horas_limite_cancelamento} onChange={e => setConfigLocal({...configLocal, horas_limite_cancelamento: e.target.value})} />
                            </div>
                            <div className="input-regras">
                                <label><Clock size={14} /> Fecha Inscrição (h)</label>
                                <input disabled={!podeEditar} type="number" value={configLocal.horas_limite_inscricao} onChange={e => setConfigLocal({...configLocal, horas_limite_inscricao: e.target.value})} />
                            </div>
                        </div>
                        <div className="input-regras">
                            <label><Calendar size={14} /> Abre Inscrição (Dias antes do jogo)</label>
                            <input disabled={!podeEditar} type="number" value={configLocal.dias_abertura_inscricao} onChange={e => setConfigLocal({...configLocal, dias_abertura_inscricao: e.target.value})} />
                        </div>
                        
                        {podeEditar && (
                            <Botao 
                                onClick={handleSalvarRegras} 
                                disabled={!!processando} 
                                style={{ marginTop: '10px', width: '100%' }}
                            >
                                {processando === 'salvando' ? <Loader2 className="animate-spin" size={18} /> : 'Salvar Configurações do Jogo'}
                            </Botao>
                        )}
                    </div>
                </section>

                {/* ── CARD: REGRAS FINANCEIRAS ── */}
                {equipeAtiva.gestao_financeira && (
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
                                    style={{ marginTop: '10px', width: '100%' }}
                                >
                                    {processando === 'salvando' ? <Loader2 className="animate-spin" size={18} /> : 'Salvar Financeiro'}
                                </Botao>
                            )}
                        </div>
                    </section>
                )}

                {/* ── CARD: PERIGO ── */}
                {ehDono && (
                    <section style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '16px', padding: '24px' }}>
                        <h3 style={{ fontSize: '1.1rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <ShieldAlert size={18} /> Zona de Perigo
                        </h3>
                        <p style={{ color: '#f87171', fontSize: '0.8rem', marginBottom: '20px' }}>
                            Ao excluir a equipe, todos os dados de partidas, financeiro e membros serão removidos permanentemente.
                        </p>
                        <Botao 
                            variant="secundario" 
                            onClick={() => {
                                rastrear.clique('equipe_solicitou_exclusao', 'Iniciou fluxo agressivo de fechamento total (churn)');
                                aoExcluir();
                            }} 
                            style={{ width: '100%', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                        >
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

                /* Switch Estilo iPhone/Moderno para RegrasTab */
                .switch-regras { position: relative; display: inline-block; width: 44px; height: 22px; flex-shrink: 0; }
                .switch-regras input { opacity: 0; width: 0; height: 0; }
                .slider-regras { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #334155; transition: .4s; border-radius: 34px; }
                .slider-regras:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
                input:checked + .slider-regras { background-color: #38bdf8; }
                input:checked + .slider-regras:before { transform: translateX(22px); }
                input:disabled + .slider-regras { opacity: 0.5; cursor: not-allowed; }
            `}</style>
        </div>
    );
};

export default RegrasTab;
