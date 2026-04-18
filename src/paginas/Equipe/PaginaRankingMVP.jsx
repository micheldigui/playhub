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
                {time.pontos !== undefined && (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span style={{ fontWeight: '800', fontSize: '1rem', color: isFirst ? md.cor : '#cbd5e1' }}>{time.pontos}</span>
                        <span style={{ fontSize: '0.6rem', color: '#475569', marginLeft: '3px' }}>PTS</span>
                    </div>
                )}
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

    const podio = ranking.slice(0, 3);
    const resto = ranking.slice(3);

    return (
        <>
            <div className="podio-container">
                {podio.map((player, index) => (
                    <div key={player.usuario_id || index} className={`podio-item ${['primeiro','segundo','terceiro'][index]}`}>
                        <div className="podio-avatar-wrapper">
                            {index === 0 && <div className="coroa-icon"><Crown size={32} /></div>}
                            <div className="podio-avatar">
                                {player.foto_url ? <img src={player.foto_url} alt={player.apelido} /> : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#334155', color: '#94a3b8', fontWeight: '800' }}>
                                        {(player.apelido || player.nome_completo || '?')[0].toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="posicao-badge">{index + 1}</div>
                        </div>
                        <span className="podio-nome">{formatarNomeCurto(player.apelido || player.nome_completo)}</span>
                        <div className="podio-pontos">{player.pontos} <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>PTS</span></div>
                        <div className="podio-medalheiro">
                            <span>🥇{player.ouros}</span><span>🥈{player.pratas}</span><span>🥉{player.bronzes}</span>
                        </div>
                    </div>
                ))}
            </div>
            {resto.length > 0 && (
                <div className="lista-ranking">
                    {resto.map((player, index) => (
                        <div key={player.usuario_id || index} className="item-ranking">
                            <div className="item-ranking-pos">{index + 4}</div>
                            <div className="item-ranking-atleta">
                                <div className="item-ranking-avatar">
                                    {player.foto_url ? <img src={player.foto_url} alt="" /> : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#334155', color: '#64748b' }}>
                                            {(player.apelido || player.nome_completo || '?')[0].toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="item-ranking-info">
                                    <span className="item-ranking-nome">{formatarNomeCurto(player.apelido || player.nome_completo)}</span>
                                    <div className="item-ranking-medalheiro-mini">
                                        <span>🥇{player.ouros}</span><span>🥈{player.pratas}</span><span>🥉{player.bronzes}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="item-ranking-pontos">
                                <strong>{player.pontos}</strong> <span style={{ fontSize: '0.65rem', color: '#64748b' }}>PTS</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
};

// ── Subcomponente: Pódio da Partida (atletas apenas na aba partida) ───────
const PodioPartida = ({ atletas }) => {
    const ordem = [atletas[1], atletas[0], atletas[2]].filter(Boolean);
    const classeAltura = ['segundo', 'primeiro', 'terceiro'];
    if (!atletas.length) return (
        <div style={{ textAlign: 'center', padding: '24px', color: '#475569', fontSize: '0.85rem' }}>
            Nenhum voto de atleta registrado nesta partida.
        </div>
    );
    return (
        <div className="podio-container">
            {ordem.map((player, vi) => {
                const realIdx = vi === 0 ? 1 : vi === 1 ? 0 : 2;
                return (
                    <div key={player.usuario_id || vi} className={`podio-item ${classeAltura[vi]}`}>
                        <div className="podio-avatar-wrapper">
                            {realIdx === 0 && <div className="coroa-icon"><Crown size={28} /></div>}
                            <div className="podio-avatar">
                                {player.foto_url ? (
                                    <img src={player.foto_url} alt={player.apelido} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#334155', color: '#94a3b8', fontWeight: '800' }}>
                                        {(player.apelido || player.nome_completo || '?')[0].toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="posicao-badge">{realIdx + 1}</div>
                        </div>
                        <span className="podio-nome">{formatarNomeCurto(player.apelido || player.nome_completo)}</span>
                        {player.pontos !== undefined && (
                            <div className="podio-pontos">{player.pontos} <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>PTS</span></div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// ── Componente Principal ──────────────────────────────────────────────────
const PaginaRankingMVP = ({ equipeIdProp, aoVoltar }) => {
    const { equipeAtiva, carregarMembrosEquipe } = usarEquipe();
    const equipeId = equipeIdProp || equipeAtiva?.id;
    const { buscarRankingMVP, buscarRankingColetivo, carregarPartidas, buscarVencedoresPartida, buscarVotosTime } = usarPartidas();

    const [modo, setModo] = useState('geral');

    // Estado geral
    const [rankingMVP, setRankingMVP] = useState([]);
    const [rankingColetivo, setRankingColetivo] = useState([]);
    const [membros, setMembros] = useState([]);
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
            const [resAtletas, resColetivo, resMembros, todasPartidas] = await Promise.all([
                buscarRankingMVP(equipeId),
                buscarRankingColetivo ? buscarRankingColetivo(equipeId) : Promise.resolve({ sucesso: false, ranking: [] }),
                carregarMembrosEquipe(equipeId),
                carregarPartidas(equipeId)
            ]);
            
            if (resAtletas.sucesso) setRankingMVP(resAtletas.ranking);
            if (resMembros) setMembros(resMembros);

            if (resColetivo.sucesso && resMembros) {
                // Enriquecer ranking coletivo com as fotos dos jogadores
                const rankingMapeado = resColetivo.ranking.map(jogador => {
                    // Tenta achar foto
                    let fotoUrl = null;
                    if (jogador.usuario_id) {
                        const m = resMembros.find(mb => String(mb.usuario_id) === String(jogador.usuario_id));
                        if (m) fotoUrl = m.usuarios?.foto_url;
                    }
                    if (!fotoUrl) {
                        const pNome = (jogador.nome_completo || '').split(' ')[0].toLowerCase();
                        const porNome = resMembros.find(mb => {
                            const mNome = (mb.usuarios?.nome_completo || mb.usuarios?.apelido || '').toLowerCase();
                            return pNome.length > 1 && mNome.startsWith(pNome);
                        });
                        if (porNome) fotoUrl = porNome.usuarios?.foto_url;
                    }
                    return { ...jogador, foto_url: fotoUrl };
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
    }, [equipeId]);

    // Carga dos dados da partida selecionada
    useEffect(() => {
        if (!partidaSelecionada) return;
        const carregarDadosPartida = async () => {
            setCarregandoPartida(true);
            const [resVenc, resVotosTime] = await Promise.all([
                buscarVencedoresPartida(partidaSelecionada.id),
                buscarVotosTime(partidaSelecionada.id),
            ]);

            setVencedoresPartida(resVenc.sucesso ? resVenc.vencedores || [] : []);

            if (resVotosTime.sucesso && resVotosTime.votos.length > 0) {
                const pontos = {};
                resVotosTime.votos.forEach(v => {
                    const pts = v.posicao === 1 ? 3 : v.posicao === 2 ? 2 : 1;
                    pontos[v.time_escolhido] = (pontos[v.time_escolhido] || 0) + pts;
                });
                const ordenado = Object.keys(pontos)
                    .map(nome => ({
                        nome,
                        pontos: pontos[nome],
                        jogadores: (partidaSelecionada.times_sorteados || []).find(t => t.nome === nome)?.jogadores || []
                    }))
                    .sort((a, b) => b.pontos - a.pontos);
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
            texto += `_Atletas eleitos por votação popular_\n\n`;
            
            if (rankingMVP.length > 0) {
                texto += `⭐ *Craques Individuais (Top 3)*\n`;
                rankingMVP.slice(0, 3).forEach((p, i) => {
                    const nomeFormatado = formatarNomeCurto(p.apelido || p.nome_completo);
                    texto += `${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}º`} ${nomeFormatado} - ${p.pontos} PTS\n`;
                });
                texto += `\n`;
            }
            if (rankingColetivo.length > 0) {
                texto += `🛡️ *Destaques Coletivos (Top 10)*\n`;
                rankingColetivo.slice(0, 10).forEach((p, i) => {
                    const nomeFormatado = formatarNomeCurto(p.apelido || p.nome_completo);
                    texto += `${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}º`} ${nomeFormatado} - ${p.pontos} PTS\n`;
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
                vencedoresPartida.slice(0, 3).forEach((p, i) => {
                    const nomeFormatado = formatarNomeCurto(p.apelido || p.nome_completo);
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
                
                <div style={{ textAlign: 'center', marginBottom: '24px', background: 'rgba(251, 191, 36, 0.08)', borderRadius: '12px', padding: '8px 12px', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                    <p style={{ color: '#fbbf24', fontSize: '0.75rem', fontWeight: '600', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        🗳️ Rankings gerados através de Eleição Popular pelos jogadores da equipe
                    </p>
                </div>

                {/* ── SELETOR DE MODO ── */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
                    <button style={ESTILO_TAB(modo === 'geral')} onClick={() => setModo('geral')}>
                        <Trophy size={15} /> Geral
                    </button>
                    <button style={ESTILO_TAB(modo === 'partida')} onClick={() => setModo('partida')}>
                        <Calendar size={15} /> Por Partida
                    </button>
                </div>

                {/* ═══════════════════════════════
                    MODO GERAL
                ═══════════════════════════════ */}
                {modo === 'geral' && (
                    <>
                        {/* Atletas (Craques Individuais) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                            <Trophy size={15} color="#fbbf24" />
                            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '1px' }}>Craques Individuais (Top 3)</span>
                        </div>
                        <ListaRankingJogadores ranking={rankingMVP.slice(0, 3)} />

                        {/* Atletas (Destaques Coletivos) */}
                        <div style={{ marginTop: '40px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                                <Users size={15} color="#10b981" />
                                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#10b981', textTransform: 'uppercase', letterSpacing: '1px' }}>Destaques Coletivos (Top 10)</span>
                            </div>
                            <ListaRankingJogadores ranking={rankingColetivo.slice(0, 10)} />
                            {rankingColetivo.length > 0 && (
                                <p style={{ textAlign: 'center', fontSize: '0.68rem', color: '#334155', marginTop: '16px' }}>
                                    Pontos ganhos quando o time em que jogou ficou no pódio (🥇=3 pts · 🥈=2 pts · 🥉=1 pt).
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
