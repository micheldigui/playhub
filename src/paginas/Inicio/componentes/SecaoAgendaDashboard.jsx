import React from 'react';
import { Calendar, ChevronRight, MapPin } from 'lucide-react';

/**
 * Seção de Agenda do Dashboard
 * Exibe a lista de próximas partidas da equipe selecionada
 */
const SecaoAgendaDashboard = ({ 
    proximasPartidas, 
    equipeNome, 
    navegarParaEquipeFocada, 
    setPartidaSelecionada,
    temMaisPartidas
}) => {
    return (
        <section className="bento-card card-agenda" style={{ order: 2 }}>
            <div className="bento-top">
                <div className="bento-titulo">
                    <span className="bento-icone blue"><Calendar size={17} /></span>
                    <h2>Partidas ({equipeNome || 'Nenhuma Equipe'})</h2>
                </div>
                <button className="bento-atalho" onClick={() => navegarParaEquipeFocada('agenda')}>
                    Ver Agenda <ChevronRight size={14} />
                </button>
            </div>
            
            {proximasPartidas.length > 0 ? (
                <div className="agenda-lista">
                    {proximasPartidas.map(p => {
                        const [, mes, dia] = p.data.split('-');
                        const inscrita = p.minhaInscricao?.status === 'confirmado';
                        const emEspera = p.minhaInscricao?.status === 'espera';
                        
                        // Regras de Inscrição
                        const regras = p.equipes?.regras || {};
                        const openDays = regras.registrationOpenDays || 7;
                        const eventDate = new Date(`${p.data}T${p.hora}`);
                        const openDate = new Date(eventDate.getTime() - (openDays * 24 * 60 * 60 * 1000));
                        const agora = new Date();
                        const aberta = agora >= openDate;

                        return (
                            <div 
                                key={p.id} 
                                className="agenda-item" 
                                onClick={() => setPartidaSelecionada(p)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="agenda-data">
                                    <strong>{dia}/{mes}</strong>
                                    <span>{p.hora?.substring(0, 5)}</span>
                                </div>
                                <div className="agenda-info" style={{ flex: 1 }}>
                                    <span className="agenda-equipe">{p.equipes?.nome}</span>
                                    <span className="agenda-local">
                                        <MapPin size={11} /> {p.local_nome || p.local || 'Local a definir'}
                                    </span>
                                    {!aberta && (
                                        <span style={{ fontSize: '10px', color: '#f59e0b', marginTop: '4px', display: 'block' }}>
                                            Abre inscrição: {openDate.toLocaleDateString('pt-BR')} às {openDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                    {inscrita && <span className="badge confirmado">✓ Confirmado</span>}
                                    {emEspera && <span className="badge espera">Espera</span>}
                                    {aberta && !p.minhaInscricao && <span className="badge aviso">Participar</span>}
                                    {!aberta && <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b' }}>Em breve</span>}
                                </div>
                            </div>
                        );
                    })}
                    {temMaisPartidas && (
                        <button 
                            onClick={() => navegarParaEquipeFocada('agenda')}
                            style={{
                                width: '100%',
                                padding: '10px',
                                background: 'rgba(255,255,255,0.05)',
                                border: 'none',
                                borderRadius: '12px',
                                color: '#e2e8f0',
                                cursor: 'pointer',
                                marginTop: '8px',
                                fontSize: '0.85rem'
                            }}
                        >
                            Carregar Mais Partidas...
                        </button>
                    )}
                </div>
            ) : (
                <div className="bento-vazio">
                    <Calendar size={36} opacity={0.3} />
                    <p>Nenhuma partida agendada para {equipeNome}.</p>
                </div>
            )}
        </section>
    );
};

export default SecaoAgendaDashboard;
