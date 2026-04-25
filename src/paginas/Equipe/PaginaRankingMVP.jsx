import React, { useState, useEffect, useRef } from 'react';
import { Trophy, ArrowLeft, Loader2, Crown, Shield, Calendar, ChevronDown, Users, Share2 } from 'lucide-react';
import { usarPartidas } from '../../contextos/PartidasContexto';
import { usarEquipe } from '../../contextos/EquipeContexto';
import { rastrear } from '../../servicos/rastreamento';
import './PaginaRankingMVP.css';

const MEDALHAS = [
    { emoji: '🥇', label: 'Ouro',   cor: '#fbbf24', corBg: 'rgba(251,191,36,0.14)', corBorda: 'rgba(251,191,36,0.45)' },
    { emoji: '🥈', label: 'Prata',  cor: '#94a3b8', corBg: 'rgba(148,163,184,0.1)', corBorda: 'rgba(148,163,184,0.35)' },
    { emoji: '🥉', label: 'Bronze', cor: '#cd7f32', corBg: 'rgba(205,127,50,0.1)',  corBorda: 'rgba(205,127,50,0.35)' },
];

const formatarNomeCurto = (texto) => {
    if (!texto) return '';
    const partes = texto.trim().split(/\s+/);
    const formatar = (p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
    if (partes.length === 1) return formatar(partes[0]);
    const primeiro = formatar(partes[0]);
    const ultimo = formatar(partes[partes.length - 1]);
    return `${primeiro} ${ultimo}`;
};

// ── Subcomponente: Avatar ──────────────────────────────────────────────────
const Avatar = ({ src, inicial, tamanho = 52, borda = 'rgba(255,255,255,0.15)', glow = false, corGlow = '' }) => (
    <div style={{
        width: tamanho, height: tamanho,
        borderRadius: '50%',
        border: `2.5px solid ${borda}`,
        overflow: 'hidden',
        background: '#1e293b',
        flexShrink: 0,
        boxShadow: glow ? `0 0 10px -3px ${corGlow}` : 'none',
    }}>
        {src ? (
            <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#283548', color: '#64748b', fontWeight: '800', fontSize: tamanho * 0.38 }}>
                {inicial}
            </div>
        )}
    </div>
);

// ── Subcomponente: Card de Time (usado apenas na aba Por Partida) ────────
const CardTime = ({ time, idx, encontrarMembro }) => {
    const md = MEDALHAS[Math.min(idx, 2)];
    const isFirst = idx === 0;
    return (
        <div style={{
            background: isFirst ? `linear-gradient(135deg, ${md.corBg}, rgba(15,23,42,0.85))` : 'rgba(30,41,59,0.4)',
            border: `1.5px solid ${isFirst ? md.corBorda : 'rgba(255,255,255,0.06)'}`,
            borderRadius: '16px',
            padding: '14px 16px',
            boxShadow: isFirst ? `0 0 28px -8px ${md.corBorda}` : 'none',
        }}>
            {/* Linha superior */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: md.corBg, border: `2px solid ${md.corBorda}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem', flexShrink: 0,
                }}>{md.emoji}</div>
                <span style={{ flex: 1, fontWeight: '800', color: isFirst ? md.cor : '#f1f5f9', fontSize: '0.95rem' }}>{time.nome}</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, gap: '2px' }}>
                    {time.isNota ? (
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ fontWeight: '800', fontSize: '1rem', color: isFirst ? md.cor : '#cbd5e1' }}>{time.nota.toFixed(1)}</span>
                            <span style={{ fontSize: '0.6rem', color: '#475569', marginLeft: '3px' }}>NOTA</span>
                        </div>
                    ) : time.pontos !== undefined && (
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ fontWeight: '800', fontSize: '1rem', color: isFirst ? md.cor : '#cbd5e1' }}>{time.pontos}</span>
                            <span style={{ fontSize: '0.6rem', color: '#475569', marginLeft: '3px' }}>PTS</span>
                        </div>
                    )}
                    {(time.ouros !== undefined) && (
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'flex', gap: '4px' }}>
                            <span>🥇{time.ouros}</span>
                            <span>🥈{time.pratas}</span>
                            <span>🥉{time.bronzes}</span>
                        </div>
                    )}
                </div>
            </div>
            {/* Avatares */}
            {time.jogadores?.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {time.jogadores.map((j, jIdx) => {
                        const m = encontrarMembro(j);
                        const pNome = (j.nome || '').split(' ')[0];
                        return (
                            <div key={jIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '50px' }}>
                                <Avatar
                                    src={m?.foto_url}
                                    inicial={(pNome[0] || '?').toUpperCase()}
                                    tamanho={46}
                                    borda={isFirst ? md.corBorda : 'rgba(255,255,255,0.1)'}
                                    glow={isFirst}
                                    corGlow={md.corBorda}
                                />
                                <span style={{ 
                                    fontSize: '0.62rem', 
                                    color: isFirst ? '#e2e8f0' : '#64748b', 
                                    fontWeight: '600', 
                                    textAlign: 'center', 
                                    maxWidth: '50px', 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis', 
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    whiteSpace: 'normal',
                                    lineHeight: '1.1',
                                    minHeight: '2.2em'
                                }}>
                                    {formatarNomeCurto(j.nome)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ── Subcomponente: Lista e Pódio de Jogadores ──────────────────────────────
const ListaRankingJogadores = ({ ranking }) => {
    if (!ranking || ranking.length === 0) {
        return (
            <div style={{ padding: '32px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', marginBottom: '8px' }}>
                <Trophy size={40} color="#1e293b" style={{ margin: '0 auto 12px' }} />
                <p style={{ color: '#475569', fontSize: '0.9rem' }}>Pódio ainda vazio. Vote nas partidas!</p>
            </div>
        );
    }

    const podio = ranking.slice(0, 5);
    const resto = ranking.slice(5);

    return (
        <>
            <div className="podio-container container-top-5">
                {podio.map((player, index) => {
                    const corCoroa = index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : '#cd7f32';
                    const classePos = ['primeiro', 'segundo', 'terceiro', 'quarto', 'quinto'][index];
                    return (
                        <div key={player.usuario_id || index} className={`podio-item ${classePos}`}>
                            <div className="podio-avatar-wrapper">
                                <div className="coroa-icon" style={{ color: corCoroa }}><Crown size={index === 0 ? 30 : index === 1 ? 22 : 18} /></div>
                                <div className="podio-avatar" style={{ border: `2.5px solid ${corCoroa}44` }}>
                                    {player.foto_url ? <img src={player.foto_url} alt={player.apelido} /> : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#334155', color: '#94a3b8', fontWeight: '800' }}>
                                            {(player.apelido || player.nome_completo || '?')[0].toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="posicao-badge" style={{ background: corCoroa }}>{index + 1}</div>
                            </div>
                            <span className="podio-nome">{formatarNomeCurto(player.nome_completo || player.apelido)}</span>
                            <div className="podio-pontos" style={{ color: corCoroa, fontSize: index > 2 ? '0.9rem' : '1.1rem' }}>
                                {Math.min(10, player.media).toFixed(1)} <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>NOTA</span>
                            </div>
                            <div className="podio-medalheiro" style={{ fontSize: index > 2 ? '0.62rem' : '0.7rem' }}>
                                <span>{player.jogos || 0} jogos validos</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            {resto.length > 0 && (
                <div className="lista-ranking">
                    {resto.map((player, index) => {
                        return (
                            <div key={player.usuario_id || index} className="item-ranking">
                                <div className="item-ranking-pos">{index + 6}</div>
                                <div className="item-ranking-atleta">
                                    <div className="item-ranking-avatar">
                                        {player.foto_url ? <img src={player.foto_url} alt="" /> : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#334155', color: '#64748b' }}>
                                                {(player.apelido || player.nome_completo || '?')[0].toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="item-ranking-info">
                                        <span className="item-ranking-nome">{formatarNomeCurto(player.nome_completo || player.apelido)}</span>
                                        <div className="item-ranking-medalheiro-mini">
                                            <span>{player.jogos || 0} jogos validos</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="item-ranking-pontos">
                                    <strong>{Math.min(10, player.media).toFixed(1)}</strong> 
                                    <span style={{ fontSize: '0.65rem', color: '#64748b', marginLeft: '2px' }}>NOTA</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
};

// ── Subcomponente: Pódio da Partida (atletas apenas na aba partida) ───────
const PodioPartida = ({ atletas }) => {
    const podio = atletas.slice(0, 5);
    if (!podio.length) return (
        <div style={{ textAlign: 'center', padding: '24px', color: '#475569', fontSize: '0.85rem' }}>
            Nenhum voto de atleta registrado nesta partida.
        </div>
    );
    return (
        <div className="podio-container container-top-5">
            {podio.map((player, index) => {
                const corCoroa = index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : '#cd7f32';
                const classePos = ['primeiro', 'segundo', 'terceiro', 'quarto', 'quinto'][index];
                return (
                    <div key={player.usuario_id || index} className={`podio-item ${classePos}`}>
                        <div className="podio-avatar-wrapper">
                            <div className="coroa-icon" style={{ color: corCoroa }}><Crown size={index === 0 ? 30 : index === 1 ? 22 : 18} /></div>
                            <div className="podio-avatar" style={{ border: `2.5px solid ${corCoroa}44` }}>
                                {player.foto_url ? (
                                    <img src={player.foto_url} alt={player.apelido} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#334155', color: '#94a3b8', fontWeight: '800' }}>
                                        {(player.apelido || player.nome_completo || '?')[0].toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="posicao-badge" style={{ background: corCoroa }}>{index + 1}</div>
                        </div>
                        <span className="podio-nome">{formatarNomeCurto(player.nome_completo || player.apelido)}</span>
                        {player.isNota ? (
                            <div className="podio-pontos" style={{ color: corCoroa, fontSize: index > 2 ? '0.9rem' : '1.1rem' }}>
                                {player.nota.toFixed(1)} <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>NOTA</span>
                            </div>
                        ) : player.pontos !== undefined && (
                            <div className="podio-pontos" style={{ color: corCoroa, fontSize: index > 2 ? '0.9rem' : '1.1rem' }}>
                                {player.pontos} <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>PTS</span>
                            </div>
                        )}
                        {(player.ouros !== undefined || player.pratas !== undefined) && (
                            <div className="podio-medalheiro" style={{ fontSize: index > 2 ? '0.6rem' : '0.68rem' }}>
                                <span>🥇{player.ouros || 0}</span><span>🥈{player.pratas || 0}</span><span>🥉{player.bronzes || 0}</span>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// ── Componente Principal ──────────────────────────────────────────────────
const PaginaRankingMVP = ({ equipeIdProp, aoVoltar, modoInicial = 'geral', apenasPartidas = false }) => {
    const { equipeAtiva, carregarMembrosEquipe } = usarEquipe();
    const equipeId = equipeIdProp || equipeAtiva?.id;
    const { buscarRankingMVP, buscarRankingColetivo, carregarPartidas, buscarVencedoresPartida, buscarVotosTime, buscarVotosMVP } = usarPartidas();

    const [modo, setModo] = useState(modoInicial);
    const [periodo, setPeriodo] = useState('sempre'); // 'sempre' | 'mes'
    const [showInfoGeral, setShowInfoGeral] = useState(false);
    const [showInfoPartida, setShowInfoPartida] = useState(false);

    // Estado geral
    const [rankingMVP, setRankingMVP] = useState([]);
    const [rankingColetivo, setRankingColetivo] = useState([]);
    const [membros, setMembros] = useState([]);
    const [travaPresenca, setTravaPresenca] = useState(0);
    const [carregando, setCarregando] = useState(true);

    // Estado por partida
    const [partidas, setPartidas] = useState([]);
    const [partidaSelecionada, setPartidaSelecionada] = useState(null);
    const [vencedoresPartida, setVencedoresPartida] = useState([]);
    const [timesPartida, setTimesPartida] = useState([]);
    const [carregandoPartida, setCarregandoPartida] = useState(false);
    const [seletorAberto, setSeletorAberto] = useState(false);
    const seletorRef = useRef(null);

    useEffect(() => {
        rastrear.pagina('Visitou: Hall da Fama');
    }, []);

    useEffect(() => {
        setModo(modoInicial);
    }, [modoInicial]);

    // Fechar dropdown ao clicar fora
    useEffect(() => {
        const handler = (e) => {
            if (seletorRef.current && !seletorRef.current.contains(e.target)) setSeletorAberto(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Carga inicial dos rankings (assíncrona)
    useEffect(() => {
        const carregar = async () => {
            if (!equipeId) return;
            setCarregando(true);
            const [resAtletas, resColetivo, resMembros, todasPartidas] = await Promise.all([
                buscarRankingMVP(equipeId, periodo === 'mes'),
                buscarRankingColetivo ? buscarRankingColetivo(equipeId, periodo === 'mes') : Promise.resolve({ sucesso: false, ranking: [] }),
                carregarMembrosEquipe(equipeId),
                carregarPartidas(equipeId)
            ]);
            
            if (resAtletas.sucesso && resMembros) {
                // Enriquecer ranking MVP com dados dos membros (Foto e Nome)
                const rankingMapeado = resAtletas.ranking.map(jogador => {
                    const m = resMembros.find(mb => String(mb.usuario_id) === String(jogador.usuario_id));
                    return { 
                        ...jogador, 
                        foto_url: m?.usuarios?.foto_url,
                        nome_completo: m?.usuarios?.nome_completo || m?.usuarios?.apelido || 'Atleta'
                    };
                });
                setRankingMVP(rankingMapeado);
                setTravaPresenca(resAtletas.travaPresenca);
            }
            if (resMembros) setMembros(resMembros);

            if (resColetivo.sucesso && resMembros) {
                // Enriquecer ranking coletivo com as fotos dos jogadores
                const rankingMapeado = resColetivo.ranking.map(jogador => {
                    const m = resMembros.find(mb => String(mb.usuario_id) === String(jogador.usuario_id));
                    return { 
                        ...jogador, 
                        foto_url: m?.usuarios?.foto_url,
                        nome_completo: m?.usuarios?.nome_completo || m?.usuarios?.apelido || jogador.nome_completo
                    };
                });
                setRankingColetivo(rankingMapeado);
            }

            const agora = new Date().getTime();
            const comVoto = (todasPartidas || [])
                .filter(p => {
                    const dataString = p.data + 'T' + (p.hora ? p.hora.substring(0,8) : '00:00:00');
                    const dataPartida = new Date(dataString).getTime();
                    return p.frequencia_lancada || dataPartida <= agora;
                })
                .sort((a, b) => new Date(b.data + 'T' + (b.hora||'00:00:00')).getTime() - new Date(a.data + 'T' + (a.hora||'00:00:00')).getTime());
            
            setPartidas(comVoto);
            if (comVoto.length > 0 && !partidaSelecionada) {
                setPartidaSelecionada(comVoto[0]);
            }

            setCarregando(false);
        };
        carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [equipeId, periodo]);

    // Carga dos dados da partida selecionada
    useEffect(() => {
        if (!partidaSelecionada) return;
        const carregarDadosPartida = async () => {
            setCarregandoPartida(true);
            const [resVenc, resVotosTime, resVotosMVP] = await Promise.all([
                buscarVencedoresPartida(partidaSelecionada.id),
                buscarVotosTime(partidaSelecionada.id),
                buscarVotosMVP(partidaSelecionada.id),
            ]);

            const todosVotosMVP = resVenc.sucesso ? resVenc.vencedores || [] : [];
            // Usar votantes reais (IDs únicos que votaram) para o teto máximo
            const votantesReaisMVP = new Set(
                (resVotosMVP.sucesso ? resVotosMVP.votos || [] : []).map(v => v.eleitor_id).filter(Boolean)
            );
            const qtdVotantesMVP = Math.max(1, votantesReaisMVP.size);
            // Teto máximo = todos votando Ouro (4 pts) em um só candidato
            const maxPontosMVP = qtdVotantesMVP * 4;

            // Calcular medalhas E pontos (4-2-1) inteiramente dos votos brutos
            // Ignoramos v.pontos da RPC pois ela ainda usa pesos 3-2-1 no banco
            const medalhasMVP = {};
            const pontosMVP = {};
            (resVotosMVP.sucesso ? resVotosMVP.votos || [] : []).forEach(v => {
                const pts = v.posicao === 1 ? 4 : v.posicao === 2 ? 2 : 1;
                pontosMVP[v.candidato_id] = (pontosMVP[v.candidato_id] || 0) + pts;
                if (!medalhasMVP[v.candidato_id]) medalhasMVP[v.candidato_id] = { ouros: 0, pratas: 0, bronzes: 0 };
                if (v.posicao === 1) medalhasMVP[v.candidato_id].ouros++;
                else if (v.posicao === 2) medalhasMVP[v.candidato_id].pratas++;
                else if (v.posicao === 3) medalhasMVP[v.candidato_id].bronzes++;
            });

            // Montar lista final usando os candidatos que aparecem na RPC (para ter nome/foto)
            // mas com pontos e medalhas calculados pelo frontend (4-2-1)
            const vencedoresFormatados = todosVotosMVP
                .filter(v => pontosMVP[v.usuario_id] !== undefined)
                .map(v => {
                    const med = medalhasMVP[v.usuario_id] || { ouros: 0, pratas: 0, bronzes: 0 };
                    const pts = pontosMVP[v.usuario_id] || 0;
                    const perc = pts / maxPontosMVP;
                    return {
                        ...v,
                        nota: Math.min(10.0, perc * 10.0),
                        isNota: true,
                        ouros: med.ouros,
                        pratas: med.pratas,
                        bronzes: med.bronzes,
                    };
                });
            // Ordenação Olímpica: Ouro primeiro, Prata como desempate, Bronze como 2º desempate
            const vencedoresOrdenados = vencedoresFormatados.sort((a, b) => {
                if (b.ouros !== a.ouros) return b.ouros - a.ouros;
                if (b.pratas !== a.pratas) return b.pratas - a.pratas;
                if (b.bronzes !== a.bronzes) return b.bronzes - a.bronzes;
                return b.nota - a.nota;
            });
            setVencedoresPartida(vencedoresOrdenados);

            if (resVotosTime.sucesso && resVotosTime.votos.length > 0) {
                const qtdVotantesTimes = Math.max(1, new Set((resVotosTime.votos || []).filter(v => v.eleitor_id).map(v => v.eleitor_id)).size || 0);
                const maxPontosTimes = qtdVotantesTimes * 4;

                const pontos = {};
                const medalhasTimes = {};
                resVotosTime.votos.forEach(v => {
                    const pts = v.posicao === 1 ? 4 : v.posicao === 2 ? 2 : 1;
                    pontos[v.time_escolhido] = (pontos[v.time_escolhido] || 0) + pts;
                    if (!medalhasTimes[v.time_escolhido]) medalhasTimes[v.time_escolhido] = { ouros: 0, pratas: 0, bronzes: 0 };
                    if (v.posicao === 1) medalhasTimes[v.time_escolhido].ouros++;
                    else if (v.posicao === 2) medalhasTimes[v.time_escolhido].pratas++;
                    else if (v.posicao === 3) medalhasTimes[v.time_escolhido].bronzes++;
                });
                const ordenado = Object.keys(pontos)
                    .map(nome => {
                        const pts = pontos[nome];
                        const perc = pts / maxPontosTimes;
                        const nota = Math.min(10.0, perc * 10.0);
                        return {
                            nome,
                            pontos: pts,
                            nota,
                            isNota: true,
                            ouros: medalhasTimes[nome]?.ouros || 0,
                            pratas: medalhasTimes[nome]?.pratas || 0,
                            bronzes: medalhasTimes[nome]?.bronzes || 0,
                            jogadores: (partidaSelecionada.times_sorteados || []).find(t => t.nome === nome)?.jogadores || []
                        };
                    })
                    .sort((a, b) => {
                        if (b.ouros !== a.ouros) return b.ouros - a.ouros;
                        if (b.pratas !== a.pratas) return b.pratas - a.pratas;
                        if (b.bronzes !== a.bronzes) return b.bronzes - a.bronzes;
                        return b.nota - a.nota;
                    });
                setTimesPartida(ordenado);
            } else {
                setTimesPartida([]);
            }
            setCarregandoPartida(false);
        };
        carregarDadosPartida();
    }, [partidaSelecionada]);

    const encontrarMembro = (jogador) => {
        if (jogador.id) {
            const porId = membros.find(m =>
                String(m.usuario_id) === String(jogador.id) ||
                String(m.usuarios?.id) === String(jogador.id)
            );
            if (porId?.usuarios) return porId.usuarios;
        }
        const pNome = (jogador.nome || '').split(' ')[0].toLowerCase();
        const porNome = membros.find(m => {
            const mNome = (m.usuarios?.nome_completo || m.usuarios?.apelido || '').toLowerCase();
            return pNome.length > 1 && mNome.startsWith(pNome);
        });
        return porNome?.usuarios || null;
    };

    const formatarData = (data) =>
        new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

    const compartilharResultados = async () => {
        rastrear.clique('hall_fama_compartilhar', `Compartilhou resultados do Hall da Fama (${modo})`);
        
        let texto = '';
        if (modo === 'geral') {
            texto += `🏆 *Hall da Fama (TOP 10) - ${equipeAtiva?.nome || 'Equipe'}* 🏆\n`;
            texto += `_Ranking por nota ajustada, nao por soma de medalhas_\n\n`;
            
            if (rankingMVP.length > 0) {
                texto += `⭐ *Craques Individuais - Nota Ajustada*\n`;
                rankingMVP.slice(0, 5).forEach((p, i) => {
                    const nomeFormatado = formatarNomeCurto(p.nome_completo || p.apelido);
                    const nota = Math.min(10, p.media).toFixed(1);
                    texto += `${i + 1}º ${nomeFormatado} - Nota ${nota} (${p.jogos || 0} jogos validos)\n`;
                });
                texto += `\n`;
            }
            if (rankingColetivo.length > 0) {
                texto += `🛡️ *Destaques Coletivos - Nota Ajustada*\n`;
                rankingColetivo.slice(0, 10).forEach((p, i) => {
                    const nomeFormatado = formatarNomeCurto(p.nome_completo || p.apelido);
                    const nota = Math.min(10, p.media).toFixed(1);
                    texto += `${i + 1}º ${nomeFormatado} - Nota ${nota} (${p.jogos || 0} jogos validos)\n`;
                });
                texto += `\n`;
            }
        } else {
            if (!partidaSelecionada) return;
            texto += `🏅 *Destaques do Jogo - ${equipeAtiva?.nome || 'Equipe'}* 🏅\n`;
            texto += `📅 ${formatarData(partidaSelecionada.data)} às ${partidaSelecionada.hora?.substring(0, 5) || ''}\n\n`;

            if (timesPartida.length > 0) {
                texto += `🛡️ *Melhor Time do Jogo*\n`;
                const melhorTime = timesPartida[0];
                const nomesGold = melhorTime.jogadores?.map(j => formatarNomeCurto(j.nome)).join(', ');
                texto += `🥇 ${melhorTime.nome}${nomesGold ? ` (${nomesGold})` : ''}\n\n`;

                if (timesPartida[1]) {
                    const nomesSilver = timesPartida[1].jogadores?.map(j => formatarNomeCurto(j.nome)).join(', ');
                    texto += `🥈 ${timesPartida[1].nome}${nomesSilver ? ` (${nomesSilver})` : ''}\n`;
                }
                if (timesPartida[2]) {
                    const nomesBronze = timesPartida[2].jogadores?.map(j => formatarNomeCurto(j.nome)).join(', ');
                    texto += `🥉 ${timesPartida[2].nome}${nomesBronze ? ` (${nomesBronze})` : ''}\n\n`;
                }
            }

            if (vencedoresPartida.length > 0) {
                texto += `⭐ *Craques da Partida*\n`;
                vencedoresPartida.slice(0, 5).forEach((p, i) => {
                    const nomeFormatado = formatarNomeCurto(p.nome_completo || p.apelido);
                    texto += `${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} ${nomeFormatado}\n`;
                });
                texto += `\n`;
            }
        }

        texto += `🚀 *Eleve o nível da sua pelada!*\n`;
        texto += `Sorteio de times, mensalidades e Hall da Fama num só app.\n`;
        texto += `Acesse grátis ➡️ https://playhubapp.com.br`;

        try {
            if (navigator.share) {
                await navigator.share({
                    title: 'Hall da Fama PlayHub',
                    text: texto
                });
            } else {
                await navigator.clipboard.writeText(texto);
                alert('Tabela copiada! Cole no WhatsApp para compartilhar.');
            }
        } catch (error) {
            console.error('Erro ao compartilhar:', error);
        }
    };

    if (carregando) {
        return (
            <div className="pagina-ranking-mvp" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <Loader2 className="animate-spin" size={40} color="#fbbf24" />
                    <p style={{ marginTop: '16px', color: '#94a3b8' }}>Limpando os troféus...</p>
                </div>
            </div>
        );
    }

    const ESTILO_TAB = (ativo) => ({
        flex: 1,
        padding: '10px 0',
        background: ativo ? 'rgba(251,191,36,0.15)' : 'transparent',
        border: `1px solid ${ativo ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: '10px',
        color: ativo ? '#fbbf24' : '#64748b',
        fontWeight: ativo ? '800' : '600',
        fontSize: '0.85rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    });

    return (
        <div className="pagina-ranking-mvp">
            <header className="ranking-header">
                <button style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }} onClick={aoVoltar}>
                    <ArrowLeft size={24} />
                </button>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>Hall da Fama</h2>
            </header>

            <main className="ranking-container">
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '6px' }}>Hall da Fama 🏅</h1>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                        <strong>{equipeAtiva?.nome || '...'}</strong>
                    </p>
                </div>
                
                <div style={{ display: apenasPartidas ? 'none' : 'block', textAlign: 'center', marginBottom: '24px', background: 'rgba(251, 191, 36, 0.08)', borderRadius: '12px', padding: '12px', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                    <p style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: '700', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        🗳️ Eleição Popular dos Atletas
                    </p>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button 
                            onClick={() => setPeriodo('mes')}
                            style={{
                                padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer',
                                background: periodo === 'mes' ? '#fbbf24' : 'rgba(255,255,255,0.05)',
                                color: periodo === 'mes' ? '#0f172a' : '#94a3b8',
                                border: 'none', transition: 'all 0.2s'
                            }}
                        >
                            Mês Atual
                        </button>
                        <button 
                            onClick={() => setPeriodo('sempre')}
                            style={{
                                padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer',
                                background: periodo === 'sempre' ? '#fbbf24' : 'rgba(255,255,255,0.05)',
                                color: periodo === 'sempre' ? '#0f172a' : '#94a3b8',
                                border: 'none', transition: 'all 0.2s'
                            }}
                        >
                            Histórico Geral
                        </button>
                    </div>
                </div>

                {/* ── SELETOR DE MODO ── */}
                {!apenasPartidas && <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
                    <button style={ESTILO_TAB(modo === 'geral')} onClick={() => setModo('geral')}>
                        <Trophy size={15} /> Geral
                    </button>
                    <button style={ESTILO_TAB(modo === 'partida')} onClick={() => setModo('partida')}>
                        <Calendar size={15} /> Por Partida
                    </button>
                </div>}

                {/* ═══════════════════════════════
                    MODO GERAL
                ═══════════════════════════════ */}
                {modo === 'geral' && (
                    <>
                        <div style={{ 
                            background: 'rgba(30,41,59,0.3)', 
                            border: '1px solid rgba(255,255,255,0.05)', 
                            borderRadius: '12px', 
                            padding: '10px 16px', 
                            marginBottom: '28px',
                            fontSize: '0.8rem',
                            color: '#94a3b8',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span>📊 <strong style={{ color: '#f1f5f9' }}>Nota ajustada (0 a 10)</strong> &nbsp;
                                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Ranking justo por desempenho medio.</span>
                                </span>
                                <button
                                    onClick={() => setShowInfoGeral(p => !p)}
                                    style={{ background: 'none', border: 'none', color: '#10b981', fontSize: '0.7rem', cursor: 'pointer', padding: '2px 6px', borderRadius: '6px', flexShrink: 0 }}
                                >
                                    {showInfoGeral ? 'Fechar ✕' : 'Como funciona?'}
                                </button>
                            </div>
                            {showInfoGeral && (
                                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem', color: '#64748b', lineHeight: '1.6' }}>
                                    <p style={{ margin: '0 0 8px 0', color: '#10b981', fontWeight: '800' }}>
                                        Resumo rapido
                                    </p>
                                    <p style={{ margin: '0 0 6px 0' }}>
                                        <strong style={{ color: '#f1f5f9' }}>🗳️ 1. Votos da partida:</strong> cada voto vale um peso. Ouro vale 4, prata vale 2 e bronze vale 1.
                                    </p>
                                    <p style={{ margin: '0 0 6px 0' }}>
                                        <strong style={{ color: '#f1f5f9' }}>📊 2. Nota da partida:</strong> esses votos viram uma nota de 0 a 10 para aquele jogo.
                                    </p>
                                    <p style={{ margin: '0 0 6px 0' }}>
                                        <strong style={{ color: '#f1f5f9' }}>🏆 3. Ranking geral:</strong> o sistema usa a media das notas. Assim, quem joga ha mais tempo nao fica na frente so por ter mais medalhas.
                                    </p>
                                    <p style={{ margin: '0 0 6px 0' }}>
                                        <strong style={{ color: '#f1f5f9' }}>🛡️ 4. Protecao contra distorcao:</strong> uma partida com poucos votos nao conta no historico. Ela aparece em "Por Partida", mas fica fora do ranking geral.
                                    </p>
                                    <p style={{ margin: '0 0 6px 0' }}>
                                        <strong style={{ color: '#f1f5f9' }}>⚖️ 5. Poucos jogos:</strong> no comeco, todo mundo entra no ranking. Quando a equipe tiver mais partidas validas, o sistema passa a exigir mais jogos para evitar distorcoes.
                                    </p>
                                    <p style={{ margin: '8px 0 0 0', color: '#cbd5e1' }}>
                                        🤝 No coletivo, o time tambem recebe nota de 0 a 10 conforme os votos da partida. Essa nota vai para todos os atletas daquele time.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', marginTop: '12px' }}>
                            <Trophy size={15} color="#fbbf24" />
                            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '1px' }}>Craques Individuais - Nota Ajustada</span>
                        </div>
                        <ListaRankingJogadores ranking={rankingMVP.slice(0, 5)} />

                        {/* Atletas (Destaques Coletivos) */}
                        <div style={{ marginTop: '40px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                                <Users size={15} color="#10b981" />
                                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#10b981', textTransform: 'uppercase', letterSpacing: '1px' }}>Destaques Coletivos - Nota Ajustada</span>
                            </div>
                            <ListaRankingJogadores ranking={rankingColetivo.slice(0, 10)} />
                            {rankingColetivo.length > 0 && (
                                <p style={{ textAlign: 'center', fontSize: '0.68rem', color: '#334155', marginTop: '16px' }}>
                                    Sua nota coletiva sobe quando o time em que voce jogou foi bem votado pela equipe.
                                </p>
                            )}
                        </div>
                    </>
                )}

                {/* ═══════════════════════════════
                    MODO POR PARTIDA
                ═══════════════════════════════ */}
                {modo === 'partida' && (
                    <>
                        {partidas.length === 0 ? (
                            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#475569' }}>
                                <Calendar size={40} color="#1e293b" style={{ margin: '0 auto 12px' }} />
                                <p>Nenhuma partida com votação disponível ainda.</p>
                            </div>
                        ) : (
                            <>
                                {/* ── Seletor de Partida ── */}
                                <div ref={seletorRef} style={{ marginBottom: '28px', position: 'relative' }}>
                                    <button
                                        onClick={() => setSeletorAberto(p => !p)}
                                        style={{
                                            width: '100%',
                                            background: 'rgba(30,41,59,0.6)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '14px',
                                            padding: '14px 16px',
                                            display: 'flex', alignItems: 'center', gap: '12px',
                                            cursor: 'pointer', textAlign: 'left',
                                        }}
                                    >
                                        <div style={{
                                            width: '36px', height: '36px', borderRadius: '10px',
                                            background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                        }}>
                                            <Calendar size={18} color="#fbbf24" />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: '800', color: '#f8fafc', fontSize: '0.9rem' }}>
                                                {partidaSelecionada ? formatarData(partidaSelecionada.data) : '—'}&nbsp;
                                                <span style={{ fontSize: '0.75rem', fontWeight: '500', color: '#64748b' }}>
                                                    {partidaSelecionada?.hora?.substring(0, 5)}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                                {partidaSelecionada?.local_nome || '—'}
                                            </div>
                                        </div>
                                        <ChevronDown
                                            size={18}
                                            color="#64748b"
                                            style={{ transform: seletorAberto ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
                                        />
                                    </button>

                                    {/* Dropdown */}
                                    {seletorAberto && (
                                        <div style={{
                                            position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
                                            background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '14px', overflow: 'hidden',
                                            boxShadow: '0 20px 40px rgba(0,0,0,0.5)', zIndex: 100,
                                            maxHeight: '240px', overflowY: 'auto',
                                        }}>
                                            {partidas.map((p, i) => {
                                                const selecionada = partidaSelecionada?.id === p.id;
                                                return (
                                                    <button
                                                        key={p.id}
                                                        onClick={() => { setPartidaSelecionada(p); setSeletorAberto(false); }}
                                                        style={{
                                                            width: '100%', textAlign: 'left',
                                                            padding: '12px 16px',
                                                            background: selecionada ? 'rgba(251,191,36,0.1)' : (i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'),
                                                            border: 'none',
                                                            borderLeft: selecionada ? '3px solid #fbbf24' : '3px solid transparent',
                                                            cursor: 'pointer',
                                                            display: 'flex', alignItems: 'center', gap: '12px',
                                                        }}
                                                    >
                                                        <div>
                                                            <div style={{ fontWeight: selecionada ? '800' : '600', color: selecionada ? '#fbbf24' : '#f1f5f9', fontSize: '0.85rem' }}>
                                                                {formatarData(p.data)} · {p.hora?.substring(0, 5)}
                                                            </div>
                                                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>{p.local_nome}</div>
                                                        </div>
                                                        {i === 0 && <span style={{ marginLeft: 'auto', fontSize: '0.65rem', background: 'rgba(251,191,36,0.2)', color: '#fbbf24', padding: '2px 8px', borderRadius: '20px', fontWeight: '700', flexShrink: 0 }}>Última</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                    <div style={{ 
                                        background: 'rgba(30,41,59,0.3)', 
                                        border: '1px solid rgba(255,255,255,0.05)', 
                                        borderRadius: '12px', 
                                        padding: '10px 16px', 
                                        marginBottom: '28px',
                                        fontSize: '0.8rem',
                                        color: '#94a3b8',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span>🏅 <strong style={{ color: '#f1f5f9' }}>Destaques da Partida</strong> &nbsp;
                                                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Resultado apenas do jogo selecionado.</span>
                                            </span>
                                            <button
                                                onClick={() => setShowInfoPartida(p => !p)}
                                                style={{ background: 'none', border: 'none', color: '#10b981', fontSize: '0.7rem', cursor: 'pointer', padding: '2px 6px', borderRadius: '6px', flexShrink: 0 }}
                                            >
                                                {showInfoPartida ? 'Fechar ✕' : 'Como funciona?'}
                                            </button>
                                        </div>
                                        {showInfoPartida && (
                                            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem', color: '#64748b', lineHeight: '1.6' }}>
                                                <p style={{ margin: '0 0 8px 0', color: '#10b981', fontWeight: '800' }}>
                                                    Resumo rapido
                                                </p>
                                                <p style={{ margin: '0 0 6px 0' }}>
                                                    <strong style={{ color: '#f1f5f9' }}>📅 1. Esta aba e so da partida:</strong> mostra os destaques do jogo escolhido acima.
                                                </p>
                                                <p style={{ margin: '0 0 6px 0' }}>
                                                    <strong style={{ color: '#f1f5f9' }}>🥇 2. Cada voto tem peso:</strong> ouro vale 4, prata vale 2 e bronze vale 1.
                                                </p>
                                                <p style={{ margin: '0 0 6px 0' }}>
                                                    <strong style={{ color: '#f1f5f9' }}>📈 3. A nota vai de 0 a 10:</strong> quanto mais votos bons o atleta ou time recebeu nesse jogo, maior fica a nota.
                                                </p>
                                                <p style={{ margin: '8px 0 0 0', color: '#cbd5e1' }}>
                                                    👑 Desempate: se duas notas ficarem muito parecidas, quem recebeu mais votos de ouro aparece primeiro.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                {/* ── Resultados da Partida ── */}
                                {carregandoPartida ? (
                                    <div style={{ textAlign: 'center', padding: '40px' }}>
                                        <Loader2 className="animate-spin" size={32} color="#fbbf24" />
                                        <p style={{ marginTop: '12px', color: '#64748b', fontSize: '0.85rem' }}>Carregando resultados...</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Times da Partida */}
                                        {timesPartida.length > 0 && (
                                            <div style={{ marginBottom: '36px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                                    <Shield size={15} color="#10b981" />
                                                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#10b981', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                        Times Formados
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    {timesPartida.slice(0, 3).map((time, idx) => (
                                                        <CardTime key={time.nome} time={time} idx={idx} encontrarMembro={encontrarMembro} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Atletas da Partida */}
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                                                <Trophy size={15} color="#fbbf24" />
                                                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                    Craques da Partida
                                                </span>
                                            </div>
                                            <PodioPartida atletas={vencedoresPartida} />
                                        </div>

                                        {timesPartida.length === 0 && vencedoresPartida.length === 0 && (
                                            <div style={{ textAlign: 'center', padding: '32px 20px', color: '#475569' }}>
                                                <p>Nenhuma votação registrada nesta partida ainda.</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </>
                )}
                
                {/* ── BOTAO COMPARTILHAR ── */}
                <div style={{ marginTop: '40px', textAlign: 'center' }}>
                    <button
                        onClick={compartilharResultados}
                        style={{
                            background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                            color: '#ffffff',
                            border: 'none',
                            padding: '16px 24px',
                            borderRadius: '14px',
                            fontWeight: '800',
                            fontSize: '0.95rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '10px',
                            cursor: 'pointer',
                            boxShadow: '0 8px 16px rgba(16, 185, 129, 0.25)',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                        }}
                    >
                        <Share2 size={20} />
                        COMPARTILHAR RESULTADOS
                    </button>
                    <p style={{ color: '#475569', fontSize: '0.75rem', marginTop: '12px' }}>
                        Gera um resumo automático para WhatsApp ou Redes Sociais.
                    </p>
                </div>
            </main>
        </div>
    );
};

export default PaginaRankingMVP;
