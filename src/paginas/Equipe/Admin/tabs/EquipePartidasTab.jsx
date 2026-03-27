import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Calendar, Users, Wallet, Info, Check } from 'lucide-react';
import { usarEquipe } from '../../../../contextos/EquipeContexto';
import { usarPartidas } from '../../../../contextos/PartidasContexto';
import Botao from '../../../../componentes/Botao/Botao';
import ModalCriacaoPartida from './modais/ModalCriacaoPartida';
import ModalEdicaoPartida from './modais/ModalEdicaoPartida';

const EquipePartidasTab = () => {
    const { equipeAtiva, temPermissaoEquipe } = usarEquipe();
    const { carregarPartidas, excluirPartida, partidasCarregadas } = usarPartidas();
    const [carregando, setCarregando] = useState(true);
    const [mostrarHistorico, setMostrarHistorico] = useState(false);
    const [modalCriacaoAberto, setModalCriacaoAberto] = useState(false);
    const [partidaEditando, setPartidaEditando] = useState(null);

    const podeGerenciar = equipeAtiva?.papel === 'admin' || temPermissaoEquipe('gerenciar_partidas');

    useEffect(() => {
        if (equipeAtiva?.id) {
            buscar();
        }
    }, [equipeAtiva]);

    const buscar = async () => {
        setCarregando(true);
        await carregarPartidas(equipeAtiva.id);
        setCarregando(false);
    };

    const handleNovaPartida = () => {
        setModalCriacaoAberto(true);
    };

    const handleDeletePartida = async (id) => {
        if (!window.confirm('Tem certeza que deseja excluir esta partida?')) return;
        const result = await excluirPartida(id);
        if (!result.sucesso) alert('Erro ao excluir partida: ' + result.erro);
    };

    const PartidaCard = ({ partida }) => {
        const isPast = new Date(partida.data + 'T' + partida.hora) < new Date();
        
        // Formatar data para exibição (ex: 30 de Março, Segunda-feira)
        const formatData = (dateString) => {
            const date = new Date(dateString + 'T00:00:00');
            const options = { weekday: 'long', day: '2-digit', month: 'long' };
            const formatada = date.toLocaleDateString('pt-BR', options);
            return formatada.charAt(0).toUpperCase() + formatada.slice(1);
        };

        return (
            <div style={{
                background: 'rgba(255,255,255,0.03)',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.05)',
                opacity: isPast ? 0.7 : 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{
                        padding: '4px 12px',
                        borderRadius: '8px',
                        background: 'rgba(34, 197, 94, 0.1)',
                        color: '#22c55e',
                        fontWeight: '800',
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        border: '1px solid rgba(34, 197, 94, 0.3)'
                    }}>
                        {equipeAtiva?.modalidade?.toUpperCase() || 'ESPORTE'}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {podeGerenciar && (
                            <>
                                <button className="btn-acao-icone" title="Editar" onClick={() => setPartidaEditando(partida)}>
                                    <Edit size={18} />
                                </button>
                                <button className="btn-acao-icone btn-perigo" onClick={() => handleDeletePartida(partida.id)} title="Excluir">
                                    <Trash2 size={18} />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#f8fafc' }}>{formatData(partida.data)}</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '13px' }}>
                        <Calendar size={14} /> {partida.hora}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '13px' }}>
                        <Users size={14} /> {partida.vagas} vagas
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '13px', gridColumn: 'span 2' }}>
                        <Wallet size={14} /> R$ {(partida.valor_avulso || 0).toFixed(2).replace('.', ',')} por jogo
                    </div>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
                    <Botao fullWidth variant={isPast ? 'secundario' : 'primario'} style={{ gap: '8px' }}>
                        {isPast ? <Info size={18}/> : <Check size={18}/>}
                        {isPast ? 'Ver Frequência' : 'Frequência / Lista'}
                    </Botao>
                </div>
            </div>
        );
    };

    if (carregando) return <div className="p-8 text-center text-muted">Carregando partidas...</div>;

    const partidasFiltradas = partidasCarregadas.filter(p => {
        const isPast = new Date(p.data + 'T' + p.hora) < new Date();
        return mostrarHistorico ? isPast : !isPast;
    });

    return (
        <div className="animate-fade-in">
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '8px', color: '#f8fafc' }}>Partidas da Equipe</h3>
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                            Agende os jogos e gerencie quem vai estar presente.
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '14px', cursor: 'pointer' }} onClick={() => setMostrarHistorico(!mostrarHistorico)}>
                            <span>{mostrarHistorico ? "Ver Próximas" : "Ver Histórico"}</span>
                            <div style={{
                                width: '40px',
                                height: '22px',
                                borderRadius: '20px',
                                background: mostrarHistorico ? 'var(--primaria)' : 'rgba(255,255,255,0.1)',
                                position: 'relative',
                                transition: 'all 0.3s'
                            }}>
                                <div style={{
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    background: 'white',
                                    position: 'absolute',
                                    top: '3px',
                                    left: mostrarHistorico ? '21px' : '3px',
                                    transition: 'all 0.3s'
                                }} />
                            </div>
                        </div>
            {podeGerenciar && (
                <Botao onClick={handleNovaPartida} style={{ gap: '8px' }}>
                    <Plus size={18} /> Nova Partida
                </Botao>
            )}
                    </div>
                </div>

                {partidasFiltradas.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                        {partidasFiltradas.map(partida => (
                            <PartidaCard key={partida.id} partida={partida} />
                        ))}
                    </div>
                ) : (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                        Nenhuma partida {mostrarHistorico ? 'no histórico' : 'agendada'}.
                    </div>
                )}
            </div>
            
            <ModalCriacaoPartida 
                isOpen={modalCriacaoAberto} 
                onClose={() => setModalCriacaoAberto(false)}
            />

            <ModalEdicaoPartida
                isOpen={!!partidaEditando}
                onClose={() => setPartidaEditando(null)}
                partida={partidaEditando}
            />
        </div>
    );
};

export default EquipePartidasTab;
