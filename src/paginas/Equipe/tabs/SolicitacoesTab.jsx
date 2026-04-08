import React, { useState, useEffect } from 'react';
import { Users, Mail, CheckCircle2, XCircle, Trash2, Clock, MapPin, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { supabase } from '../../../servicos/supabase';
import { usarEquipe } from '../../../contextos/EquipeContexto';
import { usarAutenticacao } from '../../../contextos/AutenticacaoContexto';
import ModalPerfilAtleta from '../../../componentes/Modais/ModalPerfilAtleta';

const calcularIdade = (dataNasc) => {
    if (!dataNasc) return null;
    const hoje = new Date();
    const nasc = new Date(dataNasc);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade;
};

const SolicitacoesTab = () => {
    const { 
        equipeAtiva, carregarSolicitacoes, responderSolicitacao, 
        carregarConvitesEnviados, cancelarConvite 
    } = usarEquipe();
    const { ehSuperAdmin, usuario, dadosUsuario } = usarAutenticacao();
    
    const [solicitacoes, setSolicitacoes] = useState([]);
    const [convitesEnviados, setConvitesEnviados] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [processando, setProcessando] = useState(null);
    const [expandidos, setExpandidos] = useState({});
    const [atletaSelecionado, setAtletaSelecionado] = useState(null);

    useEffect(() => {
        let isMounted = true;
        const obterDados = async () => {
            if (!equipeAtiva?.id) return;
            setCarregando(true);
            try {
                const [pedidos, enviados] = await Promise.all([
                    carregarSolicitacoes(equipeAtiva.id),
                    carregarConvitesEnviados(equipeAtiva.id)
                ]);
                if (isMounted) {
                    setSolicitacoes(pedidos || []);
                    setConvitesEnviados(enviados || []);
                }
            } catch (error) {
                console.error('Erro ao carregar solicitações:', error);
            } finally {
                if (isMounted) setCarregando(false);
            }
        };

        obterDados();
        return () => { isMounted = false; };
    }, [equipeAtiva?.id, carregarSolicitacoes, carregarConvitesEnviados]);

    const handleRespostaPedido = async (membroId, aprovado) => {
        setProcessando(membroId);
        const res = await responderSolicitacao(membroId, aprovado);
        if (res.sucesso) {
            setSolicitacoes(prev => prev.filter(s => s.id !== membroId));
        } else {
            alert('Erro: ' + res.erro);
        }
        setProcessando(null);
    };

    const handleCancelarConvite = async (conviteId) => {
        setProcessando(conviteId);
        const res = await cancelarConvite(conviteId);
        if (res.sucesso) {
            setConvitesEnviados(prev => prev.filter(c => c.id !== conviteId));
        } else {
            alert('Erro: ' + res.erro);
        }
        setProcessando(null);
    };

    const handlePassarBola = async (atletaAlvo) => {
        if (!usuario || !dadosUsuario) {
            alert('Carregando seus dados... Tente novamente.');
            return;
        }

        const idadeEu = calcularIdade(dadosUsuario.data_nascimento);
        const idadeAlvo = calcularIdade(atletaAlvo.data_nascimento);

        if (idadeEu === null || idadeAlvo === null) {
            alert('Para interagir, ambos os atletas precisam ter a data de nascimento preenchida. 🛡️');
            return;
        }

        if (idadeEu < 18 || idadeAlvo < 18) {
            alert('A interação direta ("Passar a bola") só é permitida entre maiores de 18 anos. 🛡️');
            return;
        }

        try {
            const { error } = await supabase.from('interacoes').insert({
                remetente_id: usuario.id,
                destinatario_id: atletaAlvo.id,
                tipo: 'bola'
            });
            if (error) throw error;
            alert('Você passou a bola para ' + (atletaAlvo.apelido || atletaAlvo.nome_completo) + '! ⚽');
        } catch (err) {
            alert('Erro ao passar a bola: ' + err.message);
        }
    };

    const toggleExpandido = (id) => {
        setExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
    };

    if (carregando) return <div className="p-8 text-center text-muted"><Loader2 className="animate-spin" /> Carregando chamados...</div>;

    return (
        <div className="animate-fade-in" style={{ padding: '0 1rem' }}>
            <header style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.6rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Mail size={28} color="var(--primaria)" /> Solicitações & Convites
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Gerencie quem deseja entrar no time e acompanhe os convites enviados.</p>
            </header>

            <div className="solicitacoes-grade" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
                
                {/* ── COLUNA 1: PEDIDOS DE ENTRADA ── */}
                <section>
                    <h3 style={{ fontSize: '1.1rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <Users size={18} color="#38bdf8" /> Pedidos de Ingresso
                        {solicitacoes.length > 0 && <span className="badge-contagem">{solicitacoes.length}</span>}
                    </h3>
                    
                    <div className="lista-cards">
                        {solicitacoes.length === 0 ? (
                            <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>Nenhuma solicitação pendente.</p>
                        ) : (
                            solicitacoes.map(sol => (
                                <div key={sol.id} className="card-solicitacao">
                                    <div 
                                        className="info-atleta" 
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => sol.usuarios && setAtletaSelecionado(sol.usuarios)}
                                        title="Clique para ver o Perfil Esportivo"
                                    >
                                        <div className="avatar-mini">
                                            {sol.usuarios?.foto_url ? <img src={sol.usuarios.foto_url} alt={sol.usuarios.apelido} /> : <Users size={18} />}
                                        </div>
                                        <div>
                                            <p className="nome">{sol.usuarios?.nome_completo || 'Atleta não localizado'}</p>
                                            <p className="sub">
                                                <MapPin size={12} /> {sol.usuarios?.cidade || 'Não informada'}
                                                {sol.usuarios?.estado ? `, ${sol.usuarios.estado}` : ''}
                                                {sol.usuarios?.data_nascimento && ` • ${calcularIdade(sol.usuarios.data_nascimento)} anos`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="acoes">
                                        <button className="btn-negar" onClick={() => handleRespostaPedido(sol.id, false)} disabled={processando === sol.id}>Recusar</button>
                                        <button className="btn-aceitar" onClick={() => handleRespostaPedido(sol.id, true)} disabled={processando === sol.id}>Aceitar</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* ── COLUNA 2: CONVITES ENVIADOS (SAÍDA) ── */}
                <section>
                    <h3 style={{ fontSize: '1.1rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <Mail size={18} color="#8b5cf6" /> Convites Emitidos
                    </h3>
                    
                    <div className="lista-cards">
                        {convitesEnviados.length === 0 ? (
                            <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>Nenhum convite enviado.</p>
                        ) : (
                            convitesEnviados.map(conv => {
                                const resolvido = conv.status !== 'pendente';
                                const aberto = expandidos[conv.id];

                                return (
                                    <div key={conv.id} className={`card-convite ${resolvido ? 'resolvido' : ''} ${aberto ? 'aberto' : ''}`}>
                                        <div className="card-corpo" onClick={() => resolvido && toggleExpandido(conv.id)}>
                                            <div className="info-atleta">
                                                <div className="avatar-mini">
                                                    {conv.jogador?.foto_url ? <img src={conv.jogador.foto_url} alt="atleta" /> : <Users size={18} />}
                                                </div>
                                                <div>
                                                    <p className="nome">{conv.jogador?.nome_completo || 'Atleta Convidado'}</p>
                                                    <p className="sub">Status: <span className={`status ${conv.status}`}>{conv.status?.toUpperCase() || 'PENDENTE'}</span></p>
                                                </div>
                                            </div>
                                            {resolvido ? (
                                                aberto ? <ChevronUp size={18} /> : <ChevronDown size={18} />
                                            ) : (
                                                <button className="btn-cancelar" onClick={() => handleCancelarConvite(conv.id)} title="Cancelar Convite">
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                        
                                        {aberto && (
                                            <div className="card-detalhes">
                                                <p><strong>Enviado em:</strong> {new Date(conv.criado_em).toLocaleDateString('pt-BR')}</p>
                                                {conv.respondido_em && <p><strong>Respondido em:</strong> {new Date(conv.respondido_em).toLocaleDateString('pt-BR')}</p>}
                                                {conv.mensagem_resposta && <p className="msg">Resposta: "{conv.mensagem_resposta}"</p>}
                                                <button className="btn-excluir-log" onClick={() => handleCancelarConvite(conv.id)}>Excluir do histórico</button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>
            </div>

            <style>{`
                .badge-contagem { background: #38bdf8; color: #0f172a; font-size: 0.7rem; font-weight: 800; padding: 2px 6px; border-radius: 6px; margin-left: 8px; }
                .lista-cards { display: flex; flex-direction: column; gap: 12px; }
                
                .card-solicitacao { background: rgba(15, 23, 42, 0.6); padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; }
                .info-atleta { display: flex; align-items: center; gap: 12px; }
                .avatar-mini { width: 36px; height: 36px; border-radius: 50%; overflow: hidden; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; }
                .avatar-mini img { width: 100%; height: 100%; object-fit: cover; }
                .nome { font-size: 0.9rem; font-weight: 600; color: #f1f5f9; }
                .sub { font-size: 0.75rem; color: #64748b; display: flex; align-items: center; gap: 4px; }
                
                .acoes { display: flex; gap: 8px; }
                .btn-negar { background: rgba(244, 63, 94, 0.1); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.2); padding: 4px 10px; borderRadius: 6px; font-size: 0.8rem; cursor: pointer; }
                .btn-aceitar { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); padding: 4px 10px; borderRadius: 6px; font-size: 0.8rem; cursor: pointer; }

                .card-convite { background: rgba(15, 23, 42, 0.6); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); overflow: hidden; }
                .card-corpo { padding: 12px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
                .card-convite.resolvido { opacity: 0.7; }
                .status { font-weight: 700; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; }
                .status.pendente { color: #fbbf24; background: rgba(251, 191, 36, 0.1); }
                .status.aceito { color: #10b981; background: rgba(16, 185, 129, 0.1); }
                .status.recusado { color: #f43f5e; background: rgba(244, 63, 94, 0.1); }
                
                .btn-cancelar { background: none; border: none; color: #64748b; cursor: pointer; padding: 6px; }
                .btn-cancelar:hover { color: #f43f5e; }

                .card-detalhes { padding: 12px; background: rgba(0,0,0,0.2); border-top: 1px solid rgba(255,255,255,0.03); font-size: 0.8rem; color: #94a3b8; }
                .card-detalhes .msg { font-style: italic; color: #cbd5e1; margin-top: 8px; }
                .btn-excluir-log { background: none; border: none; color: #f43f5e; font-size: 0.7rem; text-decoration: underline; cursor: pointer; margin-top: 10px; padding: 0; }
            `}</style>

            {/* MODAL DO PERFIL ESPORTIVO DO JOGADOR CANDIDATO */}
            <ModalPerfilAtleta 
                isOpen={!!atletaSelecionado}
                onClose={() => setAtletaSelecionado(null)}
                idAtleta={atletaSelecionado?.id}
                aoPassarBola={handlePassarBola}
            />
        </div>
    );
};

export default SolicitacoesTab;
