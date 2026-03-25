import React, { useState, useEffect } from 'react';
import { supabase } from '../../../servicos/supabase';
import { usarEquipe } from '../../../contextos/EquipeContexto';
import Botao from '../../../componentes/Botao/Botao';
import { Shield, AlertTriangle, Scale, Calendar, Trash2, CheckCircle2 } from 'lucide-react';

const AbaPunicoes = () => {
    const { equipeAtiva } = usarEquipe();
    const [punicoes, setPunicoes] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [processando, setProcessando] = useState(null);

    const isAdmin = equipeAtiva?.papel === 'admin' || equipeAtiva?.papel === 'sub_admin';

    const carregarPunicoes = async () => {
        if (!equipeAtiva) return;
        setCarregando(true);
        try {
            const { data, error } = await supabase
                .from('punicoes_equipe')
                .select(`
                    id, motivo, ativa, criado_em,
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

        // Configuração de REALTIME para atualizações instantâneas
        const canal = supabase
            .channel(`punicoes-${equipeAtiva?.id}`)
            .on(
                'postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'punicoes_equipe',
                    filter: `equipe_id=eq.${equipeAtiva?.id}`
                }, 
                () => {
                    carregarPunicoes();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(canal);
        };
    }, [equipeAtiva]);

    const anistiarPunicao = async (id, ativaAtualmente) => {
        if (!isAdmin) return;
        setProcessando(id);
        const novoEstado = !ativaAtualmente; // Anistiar (false) ou Reativar (true)
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

    const deletarPunicao = async (id) => {
        if (!isAdmin) return;
        if (!window.confirm("Isso apagará a punição definitivamente do histórico. Continuar?")) return;
        
        setProcessando(id);
        try {
            const { error } = await supabase
                .from('punicoes_equipe')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            await carregarPunicoes();
        } catch (error) {
            alert('Falha ao excluir: ' + error.message);
        } finally {
            setProcessando(null);
        }
    };

    const formatarDataLocal = (ts) => {
        return new Date(ts).toLocaleDateString('pt-BR');
    };

    if (carregando) return <div style={{ color: '#94a3b8', padding: '2rem', textAlign: 'center' }}>Carregando pendências...</div>;

    const ativas = punicoes.filter(p => p.ativa);
    const anistiadas = punicoes.filter(p => !p.ativa);

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* HEROS DE ESTATÍSTICAS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', padding: '16px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fca5a5', marginBottom: '8px' }}>
                        <AlertTriangle size={18} /> Punições Ativas
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#f43f5e' }}>{ativas.length}</div>
                </div>
                <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '16px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7dd3fc', marginBottom: '8px' }}>
                        <Shield size={18} /> Histórico de Anistias
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#38bdf8' }}>{anistiadas.length}</div>
                </div>
            </div>

            {punicoes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', background: 'rgba(15,23,42,0.4)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <Scale size={48} color="#10b981" style={{ marginBottom: '16px' }} />
                    <h3 style={{ color: '#f8fafc', fontSize: '1.2rem', marginBottom: '8px' }}>Equipe Disciplinada!</h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>Nenhum jogador possui infrações ou faltas gravadas no histórico disciplinar.</p>
                </div>
            ) : (
                <div className="painel-membros" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', overflow: 'hidden' }}>
                    <div className="lista-membros" style={{ padding: 0 }}>
                        {punicoes.map(p => (
                            <div key={p.id} className="membro-item" style={{ 
                                display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                                opacity: processando === p.id ? 0.5 : 1,
                                background: p.ativa ? 'transparent' : 'rgba(0,0,0,0.2)'
                            }}>
                                <div style={{width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginRight: '16px', border: p.ativa ? '2px solid #f43f5e' : '2px solid transparent'}}>
                                    {p.usuarios?.foto_url ? <img src={p.usuarios.foto_url} alt="jogador" style={{width:'100%', height:'100%', objectFit:'cover'}}/> : <Shield size={20} style={{margin:'12px', color:'#94a3b8'}}/>}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '500', color: p.ativa ? '#f8fafc' : '#94a3b8', marginBottom: '4px', textDecoration: p.ativa ? 'none' : 'line-through' }}>
                                        {p.usuarios?.nome_completo || 'Desconhecido'}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '4px' }}>
                                        {p.motivo}
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem', color: '#64748b' }}>
                                        <span><Calendar size={10} style={{marginRight: 4}}/>{formatarDataLocal(p.criado_em)}</span>
                                    </div>
                                </div>
                                
                                {/* Ações */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button 
                                        onClick={() => anistiarPunicao(p.id, p.ativa)}
                                        disabled={!isAdmin}
                                        style={{
                                            background: p.ativa ? 'rgba(56, 189, 248, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                                            color: p.ativa ? '#38bdf8' : '#fbbf24',
                                            border: `1px solid ${p.ativa ? 'rgba(56, 189, 248, 0.2)' : 'rgba(251, 191, 36, 0.2)'}`,
                                            padding: '6px 12px', borderRadius: '8px', cursor: isAdmin ? 'pointer' : 'default',
                                            display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500', fontSize: '0.8rem'
                                        }}
                                        title={isAdmin ? (p.ativa ? "Perdoar Jogador" : "Extinguir Perdão (Reativar)") : (p.ativa ? "Punição Ativa" : "Anistiado")}
                                    >
                                        {p.ativa ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                                        {p.ativa ? 'Conceder Anistia' : 'Reativar Infração'}
                                    </button>
                                    
                                    {isAdmin && (
                                        <button 
                                            onClick={() => deletarPunicao(p.id)}
                                            style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '6px' }}
                                            title="Esconder Registro/Deletar Permanentemente"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AbaPunicoes;
