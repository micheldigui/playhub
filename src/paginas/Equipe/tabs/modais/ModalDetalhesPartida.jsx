import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Clock, Users, Star, DollarSign, MessageCircle } from 'lucide-react';
import { usarPartidas } from '../../../../contextos/PartidasContexto';
import { usarEquipe } from '../../../../contextos/EquipeContexto';
import { usarAutenticacao } from '../../../../contextos/AutenticacaoContexto';
import { usarFinanceiro } from '../../../../contextos/FinanceiroContexto';
import Botao from '../../../../componentes/Botao/Botao';
import Modal from '../../../../componentes/Modal/Modal';

const ModalDetalhesPartida = ({ isOpen, onClose, partida }) => {
    const { usuario } = usarAutenticacao();
    const { buscarPresencas, confirmarPresenca, cancelarPresenca, lancarFrequencia, removerInscricaoAdmin, adicionarInscricaoAdmin, alternarPagamentoAvulso, buscarPagamentosAvulsosPartida, registrarPagamentoAvulso, removerPagamentoAvulso, buscarPunicoesPartida } = usarPartidas();
    const { equipeAtiva, carregarMembrosEquipe, temPermissaoEquipe, getLabelVinculo } = usarEquipe();
    const { verificarSituacaoFinanceiraAtleta } = usarFinanceiro();

    const [presencas, setPresencas] = useState([]);
    const [membros, setMembros] = useState([]);
    const [pagamentos, setPagamentos] = useState([]);
    const [punicoes, setPunicoes] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [processandoAcao, setProcessandoAcao] = useState(false);
    const [pickerAberto, setPickerAberto] = useState(null); // id do usuário com o seletor de cartão aberto

    useEffect(() => {
        if (isOpen && partida && equipeAtiva?.id) {
            carregarDados();
        }
    }, [isOpen, partida, equipeAtiva?.id]);

    const carregarDados = async () => {
        if (!equipeAtiva?.id) return;
        setCarregando(true);
        try {
            // Busca presencas do banco e os membros da equipe para pegar os vínculos
            const [respPresencas, respMembros, respPagamentos, respPunicoes] = await Promise.all([
                buscarPresencas(partida.id),
                carregarMembrosEquipe(equipeAtiva.id),
                buscarPagamentosAvulsosPartida(partida.id),
                buscarPunicoesPartida(partida.id)
            ]);

            if (respPresencas.sucesso) {
                setPresencas(respPresencas.presencas || []);
            }
            if (respMembros) {
                setMembros(respMembros);
            }
            if (respPagamentos?.sucesso) {
                setPagamentos(respPagamentos.pagamentos || []);
            }
            if (respPunicoes?.sucesso) {
                setPunicoes(respPunicoes.punicoes || []);
            }
        } catch (error) {
            console.error('Erro ao carregar detalhes da partida:', error);
        } finally {
            setCarregando(false);
        }
    };

    if (!isOpen || !partida || !equipeAtiva) return null;

    const limite = partida.vagas || 999;

    const getVinculoUsuario = (userId) => {
        const membroRef = membros.find(m => m.usuarios?.id === userId);
        return membroRef?.vinculo || 'avulso';
    };

    // Função auxiliar para obter o emoji de papel do membro
    const getEmojiPapel = (userId) => {
        const membroRef = membros.find(m => m.usuarios?.id === userId);
        if (!membroRef) return '';
        if (membroRef.papel === 'admin') return ' 👑'; // Capitão - coroa de ouro
        if (membroRef.papel === 'sub_admin') return ' 🥈'; // Vice - coroa de prata
        return '';
    };

    // Função auxiliar para obter o emoji de vínculo
    const getEmojiVinculo = (vinculo) => {
        return vinculo === 'mensalista' ? ' ⭐' : ' ✩';
    };

    // Formata nome: primeiro nome + inicial do último sobrenome (maiúscula)
    const formatName = (fullName) => {
        if (!fullName) return '';
        const parts = fullName.trim().toLowerCase().split(/\s+/);
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        
        const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        const last = parts[parts.length - 1].charAt(0).toUpperCase() + parts[parts.length - 1].slice(1);
        
        return `${first} ${last}`;
    };

    // Função auxiliar para buscar o nome do usuário lidando com perfis privados / null
    const getNomeUsuario = (userId, usuarioPayload) => {
        // Tenta pegar do payload direto da presenca (p.usuarios)
        if (usuarioPayload?.nome_completo) return formatName(usuarioPayload.nome_completo);
        if (usuarioPayload?.apelido) return formatName(usuarioPayload.apelido);
        
        // Fallback: se o RLS (perfil privado) ocultou, tenta buscar pelo membro da equipe atrelado
        const membroRef = membros.find(m => m.usuario_id === userId || m.usuarios?.id === userId);
        if (membroRef?.usuarios?.nome_completo) return formatName(membroRef.usuarios.nome_completo);
        if (membroRef?.usuarios?.apelido) return formatName(membroRef.usuarios.apelido);
        
        return 'Desconhecido';
    };

    // Calcula filas dinamicamente com base nas regras de prioridade
    let todosInscritos = [...presencas].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    if (equipeAtiva?.regras?.prioridade_mensalista) {
        todosInscritos.sort((a, b) => {
            const vinculoA = getVinculoUsuario(a.usuarios?.id);
            const vinculoB = getVinculoUsuario(b.usuarios?.id);
            if (vinculoA === 'mensalista' && vinculoB !== 'mensalista') return -1;
            if (vinculoB === 'mensalista' && vinculoA !== 'mensalista') return 1;
            return 0; // se ambos forem iguais, mantém a cronológica por inscrição
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
    const isAdmin = equipeAtiva?.papel === 'admin' || temPermissaoEquipe('gerenciar_partidas') || temPermissaoEquipe('gerenciar_punicoes');
    const regras = equipeAtiva?.regras || {};
    const openDays = regras.dias_abertura_inscricao || 7;
    const closeHours = regras.horas_limite_inscricao || 1;
    const cancelHours = regras.horas_limite_cancelamento || 2;

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
            const vinculoAtual = getVinculoUsuario(usuario?.id);
            const mzg = isLotado ? "A partida está cheia. Você vai entrar para a lista de espera. Deseja continuar?" : "Confirmar sua presença no jogo?";
            if (window.confirm(mzg)) {
                setProcessandoAcao(true);
                // INJETANDO O OBJETO E NÃO APENAS O ID (Erro do Null resolvido)
                // Novo: Bloqueio Financeiro para Mensalistas
                const fin = await verificarSituacaoFinanceiraAtleta(partida.equipe_id, usuario?.id);
                if (fin.bloqueio) {
                    alert(`⚠️ INSCRIÇÃO BLOQUEADA\n\nVocê possui a mensalidade de ${fin.ciclo} em atraso.\n\nPor favor, procure o capitão ou vice-capitão da equipe para regularizar sua situação financeira.`);
                    setProcessandoAcao(false);
                    return;
                }

                const result = await confirmarPresenca(partida, novoStatus, vinculoAtual);
                if (result.sucesso) {
                    await carregarDados();
                } else {
                    alert('Erro ao inscrever-se: ' + result.erro);
                }
            }
        }
        setProcessandoAcao(false);
    };

    const handleShareWhatsApp = () => {
        if (!partida) return;

        const dataFormatada = formatarData(partida.data);
        const horaFormatada = partida.hora.substring(0, 5);
        const local = partida.local_nome || 'Local a definir';
        const equipeNome = equipeAtiva?.nome || 'Equipe';

        let mensagem = `*🏟️ JOGO CONFIRMADO - ${equipeNome.toUpperCase()}*\n`;
        mensagem += `📅 *DATA:* ${dataFormatada}\n`;
        mensagem += `⏰ *HORA:* ${horaFormatada}\n`;
        mensagem += `📍 *LOCAL:* ${local}\n`;
        mensagem += `---------------------------\n\n`;

        mensagem += `*✅ CONFIRMADOS (${listaConfirmados.length}/${limite === 999 ? '∞' : limite})*\n`;
        if (listaConfirmados.length > 0) {
            listaConfirmados.forEach((p, index) => {
                const userId = p.usuario_id || p.usuarios?.id;
                const vinculo = getVinculoUsuario(userId);
                const nomeExibir = getNomeUsuario(userId, p.usuarios);
                mensagem += `${index + 1}. ${nomeExibir}${getEmojiPapel(userId)}${getEmojiVinculo(vinculo)}\n`;
            });
        } else {
            mensagem += `_Nenhum confirmado_\n`;
        }

        if (listaEspera.length > 0) {
            mensagem += `\n*⏳ LISTA DE ESPERA (${listaEspera.length})*\n`;
            listaEspera.forEach((p, index) => {
                const userId = p.usuario_id || p.usuarios?.id;
                const vinculo = getVinculoUsuario(userId);
                const nomeExibir = getNomeUsuario(userId, p.usuarios);
                mensagem += `${index + 1}. ${nomeExibir}${getEmojiPapel(userId)}${getEmojiVinculo(vinculo)}\n`;
            });
        }

        mensagem += `\n---------------------------\n`;
        mensagem += `⭐ _Mensalista_  ✩ _Avulso_  👑 _Capitão_  🥈 _Vice_\n`;
        mensagem += `👉 _Garanta sua vaga em playhubapp.com.br_ 🚀`;

        const encodedMessage = encodeURIComponent(mensagem);
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedMessage}`;

        window.open(whatsappUrl, '_blank');
    };

    const handleTogglePagamentoAvulso = async (usuarioId) => {
        if (!isAdmin) return;
        setProcessandoAcao(true); 
        try {
            const pagDoc = pagamentos.find(pg => pg.usuario_id === usuarioId);
            if (pagDoc) {
                await alternarPagamentoAvulso(pagDoc.id, pagDoc.status);
            } else {
                // Se o Documento não existe ainda (ex: presenças cadastradas antigas ou sem disparador)
                // O Admin Força a criação do caixa PAGO!
                await registrarPagamentoAvulso({
                    equipe_id: partida.equipe_id,
                    partida_id: partida.id,
                    usuario_id: usuarioId,
                    status: 'pago',
                    valor_pago: partida.valor_avulso || 0
                });
            }
            await carregarDados();
        } catch (error) {
            console.error('Erro ao alternar pagamento avulso:', error);
            alert('Erro ao registrar/remover pagamento: ' + error.message);
        }
        setProcessandoAcao(false); 
    };

    const handleRemoverJogadorAdmin = async (targetUserId, nome) => {
        if (!window.confirm(`Tem certeza que deseja remover ${nome} da partida sem gerar punições?`)) return;
        setProcessandoAcao(true);
        try {
            await removerInscricaoAdmin(partida.id, targetUserId);
            await carregarDados();
        } catch (error) {
            console.error('Erro ao remover jogador:', error);
            alert('Erro ao remover jogador: ' + error.message);
        }
        setProcessandoAcao(false);
    };

    const handleClickFrequencia = async (targetUserId, freqClicada, freqAtual, vinculo, tipoCartao = 'vermelho') => {
        if (!isAdmin) return;
        setProcessandoAcao(true);
        // Regra do toggle: clicar em P enquanto já está P não faz nada (mas nunca chega aqui)
        // Clicar em F enquanto está F → vai para P (desmarca)
        // Clicar em P enquanto está F → vai para P (vindo do botão colorido)
        await lancarFrequencia(partida, targetUserId, freqClicada, vinculo, tipoCartao);
        await carregarDados();
        setPickerAberto(null);
        setProcessandoAcao(false);
    };

    const handleAdicionarManual = async (e) => {
        const targetUserId = e.target.value;
        if (!targetUserId) return;
        setProcessandoAcao(true);
        const selectedOption = e.target.options[e.target.selectedIndex];
        const vinculoFormatado = selectedOption.dataset.vinculo || 'mensalista';
        
        // Agora injeta objeto partida e vinculo para disparar as macros automáticas lá (pagamentos etc)
        await adicionarInscricaoAdmin(partida, targetUserId, vinculoFormatado);
        await carregarDados();
        setProcessandoAcao(false);
    };

    const formatarData = (dataDb) => {
        const d = new Date(dataDb + 'T00:00:00');
        return d.toLocaleDateString('pt-BR');
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Detalhes da Partida"
            maxWidth="600px"
        >
            <div className="anima-entrada" style={{ display: 'flex', flexDirection: 'column', gap: window.innerWidth < 768 ? '16px' : '24px' }}>
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

                        {/* Botão de Compartilhamento (WhatsApp) */}
                        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                            <Botao 
                                onClick={handleShareWhatsApp}
                                variant="secundario"
                                style={{ 
                                    background: '#25D366', 
                                    color: '#fff', 
                                    border: 'none',
                                    padding: '8px 16px',
                                    fontSize: '0.85rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontWeight: '700'
                                }}
                            >
                                <MessageCircle size={18} /> Enviar Lista para WhatsApp
                            </Botao>
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
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        Confirmados 
                                        <span style={{ fontSize: '0.9rem', color: '#38bdf8' }}>{listaConfirmados.length} / {limite === 999 ? '∞' : limite}</span>
                                    </div>
                                    {isAdmin && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'normal', textTransform: 'uppercase' }}>Gestão</span>
                                        </div>
                                    )}
                                </h3>
                                
                                {listaConfirmados.length === 0 ? (
                                    <p style={{ color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic' }}>Ninguém confirmado ainda. Seja o primeiro!</p>
                                ) : (
                                    <div style={{ display: 'grid', gap: '8px' }}>
                                        {listaConfirmados.map((p, index) => {
                                            const u = p.usuarios || {};
                                            const userId = p.usuario_id || u.id;
                                            const vinculo = getVinculoUsuario(userId);
                                            const nomeDisplay = getNomeUsuario(userId, u);
                                            
                                            return (
                                                <div key={p.id} style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: window.innerWidth < 768 ? '8px' : '12px', 
                                                    background: 'rgba(255,255,255,0.02)', 
                                                    padding: window.innerWidth < 768 ? '6px 10px' : '8px 12px', 
                                                    borderRadius: '8px', 
                                                    borderLeft: '3px solid #10b981' 
                                                }}>
                                                    <span style={{ width: '20px', color: '#64748b', fontSize: '0.85rem' }}>{index + 1}.</span>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                                                        {u?.foto_url ? <img src={u.foto_url} alt="avatar" style={{width:'100%', height:'100%', objectFit:'cover'}}/> : <Users size={16} style={{margin:'8px'}}/>}
                                                    </div>
                                                    <div style={{ flex: 1, color: '#f8fafc', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', flex: 1, minWidth: 0 }}>
                                                            <span style={{ 
                                                                whiteSpace: 'nowrap', 
                                                                overflow: 'hidden', 
                                                                textOverflow: 'ellipsis',
                                                                flex: 1
                                                            }} title={u?.nome_completo || nomeDisplay}>
                                                                {nomeDisplay}{getEmojiPapel(userId)}{getEmojiVinculo(vinculo)}
                                                            </span>
                                                        </div>

                                                        {/* ÁREA DE FREQUÊNCIA (Visível para todos, editável apenas p/ Admin) */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                                                
                                                            {isAdmin ? (
                                                                <>
                                                                    {/* BOTÃO [P] - ADMIN */}
                                                                    <button 
                                                                        onClick={() => handleClickFrequencia(u.id, 'P', p.frequencia, vinculo)}
                                                                        disabled={processandoAcao}
                                                                        title="Marcar/Desmarcar Presença (P)"
                                                                        style={{ 
                                                                            background: p.frequencia === 'P' ? '#10b981' : 'transparent', 
                                                                            color: p.frequencia === 'P' ? '#fff' : '#10b981',
                                                                            border: p.frequencia === 'P' ? '1px solid #10b981' : '1px solid rgba(16, 185, 129, 0.3)', 
                                                                            cursor: 'pointer',
                                                                            padding: window.innerWidth < 768 ? '4px 6px' : '4px 8px',
                                                                            borderRadius: '4px',
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                            fontWeight: 'bold', fontSize: window.innerWidth < 768 ? '0.75rem' : '0.8rem', opacity: processandoAcao ? 0.5 : 1
                                                                        }}
                                                                    >
                                                                        P
                                                                    </button>
                                                                    
                                                                    {/* BOTÃO [F] - ADMIN COM SELETOR */}
                                                                    <div style={{ position: 'relative' }}>
                                                                        <button 
                                                                            onClick={() => {
                                                                                if (p.frequencia === 'F') {
                                                                                    handleClickFrequencia(u.id, 'P', p.frequencia, vinculo);
                                                                                } else {
                                                                                    setPickerAberto(pickerAberto === u.id ? null : u.id);
                                                                                }
                                                                            }}
                                                                            disabled={processandoAcao}
                                                                            title={p.frequencia === 'F' ? "Remover Falta/Cartão" : "Lançar Falta com Cartão"}
                                                                            style={{ 
                                                                                background: (() => {
                                                                                    if (p.frequencia !== 'F') return 'transparent';
                                                                                    const card = punicoes.find(pun => pun.usuario_id === u.id && pun.partida_id === partida.id);
                                                                                    if (card?.tipo_cartao === 'amarelo') return '#eab308';
                                                                                    if (card?.tipo_cartao === 'justificado') return '#3b82f6';
                                                                                    return '#ef4444';
                                                                                })(), 
                                                                                color: p.frequencia === 'F' ? '#fff' : '#ef4444',
                                                                                border: p.frequencia === 'F' ? 'none' : '1px solid rgba(239, 68, 68, 0.3)', 
                                                                                cursor: 'pointer',
                                                                                padding: '4px 8px',
                                                                                borderRadius: '4px',
                                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                fontWeight: 'bold', fontSize: '0.8rem', opacity: processandoAcao ? 0.5 : 1
                                                                            }}
                                                                        >
                                                                            F
                                                                        </button>

                                                                        {pickerAberto === u.id && (
                                                                            <div className="animate-pop-in" style={{ 
                                                                                position: 'absolute', bottom: '100%', right: 0, marginBottom: '8px',
                                                                                background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
                                                                                borderRadius: '8px', padding: '6px', display: 'flex', gap: '6px',
                                                                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)', zIndex: 100
                                                                            }}>
                                                                                <button onClick={() => handleClickFrequencia(u.id, 'F', p.frequencia, vinculo, 'amarelo')} style={{ width: '28px', height: '36px', background: '#eab308', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🟨</button>
                                                                                <button onClick={() => handleClickFrequencia(u.id, 'F', p.frequencia, vinculo, 'vermelho')} style={{ width: '28px', height: '36px', background: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🟥</button>
                                                                                <button onClick={() => handleClickFrequencia(u.id, 'F', p.frequencia, vinculo, 'justificado')} style={{ width: '28px', height: '36px', background: '#3b82f6', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🟦</button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    <button 
                                                                        onClick={() => handleRemoverJogadorAdmin(u.id, u?.nome_completo)}
                                                                        disabled={processandoAcao}
                                                                        title="Remover Jogador"
                                                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#f43f5e', padding: '4px' }}
                                                                    >
                                                                        <X size={16} strokeWidth={3} />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    {/* INDICADORES VISUAIS - ATLETA COMUM */}
                                                                    {p.frequencia === 'P' && (
                                                                        <span title="Presente" style={{ background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>P</span>
                                                                    )}
                                                                    {p.frequencia === 'F' && (
                                                                        <span 
                                                                            title={(() => {
                                                                                const card = punicoes.find(pun => pun.usuario_id === u.id && pun.partida_id === partida.id);
                                                                                return card?.tipo_cartao === 'amarelo' ? "Falta (Amarelo)" : card?.tipo_cartao === 'justificado' ? "Falta Justificada" : "Falta (Vermelho)";
                                                                            })()} 
                                                                            style={{ 
                                                                                background: (() => {
                                                                                    const card = punicoes.find(pun => pun.usuario_id === u.id && pun.partida_id === partida.id);
                                                                                    if (card?.tipo_cartao === 'amarelo') return '#eab308';
                                                                                    if (card?.tipo_cartao === 'justificado') return '#3b82f6';
                                                                                    return '#ef4444';
                                                                                })(), 
                                                                                color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' 
                                                                            }}
                                                                        >F</span>
                                                                    )}
                                                                </>
                                                            )}

                                                            {/* GESTÃO FINANCEIRA AVULSO (ADMIN APENAS) */}
                                                            {isAdmin && equipeAtiva?.gestao_financeira && vinculo === 'avulso' && (
                                                                <>
                                                                    <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
                                                                    {(() => {
                                                                        const pagDoc = pagamentos.find(pg => pg.usuario_id === u.id);
                                                                        const pago = pagDoc && pagDoc.status === 'pago';
                                                                        const temDocPendencia = pagDoc !== undefined;
                                                                        
                                                                        return (
                                                                            <button 
                                                                                onClick={() => handleTogglePagamentoAvulso(u.id)}
                                                                                title={!temDocPendencia ? "Fixar Pagamento" : pago ? "Estornar" : "Dar Baixa $"}
                                                                                disabled={processandoAcao}
                                                                                style={{ background: pago ? 'rgba(16, 185, 129, 0.2)' : 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', opacity: processandoAcao ? 0.3 : 1 }}
                                                                            >
                                                                                <DollarSign size={16} strokeWidth={3} color={pago ? '#10b981' : (temDocPendencia ? '#f43f5e' : '#64748b')} />
                                                                            </button>
                                                                        );
                                                                    })()}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                
                                 {/* ADIÇÃO MANUAL ADMINISTRATIVA */}
                                 {isAdmin && (() => {
                                     // Filtra membros da equipe que não estão removidos (pegando ativo, pendente, etc)
                                     // e que NÃO estão na lista de inscrções da partida
                                     const membrosElegiveis = membros.filter(m => 
                                         m.status?.toLowerCase() !== 'removido' && 
                                         !todosInscritos.some(p => String(p.usuario_id) === String(m.usuario_id))
                                     );

                                     return (
                                         <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                             <h4 style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px' }}>Adicionar Jogador Manualmente (Capitão ou Vice)</h4>
                                             {membrosElegiveis.length > 0 ? (
                                                 <select 
                                                     onChange={handleAdicionarManual}
                                                     value=""
                                                     disabled={processandoAcao}
                                                     style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'rgba(15,23,42,0.8)', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.1)' }}
                                                 >
                                                     <option value="" disabled>-- Selecione um membro da equipe --</option>
                                                     {membrosElegiveis.map(m => (
                                                         <option key={m.id} value={m.usuario_id} data-vinculo={m.vinculo}>
                                                             {m.usuarios?.nome_completo || m.usuarios?.id || 'Membro'} ({getLabelVinculo(m.vinculo)})
                                                         </option>
                                                     ))}
                                                 </select>
                                             ) : (
                                                 <p style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                                                     Todos os membros disponíveis já estão na lista.
                                                 </p>
                                             )}
                                         </div>
                                     );
                                 })()}
                            </div>

                            {/* FILA DE ESPERA */}
                            {listaEspera.length > 0 && (
                                <div style={{ marginTop: '12px' }}>
                                    <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: '#fbbf24' }}>
                                        Fila de Espera ({listaEspera.length})
                                    </h3>
                                    <div style={{ display: 'grid', gap: '8px' }}>
                                        {listaEspera.map((p, index) => {
                                            const u = p.usuarios || {};
                                            const userId = p.usuario_id || u.id;
                                            const vinculo = getVinculoUsuario(userId);
                                            const nomeDisplay = getNomeUsuario(userId, u);
                                            
                                            return (
                                                <div key={p.id} style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: window.innerWidth < 768 ? '8px' : '12px', 
                                                    background: 'rgba(255,255,255,0.02)', 
                                                    padding: window.innerWidth < 768 ? '6px 10px' : '8px 12px', 
                                                    borderRadius: '8px', 
                                                    borderLeft: '3px solid #fbbf24', 
                                                    opacity: 0.8 
                                                }}>
                                                    <span style={{ width: '20px', color: '#64748b', fontSize: '0.85rem' }}>{index + 1}.</span>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                                                        {u?.foto_url ? <img src={u.foto_url} alt="avatar" style={{width:'100%', height:'100%', objectFit:'cover'}}/> : <Users size={16} style={{margin:'8px'}}/>}
                                                    </div>
                                                    <div style={{ flex: 1, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', minWidth: 0 }}>
                                                        <span style={{ 
                                                            whiteSpace: 'nowrap', 
                                                            overflow: 'hidden', 
                                                            textOverflow: 'ellipsis',
                                                            flex: 1
                                                        }} title={u?.nome_completo || nomeDisplay}>
                                                            {nomeDisplay}{getEmojiPapel(userId)}{getEmojiVinculo(vinculo)}
                                                        </span>
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
        </Modal>
    );
};

export default ModalDetalhesPartida;
