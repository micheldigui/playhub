import { useState } from 'react';
import { usarNotificacoes } from '../../contextos/NotificacoesContexto';
import { usarAutenticacao } from '../../contextos/AutenticacaoContexto';
import { usarEquipe } from '../../contextos/EquipeContexto';
import { supabase } from '../../servicos/supabase';
import { Bell, User, MessageSquare, ArrowLeft, RefreshCw, Trash2, Phone, Shield } from 'lucide-react';
import Botao from '../../componentes/Botao/Botao';
import ModalPerfilAtleta from '../../componentes/Modais/ModalPerfilAtleta';
import PerfilEquipeModal from '../../componentes/Modais/PerfilEquipeModal';
import './PaginaNotificacoes.css';

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
        
        try {
            // Remove a notificação do sino (marcando como lida) e envia o capitão para a área da equipe
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
            alert(aceitar ? 'Você aceitou o convite e está na equipe! 🎉' : 'Convite recusado com sucesso.');
        } else {
            alert('Falha ao processar o convite: ' + res.erro);
        }
        setProcessando(null);
    };

    const handleLimparTudo = async () => {
        if (!window.confirm('Deseja realmente limpar todas as notificações? Esta ação não pode ser desfeita.')) return;
        
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
            alert('Bola passada com sucesso! ⚽');
            carregarNotificacoes();
        } catch (err) {
            console.error('Erro ao retribuir:', err);
            alert('Erro ao passar a bola de volta.');
        }
    };

    const abrirWhatsApp = (atleta) => {
        if (!atleta.telefone) {
            alert('Este atleta não cadastrou telefone.');
            return;
        }
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
                                            <strong>{admin?.nome_completo || admin?.apelido || 'O Capitão'}</strong> convidou você para jogar pelo time{' '}
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
                                            <div className="avatar-placeholder" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>
                                                <User size={20} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="notificacao-conteudo">
                                        <p>
                                            <strong>{notificacao.remetente?.nome_completo || notificacao.remetente?.apelido || 'Um atleta'}</strong> solicitou ingresso na equipe <strong>{notificacao.payload?.nome_equipe || 'sua equipe'}</strong>.
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
                        const ehMatch = matches.has(notificacao.remetente_id);
                        const idadeRemetente = calcularIdade(notificacao.remetente?.data_nascimento);
                        const ambosMaiores = idadeUsuario >= 18 && idadeRemetente >= 18;
                        const ambosAutorizaram = dadosUsuario?.compartilhar_whatsapp_match && notificacao.remetente?.compartilhar_whatsapp_match;
                        const contatoLiberado = ehMatch && ambosMaiores && ambosAutorizaram;

                        return (
                            <div key={`interacao-${notificacao.id}`} className={`card-notificacao animacao-entrada ${ehMatch ? 'card-match' : ''}`}>
                                <div className="notificacao-logo">
                                    {notificacao.remetente?.foto_url ? (
                                        <img src={notificacao.remetente.foto_url} alt="Remetente" />
                                    ) : (
                                        <div className="avatar-placeholder">
                                            <User size={20} />
                                        </div>
                                    )}
                                </div>
                                <div className="notificacao-conteudo">
                                    <p>
                                        <strong>{notificacao.remetente?.nome_completo || 'Atleta'}</strong> {ehMatch ? '⚽ Match! Vocês passaram a bola um para o outro.' : 'passou a bola para você! ⚽'}
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
                                                    onClick={() => setAtletaSelecionado(notificacao.remetente)}
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
                                                onClick={() => setAtletaSelecionado(notificacao.remetente)}
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
