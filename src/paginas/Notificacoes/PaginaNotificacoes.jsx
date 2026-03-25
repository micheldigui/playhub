import { useState } from 'react';
import { usarNotificacoes } from '../../contextos/NotificacoesContexto';
import { usarAutenticacao } from '../../contextos/AutenticacaoContexto';
import { supabase } from '../../servicos/supabase';
import { Bell, User, MessageSquare, ArrowLeft, RefreshCw, Trash2, Phone } from 'lucide-react';
import Botao from '../../componentes/Botao/Botao';
import PerfilAtletaModal from '../../componentes/Modais/PerfilAtletaModal';
import './PaginaNotificacoes.css';

const PaginaNotificacoes = ({ aoVoltar }) => {
    const { notificacoes, carregarNotificacoes, limparNotificacoes, matches } = usarNotificacoes();
    const { usuario, dadosUsuario } = usarAutenticacao();
    const [atletaSelecionado, setAtletaSelecionado] = useState(null);

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
                    <button className="btn-voltar-minimal" onClick={aoVoltar}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1>Notificações</h1>
                    <div className="acoes-direita">
                        <button className="btn-header-acao" onClick={carregarNotificacoes} title="Atualizar">
                            <RefreshCw size={18} />
                        </button>
                        {notificacoes.length > 0 && (
                            <button className="btn-header-acao btn-limpar" onClick={limparNotificacoes} title="Limpar tudo">
                                <Trash2 size={18} />
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
                        const ehMatch = matches.has(notificacao.remetente_id);
                        const idadeRemetente = calcularIdade(notificacao.remetente?.data_nascimento);
                        const ambosMaiores = idadeUsuario >= 18 && idadeRemetente >= 18;
                        const ambosAutorizaram = dadosUsuario?.compartilhar_whatsapp_match && notificacao.remetente?.compartilhar_whatsapp_match;
                        const contatoLiberado = ehMatch && ambosMaiores && ambosAutorizaram;

                        return (
                            <div key={notificacao.id} className={`card-notificacao animacao-entrada ${ehMatch ? 'card-match' : ''}`}>
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
                        <Botao onClick={aoVoltar} style={{ marginTop: '1rem' }}>Voltar ao Início</Botao>
                    </div>
                )}
            </div>

            {atletaSelecionado && (
                <PerfilAtletaModal 
                    atleta={atletaSelecionado}
                    aoFechar={() => setAtletaSelecionado(null)}
                    aoPassarBola={handleRetribuir}
                    ehEu={atletaSelecionado.id === usuario?.id}
                />
            )}
        </div>
    );
};

export default PaginaNotificacoes;
