import React, { useState, useEffect } from 'react';
import { Globe, Search, MapPin, Trophy, Users, Mail, Loader2 } from 'lucide-react';
import { usarEquipe } from '../../../contextos/EquipeContexto';
import { usarNotificacoes } from '../../../contextos/NotificacoesContexto';
import { usarAutenticacao } from '../../../contextos/AutenticacaoContexto';
import Botao from '../../../componentes/Botao/Botao';
import Modal from '../../../componentes/Modal/Modal';
import ModalPerfilAtleta from '../../../componentes/Modais/ModalPerfilAtleta';
import { supabase } from '../../../servicos/supabase';

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
    const { usuario } = usarAutenticacao();
    
    const [termo, setTermo] = useState('');
    const [modalidade, setModalidade] = useState('');
    const [cidade, setCidade] = useState('');
    const [resultados, setResultados] = useState([]);
    const [buscando, setBuscando] = useState(false);
    const [convidando, setConvidando] = useState(null);
    const [mapaConvites, setMapaConvites] = useState({});
    const [atletaSelecionado, setAtletaSelecionado] = useState(null);
    const [modalConvite, setModalConvite] = useState(null);
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
            const res = await cancelarConvite(conviteId);
            if (res.sucesso) {
                setMapaConvites(prev => {
                    const novoMapa = { ...prev };
                    delete novoMapa[atletaId];
                    return novoMapa;
                });
            } else {
                alert('Falha ao cancelar o convite: ' + res.erro);
            }
        }
    };

    const handlePassarBola = async (alvoId) => {
        try {
            const { error } = await supabase
                .from('interacoes')
                .insert({
                    remetente_id: usuario.id,
                    destinatario_id: alvoId,
                    tipo: 'bola'
                });
            if (error) throw error;
            alert('Bola passada com sucesso! ⚽');
        } catch (err) {
            console.error('Erro ao retribuir:', err);
            alert('Erro ao passar a bola.');
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
                    resultados.map(jog => (
                        <div 
                            key={jog.id} 
                            className="card-atleta animacao-entrada" 
                            style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '16px', cursor: 'pointer', transition: 'border-color 0.2s' }}
                            onClick={() => setAtletaSelecionado(jog)}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#38bdf8'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', overflow: 'hidden', background: '#1e293b' }}>
                                    {jog.foto_url ? <img src={jog.foto_url} alt={jog.apelido} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Users size={24} color="#64748b" style={{ margin: '12px' }} />}
                                </div>
                                <div>
                                    <h4 style={{ color: '#f1f5f9', fontSize: '1rem', margin: 0 }}>{formatarNome(jog.nome_completo)}</h4>
                                    <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{jog.apelido ? `@${formatarApelido(jog.apelido)}` : '@atleta'}</span>
                                </div>
                            </div>
                            
                            <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '16px' }}>
                                <MapPin size={12} /> {jog.cidade}, {jog.estado}
                            </div>

                            {mapaConvites[jog.id]?.status === 'pendente' ? (
                                <Botao
                                    variant="secundario"
                                    onClick={(e) => handleDesfazerConvite(mapaConvites[jog.id].id, jog.id, e)}
                                    style={{ width: '100%', fontSize: '0.85rem', borderColor: 'rgba(244, 63, 94, 0.4)', color: '#f43f5e' }}
                                    title="Desfazer Convite Pendente"
                                >
                                    Desfazer Convite
                                </Botao>
                            ) : idsMembrosEquipe.has(jog.id) ? (
                                <div style={{
                                    textAlign: 'center', color: '#10b981',
                                    background: 'rgba(16,185,129,0.1)',
                                    border: '1px solid rgba(16,185,129,0.25)',
                                    borderRadius: '10px', padding: '10px',
                                    fontSize: '0.82rem', fontWeight: '700'
                                }}>
                                    ✓ Já faz parte da equipe
                                </div>
                            ) : mapaConvites[jog.id]?.status === 'aceito' ? (
                                <div className="tag-membro">Já é membro do time</div>
                            ) : (
                                <Botao
                                    variant="secundario"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (temPermissaoEquipe('gerenciar_membros')) {
                                            setModalConvite(jog);
                                        } else {
                                            alert('Você não tem privilégios para convidar atletas nesta equipe. 🛡️\nSolicite ao capitão a permissão de "Gerenciar Membros".');
                                        }
                                    }}
                                    style={{ width: '100%', fontSize: '0.85rem' }}
                                >
                                    Convidar p/ Equipe
                                </Botao>
                            )}
                        </div>
                    ))
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
                aoPassarBola={(alvo) => handlePassarBola(alvo.id)}
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
