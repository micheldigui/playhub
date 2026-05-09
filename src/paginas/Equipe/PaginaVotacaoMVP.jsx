import React, { useState, useEffect } from 'react';
import { Trophy, Check, ArrowLeft, Loader2, Sparkles, Users, ChevronRight } from 'lucide-react';
import { supabase } from '../../servicos/supabase';
import { usarPartidas } from '../../contextos/PartidasContexto';
import { usarEquipe } from '../../contextos/EquipeContexto';
import { usarAutenticacao } from '../../contextos/AutenticacaoContexto';
import { rastrear } from '../../servicos/rastreamento';
import Botao from '../../componentes/Botao/Botao';
import './PaginaVotacaoMVP.css';

// Cores e labels das medalhas por posição
const MEDALHAS = {
    1: { emoji: '🥇', label: 'Ouro', cor: '#fbbf24', corBg: 'rgba(251,191,36,0.15)', corBorda: '#fbbf24' },
    2: { emoji: '🥈', label: 'Prata', cor: '#94a3b8', corBg: 'rgba(148,163,184,0.15)', corBorda: '#94a3b8' },
    3: { emoji: '🥉', label: 'Bronze', cor: '#cd7f32', corBg: 'rgba(205,127,50,0.15)', corBorda: '#cd7f32' },
};

const PaginaVotacaoMVP = ({ partidaIdProp, aoVoltar, aoNavegar, setDadosNavegacao }) => {
    const partidaId = partidaIdProp;
    const { usuario } = usarAutenticacao();
    const { buscarPartidaPorId, buscarPresencas, votarMVP, buscarVotosMVP, votarMelhorTime, buscarVotosTime, editarPartida } = usarPartidas();
    const { equipeAtiva } = usarEquipe();

    const [partida, setPartida] = useState(null);
    const [atletas, setAtletas] = useState([]);
    const [carregando, setCarregando] = useState(true);

    // Etapa: 'times' | 'atletas'
    const [etapa, setEtapa] = useState('atletas'); // começa em atletas; vai para 'times' se houver times_sorteados

    // Votos de time: { 1: "Time A", 2: "Time C", 3: "Time E" }
    const [votosTimeLocais, setVotosTimeLocais] = useState({ 1: null, 2: null, 3: null });

    // Votos de atletas individuais: { 1: id, 2: id, 3: id }
    const [selecionados, setSelecionados] = useState({ 1: null, 2: null, 3: null });

    const [foiParticipante, setFoiParticipante] = useState(true);
    const [enviando, setEnviando] = useState(false);
    const [votoSucesso, setVotoSucesso] = useState(false);
    const [corrigindoIDs, setCorrigindoIDs] = useState(false);
    const [jaVotou, setJaVotou] = useState(false);
    const [jaVotouTime, setJaVotouTime] = useState(false);

    useEffect(() => {
        if (partidaId) {
            rastrear.pagina('Visitou: Votação MVP', { partida_id: partidaId });
        }
        
        const carregarDados = async () => {
            // Se ainda não temos usuário ou ID da partida, apenas aguarda o próximo ciclo
            if (!partidaId || !usuario) {
                // Se demorar muito (ex: 5s) e ainda não tivermos os dados, libera o loading para mostrar estado vazio
                const timer = setTimeout(() => {
                    if (carregando) setCarregando(false);
                }, 5000);
                return () => clearTimeout(timer);
            }

            try {
                // CARREGAMENTO PARALELO INICIAL: Busca dados essenciais
                // Só buscamos membros em paralelo se já tivermos o equipeAtiva?.id (vinda do contexto já carregado)
                const promessas = [
                    buscarPartidaPorId(partidaId),
                    buscarPresencas(partidaId),
                    buscarVotosMVP(partidaId),
                    buscarVotosTime(partidaId).catch(() => ({ sucesso: false })),
                ];

                const [resP, resPr, resV, resT] = await Promise.all(promessas);

                if (!resP.sucesso) throw new Error('Partida não encontrada');
                const partidaData = resP.partida;
                setPartida(partidaData);

                // Se há times sorteados, começa na etapa de times
                if (partidaData?.times_sorteados) {
                    setEtapa('times');
                    
                    // Checa se já votou no time
                    if (resT.sucesso && resT.votos.some(v => v.eleitor_id === usuario.id)) {
                        setJaVotouTime(true);
                        setEtapa('atletas');
                    }
                }

                // Processa atletas (Presença)
                let todosAtletas = [];
                if (resPr.sucesso) {
                    // Verifica se o usuário logado participou da partida
                    const participou = resPr.presencas.some(p => 
                        String(p.usuario_id) === String(usuario.id) && p.frequencia === 'P'
                    );
                    setFoiParticipante(participou);

                    todosAtletas = resPr.presencas
                        .filter(p => p.frequencia === 'P')
                        .map(p => p.usuarios)
                        .filter(u => u);
                }

                setAtletas(todosAtletas);

                // Checa se já votou no MVP
                if (resV.sucesso && resV.votos.some(v => v.eleitor_id === usuario.id)) {
                    setJaVotou(true);
                }

            } catch (err) {
                console.error('Erro ao carregar dados da votação:', err);
            } finally {
                setCarregando(false);
            }
        };
        carregarDados();
    }, [partidaId, usuario]);

    // ── Helpers de seleção de time ──────────────────────────────────────
    const alternarSelecaoTime = (nomeTime) => {
        setVotosTimeLocais(prev => {
            const novo = { ...prev };
            // Se já selecionado em alguma posição, remove
            const posExistente = Object.keys(novo).find(p => novo[p] === nomeTime);
            if (posExistente) {
                novo[posExistente] = null;
                return novo;
            }
            // Encaixa na próxima vaga livre (1→2→3)
            if (!novo[1]) novo[1] = nomeTime;
            else if (!novo[2]) novo[2] = nomeTime;
            else if (!novo[3]) novo[3] = nomeTime;
            return novo;
        });
    };

    const getMedalhaTime = (nomeTime) => {
        const pos = Object.keys(votosTimeLocais).find(p => votosTimeLocais[p] === nomeTime);
        return pos ? MEDALHAS[parseInt(pos)] : null;
    };

    const timesCompletos = () => votosTimeLocais[1] && votosTimeLocais[2] && votosTimeLocais[3];

    // ── Helpers de seleção de atleta ─────────────────────────────────────
    const alternarSelecao = (atletaId) => {
        setSelecionados(prev => {
            const novo = { ...prev };
            const posExistente = Object.keys(novo).find(pos => novo[pos] === atletaId);
            if (posExistente) { novo[posExistente] = null; return novo; }
            if (!novo[1]) novo[1] = atletaId;
            else if (!novo[2]) novo[2] = atletaId;
            else if (!novo[3]) novo[3] = atletaId;
            return novo;
        });
    };

    const getMedalhaPosicao = (atletaId) => {
        const pos = Object.keys(selecionados).find(p => selecionados[p] === atletaId);
        return pos ? MEDALHAS[parseInt(pos)] : null;
    };

    const normalizarToken = (str) => {
        if (!str) return '';
        return str.normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    };

    const normalizarCompleto = (str) => {
        if (!str) return '';
        return str.normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]/g, "")
            .toLowerCase()
            .trim();
    };
    
    // Mapeamento prévio para evitar cálculos pesados e race conditions no render
    const mapaJogadoresIdentificados = React.useMemo(() => {
        if (!partida?.times_sorteados || !atletas.length) return {};
        
        const mapa = {};
        partida.times_sorteados.forEach(time => {
            time.jogadores?.forEach(j => {
                const jogadorIdSorteio = j.id;
                const nomeSorteio = j.nome || j || '';
                const nomeNorm = normalizarCompleto(nomeSorteio);
                const tokensSorteio = normalizarToken(nomeSorteio).split(/\s+/).filter(t => t.length > 2);

                let match = null;

                // 1. PRIORIDADE TOTAL: ID do Usuário (Se disponível no sorteio)
                if (jogadorIdSorteio) {
                    match = atletas.find(a => a.id === jogadorIdSorteio);
                }

                // 2. BUSCA POR PALAVRAS (A prova de nomes incompletos/ID Null)
                if (!match && tokensSorteio.length > 0) {
                    match = atletas.find(a => {
                        const aNome = normalizarToken(a.nome_completo);
                        const aApelido = normalizarToken(a.apelido);
                        const aTokens = [...aNome.split(/\s+/), aApelido].filter(t => t && t.length > 1);
                        
                        // Verifica se TODAS as palavras do sorteio estão no cadastro
                        // Ex: "João Sales" bate com "João Carlos Melo de Sales"
                        return tokensSorteio.every(ts => aTokens.some(at => at.includes(ts) || ts.includes(at)));
                    });
                }

                // 3. FALLBACK: Foto Prioritária (Se houver duplicidade de nomes curtos)
                if (!match) {
                    match = atletas.find(a => normalizarCompleto(a.nome_completo) === nomeNorm || normalizarCompleto(a.apelido) === nomeNorm);
                }

                if (match) {
                    if (jogadorIdSorteio) mapa[`id-${jogadorIdSorteio}`] = match;
                    mapa[`nome-${nomeSorteio}`] = match;
                }
            });
        });
        return mapa;
    }, [partida?.times_sorteados, atletas]);

    const encontrarAtleta = (jogadorRef) => {
        if (jogadorRef.id && mapaJogadoresIdentificados[`id-${jogadorRef.id}`]) {
            return mapaJogadoresIdentificados[`id-${jogadorRef.id}`];
        }
        const nomeSorteio = jogadorRef.nome || jogadorRef || '';
        return mapaJogadoresIdentificados[`nome-${nomeSorteio}`] || null;
    };

    const handleAutoCorrigirIDs = async () => {
        if (!partida?.times_sorteados) return;
        setCorrigindoIDs(true);
        try {
            const novosTimes = partida.times_sorteados.map(time => ({
                ...time,
                jogadores: time.jogadores.map(j => {
                    const match = encontrarAtleta(j);
                    return {
                        id: match ? match.id : j.id,
                        nome: j.nome || j,
                        nivel: j.nivel || 3
                    };
                })
            }));

            const res = await editarPartida(partida.id, { times_sorteados: novosTimes });
            if (res.sucesso) {
                setPartida(prev => ({ ...prev, times_sorteados: novosTimes }));
                alert('✅ Banco de dados atualizado com os IDs corretos!');
            } else {
                alert('Erro ao atualizar banco: ' + res.erro);
            }
        } catch (error) {
            console.error(error);
            alert('Falha na correção automática.');
        } finally {
            setCorrigindoIDs(false);
        }
    };

    const formatarNomeLegivel = (texto) => {
        if (!texto) return 'Atleta';
        // Remove arrobas e limpa o texto
        const limpo = texto.replace('@', '').replace(/\./g, ' ').trim();
        const partes = limpo.split(/\s+/).filter(p => p.length > 0);
        
        const formatarPalavra = (p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();

        if (partes.length === 0) return texto;
        if (partes.length === 1) return formatarPalavra(partes[0]);
        
        const primeiro = formatarPalavra(partes[0]);
        const ultimo = formatarPalavra(partes[partes.length - 1]);
        return `${primeiro} ${ultimo}`;
    };

    // ── Envio ─────────────────────────────────────────────────────────────
    const handleVotar = async () => {
        if (enviando) return;
        rastrear.evento('votacao_registrada_mvp', 'Tentativa de submeter votos de MVP/Time');

        const votosFormatados = Object.keys(selecionados)
            .filter(pos => selecionados[pos])
            .map(pos => ({ candidato_id: selecionados[pos], posicao: parseInt(pos) }));

        if (votosFormatados.length < 3) {
            alert('Por favor, selecione os 3 atletas do seu pódio (Ouro, Prata e Bronze).');
            return;
        }

        setEnviando(true);

        // Envio de votos de times (se aplicável)
        if (partida.times_sorteados && !jaVotouTime) {
            const votosTimesArray = Object.keys(votosTimeLocais)
                .filter(pos => votosTimeLocais[pos])
                .map(pos => ({ time_escolhido: votosTimeLocais[pos], posicao: parseInt(pos) }));

            if (votosTimesArray.length === 3) {
                const timeRes = await votarMelhorTime(partidaId, partida.equipe_id, votosTimesArray);
                if (!timeRes.sucesso) {
                    alert(timeRes.erro || 'Erro ao registrar voto do time.');
                    setEnviando(false);
                    return;
                }
            }
        }

        // Envio de votos MVP
        const res = await votarMVP(partidaId, partida.equipe_id, votosFormatados);
        if (res.sucesso) {
            setVotoSucesso(true);
            rastrear.clique('mvp_voto_registrado_v2', 'Usuario votou no podio MVP');
            if (setDadosNavegacao) setDadosNavegacao({ equipeId: partida.equipe_id });
            setTimeout(() => {
                if (aoNavegar) aoNavegar('ranking_partidas');
                else aoVoltar();
            }, 3000);
        } else {
            alert(res.erro || 'Erro ao registrar voto.');
            setEnviando(false);
        }
    };

    // ── Loading / estados especiais ───────────────────────────────────────
    if (carregando) {
        return (
            <div className="pagina-votacao-mvp" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <Loader2 className="animate-spin" size={40} color="#fbbf24" />
                    <p style={{ marginTop: '16px', color: '#94a3b8' }}>Preparando as medalhas...</p>
                </div>
            </div>
        );
    }

    if (votoSucesso) {
        return (
            <div className="pagina-votacao-mvp">
                <div className="votacao-container">
                    <div className="voto-sucesso-container">
                        <div className="voto-sucesso-icon"><Sparkles size={48} /></div>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '12px' }}>Pódio Enviado!</h2>
                        <p style={{ color: '#94a3b8', marginBottom: '32px' }}>
                            Seus votos de Ouro, Prata e Bronze foram registrados. <br />
                            Obrigado por ajudar a eleger os melhores do jogo!
                        </p>
                        <Botao onClick={() => {
                            if (setDadosNavegacao) setDadosNavegacao({ equipeId: partida.equipe_id });
                            if (aoNavegar) aoNavegar('ranking_partidas');
                            else aoVoltar();
                        }}>
                            Ver Hall da Fama
                        </Botao>
                    </div>
                </div>
            </div>
        );
    }

    if (jaVotou) {
        return (
            <div className="pagina-votacao-mvp">
                <div className="votacao-header">
                    <button className="btn-voltar-v4" onClick={aoVoltar}><ArrowLeft size={20} /></button>
                    <span className="v4-header-title">Votação MVP</span>
                </div>
                <div className="votacao-container">
                    <div className="voto-vazio" style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <Trophy size={48} color="#475569" style={{ margin: '0 auto 24px' }} />
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '12px' }}>Pódio já registrado!</h2>
                        <p style={{ color: '#94a3b8', marginBottom: '32px' }}>
                            Você já enviou seus votos para esta partida. <br /> Cada voto conta para o Hall da Fama da equipe!
                        </p>
                        <Botao onClick={() => {
                            if (setDadosNavegacao) setDadosNavegacao({ equipeId: partida.equipe_id });
                            if (aoNavegar) aoNavegar('ranking_partidas');
                            else aoVoltar();
                        }}>
                            Ver Hall da Fama
                        </Botao>
                    </div>
                </div>
            </div>
        );
    }

    if (!foiParticipante) {
        return (
            <div className="pagina-votacao-mvp">
                <div className="votacao-header">
                    <button className="btn-voltar-v4" onClick={aoVoltar}><ArrowLeft size={20} /></button>
                    <span className="v4-header-title">Votação MVP</span>
                </div>
                <div className="votacao-container">
                    <div className="voto-vazio" style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <Users size={48} color="#475569" style={{ margin: '0 auto 24px' }} />
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '12px' }}>Acesso Restrito ✋</h2>
                        <p style={{ color: '#94a3b8', marginBottom: '32px' }}>
                            Apenas os atletas que **estiveram presentes** nesta partida podem votar. <br />
                            Não identificamos sua presença na lista oficial desta partida.
                        </p>
                        <Botao onClick={aoVoltar}>
                            Voltar
                        </Botao>
                    </div>
                </div>
            </div>
        );
    }

    // ── Renderização principal ────────────────────────────────────────────
    const temTimes = partida?.times_sorteados && !jaVotouTime;

    return (
        <div className="pagina-votacao-mvp">
            <header className="votacao-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                        onClick={etapa === 'atletas' && temTimes ? () => setEtapa('times') : aoVoltar}
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: '700' }}>
                            {etapa === 'times' ? 'Melhor Time 🛡️' : 'Destaques do Jogo 🏆'}
                        </h2>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {temTimes ? (etapa === 'times' ? 'Passo 1 de 2 • ' : 'Passo 2 de 2 • ') : ''} 
                            📅 {partida?.data ? new Date(partida.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : ''} {partida?.local_nome ? `• 📍 ${partida.local_nome}` : ''}
                        </span>
                    </div>
                </div>
                {/* Indicador de progresso */}
                {temTimes && (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <div style={{ width: '28px', height: '4px', borderRadius: '2px', background: '#fbbf24' }} />
                        <div style={{ width: '28px', height: '4px', borderRadius: '2px', background: etapa === 'atletas' ? '#fbbf24' : 'rgba(255,255,255,0.1)' }} />
                    </div>
                )}
            </header>

            {/* ═══════════════════════════════════
                ETAPA 1: VOTAÇÃO DOS TIMES
            ═══════════════════════════════════ */}
            {etapa === 'times' && temTimes && (
                <main className="votacao-container" key={`times-${atletas.length}`}>
                    <div className="votacao-titulo-secao">
                        <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Melhor Time 🛡️
                        </h2>
                        
                        {(equipeAtiva?.papel === 'admin' || equipeAtiva?.papel === 'sub_admin') && 
                          partida?.times_sorteados?.some(t => t.jogadores?.some(j => !j.id)) && (
                            <button 
                                onClick={handleAutoCorrigirIDs}
                                disabled={corrigindoIDs}
                                style={{
                                    marginTop: '8px',
                                    padding: '6px 14px',
                                    borderRadius: '20px',
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    border: '1px solid #10b981',
                                    color: '#10b981',
                                    fontSize: '0.75rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {corrigindoIDs ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                {corrigindoIDs ? 'Corrigindo...' : '✨ Corrigir IDs no Banco de Dados'}
                            </button>
                        )}
                        <p>Atribua <strong>🥇 Ouro</strong>, <strong>🥈 Prata</strong> e <strong>🥉 Bronze</strong> para as equipes.</p>
                    </div>

                    {/* Indicador de progresso da seleção */}
                    <div className="indicador-passo-voto" style={{ marginBottom: '20px' }}>
                        {!votosTimeLocais[1] ? '🥇 Selecione o Time Ouro' :
                         !votosTimeLocais[2] ? '🥈 Selecione o Time Prata' :
                         !votosTimeLocais[3] ? '🥉 Selecione o Time Bronze' :
                         'Times escolhidos! ✅'}
                    </div>

                    {/* Cards de Times */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {partida.times_sorteados.map(time => {
                            const medalha = getMedalhaTime(time.nome);
                            return (
                                <div
                                    key={time.nome}
                                    onClick={() => alternarSelecaoTime(time.nome)}
                                    style={{
                                        background: medalha
                                            ? `linear-gradient(135deg, ${medalha.corBg}, rgba(15,23,42,0.8))`
                                            : 'rgba(30,41,59,0.45)',
                                        border: `2px solid ${medalha ? medalha.corBorda : 'rgba(255,255,255,0.07)'}`,
                                        borderRadius: '18px',
                                        padding: '14px 16px',
                                        cursor: 'pointer',
                                        transition: 'all 0.22s ease',
                                        boxShadow: medalha ? `0 0 24px -6px ${medalha.corBorda}` : 'none',
                                        userSelect: 'none',
                                    }}
                                >
                                    {/* ─ Linha superior: nome + badge ─ */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '14px'
                                    }}>
                                        <span style={{
                                            fontWeight: '800',
                                            fontSize: '1rem',
                                            color: medalha ? medalha.cor : '#f8fafc',
                                            letterSpacing: '0.02em',
                                        }}>
                                            {time.nome}
                                        </span>

                                        {medalha ? (
                                            <span style={{
                                                background: medalha.corBorda,
                                                color: '#0f172a',
                                                fontWeight: '800',
                                                fontSize: '0.78rem',
                                                padding: '3px 11px',
                                                borderRadius: '20px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {medalha.emoji} {medalha.label}
                                            </span>
                                        ) : (
                                            <span style={{
                                                fontSize: '0.72rem',
                                                color: '#475569',
                                                fontStyle: 'italic',
                                            }}>
                                                toque para votar
                                            </span>
                                        )}
                                    </div>

                                    {/* ─ Grade de jogadores centralizada ─ */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        gap: '16px',
                                        flexWrap: 'wrap',
                                    }}>
                                        {time.jogadores?.map((j, idx) => {
                                            const atletaMatch = encontrarAtleta(j);
                                            // PRIORIDADE: Sempre usar o nome original do sorteio para evitar confusão visual
                                            const nomeExibicao = formatarNomeLegivel(j.nome || j);
                                            const iniciais = nomeExibicao[0]?.toUpperCase() || '?';
                                            return (
                                                <div key={idx} style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    width: '65px',
                                                }}>
                                                    {/* Avatar */}
                                                    <div style={{
                                                        width: '54px',
                                                        height: '54px',
                                                        borderRadius: '50%',
                                                        border: `2.5px solid ${medalha ? medalha.corBorda : 'rgba(255,255,255,0.12)'}`,
                                                        overflow: 'hidden',
                                                        background: '#1e293b',
                                                        flexShrink: 0,
                                                        boxShadow: medalha ? `0 0 8px -2px ${medalha.corBorda}` : 'none',
                                                    }}>
                                                        {atletaMatch?.foto_url ? (
                                                            <img
                                                                src={atletaMatch.foto_url}
                                                                alt={nomeExibicao}
                                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                            />
                                                        ) : (
                                                            <div style={{
                                                                width: '100%', height: '100%',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                background: medalha ? `${medalha.corBorda}25` : '#283548',
                                                                color: medalha ? medalha.cor : '#64748b',
                                                                fontWeight: '700',
                                                                fontSize: '1.15rem',
                                                            }}>
                                                                {iniciais}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Nome */}
                                                    <span style={{
                                                        fontSize: '0.62rem',
                                                        color: medalha ? '#e2e8f0' : '#94a3b8',
                                                        fontWeight: '600',
                                                        textAlign: 'center',
                                                        lineHeight: '1.2',
                                                        maxWidth: '65px',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}>
                                                        {nomeExibicao}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Botão Próxima Etapa */}
                    <div style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <button
                            className="btn-confirmar-voto"
                            disabled={!timesCompletos()}
                            onClick={() => setEtapa('atletas')}
                            style={{
                                width: '100%',
                                maxWidth: '350px',
                                background: timesCompletos() ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'rgba(255,255,255,0.05)',
                                color: timesCompletos() ? '#0f172a' : '#475569',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}
                        >
                            Votar nos Atletas <ChevronRight size={20} />
                        </button>
                        {!timesCompletos() && (
                            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>
                                Selecione Ouro, Prata e Bronze para continuar
                            </p>
                        )}
                    </div>
                </main>
            )}

            {/* ═══════════════════════════════════
                ETAPA 2: VOTAÇÃO DOS ATLETAS
            ═══════════════════════════════════ */}
            {etapa === 'atletas' && (
                <>
                    <main className="votacao-container">
                        {/* Mini-resumo dos times escolhidos */}
                        {temTimes && timesCompletos() && (
                            <div style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '12px', padding: '12px 16px', marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                {[1, 2, 3].map(pos => (
                                    <span key={pos} style={{ fontSize: '0.8rem', color: MEDALHAS[pos].cor, fontWeight: '700' }}>
                                        {MEDALHAS[pos].emoji} {votosTimeLocais[pos]}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="votacao-titulo-secao">
                            <h1>Destaques do Jogo 🏆</h1>
                            <p>Selecione os 3 atletas que mais brilharam hoje, do 1º ao 3º lugar.</p>
                        </div>

                        <div className="indicador-passo-voto">
                            {!selecionados[1] ? '🥇 Selecione o 1º Lugar (Ouro)' :
                             !selecionados[2] ? '🥈 Selecione o 2º Lugar (Prata)' :
                             !selecionados[3] ? '🥉 Selecione o 3º Lugar (Bronze)' :
                             'Pódio completo! ✅'}
                        </div>

                        {atletas.length > 0 ? (
                            <div className="grid-votacao">
                                {atletas.filter(a => a.id !== usuario.id).map(atleta => {
                                    const medalha = getMedalhaPosicao(atleta.id);
                                    return (
                                        <div
                                            key={atleta.id}
                                            className={`card-votacao ${medalha ? 'selecionado' : ''}`}
                                            onClick={() => alternarSelecao(atleta.id)}
                                        >
                                            {medalha && (
                                                <div className="voto-pos-badge" title={medalha.label}>
                                                    {medalha.emoji}
                                                </div>
                                            )}
                                            <div className="v4-avatar-voto">
                                                {atleta.foto_url ? (
                                                    <img src={atleta.foto_url} alt={atleta.apelido || atleta.nome_completo} />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#334155', color: '#94a3b8', fontWeight: '700' }}>
                                                        {atleta.apelido ? atleta.apelido[0].toUpperCase() : (atleta.nome_completo ? atleta.nome_completo[0].toUpperCase() : '?')}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="voto-atleta-nome">{formatarNomeLegivel(atleta.apelido || atleta.nome_completo)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="bento-vazio" style={{ padding: '60px 20px' }}>
                                <Users size={48} color="#1e293b" style={{ margin: '0 auto 16px' }} />
                                <p>Nenhum atleta disponível para votação.</p>
                            </div>
                        )}
                    </main>

                    {atletas.length > 0 && (
                        <footer className="votacao-footer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <button
                                className="btn-confirmar-voto"
                                disabled={!selecionados[3] || enviando}
                                onClick={handleVotar}
                                style={{
                                    width: '100%',
                                    maxWidth: '350px',
                                    background: selecionados[3] ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'rgba(255,255,255,0.05)',
                                    color: selecionados[3] ? '#0f172a' : '#475569',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                {enviando ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <>Confirmar Pódio <Check size={18} style={{ marginLeft: '8px' }} /></>
                                )}
                            </button>
                        </footer>
                    )}
                </>
            )}
        </div>
    );
};

export default PaginaVotacaoMVP;
