import React, { useState, useEffect } from 'react';
import { supabase } from '../../servicos/supabase';
import { X, MapPin, Users, Calendar, Trophy, Star, Shield, Info, Loader2 } from 'lucide-react';
import Botao from '../Botao/Botao';
import '../Modal/Modal.css';

const PerfilEquipeModal = ({ equipeId, aoFechar, convite, aoResponderConvite, processando }) => {
    const [equipe, setEquipe] = useState(null);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        if (equipeId && equipeId !== 'undefined' && equipeId !== 'null') {
            carregarPerfil();
        } else {
            setCarregando(false);
            setEquipe(null);
        }
    }, [equipeId]);

    const carregarPerfil = async () => {
        setCarregando(true);
        try {
            // Busca dados básicos da equipe
            const { data, error } = await supabase
                .from('equipes')
                .select(`
                    id, nome, logo_url, local_cidade, local_estado, modalidade, criado_em, visibilidade, nivel,
                    admin:usuarios!equipes_admin_id_fkey (nome_completo, apelido)
                `)
                .eq('id', equipeId)
                .single();

            if (error) throw error;
            
            // Tenta buscar a contagem de membros ativos
            const { count: membrosCount } = await supabase
                .from('membros_equipe')
                .select('id', { count: 'exact', head: true })
                .eq('equipe_id', equipeId)
                .eq('status', 'ativo');

            setEquipe({ ...data, membros_ativos: membrosCount || 0 });
        } catch (error) {
            console.error('Erro ao buscar perfil da equipe:', error);
        } finally {
            setCarregando(false);
        }
    };

    if (!equipeId) return null;

    const anoFundacao = equipe?.criado_em ? new Date(equipe.criado_em).getFullYear() : 'Desconhecido';

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '500px', width: '95%', padding: 0, overflow: 'hidden', background: '#0f172a' }}>
                
                {carregando ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                        <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto 16px' }} />
                        <p>Busando informações da equipe...</p>
                    </div>
                ) : equipe ? (
                    <>
                        {/* HEADER VERDE/AZUL CAMPO */}
                        <div style={{ position: 'relative', height: '120px', background: 'linear-gradient(135deg, #0f172a 0%, #0284c7 100%)' }}>
                            <button className="btn-fechar" onClick={aoFechar} style={{ position: 'absolute', top: '16px', right: '16px', color: 'white', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '6px' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* FOTO E NOME */}
                        <div style={{ padding: '0 24px', position: 'relative', marginTop: '-40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ width: '96px', height: '96px', borderRadius: '50%', border: '4px solid #0f172a', background: '#1e293b', overflow: 'hidden', marginBottom: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                                {equipe.logo_url ? (
                                    <img src={equipe.logo_url} alt={equipe.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <Shield size={40} color="#64748b" />
                                )}
                            </div>
                            
                            <h2 style={{ fontSize: '1.5rem', color: '#f8fafc', margin: '0 0 4px 0', textAlign: 'center' }}>{equipe.nome}</h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontSize: '0.9rem', marginBottom: '16px' }}>
                                <Trophy size={14} /> {equipe.modalidade || 'Esportes Diversos'}
                            </div>

                            {equipe.descricao && (
                                <p style={{ color: '#94a3b8', fontSize: '0.95rem', textAlign: 'center', margin: '0 0 24px 0', fontStyle: 'italic' }}>
                                    "{equipe.descricao}"
                                </p>
                            )}
                        </div>

                        {/* INFO GRID */}
                        <div style={{ padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={12}/> Localização</span>
                                    <span style={{ color: '#f1f5f9', fontSize: '0.9rem' }}>{equipe.local_cidade ? `${equipe.local_cidade}, ${equipe.local_estado || ''}` : 'Não informada'}</span>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={12}/> Elenco Ativo</span>
                                    <span style={{ color: '#f1f5f9', fontSize: '0.9rem' }}>{equipe.membros_ativos} atletas inscritos</span>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}><Star size={12}/> Capitão</span>
                                    <span style={{ color: '#f1f5f9', fontSize: '0.9rem' }}>{equipe.admin?.nome_completo || equipe.admin?.apelido || 'Desconhecido'}</span>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={12}/> Fundação</span>
                                    <span style={{ color: '#f1f5f9', fontSize: '0.9rem' }}>{anoFundacao}</span>
                                </div>
                            </div>
                            
                            {equipe.visibilidade === 'privada' && (
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.2)', padding: '12px', borderRadius: '8px', color: '#fbbf24', fontSize: '0.85rem' }}>
                                    <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <span>Esta é uma equipe privada. O acesso aos dados completos do elenco e histórico de partidas é restrito aos membros confirmados.</span>
                                </div>
                            )}
                            
                            
                            {/* BOTOES DE RESPOSTA AO CONVITE */}
                            {convite && aoResponderConvite && (
                                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                    <Botao 
                                        variant="secundario" 
                                        style={{ padding: '12px', fontSize: '0.9rem', flex: 1, borderColor: 'rgba(244, 63, 94, 0.2)', color: '#f43f5e' }} 
                                        onClick={() => { aoResponderConvite(convite.id, false); aoFechar(); }}
                                        disabled={processando === convite.id}
                                    >Recusar Convite</Botao>
                                    <Botao 
                                        style={{ background: '#10b981', padding: '12px', fontSize: '0.9rem', flex: 1 }} 
                                        onClick={() => { aoResponderConvite(convite.id, true); aoFechar(); }}
                                        disabled={processando === convite.id}
                                    >Aceitar Convite</Botao>
                                </div>
                            )}

                        </div>
                    </>
                ) : (
                    <div style={{ padding: '60px', textAlign: 'center', color: '#f43f5e' }}>
                        <Info size={32} style={{ margin: '0 auto 16px' }} />
                        <p>Equipe não encontrada ou excluída.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PerfilEquipeModal;
