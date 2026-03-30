import React, { useState, useEffect } from 'react';
import { 
  Trophy, Wallet, ShieldAlert, Activity, 
  Copy, CheckCircle2, Info, Landmark, HelpCircle, Star
} from 'lucide-react';
import { usarEquipe } from '../../../contextos/EquipeContexto';
import { usarAutenticacao } from '../../../contextos/AutenticacaoContexto';
import { usarFinanceiro } from '../../../contextos/FinanceiroContexto';
import { supabase } from '../../../servicos/supabase';
import InfoTooltip from '../../../componentes/Tooltip/InfoTooltip';

const CardsDadosAtleta = ({ equipeIdOpcional, esconderIcones = false }) => {
    const { equipeAtiva: equipeContexto, equipes, getLabelVinculo } = usarEquipe();
    const { usuario } = usarAutenticacao();
    const { obterCicloAtual } = usarFinanceiro();

    // Determina qual equipe usar: a passada por prop ou a ativa do contexto
    const equipeAlvo = equipeIdOpcional 
        ? (equipes.find(e => e.id === equipeIdOpcional) || equipeContexto)
        : equipeContexto;

    const [dadosAtleta, setDadosAtleta] = useState({
        pagoMes: 'carregando',
        cartoes: 0,
        assiduidade: 0,
        copiado: false
    });

    useEffect(() => {
        if (equipeAlvo?.id && usuario?.id) {
            carregarEstatisticasPessoais();

            // Escuta mudanças em tempo real na mensalidade deste atleta/equipe
            const canal = supabase
                .channel(`fins-atleta-${equipeAlvo.id}-${usuario.id}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'mensalidades',
                    filter: `equipe_id=eq.${equipeAlvo.id}`
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
            const ciclo = obterCicloAtual();
            
            // 1. Verificar Pagamento
            const { data: mens } = await supabase
                .from('mensalidades')
                .select('status')
                .eq('equipe_id', equipeAlvo.id)
                .eq('usuario_id', usuario.id)
                .eq('periodo', ciclo)
                .maybeSingle();

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

            // 3. Calcular Assiduidade (tabela correta: partidas_presencas)
            const { data: presencas } = await supabase
                .from('partidas_presencas')
                .select('frequencia')
                .eq('usuario_id', usuario.id)
                .order('created_at', { ascending: false })
                .limit(10);
            
            const totalJogos = presencas?.length || 0;
            const presentes = presencas?.filter(p => p.frequencia === 'P').length || 0;
            const percAssiduidade = totalJogos > 0 ? Math.round((presentes / totalJogos) * 100) : 0;

            setDadosAtleta({
                pagoMes: mens?.status || 'pendente',
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
        }
    };

    const copiarPix = () => {
        const pix = equipeAlvo.regras?.chave_pix || 'Chave não cadastrada';
        navigator.clipboard.writeText(pix);
        setDadosAtleta(prev => ({ ...prev, copiado: true }));
        setTimeout(() => setDadosAtleta(prev => ({ ...prev, copiado: false })), 2000);
    };

    const regras = equipeAlvo?.regras || {};

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
                        <Trophy size={22} strokeWidth={2.5} />
                    </div>
                )}
                <div className="card-atleta-info">
                    <span className="card-atleta-label">
                        Perfil
                        <InfoTooltip texto="Seu vínculo com esta equipe. Mensalistas pagam mensalidade fixa, Avulsos pagam por cada jogo que participam." />
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong className="card-atleta-valor">{getLabelVinculo(equipeAlvo.vinculo || 'mensalista')}</strong>
                        {equipeAlvo.vinculo === 'mensalista' ? (
                            <Star size={16} fill="#fbbf24" color="#fbbf24" />
                        ) : (
                            <Star size={16} fill="#94a3b8" color="#94a3b8" />
                        )}
                    </div>
                </div>
            </div>

            {/* CARD: MENSALIDADE (Apenas para Mensalistas) */}
            {equipeAlvo.gestao_financeira && equipeAlvo.vinculo === 'mensalista' && (
                <div className="card-atleta-status" style={{ borderLeft: `4px solid ${dadosAtleta.pagoMes === 'pago' ? '#10b981' : '#f59e0b'}` }}>
                    {!esconderIcones && (
                        <div className="card-atleta-icone" style={{ 
                            background: dadosAtleta.pagoMes === 'pago' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)', 
                            color: dadosAtleta.pagoMes === 'pago' ? '#10b981' : '#f59e0b',
                            border: `1px solid ${dadosAtleta.pagoMes === 'pago' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`
                        }}>
                            <Wallet size={22} strokeWidth={2.5} />
                        </div>
                    )}
                    <div className="card-atleta-info">
                        <span className="card-atleta-label">Financeiro</span>
                        <strong className="card-atleta-valor" style={{ color: dadosAtleta.pagoMes === 'pago' ? '#10b981' : '#f59e0b' }}>
                            {dadosAtleta.pagoMes === 'pago' ? 'Paga' : 'Pendente'}
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
                        <ShieldAlert size={22} strokeWidth={2.5} />
                    </div>
                )}
                <div className="card-atleta-info">
                    <span className="card-atleta-label">
                        Fair Play
                        <InfoTooltip texto="Regra da Equipe: 3 Cartões Amarelos ou 1 Vermelho = Suspensão Automática do próximo jogo da equipe." />
                    </span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <strong className="card-atleta-valor">{dadosAtleta.cartoes.total}</strong>
                        <div style={{ display: 'flex', gap: '6px', fontSize: '0.75rem' }}>
                            {dadosAtleta.cartoes.amarelo > 0 && <span title="Amarelos">🟨 {dadosAtleta.cartoes.amarelo}</span>}
                            {dadosAtleta.cartoes.vermelho > 0 && <span title="Vermelhos">🟥 {dadosAtleta.cartoes.vermelho}</span>}
                            {dadosAtleta.cartoes.justificado > 0 && <span title="Justificados">🟦 {dadosAtleta.cartoes.justificado}</span>}
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
                        <Activity size={22} strokeWidth={2.5} />
                    </div>
                )}
                <div className="card-atleta-info">
                    <span className="card-atleta-label">
                        Assiduidade
                        <InfoTooltip texto="Seu índice de presença nos últimos 10 jogos em que você esteve na lista (confirmado ou espera)." />
                    </span>
                    <strong className="card-atleta-valor">{dadosAtleta.assiduidade}%</strong>
                </div>
            </div>

            {/* CARD: CHAVE PIX */}
            {regras.chave_pix && (
                <div className="card-atleta-status card-pix-interativo" style={{ borderLeft: '4px solid #38bdf8' }} onClick={copiarPix}>
                    {!esconderIcones && (
                        <div className="card-atleta-icone" style={{ 
                            background: 'rgba(14, 165, 233, 0.25)', 
                            color: '#38bdf8',
                            border: '1px solid rgba(14, 165, 233, 0.4)'
                        }}>
                            <Landmark size={22} strokeWidth={2.5} />
                        </div>
                    )}
                    <div className="card-atleta-info" style={{ flex: 1 }}>
                        <span className="card-atleta-label">Chave PIX p/ Pagamento</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong className="card-atleta-valor" style={{ fontSize: '0.9rem', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                    padding: 16px 20px;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                }
                .card-atleta-status:hover {
                    background: rgba(30, 41, 59, 0.8);
                    border-color: rgba(255, 255, 255, 0.15);
                    transform: translateY(-2px);
                }
                .card-pix-interativo { cursor: pointer; border: 1px dashed rgba(56, 189, 248, 0.3); }
                .card-pix-interativo:hover { background: rgba(56, 189, 248, 0.1); }
                
                .card-atleta-icone {
                    width: 44px; height: 44px;
                    border-radius: 12px;
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                    flex-shrink: 0;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
                    transition: transform 0.3s;
                }
                .card-atleta-status:hover .card-atleta-icone {
                    transform: scale(1.1);
                }
                .card-atleta-info { display: flex; flex-direction: column; gap: 2px; }
                .card-atleta-label { font-size: 0.65rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
                .card-atleta-valor { font-size: 1.1rem; color: #f8fafc; font-weight: 800; }
            `}</style>
        </div>
    );
};

export default CardsDadosAtleta;
