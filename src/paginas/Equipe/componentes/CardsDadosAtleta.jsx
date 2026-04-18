import React, { useState, useEffect } from 'react';
import { 
  Trophy, Wallet, ShieldAlert, Activity, 
  Copy, CheckCircle2, Info, Landmark, HelpCircle, Star, AlertTriangle, Clock as ClockIcon
} from 'lucide-react';
import { usarEquipe } from '../../../contextos/EquipeContexto';
import { usarAutenticacao } from '../../../contextos/AutenticacaoContexto';
import { usarFinanceiro } from '../../../contextos/FinanceiroContexto';
import { supabase } from '../../../servicos/supabase';
import InfoTooltip from '../../../componentes/Tooltip/InfoTooltip';

const CardsDadosAtleta = ({ equipeIdOpcional, esconderIcones = false }) => {
    const { equipeAtiva: equipeContexto, equipes, getLabelVinculo } = usarEquipe();
    const { usuario } = usarAutenticacao();
    const { verificarSituacaoFinanceiraAtleta } = usarFinanceiro();

    // Determina qual equipe usar: a passada por prop ou a ativa do contexto
    const equipeAlvo = equipeIdOpcional 
        ? (equipes.find(e => e.id === equipeIdOpcional) || equipeContexto)
        : equipeContexto;

    const [dadosAtleta, setDadosAtleta] = useState({
        financeiro: { status: 'carregando', ciclo: '' },
        cartoes: 0,
        assiduidade: 0,
        copiado: false
    });

    useEffect(() => {
        if (equipeAlvo?.id && usuario?.id) {
            carregarEstatisticasPessoais();

            // Escuta mudanças em tempo real na mensalidade deste atleta/equipe
            const canal = supabase
                .channel(`fins-atleta-v3-${equipeAlvo.id}-${usuario.id}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'mensalidades',
                    filter: `usuario_id=eq.${usuario.id}`
                }, () => {
                    carregarEstatisticasPessoais();
                })
                .subscribe();

            return () => supabase.removeChannel(canal);
        }
    }, [equipeAlvo?.id, usuario?.id]);

    if (!equipeAlvo) return null;

    const carregarEstatisticasPessoais = async () => {
        try {
            // 1. Verificar Situação Financeira REAL
            const situacao = await verificarSituacaoFinanceiraAtleta(equipeAlvo.id, usuario.id);

            // 2. Contar Cartões por Cor
            const { data: todosCartoes } = await supabase
                .from('punicoes_equipe')
                .select('tipo_cartao')
                .eq('equipe_id', equipeAlvo.id)
                .eq('usuario_id', usuario.id)
                .eq('ativa', true);

            const countAmarelo = todosCartoes?.filter(c => c.tipo_cartao === 'amarelo').length || 0;
            const countVermelho = todosCartoes?.filter(c => c.tipo_cartao === 'vermelho').length || 0;
            const countJustificado = todosCartoes?.filter(c => c.tipo_cartao === 'justificado' || c.tipo_cartao === 'azul').length || 0;

            // 3. Calcular Assiduidade (Opção 2: todas as partidas da equipe desde que o jogador entrou)
            
            // 3a. Data de entrada do atleta na equipe
            const { data: dadosMembro } = await supabase
                .from('membros_equipe')
                .select('created_at')
                .eq('equipe_id', equipeAlvo.id)
                .eq('usuario_id', usuario.id)
                .eq('status', 'ativo')
                .single();
            
            const dataEntrada = dadosMembro?.created_at || null;

            // 3b. Total de partidas passadas da equipe desde que o jogador entrou
            const hoje = new Date().toISOString().split('T')[0]; // '2026-04-18'
            
            let queryPartidas = supabase
                .from('partidas')
                .select('id')
                .eq('equipe_id', equipeAlvo.id)
                .lte('data', hoje); // partidas até hoje (campo 'data' da tabela)

            if (dataEntrada) {
                // Filtra somente partidas a partir da data de entrada do atleta
                const dataEntradaFormatada = dataEntrada.split('T')[0];
                queryPartidas = queryPartidas.gte('data', dataEntradaFormatada);
            }

            const { data: partidasDaEquipe } = await queryPartidas;
            const idsPartidas = partidasDaEquipe?.map(p => p.id) || [];
            const totalJogos = idsPartidas.length;

            // 3c. Quantas dessas partidas o atleta foi marcado como Presente
            let presentes = 0;
            if (totalJogos > 0) {
                const { data: presencasAtleta } = await supabase
                    .from('partidas_presencas')
                    .select('frequencia')
                    .eq('usuario_id', usuario.id)
                    .eq('frequencia', 'P')
                    .in('partida_id', idsPartidas);
                presentes = presencasAtleta?.length || 0;
            }

            const percAssiduidade = totalJogos > 0 ? Math.round((presentes / totalJogos) * 100) : 0;

            setDadosAtleta({
                financeiro: situacao,
                cartoes: { 
                    total: (todosCartoes?.length || 0),
                    amarelo: countAmarelo,
                    vermelho: countVermelho,
                    justificado: countJustificado
                },
                assiduidade: percAssiduidade,
                copiado: false
            });
        } catch (error) {
            console.error('Erro ao carregar dados do atleta:', error);
            // Em caso de erro, removemos o estado carregando para não travar a UI
            setDadosAtleta(prev => ({ ...prev, financeiro: { status: 'ocultar', ciclo: '' } }));
        }
    };

    const copiarPix = () => {
        const pix = equipeAlvo.regras?.chave_pix || 'Chave não cadastrada';
        navigator.clipboard.writeText(pix);
        setDadosAtleta(prev => ({ ...prev, copiado: true }));
        setTimeout(() => setDadosAtleta(prev => ({ ...prev, copiado: false })), 2000);
    };

    const regras = equipeAlvo?.regras || {};
    const vinculoAtleta = equipeAlvo.vinculo || 'mensalista';
    const fin = dadosAtleta.financeiro;

    return (
        <div className="grade-cards-atleta" style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px', marginBottom: '32px'
        }}>
            {/* CARD: PERFIL */}
            <div className="card-atleta-status" style={{ borderLeft: '4px solid #38bdf8' }}>
                {!esconderIcones && (
                    <div className="card-atleta-icone" style={{ 
                        background: 'rgba(14, 165, 233, 0.25)', 
                        color: '#38bdf8',
                        border: '1px solid rgba(14, 165, 233, 0.4)'
                    }}>
                        <Trophy size={20} strokeWidth={2.5} />
                    </div>
                )}
                <div className="card-atleta-info">
                    <span className="card-atleta-label">
                        Perfil {getLabelVinculo(vinculoAtleta)}
                        <InfoTooltip texto={`Seu vínculo com esta equipe. ${getLabelVinculo('mensalista')}s pagam um valor fixo, ${getLabelVinculo('avulso')}s pagam por cada jogo que participam.`} />
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong className="card-atleta-valor" style={{ fontSize: '1rem' }}>{getLabelVinculo(vinculoAtleta)}</strong>
                        {vinculoAtleta === 'mensalista' ? (
                            <Star size={14} fill="#fbbf24" color="#fbbf24" />
                        ) : (
                            <Star size={14} fill="#94a3b8" color="#94a3b8" />
                        )}
                    </div>
                </div>
            </div>

            {/* CARD: MENSALIDADE */}
            {equipeAlvo.gestao_financeira && vinculoAtleta === 'mensalista' && fin.status !== 'ocultar' && (
                <div 
                    className="card-atleta-status" 
                    style={{ 
                        borderLeft: `4px solid ${
                            fin.status === 'vencido' ? '#ef4444' : 
                            fin.status === 'pendente' ? '#f59e0b' : 
                            fin.status === 'pago' ? '#10b981' : '#64748b'
                        }` 
                    }}
                >
                    {!esconderIcones && (
                        <div className="card-atleta-icone" style={{ 
                            background: fin.status === 'vencido' ? 'rgba(239, 68, 68, 0.15)' : 
                                       fin.status === 'pendente' ? 'rgba(245, 158, 11, 0.15)' : 
                                       fin.status === 'pago' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)', 
                            color: fin.status === 'vencido' ? '#ef4444' : 
                                   fin.status === 'pendente' ? '#f59e0b' : 
                                   fin.status === 'pago' ? '#10b981' : '#64748b',
                            border: `1px solid ${
                                fin.status === 'vencido' ? 'rgba(239, 68, 68, 0.3)' : 
                                fin.status === 'pendente' ? 'rgba(245, 158, 11, 0.3)' : 
                                fin.status === 'pago' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(100, 116, 139, 0.3)'
                            }`
                        }}>
                            {fin.status === 'vencido' ? <AlertTriangle size={20} /> : 
                             fin.status === 'pendente' ? <ClockIcon size={20} /> : 
                             <Wallet size={20} strokeWidth={2.5} />}
                        </div>
                    )}
                    <div className="card-atleta-info">
                        <span className="card-atleta-label">Financeiro {getLabelVinculo('mensalista')}</span>
                        <strong className="card-atleta-valor" style={{ 
                            fontSize: '0.95rem',
                            whiteSpace: 'normal',
                            lineHeight: '1.2',
                            color: fin.status === 'vencido' ? '#ef4444' : 
                                   fin.status === 'pendente' ? '#f59e0b' : 
                                   fin.status === 'pago' ? '#10b981' : '#94a3b8' 
                        }}>
                            {fin.status === 'vencido' ? `Vencido (${fin.ciclo})` : 
                             fin.status === 'pendente' ? `Pendente (${fin.ciclo})` : 
                             fin.status === 'pago' ? `Status OK (${fin.ciclo})` : 'Carregando...'}
                        </strong>
                    </div>
                </div>
            )}

            {/* CARD: FAIR PLAY / CARTÕES */}
            <div className="card-atleta-status" style={{ borderLeft: `4px solid ${dadosAtleta.cartoes.total > 0 ? '#f43f5e' : '#64748b'}` }}>
                {!esconderIcones && (
                    <div className="card-atleta-icone" style={{ 
                        background: 'rgba(244, 63, 94, 0.25)', 
                        color: '#f43f5e',
                        border: '1px solid rgba(244, 63, 94, 0.4)'
                    }}>
                        <ShieldAlert size={20} strokeWidth={2.5} />
                    </div>
                )}
                <div className="card-atleta-info">
                    <span className="card-atleta-label">
                        Fair Play
                        <InfoTooltip texto="Regra da Equipe: 3 Cartões Amarelos ou 1 Vermelho = Suspensão Automática do próximo jogo." />
                    </span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <strong className="card-atleta-valor" style={{ fontSize: '1rem' }}>{dadosAtleta.cartoes.total}</strong>
                        <div style={{ display: 'flex', gap: '6px', fontSize: '0.7rem' }}>
                            {dadosAtleta.cartoes.amarelo > 0 && <span title="Amarelos">🟨{dadosAtleta.cartoes.amarelo}</span>}
                            {dadosAtleta.cartoes.vermelho > 0 && <span title="Vermelhos">🟥{dadosAtleta.cartoes.vermelho}</span>}
                            {dadosAtleta.cartoes.justificado > 0 && <span title="Justificados">🟦{dadosAtleta.cartoes.justificado}</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* CARD: ASSIDUIDADE */}
            <div className="card-atleta-status" style={{ borderLeft: '4px solid #8b5cf6' }}>
                {!esconderIcones && (
                    <div className="card-atleta-icone" style={{ 
                        background: 'rgba(139, 92, 246, 0.25)', 
                        color: '#a78bfa',
                        border: '1px solid rgba(139, 92, 246, 0.4)'
                    }}>
                        <Activity size={20} strokeWidth={2.5} />
                    </div>
                )}
                <div className="card-atleta-info">
                    <span className="card-atleta-label">
                        Assiduidade
                        <InfoTooltip texto="Seu índice de presença real na equipe: total de partidas realizadas desde que você entrou ÷ quantas você foi marcado como presente." />
                    </span>
                    <strong className="card-atleta-valor" style={{ fontSize: '1rem' }}>{dadosAtleta.assiduidade}%</strong>
                </div>
            </div>

            {/* CARD: CHAVE PIX */}
            {regras.chave_pix && (
                <div className="card-atleta-status card-pix-interativo" style={{ borderLeft: '4px solid #10b981' }} onClick={copiarPix}>
                    {!esconderIcones && (
                        <div className="card-atleta-icone" style={{ 
                            background: 'rgba(16, 185, 129, 0.2)', 
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}>
                            <Landmark size={20} strokeWidth={2.5} />
                        </div>
                    )}
                    <div className="card-atleta-info" style={{ flex: 1 }}>
                        <span className="card-atleta-label">Pagar {getLabelVinculo(vinculoAtleta)}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong className="card-atleta-valor" style={{ fontSize: '0.85rem', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {regras.chave_pix}
                            </strong>
                            {dadosAtleta.copiado ? <CheckCircle2 size={14} color="#10b981" /> : <Copy size={14} color="#94a3b8" />}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .card-atleta-status {
                    background: rgba(15, 23, 42, 0.6);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 16px;
                    padding: 12px 16px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                }
                .card-atleta-status:hover {
                    background: rgba(30, 41, 59, 0.8);
                    border-color: rgba(255, 255, 255, 0.15);
                    transform: translateY(-2px);
                }
                .card-pix-interativo { cursor: pointer; }
                .card-pix-interativo:hover { background: rgba(16, 185, 129, 0.1); }
                
                .card-atleta-icone {
                    width: 40px; height: 40px;
                    border-radius: 10px;
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                    flex-shrink: 0;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
                }
                .card-atleta-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
                .card-atleta-label { font-size: 0.6rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
                .card-atleta-valor { color: #f8fafc; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            `}</style>
        </div>
    );
};

export default CardsDadosAtleta;
