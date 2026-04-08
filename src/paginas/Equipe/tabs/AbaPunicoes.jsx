import React, { useState, useEffect } from 'react';
import { supabase } from '../../../servicos/supabase';
import { usarEquipe } from '../../../contextos/EquipeContexto';
import { usarAutenticacao } from '../../../contextos/AutenticacaoContexto';
import Botao from '../../../componentes/Botao/Botao';
import { Shield, AlertTriangle, Scale, Calendar, Trash2, CheckCircle2, Users } from 'lucide-react';
import InfoTooltip from '../../../componentes/Tooltip/InfoTooltip';

const AbaPunicoes = ({ membrosIniciais = [] }) => {
    const { equipeAtiva, temPermissaoEquipe } = usarEquipe();
    const { usuario } = usarAutenticacao();
    const [punicoes, setPunicoes] = useState([]);
    const [membros, setMembros] = useState(membrosIniciais);
    const [carregando, setCarregando] = useState(true);
    const [processando, setProcessando] = useState(null);

    // Sincroniza membros se as props mudarem
    useEffect(() => {
        setMembros(membrosIniciais);
    }, [membrosIniciais]);

    const formatName = (fullName) => {
        if (!fullName) return '';
        const parts = fullName.trim().toLowerCase().split(/\s+/);
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        const last = parts[parts.length - 1].charAt(0).toUpperCase() + parts[parts.length - 1].slice(1);
        return `${first} ${last}`;
    };

    const getNomeUsuario = (userId, usuarioPayload) => {
        if (usuarioPayload?.nome_completo) return formatName(usuarioPayload.nome_completo);
        const membroRef = membros.find(m => String(m.usuario_id) === String(userId) || String(m.usuarios?.id) === String(userId));
        if (membroRef?.usuarios?.nome_completo) return formatName(membroRef.usuarios.nome_completo);
        return 'Desconhecido';
    };

    const isAdmin = equipeAtiva?.papel === 'admin' || temPermissaoEquipe('gerenciar_membros') || temPermissaoEquipe('gerenciar_punicoes');

    const carregarPunicoes = async () => {
        if (!equipeAtiva) return;
        setCarregando(true);
        try {
            const { data, error } = await supabase
                .from('punicoes_equipe')
                .select(`
                    id, motivo, ativa, criado_em, tipo_cartao,
                    usuarios (id, nome_completo, foto_url),
                    partidas (id, data)
                `)
                .eq('equipe_id', equipeAtiva.id)
                .order('criado_em', { ascending: false });
                
            if (error) throw error;
            setPunicoes(data || []);
        } catch (error) {
            console.error('Erro ao buscar punições:', error);
        } finally {
            setCarregando(false);
        }
    };

    useEffect(() => {
        carregarPunicoes();

        const canal = supabase
            .channel(`punicoes-${equipeAtiva?.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'punicoes_equipe', filter: `equipe_id=eq.${equipeAtiva?.id}` }, () => carregarPunicoes())
            .subscribe();

        return () => supabase.removeChannel(canal);
    }, [equipeAtiva]);

    const anistiarPunicao = async (id, ativaAtualmente) => {
        if (!isAdmin) return;
        setProcessando(id);
        const novoEstado = !ativaAtualmente;
        try {
            const { error } = await supabase
                .from('punicoes_equipe')
                .update({ ativa: novoEstado })
                .eq('id', id);
            
            if (error) throw error;
            await carregarPunicoes();
        } catch (error) {
            alert('Falha ao perdoar: ' + error.message);
        } finally {
            setProcessando(null);
        }
    };

    const zerarCiclo = async () => {
        if (!isAdmin) return;
        if (!window.confirm("⚠️ ATENÇÃO: ZERAR CICLO ⚠️\n\nIsso irá perdoar TODOS os cartões amarelos e vermelhos ativos de todos os jogadores da equipe.\n\nEsta ação é comum após o fim de uma temporada ou rodada. Deseja continuar?")) return;
        
        setProcessando('zerar');
        try {
            const { error } = await supabase
                .from('punicoes_equipe')
                .update({ ativa: false })
                .eq('equipe_id', equipeAtiva.id)
                .eq('ativa', true);
            
            if (error) throw error;
            alert('Ciclo zerado com sucesso! Todos os atletas estão aptos para o próximo jogo. 🤝');
            await carregarPunicoes();
        } catch (error) {
            alert('Falha ao zerar ciclo: ' + error.message);
        } finally {
            setProcessando(null);
        }
    };

    const deletarPunicao = async (id) => {
        if (!isAdmin) return;
        if (!window.confirm("Isso apagará a punição definitivamente do histórico. Continuar?")) return;
        
        setProcessando(id);
        try {
            const { error } = await supabase.from('punicoes_equipe').delete().eq('id', id);
            if (error) throw error;
            await carregarPunicoes();
        } catch (error) {
            alert('Falha ao excluir: ' + error.message);
        } finally {
            setProcessando(null);
        }
    };

    const formatarDataLocal = (ts) => new Date(ts).toLocaleDateString('pt-BR');

    if (carregando) return <div style={{ color: '#94a3b8', padding: '2rem', textAlign: 'center' }}>Carregando VAR...</div>;

    const ativas = punicoes.filter(p => p.ativa);
    const amarelosAtivos = ativas.filter(p => p.tipo_cartao === 'amarelo').length;
    const vermelhosAtivos = ativas.filter(p => p.tipo_cartao === 'vermelho').length;
    // Justificados (azul) são salvos com ativa=false intencionalmente, então buscamos sem filtrar por 'ativa'
    const justificadosAtivos = punicoes.filter(p => p.tipo_cartao === 'justificado' || p.tipo_cartao === 'azul').length;

    return (
        <div className="animate-fade-in" style={{ padding: '0 1rem' }}>
            <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ fontSize: '1.6rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Scale size={28} color="var(--amarelo)" /> Fair Play (VAR)
                    </h2>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>A disciplina no campo agora tem regras claras. Acumulou 3 amarelos? Tá fora!</p>
                </div>
                
                {isAdmin && ativas.length > 0 && (
                    <Botao 
                        variant="secundario" 
                        onClick={zerarCiclo} 
                        disabled={processando === 'zerar'}
                        style={{ borderColor: 'rgba(56, 189, 248, 0.3)', color: '#38bdf8' }}
                    >
                        {processando === 'zerar' ? 'Zerando...' : 'Zerar Ciclo (Anistia)'}
                    </Botao>
                )}
            </header>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.2)', padding: '20px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ color: '#facc15', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            Amarelos Ativos
                            <InfoTooltip texto="O acúmulo de 3 cartões amarelos gera automaticamente 1 suspensão (cartão vermelho)." />
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: '800', color: '#fef08a' }}>{amarelosAtivos}</div>
                    </div>
                    <div style={{ width: '30px', height: '40px', background: '#eab308', borderRadius: '4px', boxShadow: '0 0 15px rgba(234, 179, 8, 0.3)' }} />
                </div>
                
                <div style={{ background: 'rgba(239, 64, 64, 0.1)', border: '1px solid rgba(239, 64, 64, 0.2)', padding: '20px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ color: '#f87171', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            Suspensões Ativas
                            <InfoTooltip texto="Atletas com suspensão ativa (por 3 amarelos ou 1 vermelho direto) não podem ser confirmados em partidas enquanto a punição durar." />
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: '800', color: '#fecaca' }}>{vermelhosAtivos}</div>
                    </div>
                    <div style={{ width: '30px', height: '40px', background: '#ef4444', borderRadius: '4px', boxShadow: '0 0 15px rgba(239, 68, 68, 0.3)' }} />
                </div>

                <div style={{ background: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.2)', padding: '20px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ color: '#38bdf8', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            Justificativas
                            <InfoTooltip texto="Cartões informativos ou justificados (Azul) que não geram suspensão automática por acúmulo." />
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: '800', color: '#bae6fd' }}>{justificadosAtivos}</div>
                    </div>
                    <div style={{ width: '30px', height: '40px', background: '#0284c7', borderRadius: '4px', boxShadow: '0 0 15px rgba(14, 165, 233, 0.3)' }} />
                </div>
            </div>

            {/* SEÇÃO: MEU STATUS (Para Atletas) */}
            {(() => {
                const minhasPunicoesAtivas = punicoes.filter(p => p.ativa && p.usuarios?.id === usuario?.id);
                const amareloUser = minhasPunicoesAtivas.filter(p => p.tipo_cartao === 'amarelo').length;
                const vermelhoUser = minhasPunicoesAtivas.filter(p => p.tipo_cartao === 'vermelho').length;
                // Justificados não têm 'ativa=true', buscamos sem esse filtro
                const justificadoUser = punicoes.filter(p => (p.tipo_cartao === 'justificado' || p.tipo_cartao === 'azul') && p.usuarios?.id === usuario?.id).length;
                const isSuspenso = vermelhoUser > 0;

                return (
                    <div style={{ 
                        background: isSuspenso ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        border: `1px solid ${isSuspenso ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                        padding: '24px', borderRadius: '20px', marginBottom: '32px',
                        display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap'
                    }}>
                        <div style={{ 
                            width: '64px', height: '64px', borderRadius: '50%', 
                            background: isSuspenso ? '#ef4444' : '#10b981',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', boxShadow: `0 0 20px ${isSuspenso ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                        }}>
                             {isSuspenso ? <AlertTriangle size={32} /> : <CheckCircle2 size={32} />}
                        </div>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <h3 style={{ fontSize: '1.2rem', color: '#f8fafc', marginBottom: '4px' }}>
                                {isSuspenso ? 'Você está Suspenso!' : 'Você está Apto para Jogar'}
                            </h3>
                            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
                                {isSuspenso 
                                    ? 'Cumpra seu jogo de suspensão ou peça anistia ao capitão para voltar.'
                                    : 'Continue mantendo a disciplina para evitar punições automáticas.'}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <div style={{ textAlign: 'center', padding: '10px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', minWidth: '100px' }}>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Seus Amarelos</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#eab308' }}>{amareloUser} / 3</div>
                            </div>
                            <div style={{ textAlign: 'center', padding: '10px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', minWidth: '100px' }}>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Suspensões</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ef4444' }}>{vermelhoUser}</div>
                            </div>
                            <div style={{ textAlign: 'center', padding: '10px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', minWidth: '100px' }}>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Justificativas</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#38bdf8' }}>{justificadoUser}</div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {punicoes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '5rem', background: 'rgba(15,23,42,0.4)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.05)' }}>
                    <CheckCircle2 size={56} color="#10b981" style={{ marginBottom: '20px', opacity: 0.5 }} />
                    <h3 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: '700', marginBottom: '8px' }}>Fair Play Impecável!</h3>
                    <p style={{ color: '#94a3b8', fontSize: '1rem', maxWidth: '400px', margin: '0 auto' }}>Nenhuma infração registrada. Seu time é exemplo de disciplina e respeito.</p>
                </div>
            ) : (
                <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', overflow: 'hidden' }}>
                    <div style={{ padding: '0' }}>
                        {punicoes.map(p => {
                            const isAmarelo = p.tipo_cartao === 'amarelo';
                            const isAtiva = p.ativa;
                            return (
                                <div key={p.id} style={{ 
                                    display: 'flex', alignItems: 'center', padding: '20px', 
                                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                                    background: isAtiva ? 'transparent' : 'rgba(0,0,0,0.15)',
                                    opacity: processando === p.id ? 0.5 : 1,
                                    transition: 'all 0.2s ease'
                                }}>
                                    {/* CARTÃO VISUAL */}
                                    <div style={{ 
                                        width: '12px', height: '18px', borderRadius: '2px', 
                                        background: p.tipo_cartao === 'amarelo' ? '#eab308' : (p.tipo_cartao === 'vermelho' ? '#ef4444' : '#0ea5e9'),
                                        marginRight: '20px', flexShrink: 0,
                                        boxShadow: isAtiva ? `0 0 10px ${p.tipo_cartao === 'amarelo' ? 'rgba(234, 179, 8, 0.4)' : (p.tipo_cartao === 'vermelho' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(14, 165, 233, 0.4)')}` : 'none',
                                        opacity: isAtiva ? 1 : 0.4
                                    }} />

                                    <div style={{ 
                                        width: 48, height: 48, borderRadius: '12px', 
                                        background: 'rgba(255,255,255,0.05)', 
                                        overflow: 'hidden', marginRight: '16px', 
                                        border: isAtiva ? (p.tipo_cartao === 'amarelo' ? '2px solid #eab308' : (p.tipo_cartao === 'vermelho' ? '2px solid #ef4444' : '2px solid #0ea5e9')) : '2px solid transparent' 
                                    }}>
                                        {p.usuarios?.foto_url ? <img src={p.usuarios.foto_url} alt="jogador" style={{width:'100%', height:'100%', objectFit:'cover'}}/> : <Users size={20} style={{margin:'14px', color:'#475569'}}/>}
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '700', color: isAtiva ? '#f8fafc' : '#64748b', fontSize: '1rem', marginBottom: '4px', textDecoration: isAtiva ? 'none' : 'line-through' }}>
                                            {getNomeUsuario(p.usuarios?.id, p.usuarios)}
                                        </div>
                                        <div style={{ fontSize: '0.9rem', color: isAtiva ? '#cbd5e1' : '#475569' }}>
                                            {p.motivo}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '4px' }}>
                                            {formatarDataLocal(p.criado_em)}
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {isAdmin && (
                                            <button 
                                                onClick={() => anistiarPunicao(p.id, isAtiva)}
                                                style={{
                                                    background: isAtiva ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                                    color: isAtiva ? '#38bdf8' : '#94a3b8',
                                                    border: '1px solid transparent',
                                                    padding: '8px 16px', borderRadius: '10px', cursor: 'pointer',
                                                    fontSize: '0.85rem', fontWeight: '600', transition: 'all 0.2s'
                                                }}
                                            >
                                                {isAtiva ? 'Perdoar' : 'Reativar'}
                                            </button>
                                        )}
                                        
                                        {isAdmin && (
                                            <button onClick={() => deletarPunicao(p.id)} style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', padding: '8px' }}>
                                                <Trash2 size={20} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AbaPunicoes;
