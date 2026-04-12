import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Clock, Users, ChevronRight, Plus, Wallet, Edit, Trash2 } from 'lucide-react';
import { usarPartidas } from '../../../contextos/PartidasContexto';
import { usarEquipe } from '../../../contextos/EquipeContexto';
import { usarAutenticacao } from '../../../contextos/AutenticacaoContexto';
import { rastrear } from '../../../servicos/rastreamento';
import Botao from '../../../componentes/Botao/Botao';
import ModalDetalhesPartida from './modais/ModalDetalhesPartida';
import ModalCriacaoPartida from '../Admin/tabs/modais/ModalCriacaoPartida';
import ModalEdicaoPartida from '../Admin/tabs/modais/ModalEdicaoPartida';

const AgendaTab = () => {
    const { partidasCarregadas, carregarPartidas, excluirPartida } = usarPartidas();
    const { equipeAtiva, temPermissaoEquipe } = usarEquipe();
    const [carregando, setCarregando] = useState(true);
    const [partidaSelecionada, setPartidaSelecionada] = useState(null);
    const [modalCriacaoAberto, setModalCriacaoAberto] = useState(false);
    const [partidaEditando, setPartidaEditando] = useState(null);
    const [exibirHistorico, setExibirHistorico] = useState(false);

    const podeGerenciar = equipeAtiva?.papel === 'admin' || temPermissaoEquipe('gerenciar_partidas');

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

    const partidasPassadas = partidasCarregadas.filter(p => {
        const dataPartida = new Date(p.data + 'T' + p.hora);
        return dataPartida < new Date();
    }).sort((a, b) => new Date(b.data + 'T' + b.hora) - new Date(a.data + 'T' + a.hora));

    const partidasExibir = exibirHistorico ? partidasPassadas : partidasFuturas;

    const formatarData = (dataOriginal) => {
        const dataObj = new Date(dataOriginal + 'T00:00:00');
        const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        return `${diasSemana[dataObj.getDay()]}, ${dataObj.toLocaleDateString('pt-BR')}`;
    };

    const handleExcluir = async (partida, e) => {
        e.stopPropagation();
        if (!window.confirm(`Excluir a partida do dia ${formatarData(partida.data)}?`)) return;
        const res = await excluirPartida(partida.id);
        if (!res.sucesso) {
            alert('Erro: ' + res.erro);
        } else {
            rastrear.clique('agenda_excluiu_partida', 'Cancelamento / Exclusao de partida ja agendada no backend');
        }
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                        <div>
                            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
                                {exibirHistorico ? 'Veja os resultados e a frequência das partidas anteriores.' : 'Confira as próximas partidas agendadas e confirme sua presença.'}
                            </p>
                            <button 
                                onClick={() => {
                                    rastrear.clique('agenda_alternar_historico', 'Visualizou historico passado de partidas', { status_futuro: !exibirHistorico });
                                    setExibirHistorico(!exibirHistorico);
                                }}
                                style={{ 
                                    background: 'none', 
                                    border: 'none', 
                                    color: '#38bdf8', 
                                    fontSize: '0.85rem', 
                                    cursor: 'pointer', 
                                    padding: '0', 
                                    marginTop: '8px',
                                    textDecoration: 'underline',
                                    fontWeight: '500'
                                }}
                            >
                                {exibirHistorico ? '« Voltar para Próximos Jogos' : 'Ver Histórico de Jogos »'}
                            </button>
                        </div>
                        {(equipeAtiva.papel === 'admin' || temPermissaoEquipe('gerenciar_partidas')) && (
                            <Botao onClick={() => {
                                rastrear.clique('agenda_clicou_criar_partida', 'Abriu modal de instanciacao de partida');
                                setModalCriacaoAberto(true);
                            }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Plus size={18} /> Agendar Partida
                            </Botao>
                        )}
                    </div>
                </div>

                <div style={{ display: 'grid', gap: '16px' }}>
                    {partidasExibir.length > 0 ? partidasExibir.map(partida => (
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
                                transition: 'all 0.2s',
                                flexWrap: window.innerWidth < 500 ? 'wrap' : 'nowrap',
                                gap: '12px'
                            }}
                            className="hover-card"
                            onClick={() => {
                                rastrear.clique('agenda_abrir_detalhes_partida', 'Acessou o modal interativo da partida listada');
                                setPartidaSelecionada(partida);
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                <div style={{ 
                                    fontSize: '1.1rem', 
                                    fontWeight: '600', 
                                    color: new Date(partida.data + 'T' + partida.hora) < new Date() ? '#f43f5e' : '#f8fafc' 
                                }}>
                                    {formatarData(partida.data)} às {partida.hora.substring(0, 5)}
                                </div>
                                <div style={{ 
                                    display: 'flex', 
                                    gap: window.innerWidth < 768 ? '8px 12px' : '16px', 
                                    color: '#94a3b8', 
                                    fontSize: '0.85rem',
                                    flexWrap: 'wrap'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <MapPin size={14} /> {partida.local_nome || 'Local a definir'}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Users size={14} /> Vagas: {partida.vagas || 'Ilimitadas'}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontWeight: 'bold' }}>
                                        <Wallet size={14} /> {Number(partida.valor_avulso) > 0 ? `R$ ${Number(partida.valor_avulso).toFixed(2).replace('.', ',')}` : 'Grátis'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '4px',
                                marginLeft: window.innerWidth < 500 ? 'auto' : '0' 
                            }}>
                                {podeGerenciar && (
                                    <>
                                        <button 
                                            className="btn-acao-icone" 
                                            title="Editar partida"
                                            onClick={(e) => { e.stopPropagation(); setPartidaEditando(partida); }}
                                            style={{ color: '#38bdf8' }}
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button 
                                            className="btn-acao-icone btn-perigo" 
                                            title="Excluir partida"
                                            onClick={(e) => handleExcluir(partida, e)}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </>
                                )}
                                <div style={{ color: '#38bdf8', padding: '8px' }}>
                                    <ChevronRight size={20} />
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                            <Calendar size={32} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
                            <p>{exibirHistorico ? 'Nenhum histórico de partidas econtrado.' : 'Nenhuma partida agendada para os próximos dias.'}</p>
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

            <ModalCriacaoPartida 
                isOpen={modalCriacaoAberto}
                onClose={() => setModalCriacaoAberto(false)}
                equipeId={equipeAtiva.id}
                aoSucesso={() => carregarPartidas(equipeAtiva.id)}
            />

            {partidaEditando && (
                <ModalEdicaoPartida
                    isOpen={!!partidaEditando}
                    onClose={() => setPartidaEditando(null)}
                    partida={partidaEditando}
                />
            )}
        </div>
    );
};

export default AgendaTab;
