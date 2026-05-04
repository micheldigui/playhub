import React, { useState, useEffect } from 'react';
import { Globe, Search, MapPin, Trophy, Users, Mail, Loader2, Lock, MessageCircle, Activity } from 'lucide-react';
import { usarEquipe } from '../../../contextos/EquipeContexto';
import { usarNotificacoes } from '../../../contextos/NotificacoesContexto';
import { usarAutenticacao } from '../../../contextos/AutenticacaoContexto';
import Botao from '../../../componentes/Botao/Botao';
import Modal from '../../../componentes/Modal/Modal';
import ModalPerfilAtleta from '../../../componentes/Modais/ModalPerfilAtleta';
import { supabase } from '../../../servicos/supabase';
import { buscarPrivacidadeAtletaAtual } from '../../../servicos/perfisPublicos';
import ModalAjustePrivacidade from '../../../componentes/Modais/ModalAjustePrivacidade';

// Formata "Primeiro Último" com iniciais maiúsculas
const formatarNome = (nomeCompleto) => {
    if (!nomeCompleto) return '';
    const partes = nomeCompleto.trim().split(/\s+/);
    const capitalizar = (p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
    if (partes.length === 1) return capitalizar(partes[0]);
    return `${capitalizar(partes[0])} ${capitalizar(partes[partes.length - 1])}`;
};

const formatarApelido = (apelido) => {
    if (!apelido) return '';
    return apelido.trim().split(/\s+/).map(p => 
        p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
    ).join('');
};

const ITENS_POR_PAGINA = 24;

const normalizarTexto = (valor) =>
    String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

const DescobrirTab = () => {
    const { equipeAtiva, buscarAtletas, enviarConvite, carregarConvitesEnviados, cancelarConvite, temPermissaoEquipe } = usarEquipe();
    const { carregarNotificacoes, matchesConfirmados, matches } = usarNotificacoes();
    const { usuario, dadosUsuario, recarregarUsuario } = usarAutenticacao();
    
    const [termo, setTermo] = useState('');
    const [modalidade, setModalidade] = useState('');
    const [cidade, setCidade] = useState('');
    const [resultados, setResultados] = useState([]);
    const [buscando, setBuscando] = useState(false);
    const [convidando, setConvidando] = useState(null);
    const [mapaConvites, setMapaConvites] = useState({});
    const [atletaSelecionado, setAtletaSelecionado] = useState(null);
    const [modalConvite, setModalConvite] = useState(null);
    const [mostrarAvisoPrivacidade, setMostrarAvisoPrivacidade] = useState(false);
    const [atletaPendente, setAtletaPendente] = useState(null);
    const [msgConvite, setMsgConvite] = useState('');
    const [idsMembrosEquipe, setIdsMembrosEquipe] = useState(new Set());
    const [pagina, setPagina] = useState(0);
    const [temMais, setTemMais] = useState(false);

    // Carrega IDs dos membros atuais da equipe para detectar duplicatas nos resultados
    useEffect(() => {
        if (!equipeAtiva?.id) return;
        const carregar = async () => {
            const { data } = await supabase
                .from('membros_equipe')
                .select('usuario_id')
                .eq('equipe_id', equipeAtiva.id)
                .eq('status', 'ativo');
            setIdsMembrosEquipe(new Set((data || []).map(m => m.usuario_id)));
        };
        carregar();
    }, [equipeAtiva?.id]);

    const getCidadeReferencia = () => equipeAtiva?.local_cidade || equipeAtiva?.cidade || '';
    const getEstadoReferencia = () => equipeAtiva?.local_estado || equipeAtiva?.estado || '';

    const ordenarAtletas = (lista) => {
        const cidadeReferencia = normalizarTexto(getCidadeReferencia());
        const estadoReferencia = normalizarTexto(getEstadoReferencia());

        return [...lista].sort((a, b) => {
            const scoreA =
                normalizarTexto(a.cidade) === cidadeReferencia ? 0 :
                normalizarTexto(a.estado) === estadoReferencia ? 1 :
                2;
            const scoreB =
                normalizarTexto(b.cidade) === cidadeReferencia ? 0 :
                normalizarTexto(b.estado) === estadoReferencia ? 1 :
                2;

            if (scoreA !== scoreB) return scoreA - scoreB;
            return String(a.nome_completo || '').localeCompare(String(b.nome_completo || ''), 'pt-BR');
        });
    };

    const carregarMapaConvites = async () => {
        const enviados = await carregarConvitesEnviados(equipeAtiva.id);
        const mapa = {};
        enviados.forEach(c => {
            if (c.jogador?.id) mapa[c.jogador.id] = c;
        });
        setMapaConvites(mapa);
    };

    // Função idêntica ao Explorar para manter consistência
    const handleCutucar = async (atletaAlvo) => {
        if (!usuario || !dadosUsuario) {
            alert('Carregando seus dados... Tente novamente.');
            return;
        }

        try {
            // Verifica privacidade própria
            const { data: privEu } = await supabase
                .from('usuarios')
                .select('perfil_publico, compartilhar_whatsapp_match')
                .eq('id', usuario.id)
                .single();

            if (!privEu?.perfil_publico || !privEu?.compartilhar_whatsapp_match) {
                const jaTemMatch = matchesConfirmados?.has(atletaAlvo.id);
                if (jaTemMatch) {
                    alert('Vocês deram Match! ⚽ Mas para ver o WhatsApp dele, você precisa liberar o seu no perfil.');
                }
                setAtletaPendente(atletaAlvo);
                setMostrarAvisoPrivacidade(true);
                if (recarregarUsuario) recarregarUsuario();
                return;
            }

            // Verifica privacidade do alvo
            const { data: privAlvo } = await supabase
                .from('usuarios')
                .select('perfil_publico, compartilhar_whatsapp_match')
                .eq('id', atletaAlvo.id)
                .single();

            if (!privAlvo?.perfil_publico || !privAlvo?.compartilhar_whatsapp_match) {
                const jaTemMatch = matchesConfirmados?.has(atletaAlvo.id);
                if (jaTemMatch) {
                    alert('Vocês deram Match! ⚽ Mas este atleta ocultou o WhatsApp dele por enquanto.');
                } else {
                    alert('Este atleta deixou o WhatsApp privado. 🛡️');
                }
                if (recarregarUsuario) recarregarUsuario();
                return;
            }

            // Se chegou aqui, as regras permitem. Agora verifica se já é match para abrir zap
            const idNormal = String(atletaAlvo.id).toLowerCase().trim();
            if (matchesConfirmados?.has(idNormal)) {
                // Aqui poderíamos chamar a obterWhatsAppMatchSeguro, 
                // mas para simplificar no Descobrir, vamos tentar o telefone direto ou avisar
                const { data: userZap } = await supabase.from('usuarios').select('telefone').eq('id', atletaAlvo.id).single();
                if (userZap?.telefone) {
                    const numeroLimpo = userZap.telefone.replace(/\D/g, '');
                    window.open(`https://wa.me/55${numeroLimpo}?text=Vi seu perfil no PlayHub!`, '_blank');
                } else {
                    alert('Match confirmado! ⚽ Mas este atleta não cadastrou telefone.');
                }
                return;
            }

            // Se não for match, registra a "bola passada"
            const { error } = await supabase
                .from('cutucadas')
                .insert({ remetente_id: usuario.id, destinatario_id: atletaAlvo.id });

            if (error) {
                if (error.code === '23505') alert('Você já passou a bola para este atleta!');
                else throw error;
            } else {
                alert('Bola passada com sucesso! ⚽ Se ele retribuir, o contato será liberado.');
                if (carregarNotificacoes) carregarNotificacoes();
            }
        } catch (err) {
            console.error('Erro na interação:', err);
        }
    };

    const handleBuscar = async (novaBusca = true) => {
        setBuscando(true);
        try {
            const proximaPagina = novaBusca ? 0 : pagina + 1;
            const offset = proximaPagina * ITENS_POR_PAGINA;
            const res = await buscarAtletas({
                termo,
                modalidade,
                cidade,
                limite: ITENS_POR_PAGINA + 1,
                offset,
                cidadeReferencia: getCidadeReferencia(),
                estadoReferencia: getEstadoReferencia()
            });
            
            // Filtro dinâmico: remove quem já faz parte da equipe
            const loteBruto = res || [];
            const atualizados = ordenarAtletas(
                loteBruto
                    .slice(0, ITENS_POR_PAGINA)
                    .filter(atleta => !idsMembrosEquipe.has(atleta.id))
            );

            if (novaBusca) {
                setResultados(atualizados);
            } else {
                setResultados(prev => {
                    const idsAtuais = new Set(prev.map(atleta => atleta.id));
                    const novos = atualizados.filter(atleta => !idsAtuais.has(atleta.id));
                    return ordenarAtletas([...prev, ...novos]);
                });
            }
            setPagina(proximaPagina);
            setTemMais(loteBruto.length > ITENS_POR_PAGINA);
            
            // Carrega convites enviados para marcar no card
            await carregarMapaConvites();
        } catch (error) {
            console.error('Erro ao buscar atletas:', error);
        } finally {
            setBuscando(false);
        }
    };

    const handleConvidar = async () => {
        if (!modalConvite) return;
        const atletaId = modalConvite.id;
        setConvidando(atletaId);
        const res = await enviarConvite(atletaId, equipeAtiva.id, msgConvite);
        if (res.sucesso) {
            // Usa o ID real retornado pelo banco, sem precisar recarregar tudo
            const conviteId = res.conviteId || 'sem-id';
            setMapaConvites(prev => ({ 
                ...prev, 
                [atletaId]: { id: conviteId, status: 'pendente' } 
            }));
            setModalConvite(null);
            setMsgConvite('');
            alert('Convite enviado com sucesso! ✅');
        } else {
            alert('Erro ao enviar convite: ' + res.erro);
        }
        setConvidando(null);
    };

    const handleDesfazerConvite = async (conviteId, atletaId, e) => {
        e.stopPropagation();
        // Guarda contra IDs que não são UUIDs reais (ex: quando RLS impediu a leitura)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!conviteId || !uuidRegex.test(conviteId)) {
            alert('Não foi possível cancelar: o convite não foi carregado corretamente. Recarregue a página e tente novamente.');
            return;
        }
        
        if (window.confirm('Deseja cancelar o convite enviado para este atleta?')) {
            try {
                const res = await cancelarConvite(conviteId);
                if (res.sucesso) {
                    setMapaConvites(prev => {
                        const novoMapa = { ...prev };
                        delete novoMapa[atletaId];
                        return novoMapa;
                    });
                    // Feedback visual opcional
                    // alert('Convite cancelado com sucesso!');
                } else {
                    // Se houver erro, tentamos atualizar o mapa para garantir que a UI reflita o estado real do banco
                    await carregarMapaConvites();
                    alert('Não foi possível cancelar o convite. 🛡️\nMotivo: ' + (res.erro || 'Permissão negada ou convite já processado.'));
                }
            } catch (err) {
                alert('Erro técnico ao cancelar convite. Tente recarregar a página.');
            }
        }
    };

    return (
        <div className="animate-fade-in" style={{ padding: '0 1rem' }}>
            <header style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.6rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Globe size={28} color="var(--primaria)" /> Buscar Novos Atletas
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Encontre jogadores apaixonados na sua região para reforçar o time.</p>
            </header>

            {/* FILTROS */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                    <div className="campo-busca">
                        <label><Search size={14} /> Nome/Apelido</label>
                        <input type="text" value={termo} onChange={e => setTermo(e.target.value)} placeholder="Ex: Digui..." />
                    </div>
                    <div className="campo-busca">
                        <label><Trophy size={14} /> Modalidade</label>
                        <select value={modalidade} onChange={e => setModalidade(e.target.value)}>
                            <option value="">Todas</option>
                            <option value="Basquete">Basquete</option>
                            <option value="Beach Tennis">Beach Tennis</option>
                            <option value="E-Sports">E-Sports</option>
                            <option value="Futebol de Campo">Futebol de Campo</option>
                            <option value="Futebol Society">Futebol Society</option>
                            <option value="Futsal">Futsal</option>
                            <option value="Futevôlei">Futevôlei</option>
                            <option value="Handebol">Handebol</option>
                            <option value="Padel">Padel</option>
                            <option value="Tênis">Tênis</option>
                            <option value="Vôlei de Areia / Praia">Vôlei de Areia / Praia</option>
                            <option value="Vôlei de Quadra">Vôlei de Quadra</option>
                        </select>
                    </div>
                    <div className="campo-busca">
                        <label><MapPin size={14} /> Cidade</label>
                        <input type="text" value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Ex: Jundiaí..." />
                    </div>
                </div>
                <Botao onClick={() => handleBuscar(true)} disabled={buscando} style={{ width: '100%' }}>
                    {buscando ? <Loader2 className="animate-spin" size={18} /> : 'Pesquisar Jogadores'}
                </Botao>
            </div>

            {/* RESULTADOS */}
            <div className="grade-atletas" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {resultados.length > 0 ? (
                    resultados
                      .filter(jog => !idsMembrosEquipe.has(jog.id))
                      .map(jog => {
                        return (
                        <div 
                            key={jog.id} 
                            className="card-atleta-explorar animacao-entrada" 
                            style={{ 
                                background: 'rgba(15, 23, 42, 0.4)', 
                                border: '1px solid rgba(255, 255, 255, 0.05)', 
                                borderRadius: '20px', 
                                padding: '24px', 
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ 
                                    width: '56px', 
                                    height: '56px', 
                                    borderRadius: '50%', 
                                    overflow: 'hidden', 
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '2px solid rgba(56, 189, 248, 0.2)'
                                }}>
                                    {jog.foto_url ? (
                                        <img src={jog.foto_url} alt={jog.apelido} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                            {jog.nome_completo?.charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ color: '#f1f5f9', fontSize: '1.1rem', margin: 0, fontWeight: '600' }}>
                                        {formatarNome(jog.nome_completo)}
                                    </h4>
                                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
                                        {jog.apelido ? `@${formatarApelido(jog.apelido)}` : '@atleta'}
                                    </span>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <MapPin size={14} color="#38bdf8" /> {jog.cidade}, {jog.estado}
                                </div>
                            </div>

                            <div style={{ 
                                marginTop: 'auto', 
                                display: 'flex', 
                                flexDirection: 'column',
                                gap: '10px',
                                paddingTop: '8px' 
                            }}>
                                {/* LINHA 1: VER PERFIL E PASSAR A BOLA */}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <Botao
                                        variant="secundario"
                                        onClick={() => setAtletaSelecionado(jog)}
                                        style={{ 
                                            flex: 1, 
                                            fontSize: '0.75rem', 
                                            gap: '4px',
                                            background: 'rgba(255, 255, 255, 0.03)',
                                            padding: '8px 4px'
                                        }}
                                    >
                                        <Users size={12} /> Perfil
                                    </Botao>

                                    {(() => {
                                        const idNormal = String(jog.id).toLowerCase().trim();
                                        const ehMatchMútuo = matchesConfirmados?.has(idNormal);
                                        const euPasseiABola = matches?.has(idNormal);
                                        
                                        // O botão 'Privado' deve aparecer se o ALVO não autorizou explicitamente (qualquer coisa diferente de true)
                                        const alvoEstaPrivado = jog.compartilhar_whatsapp_match !== true;

                                        return (
                                            <Botao
                                                variant="secundario"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCutucar(jog);
                                                }}
                                                style={{ 
                                                    flex: 1.4, 
                                                    fontSize: '0.75rem',
                                                    gap: '4px',
                                                    padding: '8px 4px',
                                                    background: alvoEstaPrivado ? 'rgba(244, 63, 94, 0.05)' : ehMatchMútuo ? 'rgba(37, 211, 102, 0.1)' : undefined,
                                                    color: alvoEstaPrivado ? '#f43f5e' : ehMatchMútuo ? '#25D366' : undefined,
                                                    borderColor: alvoEstaPrivado ? 'rgba(244, 63, 94, 0.2)' : ehMatchMútuo ? 'rgba(37, 211, 102, 0.3)' : undefined
                                                }}
                                            >
                                                {alvoEstaPrivado ? <><Lock size={12} /> Privado</> : 
                                                 ehMatchMútuo ? <><MessageCircle size={12} /> Conversar</> : 
                                                 euPasseiABola ? '✓ Enviado' : <><Activity size={12} /> Passar Bola</>}
                                            </Botao>
                                        );
                                    })()}
                                </div>

                                {/* LINHA 2: CONVIDAR PARA EQUIPE */}
                                {mapaConvites[jog.id]?.status === 'pendente' ? (
                                    <Botao
                                        variant="secundario"
                                        onClick={(e) => handleDesfazerConvite(mapaConvites[jog.id].id, jog.id, e)}
                                        style={{ 
                                            width: '100%', 
                                            fontSize: '0.8rem', 
                                            borderColor: 'rgba(244, 63, 94, 0.2)', 
                                            color: '#f43f5e',
                                            background: 'rgba(244, 63, 94, 0.03)' 
                                        }}
                                    >
                                        Desfazer Convite
                                    </Botao>
                                ) : (
                                    <Botao
                                        variant="primario"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (temPermissaoEquipe('gerenciar_membros')) {
                                                setModalConvite(jog);
                                            } else {
                                                alert('Sem permissão para convidar. 🛡️');
                                            }
                                        }}
                                        style={{ width: '100%', fontSize: '0.85rem', gap: '8px' }}
                                    >
                                        <Mail size={16} /> Convidar para Equipe
                                    </Botao>
                                )}
                            </div>
                        </div>
                      )})
                ) : (
                    !buscando && termo && <p style={{ color: '#64748b', textAlign: 'center', gridColumn: '1/-1', padding: '2rem' }}>Nenhum atleta encontrado com esses filtros.</p>
                )}
            </div>

            {temMais && resultados.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
                    <Botao
                        variant="secundario"
                        onClick={() => handleBuscar(false)}
                        disabled={buscando}
                        style={{ minWidth: '220px' }}
                    >
                        {buscando ? <Loader2 className="animate-spin" size={18} /> : 'Carregar mais jogadores'}
                    </Botao>
                </div>
            )}

            {/* MODAL DE CONVITE */}
            {modalConvite && (
                <Modal isOpen={!!modalConvite} onClose={() => setModalConvite(null)} title={`Convidar ${formatarNome(modalConvite.nome_completo)}`}>
                    <div style={{ padding: '20px' }}>
                        <p style={{ color: '#94a3b8', marginBottom: '16px', fontSize: '0.9rem' }}>Envie uma mensagem personalizada para {formatarApelido(modalConvite.apelido)}.</p>
                        <textarea 
                            value={msgConvite}
                            onChange={e => setMsgConvite(e.target.value)}
                            placeholder="Olá! Gostaria de te convidar para conhecer nosso time..."
                            style={{ width: '100%', height: '100px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: 'white', marginBottom: '20px', outline: 'none' }}
                        />
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <Botao variant="secundario" onClick={() => setModalConvite(null)} style={{ flex: 1 }}>Cancelar</Botao>
                            <Botao onClick={handleConvidar} style={{ flex: 2 }} disabled={convidando === modalConvite.id}>
                                {convidando === modalConvite.id ? <Loader2 className="animate-spin" size={18} /> : 'Enviar Convite'}
                            </Botao>
                        </div>
                    </div>
                </Modal>
            )}

            {/* MODAL PERFIL ATLETA */}
            <ModalPerfilAtleta 
                isOpen={!!atletaSelecionado}
                onClose={() => setAtletaSelecionado(null)}
                idAtleta={atletaSelecionado?.id}
                equipeId={equipeAtiva?.id}
                aoPassarBola={handleCutucar}
            />

            <ModalAjustePrivacidade 
                isOpen={mostrarAvisoPrivacidade}
                onClose={() => setMostrarAvisoPrivacidade(false)}
                aoConcluir={() => {
                    setMostrarAvisoPrivacidade(false);
                    if (atletaPendente) handleCutucar(atletaPendente);
                }}
            />

            <style>{`
                .campo-busca { display: flex; flex-direction: column; gap: 6px; }
                .campo-busca label { font-size: 0.75rem; color: #64748b; font-weight: 700; display: flex; align-items: center; gap: 6px; }
                .campo-busca input, .campo-busca select { background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 10px; color: white; outline: none; transition: border-color 0.2s; }
                .campo-busca select option { background: #1e293b; color: white; }
                .campo-busca input:focus, .campo-busca select:focus { border-color: var(--primaria); }
                
                .tag-convite { text-align: center; color: #fbbf24; background: rgba(251, 191, 36, 0.1); padding: 8px; border-radius: 8px; font-size: 0.8rem; font-weight: 700; border: 1px solid rgba(251, 191, 36, 0.2); }
                .tag-membro { text-align: center; color: #10b981; background: rgba(16, 185, 129, 0.1); padding: 8px; border-radius: 8px; font-size: 0.8rem; font-weight: 700; border: 1px solid rgba(16, 185, 129, 0.2); }
            `}</style>
        </div>
    );
};

export default DescobrirTab;
