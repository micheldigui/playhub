import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Clock, Users, Star, DollarSign } from 'lucide-react';
import { usarPartidas } from '../../../../contextos/PartidasContexto';
import { usarEquipe } from '../../../../contextos/EquipeContexto';
import { usarAutenticacao } from '../../../../contextos/AutenticacaoContexto';
import { usarFinanceiro } from '../../../../contextos/FinanceiroContexto';
import Botao from '../../../../componentes/Botao/Botao';
import '../../../../componentes/Modal/Modal.css';

const ModalDetalhesPartida = ({ isOpen, onClose, partida }) => {
    const { usuario } = usarAutenticacao();
    const { buscarPresencas, confirmarPresenca, cancelarPresenca } = usarPartidas();
    const { equipeAtiva, carregarMembrosEquipe } = usarEquipe();
    const { buscarPagamentosAvulsosPartida, registrarPagamentoAvulso, removerPagamentoAvulso } = usarFinanceiro();

    const [presencas, setPresencas] = useState([]);
    const [membros, setMembros] = useState([]);
    const [pagamentos, setPagamentos] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [processandoAcao, setProcessandoAcao] = useState(false);

    useEffect(() => {
        if (isOpen && partida) {
            carregarDados();
        }
    }, [isOpen, partida]);

    const carregarDados = async () => {
        setCarregando(true);
        try {
            // Busca presencas do banco e os membros da equipe para pegar os vínculos
            const [respPresencas, respMembros, respPagamentos] = await Promise.all([
                buscarPresencas(partida.id),
                carregarMembrosEquipe(equipeAtiva.id),
                buscarPagamentosAvulsosPartida(partida.id)
            ]);

            if (respPresencas.sucesso) {
                setPresencas(respPresencas.presencas || []);
            }
            if (respMembros) {
                setMembros(respMembros);
            }
            if (respPagamentos) {
                setPagamentos(respPagamentos);
            }
        } catch (error) {
            console.error('Erro ao carregar detalhes da partida:', error);
        } finally {
            setCarregando(false);
        }
    };

    if (!isOpen || !partida) return null;

    const limite = partida.vagas || 999;

    const getVinculoUsuario = (userId) => {
        const membroRef = membros.find(m => m.usuarios?.id === userId);
        return membroRef?.vinculo || 'avulso';
    };

    // Calcula filas dinamicamente com base nas regras de prioridade
    let todosInscritos = [...presencas].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    if (equipeAtiva?.regras?.mensalistaPriority) {
        todosInscritos.sort((a, b) => {
            const vinculoA = getVinculoUsuario(a.usuarios.id);
            const vinculoB = getVinculoUsuario(b.usuarios.id);
            if (vinculoA === 'mensalista' && vinculoB !== 'mensalista') return -1;
            if (vinculoB === 'mensalista' && vinculoA !== 'mensalista') return 1;
            return 0; // se ambos forem iguais, mantém a cronológica
        });
    }

    const listaConfirmados = todosInscritos.slice(0, limite);
    const listaEspera = todosInscritos.slice(limite);
    
    // Identificar a situação do usuário atual logado
    const isLotado = listaConfirmados.length >= limite;
    const inscricaoUser = todosInscritos.find(p => p.usuarios?.id === usuario?.id);
    let statusUser = 'nenhum';
    if (inscricaoUser) {
        if (listaConfirmados.some(p => p.id === inscricaoUser.id)) {
            statusUser = 'confirmado';
        } else {
            statusUser = 'espera';
        }
    }

    // Regras de Tempo (Novo)
    const isAdmin = equipeAtiva?.papel === 'admin' || equipeAtiva?.papel === 'sub_admin';
    const regras = equipeAtiva?.regras || {};
    const openDays = regras.registrationOpenDays || 7;
    const closeHours = regras.registrationCloseHours || 1;
    const cancelHours = regras.cancelDeadlineHours || 2;

    const eventDateTime = new Date(`${partida.data}T${partida.hora}`);
    const now = new Date();

    const openTime = new Date(eventDateTime.getTime() - (openDays * 24 * 60 * 60 * 1000));
    const closeTime = new Date(eventDateTime.getTime() - (closeHours * 60 * 60 * 1000));
    const cancelDeadline = new Date(eventDateTime.getTime() - (cancelHours * 60 * 60 * 1000));

    const isRegistrationOpen = now >= openTime;
    const isRegistrationClosed = now >= closeTime;
    const isLateCancellation = now >= cancelDeadline;

    const handleAcaoPresenca = async () => {
        if (statusUser !== 'nenhum') {
            // Cancelar
            if (isLateCancellation) {
                if (!window.confirm(`⚠️ ATENÇÃO: CANCELAMENTO TARDIO ⚠️\n\nFaltam menos de ${cancelHours} horas para a partida.\n\nSe você cancelar agora, receberá uma PUNIÇÃO automaticamente pelo sistema.\n\nTem certeza que deseja aceitar a punição e cancelar?`)) {
                    return;
                }
            } else {
                if (!window.confirm("Deseja realmente cancelar sua inscrição nesta partida?")) {
                    return;
                }
            }
            
            setProcessandoAcao(true);
            const result = await cancelarPresenca(partida.id);
            if (result.sucesso) {
                await carregarDados(); 
            } else {
                alert('Erro ao cancelar: ' + result.erro);
            }
        } else {
            // Tentar entrar (o status no server importa pouco pois a fila frontend recalcula, mas gravamos status guess)
            const novoStatus = isLotado ? 'espera' : 'confirmado';
            const mzg = isLotado ? "A partida está cheia. Você vai entrar para a lista de espera. Deseja continuar?" : "Confirmar sua presença no jogo?";
            if (window.confirm(mzg)) {
                setProcessandoAcao(true);
                const result = await confirmarPresenca(partida.id, novoStatus);
                if (result.sucesso) {
                    await carregarDados();
                } else {
                    alert('Erro ao inscrever-se: ' + result.erro);
                }
            }
        }
        setProcessandoAcao(false);
    };

    const handleTogglePagamentoAvulso = async (usuarioId, jaPago) => {
        if (!isAdmin) return;
        
        try {
            if (jaPago) {
                await removerPagamentoAvulso(partida.id, usuarioId);
            } else {
                await registrarPagamentoAvulso({
                    partida_id: partida.id,
                    usuario_id: usuarioId,
                    valor_pago: partida.valor_avulso || 0
                });
            }
            await carregarDados();
        } catch (error) {
            console.error('Erro ao alternar pagamento avulso:', error);
        }
    };

    const formatarData = (dataDb) => {
        const d = new Date(dataDb + 'T00:00:00');
        return d.toLocaleDateString('pt-BR');
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '600px', width: '95%' }}>
                <div className="modal-header">
                    <h2>Detalhes da Partida</h2>
                    <button className="btn-fechar" onClick={onClose}><X size={24} /></button>
                </div>

                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* INFO PARTIDA */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '12px', color: '#f8fafc' }}>
                            {formatarData(partida.data)} às {partida.hora.substring(0, 5)}
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', color: '#94a3b8', fontSize: '0.9rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={16} /> {partida.local_nome || 'A definir'}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><DollarSign size={16} /> Avulso: {partida.valor_avulso ? `R$ ${partida.valor_avulso.toFixed(2).replace('.', ',')}` : 'Grátis'}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={16} /> Vagas: {limite === 999 ? 'Ilimitadas' : limite}</div>
                        </div>
                    </div>

                    {carregando ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Carregando lista...</div>
                    ) : (
                        <>
                            {/* REGRAS DE TEMPO */}
                            {!isRegistrationOpen && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '12px', borderRadius: '8px', fontSize: '0.9rem' }}>
                                    <Clock size={18} />
                                    <span>Inscrições abrem: <strong>{openTime.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</strong></span>
                                </div>
                            )}

                            {(isRegistrationClosed && statusUser === 'nenhum' && !isAdmin) && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f43f5e', background: 'rgba(244, 63, 94, 0.1)', padding: '12px', borderRadius: '8px', fontSize: '0.9rem' }}>
                                    <X size={18} />
                                    <span>Inscrições encerradas pelo horário limite.</span>
                                </div>
                            )}

                            {(isRegistrationOpen && !isRegistrationClosed && statusUser === 'nenhum') && (
                                <div style={{ fontSize: '0.85rem', color: '#94a3b8', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #fbbf24' }}>
                                    <strong>Regras:</strong> Cancele até {cancelHours}h antes para evitar punições. 
                                    {closeHours > 0 && ` Limite para inscrição: ${closeHours}h antes da partida.`}
                                </div>
                            )}

                            {/* AÇÃO PRINCIPAL */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', background: 'rgba(15,23,42,0.4)', padding: '20px', borderRadius: '12px' }}>
                                {statusUser === 'confirmado' && (
                                    <h4 style={{ color: '#10b981', margin: 0 }}>✓ Você está confirmado neste jogo!</h4>
                                )}
                                {statusUser === 'espera' && (
                                    <h4 style={{ color: '#fbbf24', margin: 0 }}>⏳ Você está na fila de espera.</h4>
                                )}
                                {statusUser === 'nenhum' && isLotado && isRegistrationOpen && !isRegistrationClosed && (
                                    <h4 style={{ color: '#f43f5e', margin: 0 }}>Vagas esgotadas</h4>
                                )}
                                
                                <Botao 
                                    onClick={handleAcaoPresenca} 
                                    disabled={processandoAcao || 
                                              (statusUser === 'nenhum' && !isRegistrationOpen) || 
                                              (statusUser === 'nenhum' && isRegistrationClosed && !isAdmin)
                                             }
                                    variant={statusUser !== 'nenhum' ? 'perigo' : 'primario'}
                                    style={{ width: '100%', justifyContent: 'center' }}
                                >
                                    {processandoAcao ? 'Processando...' : 
                                     statusUser !== 'nenhum' ? 'Cancelar Minha Inscrição' : 
                                     !isRegistrationOpen ? 'Inscrições Fechadas' : 
                                     (isRegistrationClosed && isAdmin) ? 'Inscrição Manual (Admin)' :
                                     (isRegistrationClosed && !isAdmin) ? 'Inscrições Encerradas' :
                                     isLotado ? 'Entrar na Lista de Espera' : 
                                     'Tô Dentro! (Confirmar)'}
                                </Botao>
                            </div>

                            {/* LISTA DE CONFIRMADOS */}
                            <div>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: '#f8fafc', display: 'flex', justifyContent: 'space-between' }}>
                                    Confirmados 
                                    <span style={{ fontSize: '0.9rem', color: '#38bdf8' }}>{listaConfirmados.length} / {limite === 999 ? '∞' : limite}</span>
                                </h3>
                                
                                {listaConfirmados.length === 0 ? (
                                    <p style={{ color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic' }}>Ninguém confirmado ainda. Seja o primeiro!</p>
                                ) : (
                                    <div style={{ display: 'grid', gap: '8px' }}>
                                        {listaConfirmados.map((p, index) => {
                                            const u = p.usuarios;
                                            const vinculo = getVinculoUsuario(u.id);
                                            return (
                                                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
                                                    <span style={{ width: '20px', color: '#64748b', fontSize: '0.85rem' }}>{index + 1}.</span>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                                                        {u?.foto_url ? <img src={u.foto_url} alt="avatar" style={{width:'100%', height:'100%', objectFit:'cover'}}/> : <Users size={16} style={{margin:'8px'}}/>}
                                                    </div>
                                                    <div style={{ flex: 1, color: '#f8fafc', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {u?.nome_completo || 'Desconhecido'}
                                                            {vinculo === 'mensalista' ? (
                                                                <Star size={14} fill="#fbbf24" color="#fbbf24" title="Mensalista" />
                                                            ) : (
                                                                <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: '#94a3b8' }}>Avulso</span>
                                                            )}
                                                        </div>

                                                        {vinculo === 'avulso' && isAdmin && (
                                                            <button 
                                                                onClick={() => handleTogglePagamentoAvulso(u.id, pagamentos.some(pg => pg.usuario_id === u.id))}
                                                                style={{ 
                                                                    background: 'transparent', 
                                                                    border: 'none', 
                                                                    cursor: 'pointer',
                                                                    padding: '4px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center'
                                                                }}
                                                            >
                                                                <DollarSign 
                                                                    size={18} 
                                                                    color={pagamentos.some(pg => pg.usuario_id === u.id) ? '#10b981' : '#64748b'} 
                                                                    style={{ opacity: pagamentos.some(pg => pg.usuario_id === u.id) ? 1 : 0.5 }}
                                                                />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* FILA DE ESPERA */}
                            {listaEspera.length > 0 && (
                                <div style={{ marginTop: '12px' }}>
                                    <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: '#fbbf24' }}>
                                        Fila de Espera ({listaEspera.length})
                                    </h3>
                                    <div style={{ display: 'grid', gap: '8px' }}>
                                        {listaEspera.map((p, index) => {
                                            const u = p.usuarios;
                                            const vinculo = getVinculoUsuario(u.id);
                                            return (
                                                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '8px', borderLeft: '3px solid #fbbf24', opacity: 0.8 }}>
                                                    <span style={{ width: '20px', color: '#64748b', fontSize: '0.85rem' }}>{index + 1}.</span>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                                                        {u?.foto_url ? <img src={u.foto_url} alt="avatar" style={{width:'100%', height:'100%', objectFit:'cover'}}/> : <Users size={16} style={{margin:'8px'}}/>}
                                                    </div>
                                                    <div style={{ flex: 1, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        {u?.nome_completo || 'Desconhecido'}
                                                        {vinculo === 'mensalista' && <Star size={14} fill="#fbbf24" color="#fbbf24" title="Mensalista" />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ModalDetalhesPartida;
