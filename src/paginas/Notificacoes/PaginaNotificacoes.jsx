import { useState } from 'react';
import { usarNotificacoes } from '../../contextos/NotificacoesContexto';
import { usarAutenticacao } from '../../contextos/AutenticacaoContexto';
import { usarEquipe } from '../../contextos/EquipeContexto';
import { supabase } from '../../servicos/supabase';
import { rastrear } from '../../servicos/rastreamento';
import { Bell, User, MessageSquare, ArrowLeft, RefreshCw, Trash2, Phone, Shield } from 'lucide-react';
import Botao from '../../componentes/Botao/Botao';
import ModalPerfilAtleta from '../../componentes/Modais/ModalPerfilAtleta';
import PerfilEquipeModal from '../../componentes/Modais/PerfilEquipeModal';
import './PaginaNotificacoes.css';

const formatarNome = (nomeCompleto) => {
    if (!nomeCompleto) return '';
    const partes = nomeCompleto.trim().split(/\s+/);
    const capitalizar = (p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
    if (partes.length === 1) return capitalizar(partes[0]);
    return `${capitalizar(partes[0])} ${capitalizar(partes[partes.length - 1])}`;
};

const getIniciaisAtleta = (u) => {
    if (!u) return '??';
    const nome = u.nome_completo || '';
    if (!nome) return '??';
    const partes = nome.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
};

const PaginaNotificacoes = ({ aoVoltar, abrirEquipeTab }) => {
    const { notificacoes, carregarNotificacoes, limparNotificacoes, matches } = usarNotificacoes();
    const { usuario, dadosUsuario } = usarAutenticacao();
    const { responderConvite, selecionarEquipe } = usarEquipe();
    const [atletaSelecionado, setAtletaSelecionado] = useState(null);
    const [equipeSelecionada, setEquipeSelecionada] = useState(null);
    const [processando, setProcessando] = useState(null);
    const [limpando, setLimpando] = useState(false);

    const calcularIdade = (dataNasc) => {
        if (!dataNasc) return 0;
        const hoje = new Date();
        const nasc = new Date(dataNasc);
        let idade = hoje.getFullYear() - nasc.getFullYear();
        const m = hoje.getMonth() - nasc.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
        return idade;
    };

    const idadeUsuario = calcularIdade(dadosUsuario?.data_nascimento);

    const handleVerPedido = async (notificacao) => {
        setProcessando(notificacao.id);
        const equipeId = notificacao.payload?.equipe_id;
        const atletaId = notificacao.remetente_id;
        
        try {
            // Verificar se a solicitação ainda é válida (status pendente)
            const { data: membroPendente, error: erroCheck } = await supabase
                .from('membros_equipe')
                .select('id, status')
                .eq('equipe_id', equipeId)
                .eq('usuario_id', atletaId)
                .maybeSingle();

            if (!membroPendente || membroPendente.status !== 'pendente') {
                alert('Esta solicitação já foi processada por outro gestor da equipe. ✅');
                await supabase.from('interacoes').delete().eq('id', notificacao.id);
                carregarNotificacoes();
                setProcessando(null);
                return;
            }

            // Remove a notificação do sino (marcando como lida) e envia o capitão para a área da equipe
            rastrear.clique('notificacoes_avaliar_pedido_ingresso', 'Administrador abriu detalhamento da solicitação de ingresso');
            await supabase.from('interacoes').delete().eq('id', notificacao.id);
            carregarNotificacoes();
            
            if (equipeId && abrirEquipeTab) {
                selecionarEquipe(equipeId);
                // Pequeno delay para garantir que a equipe virou a ativa no localStorage
                setTimeout(() => {
                    abrirEquipeTab('solicitacoes');
                }, 50);
            }
        } catch (err) {
            console.error('Falha ao redirecionar: ', err.message);
        }
        setProcessando(null);
    };

    const handleRespostaConvite = async (conviteId, aceitar) => {
        setProcessando(conviteId);
        const res = await responderConvite(conviteId, aceitar);
        if (res.sucesso) {
            rastrear.clique('notificacoes_respondeu_convite_equipe', 'Usuário respondeu ao convite de uma equipe', { aceitou: aceitar });
            alert(aceitar ? 'Você aceitou o convite e está na equipe! 🎉' : 'Convite recusado com sucesso.');
            setEquipeSelecionada(null); // Fecha o modal
            carregarNotificacoes(); // Atualiza a lista
        } else {
            alert('Falha ao processar o convite: ' + res.erro);
            // Mesmo se falhar porque já foi processado, atualizamos a lista para remover o item fantasma
            carregarNotificacoes();
            setEquipeSelecionada(null);
        }
        setProcessando(null);
    };

    const handleLimparTudo = async () => {
        setLimpando(true);
        try {
            await limparNotificacoes();
        } catch (err) {
            console.error('Erro ao limpar:', err);
        } finally {
            setLimpando(false);
        }
    };

    const handleRetribuir = async (destinatarioId) => {
        try {
            const { error } = await supabase
                .from('interacoes')
                .insert({
                    remetente_id: usuario.id,
                    destinatario_id: destinatarioId,
                    tipo: 'bola'
                });
            
            if (error) throw error;
            rastrear.clique('notificacoes_match_retribuiu_bola', 'Retribuiu o interesse resultando em Match');
            alert('Bola passada com sucesso! ⚽');
            carregarNotificacoes();
        } catch (err) {
            console.error('Erro detalhado ao retribuir:', err);
            
            // Se for erro de duplicidade (23505), tratamos como sucesso/match já processado
            if (err.code === '23505' || err.message?.includes('duplicate key')) {
                console.log('Interação já existe. Provavelmente um match simultâneo.');
                alert('Vocês deram Match! ⚽ Atualizando sua lista...');
                carregarNotificacoes();
                return;
            }

            const mensagemErro = err.message || 'Erro de conexão';
            alert(`Erro ao passar a bola de volta: ${mensagemErro}`);
        }
    };

    const abrirWhatsApp = (atleta) => {
        if (!atleta.telefone) {
            alert('Este atleta não cadastrou telefone.');
            return;
        }
        rastrear.clique('notificacoes_match_whatsapp', 'Iniciou contato via WhatsApp após match de interesse');
        const numeroLimpo = atleta.telefone.replace(/\D/g, '');
        window.open(`https://wa.me/55${numeroLimpo}`, '_blank');
    };

    return (
        <div className="pagina-notificacoes">
            <header className="notificacoes-header">
                <div className="topo-acoes">
                    <h1 style={{ flex: 1 }}>Notificações</h1>
                    <div className="acoes-direita">
                        <button className="btn-header-acao" onClick={carregarNotificacoes} title="Atualizar">
                            <RefreshCw size={18} />
                        </button>
                        {notificacoes.length > 0 && (
                            <button 
                                className={`btn-header-acao btn-limpar ${limpando ? 'carregando' : ''}`} 
                                onClick={handleLimparTudo} 
                                title="Limpar tudo"
                                disabled={limpando}
                            >
                                {limpando ? <RefreshCw size={18} className="dash-spinner" /> : <Trash2 size={18} />}
                            </button>
                        )}
                    </div>
                </div>
                <p>Veja quem passou a bola para você e retribua o interesse!</p>
            </header>

            <div className="banner-match-ajuda animacao-entrada">
                <div className="icon-ajuda">🛡️</div>
                <div className="texto-ajuda">
                    <h4>Segurança e Privacidade</h4>
                    <p>O contato via WhatsApp só é liberado para <strong>maiores de 18 anos</strong> que autorizaram o compartilhamento no perfil.</p>
                </div>
            </div>

            <div className="lista-notificacoes">
                {notificacoes.length > 0 ? (
                    notificacoes.map((notificacao) => {
                        // 1. Renderização de Convite de Equipe
                        if (notificacao.tipo === 'convite_equipe') {
                            const admin = notificacao.equipes?.admin;
                            return (
                                <div key={`convite-${notificacao.id}`} className="card-notificacao animacao-entrada">
                                    <div className="notificacao-logo">
                                        {notificacao.equipes?.logo_url ? (
                                            <img src={notificacao.equipes.logo_url} alt="Equipe" />
                                        ) : (
                                            <div className="avatar-placeholder" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>
                                                <Shield size={20} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="notificacao-conteudo">
                                        <p>
                                            <strong>{admin?.nome_completo ? formatarNome(admin.nome_completo) : (admin?.apelido || 'O Capitão')}</strong> convidou você para jogar pelo time{' '}
                                            <strong 
                                                style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline' }} 
                                                onClick={() => setEquipeSelecionada(notificacao)}
                                                title="Ver Perfil da Equipe"
                                            >
                                                {notificacao.equipes?.nome}
                                            </strong>!
                                        </p>
                                        <span className="notificacao-data">
                                            {new Date(notificacao.criado_em).toLocaleDateString()} às {new Date(notificacao.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {notificacao.mensagem_convite && (
                                            <div style={{ marginTop: '8px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', fontSize: '0.8rem', color: '#cbd5e1', fontStyle: 'italic', borderLeft: '2px solid #38bdf8' }}>
                                                "{notificacao.mensagem_convite}"
                                            </div>
                                        )}
                                    </div>
                                    <div className="notificacao-acoes">
                                        <Botao 
                                            variant="primario" 
                                            style={{ padding: '8px 12px', fontSize: '0.8rem', width: '100%' }} 
                                            onClick={() => setEquipeSelecionada(notificacao)} 
                                        >
                                            Ver Convite da Equipe
                                        </Botao>
                                    </div>
                                </div>
                            );
                        }

                        // 1.1 Renderização de Solicitação de Ingresso (ALTO-NÍVEL GESTOR)
                        if (notificacao.tipo === 'solicitacao_ingresso') {
                            return (
                                <div key={`solicitacao-${notificacao.id}`} className="card-notificacao animacao-entrada" style={{ borderLeft: '3px solid #38bdf8' }}>
                                    <div className="notificacao-logo">
                                        {notificacao.remetente?.foto_url ? (
                                            <img src={notificacao.remetente.foto_url} alt="Candidato" />
                                        ) : (
                                            <div className="avatar-placeholder">
                                                {getIniciaisAtleta(notificacao.remetente)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="notificacao-conteudo">
                                        <p>
                                            <strong>{notificacao.remetente?.nome_completo ? formatarNome(notificacao.remetente.nome_completo) : (notificacao.remetente?.apelido || 'Um atleta')}</strong> solicitou ingresso na equipe <strong>{notificacao.payload?.nome_equipe || 'sua equipe'}</strong>.
                                        </p>
                                        <span className="notificacao-data">
                                            {new Date(notificacao.criado_em).toLocaleDateString()} às {new Date(notificacao.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="notificacao-acoes">
                                        <Botao 
                                            style={{ background: '#38bdf8', padding: '8px 12px', fontSize: '0.8rem', width: '100%' }} 
                                            onClick={() => handleVerPedido(notificacao)} 
                                            disabled={processando === notificacao.id}
                                        >
                                            Avaliar Perfil e Pedido
                                        </Botao>
                                    </div>
                                </div>
                            );
                        }

                        // 2. Renderização de Interações ("Passar a bola")
                        const remetenteIdNormal = String(notificacao.remetente_id || '').toLowerCase().trim();
                        const ehMatch = matches.has(remetenteIdNormal);
                        const idadeRemetente = calcularIdade(notificacao.remetente?.data_nascimento);
                        
                        // Só aplicamos restrição se os dados de ambos existirem.
                        const ambosMaiores = notificacao.remetente && idadeUsuario >= 18 && idadeRemetente >= 18;
                        const ambosAutorizaram = dadosUsuario?.compartilhar_whatsapp_match && notificacao.remetente?.compartilhar_whatsapp_match;
                        const contatoLiberado = ehMatch && ambosMaiores && ambosAutorizaram;

                        return (
                            <div key={`interacao-${notificacao.id}`} className={`card-notificacao animacao-entrada ${ehMatch ? 'card-match' : ''}`}>
                                <div className="notificacao-logo">
                                    {notificacao.remetente?.foto_url ? (
                                        <img src={notificacao.remetente.foto_url} alt="Remetente" />
                                    ) : (
                                        <div className="avatar-placeholder">
                                            {getIniciaisAtleta(notificacao.remetente)}
                                        </div>
                                    )}
                                </div>
                                <div className="notificacao-conteudo">
                                    <p>
                                        <strong>{notificacao.remetente?.nome_completo ? formatarNome(notificacao.remetente.nome_completo) : (notificacao.remetente?.apelido || `Atleta (${notificacao.remetente_id?.slice(0,5)})`)}</strong> {ehMatch ? '⚽ Match! Vocês passaram a bola um para o outro.' : 'passou a bola para você! ⚽'}
                                    </p>
                                    <span className="notificacao-data">
                                        {new Date(notificacao.criado_em).toLocaleDateString()} às {new Date(notificacao.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="notificacao-acoes">
                                    {ehMatch ? (
                                        contatoLiberado ? (
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <Botao 
                                                    variant="minimal" 
                                                    style={{ padding: '8px 12px', fontSize: '0.8rem', gap: '6px' }}
                                                    onClick={() => setAtletaSelecionado(notificacao.remetente || { id: notificacao.remetente_id })}
                                                >
                                                    <User size={14} /> Perfil
                                                </Botao>
                                                <Botao 
                                                    onClick={() => abrirWhatsApp(notificacao.remetente)}
                                                    style={{ background: '#25D366', color: 'white', border: 'none', gap: '6px' }}
                                                >
                                                    <Phone size={14} /> WhatsApp
                                                </Botao>
                                            </div>
                                        ) : (
                                            <span className="contato-bloqueado" title={!ambosMaiores ? "Restrito para menores" : "Aguardando autorização de privacidade"}>
                                                {!ambosMaiores ? '🛡️ Contato restrito (idade)' : '🔒 Privacidade restrita'}
                                            </span>
                                        )
                                    ) : (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <Botao 
                                                variant="minimal" 
                                                style={{ padding: '8px 12px', fontSize: '0.8rem', gap: '6px' }}
                                                onClick={() => setAtletaSelecionado(notificacao.remetente || { id: notificacao.remetente_id })}
                                            >
                                                <User size={14} /> Perfil
                                            </Botao>
                                            <Botao 
                                                variant="secundario" 
                                                style={{ padding: '8px 12px', fontSize: '0.8rem', gap: '6px' }}
                                                onClick={() => handleRetribuir(notificacao.remetente_id)}
                                            >
                                                <MessageSquare size={14} /> Passar a bola
                                            </Botao>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div className="notificacoes-vazio">
                        <Bell size={48} strokeWidth={1} />
                        <h3>Nenhuma notificação por enquanto</h3>
                        <p>Continue explorando e passando a bola para outros atletas!</p>
                    </div>
                )}
            </div>

            <ModalPerfilAtleta 
                isOpen={!!atletaSelecionado}
                onClose={() => setAtletaSelecionado(null)}
                idAtleta={atletaSelecionado?.id}
                aoPassarBola={handleRetribuir}
            />

            {equipeSelecionada && (
                <PerfilEquipeModal 
                    equipeId={typeof equipeSelecionada === 'string' ? equipeSelecionada : (equipeSelecionada.equipes?.id || equipeSelecionada.payload?.equipe_id)}
                    convite={typeof equipeSelecionada !== 'string' && equipeSelecionada.tipo === 'convite_equipe' ? equipeSelecionada : null}
                    aoResponderConvite={handleRespostaConvite}
                    processando={processando}
                    aoFechar={() => setEquipeSelecionada(null)}
                />
            )}
        </div>
    );
};

export default PaginaNotificacoes;
