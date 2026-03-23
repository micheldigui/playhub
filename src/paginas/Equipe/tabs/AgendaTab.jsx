import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Clock, Users, ChevronRight } from 'lucide-react';
import { usarPartidas } from '../../../contextos/PartidasContexto';
import { usarEquipe } from '../../../contextos/EquipeContexto';
import ModalDetalhesPartida from './modais/ModalDetalhesPartida';

const AgendaTab = () => {
    const { partidasCarregadas, carregarPartidas } = usarPartidas();
    const { equipeAtiva } = usarEquipe();
    const [carregando, setCarregando] = useState(true);
    const [partidaSelecionada, setPartidaSelecionada] = useState(null);

    useEffect(() => {
        if (equipeAtiva?.id) {
            carregarPartidas(equipeAtiva.id).finally(() => setCarregando(false));
        }
    }, [equipeAtiva]);

    // Filtra partidas futuras
    const partidasFuturas = partidasCarregadas.filter(p => {
        const dataPartida = new Date(p.data + 'T' + p.hora);
        return dataPartida >= new Date();
    }).sort((a, b) => new Date(a.data + 'T' + a.hora) - new Date(b.data + 'T' + b.hora));

    const formatarData = (dataOriginal) => {
        const dataObj = new Date(dataOriginal + 'T00:00:00');
        const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        return `${diasSemana[dataObj.getDay()]}, ${dataObj.toLocaleDateString('pt-BR')}`;
    };

    if (carregando) {
        return <div className="p-8 text-center text-muted">Buscando agenda...</div>;
    }

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '24px' }}>
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '8px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={20} color="#38bdf8" /> Próximos Jogos
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                        Confira as próximas partidas agendadas e confirme sua presença.
                    </p>
                </div>

                <div style={{ display: 'grid', gap: '16px' }}>
                    {partidasFuturas.length > 0 ? partidasFuturas.map(partida => (
                        <div
                            key={partida.id}
                            style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                borderRadius: '12px',
                                padding: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            className="hover-card"
                            onClick={() => setPartidaSelecionada(partida)}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#f8fafc' }}>
                                    {formatarData(partida.data)} às {partida.hora.substring(0, 5)}
                                </div>
                                <div style={{ display: 'flex', gap: '16px', color: '#94a3b8', fontSize: '0.85rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <MapPin size={14} /> {partida.local_nome || 'Local a definir'}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Users size={14} /> Vagas: {partida.limite_jogadores || 'Ilimitadas'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ color: '#38bdf8', padding: '8px' }}>
                                <ChevronRight size={20} />
                            </div>
                        </div>
                    )) : (
                        <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                            <Calendar size={32} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
                            <p>Nenhuma partida agendada para os próximos dias.</p>
                        </div>
                    )}
                </div>
            </div>
            
            <style>{`
                .hover-card:hover {
                    background: rgba(255, 255, 255, 0.06) !important;
                    border-color: rgba(56, 189, 248, 0.3) !important;
                }
            `}</style>

            {partidaSelecionada && (
                <ModalDetalhesPartida 
                    isOpen={!!partidaSelecionada}
                    partida={partidaSelecionada}
                    onClose={() => setPartidaSelecionada(null)}
                />
            )}
        </div>
    );
};

export default AgendaTab;
