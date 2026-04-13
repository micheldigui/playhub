import React, { useState, useEffect } from 'react';
import { 
    Users, 
    ArrowLeft, 
    Zap, 
    Trophy, 
    Share2, 
    RotateCcw,
    User,
    Calendar,
    ChevronDown,
    ChevronUp,
    ShieldAlert,
    ShieldCheck
} from 'lucide-react';
import { usarPartidas } from '../../contextos/PartidasContexto';
import Botao from '../../componentes/Botao/Botao';
import './PaginaSorteio.css';

const NIVEL_VALORES = {
    'Lazer / Sem Experiência': 1,
    'Iniciante': 2,
    'Intermediário': 3,
    'Avançado': 4,
    'Profissional': 5
};

const GRUPOS_ESPORTES = {
    'Soccer': ['Futsal', 'Futebol de Campo', 'Futebol Society / Suíço'],
    'Volley': ['Vôlei de Quadra', 'Vôlei de Areia / Praia', 'Futevôlei'],
    'Racket': ['Beach Tennis', 'Padel', 'Tênis'],
    'Contact': ['Handebol', 'Basquete']
};

const PaginaSorteio = ({ aoVoltar, participantes = [], partida, modalidadePrincipal }) => {
    const { buscarHabilidadesParticipantes, buscarPresencas } = usarPartidas();
    const [jogadores, setJogadores] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [equipes, setEquipes] = useState([]);
    const [jogadoresPorTime, setJogadoresPorTime] = useState(partida?.vagas ? Math.floor(participantes.length / 2) || 5 : 5);
    const [expandido, setExpandido] = useState(null);

    useEffect(() => {
        if (partida?.id) {
            carregarHabilidades();
        }
    }, [partida, participantes]);

    const carregarHabilidades = async () => {
        setCarregando(true);
        let habilidades = [];
        let usuariosData = [];
        let notasLideranca = [];

        // Fallback: Se participantes não vieram via props (ex: refresh ou erro navegação), busca presenças
        let listaParticipantes = participantes;
        if ((!listaParticipantes || listaParticipantes.length === 0) && partida?.id) {
            try {
                const { sucesso, presencas } = await buscarPresencas(partida.id);
                if (sucesso && presencas) {
                    const limite = partida.vagas || 999;
                    listaParticipantes = presencas
                        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                        .slice(0, limite);
                }
            } catch (err) {
                console.error('Erro ao carregar fallbacks de presencia:', err);
            }
        }

        const idsParaBuscar = (listaParticipantes || []).map(p => p.usuario_id || p.id);

        try {
            const resp = await buscarHabilidadesParticipantes(idsParaBuscar, partida?.equipe_id);
            if (resp.sucesso) {
                habilidades = resp.habilidades || [];
                usuariosData = resp.usuariosData || [];
                notasLideranca = resp.notasLideranca || [];
            }
        } catch (err) {
            console.error('Erro ao carregar dados extras:', err);
        }

        const jogadoresProcessados = (listaParticipantes || []).map(p => {
            const u = p.usuarios || {};
            const userId = p.usuario_id || u.id;
            const extraData = usuariosData.find(ud => ud.id === userId) || {};
            const notaPrivada = notasLideranca.find(nl => nl.usuario_id === userId);
            
            // Busca habilidades para este usuário
            const playerHabs = habilidades.filter(h => h.usuario_id === userId);
            
            // LÓGICA DE PRIORIDADES:
            // 1. Prioridade Máxima: Nota Privada da Liderança
            // 2. Prioridade 2: Modalidade principal da equipe
            // 3. Prioridade 3: Afinidade ou Melhor nível global
            
            let habilidadeSugerida = null;
            let modoFonte = 'Geral';

            if (notaPrivada?.nivel_lideranca) {
                habilidadeSugerida = { nivel_habilidade: String(notaPrivada.nivel_lideranca), modalidade: 'Ajuste Líder 🔒' };
                modoFonte = 'Liderança';
            } else {
                // Tenta achar exatamente para a modalidade principal da equipe
                habilidadeSugerida = playerHabs.find(h => h.modalidade === modalidadePrincipal);
                if (habilidadeSugerida) modoFonte = 'Fixo';
                
                // Tenta achar por afinidade
                if (!habilidadeSugerida && modalidadePrincipal) {
                    const grupoAtivo = Object.keys(GRUPOS_ESPORTES).find(grupo => 
                        GRUPOS_ESPORTES[grupo].includes(modalidadePrincipal)
                    );
                    
                    if (grupoAtivo) {
                        habilidadeSugerida = playerHabs.find(h => 
                            GRUPOS_ESPORTES[grupoAtivo].includes(h.modalidade)
                        );
                        if (habilidadeSugerida) modoFonte = 'Afinidade';
                    }
                }

                // Pega a melhor global
                if (!habilidadeSugerida && playerHabs.length > 0) {
                    habilidadeSugerida = [...playerHabs].sort((a, b) => 
                        NIVEL_VALORES[b.nivel_habilidade] - NIVEL_VALORES[a.nivel_habilidade]
                    )[0];
                    if (habilidadeSugerida) modoFonte = 'Histórico';
                }
            }

            const nivelFinal = notaPrivada?.nivel_lideranca || NIVEL_VALORES[habilidadeSugerida?.nivel_habilidade] || 3;

            return {
                id: userId,
                nome: u.nome_completo || u.apelido || 'Jogador',
                foto: u.foto_url,
                genero: extraData.genero || 'Masculino',
                nascimento: extraData.data_nascimento,
                idade: (extraData.data_nascimento && extraData.data_nascimento !== '1900-01-01') 
                    ? calcularIdade(extraData.data_nascimento) 
                    : 25,
                nivelOriginal: habilidadeSugerida?.modalidade || 'Geral',
                nivelAjustado: nivelFinal,
                modalidade: habilidadeSugerida?.modalidade || 'Geral',
                fonte: modoFonte
            };
        });

        setJogadores(jogadoresProcessados);
        setCarregando(false);
    };

    const calcularIdade = (dataNasc) => {
        const hoje = new Date();
        const nasc = new Date(dataNasc);
        let idade = hoje.getFullYear() - nasc.getFullYear();
        const m = hoje.getMonth() - nasc.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
        return idade;
    };

    const formatarNomeAtleta = (nome) => {
        if (!nome) return 'Jogador';
        const partes = nome.trim().split(/\s+/);
        if (partes.length === 1) return partes[0].charAt(0).toUpperCase() + partes[0].slice(1).toLowerCase();
        
        const primeiro = partes[0].charAt(0).toUpperCase() + partes[0].slice(1).toLowerCase();
        const ultimo = partes[partes.length - 1].charAt(0).toUpperCase() + partes[partes.length - 1].slice(1).toLowerCase();
        
        return `${primeiro} ${ultimo}`;
    };

    const handleAjustarNivel = (id, novoNivel) => {
        setJogadores(prev => prev.map(j => 
            j.id === id ? { ...j, nivelAjustado: parseInt(novoNivel) } : j
        ));
    };

    const realizarSorteio = () => {
        if (jogadores.length < 2) return;

        // 1. Preparar jogadores com Score Técnico Pesado
        // Peso das estrelas é 10.000 para garantir que mandem em tudo.
        // Idade entra como fator secundário (mais novos = score levemente maior).
        const listaSorteio = jogadores.map(j => ({
            ...j,
            score: (j.nivelAjustado * 10000) + (100 - j.idade)
        }));

        // 2. Definir número de times
        const numTimes = Math.max(2, Math.ceil(listaSorteio.length / jogadoresPorTime));
        const gridTimes = Array.from({ length: numTimes }, () => []);

        // 3. Ordenação rigorosa por Rank Técnico (Estrelas)
        // Isso garante que os "Pro" (5 estrelas) sejam os primeiros a serem distribuídos entre os times.
        const mulheres = listaSorteio.filter(j => j.genero === 'Feminino').sort((a, b) => b.score - a.score);
        const homens = listaSorteio.filter(j => j.genero !== 'Feminino').sort((a, b) => b.score - a.score);

        let timeAtual = 0;
        let direcao = 1;

        // Distribui Mulheres (Snake Draft)
        mulheres.forEach(m => {
            gridTimes[timeAtual].push(m);
            timeAtual += direcao;
            if (timeAtual >= numTimes) {
                timeAtual = numTimes - 1;
                direcao = -1;
            } else if (timeAtual < 0) {
                timeAtual = 0;
                direcao = 1;
            }
        });

        // Continua com homens de onde parou ou reinicia? Melhor balancear densidade
        // Para manter equilíbrio, vamos distribuir o restante nos times com menos gente primeiro ou seguindo a cobra
        homens.forEach(h => {
            gridTimes[timeAtual].push(h);
            timeAtual += direcao;
            if (timeAtual >= numTimes) {
                timeAtual = numTimes - 1;
                direcao = -1;
            } else if (timeAtual < 0) {
                timeAtual = 0;
                direcao = 1;
            }
        });

        setEquipes(gridTimes);
    };

    const compartilharWhatsApp = () => {
        if (equipes.length === 0) return;

        let msg = `*⚖️ EQUIPES SORTEADAS - ${partida?.local_nome || 'PLAYHUB'}*\n\n`;
        
        equipes.forEach((equipe, index) => {
            if (equipe.length === 0) return;
            msg += `*TEAM ${String.fromCharCode(65 + index)}* 🛡️\n`;
            equipe.forEach((j, i) => {
                msg += `${i + 1}. ${formatarNomeAtleta(j.nome)}\n`;
            });
            msg += `\n`; // Apenas um pulo de linha entre os times, sem médias técnicas
        });

        msg += `👉 _Gerado via PlayHub App_ 🚀`;

        const encoded = encodeURIComponent(msg);
        window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    };

    if (carregando) return <div className="sorteio-loading">Carregando dados da equipe...</div>;

    return (
        <div className="pagina-sorteio-v3 animacao-entrada">
            <header className="sorteio-header">
                <button onClick={aoVoltar} className="btn-voltar">
                    <ArrowLeft size={24} />
                </button>
                <div className="header-titles">
                    <h1>Balanceamento de Equipes</h1>
                    <p>Ajuste o rank técnico e defina os times</p>
                </div>
            </header>

            <main className="sorteio-content">
                {/* Configurações Iniciais */}
                <section className="sorteio-secao-config">
                    <div className="card-config">
                        <Users size={20} />
                        <label>Jogadores por Time:</label>
                        <div className="contador-vagas">
                            <button onClick={() => setJogadoresPorTime(Math.max(2, jogadoresPorTime - 1))}>-</button>
                            <span>{jogadoresPorTime}</span>
                            <button onClick={() => setJogadoresPorTime(Math.min(22, jogadoresPorTime + 1))}>+</button>
                        </div>
                    </div>
                </section>

                {/* Lista de Ajustes */}
                <section className="sorteio-secao-ajustes">
                    <div className="secao-titulo">
                        <h3>Ajuste Técnico ⚖️</h3>
                        <span>{jogadores.length} atletas disponíveis</span>
                    </div>

                    {jogadores.some(j => j.fonte !== 'Liderança') && (
                        <div style={{ 
                            background: 'rgba(239, 68, 68, 0.1)', 
                            border: '1px solid rgba(239, 68, 68, 0.2)', 
                            padding: '12px', 
                            borderRadius: '12px', 
                            marginBottom: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            fontSize: '0.85rem',
                            color: '#f87171'
                        }}>
                            <ShieldAlert size={20} />
                            <span>Existem atletas sem <b>Rank de Liderança</b> definido. Verifique os níveis destacados abaixo para um sorteio justo.</span>
                        </div>
                    )}

                    <div className="lista-atletas-ajuste">
                        {jogadores.map(j => (
                            <div key={j.id} className="item-atleta-ajuste" style={{ 
                                borderLeft: j.fonte !== 'Liderança' ? '4px solid #f87171' : '4px solid #10b981',
                                background: j.fonte !== 'Liderança' ? 'rgba(239, 68, 68, 0.02)' : 'transparent'
                            }}>
                                <div className="atleta-info-base">
                                    <div className="atleta-avatar">
                                        {j.foto ? <img src={j.foto} alt="" /> : <User size={18} />}
                                    </div>
                                    <div className="atleta-nome-hab">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span className="nome">{formatarNomeAtleta(j.nome)}</span>
                                            {j.fonte !== 'Liderança' && <span title="Sem Rank de Liderança" style={{ color: '#f87171' }}><ShieldAlert size={12} /></span>}
                                        </div>
                                        <span className="modalidade-link">{j.modalidade} • {j.idade} anos</span>
                                    </div>
                                </div>
                                <div className="atleta-rank-ajuste">
                                    <select 
                                        value={j.nivelAjustado} 
                                        onChange={(e) => handleAjustarNivel(j.id, e.target.value)}
                                        className={`rank-select val-${j.nivelAjustado}`}
                                    >
                                        <option value="1">1⭐ - Lazer</option>
                                        <option value="2">2⭐ - Iniciante</option>
                                        <option value="3">3⭐ - Intermed.</option>
                                        <option value="4">4⭐ - Avançado</option>
                                        <option value="5">5⭐ - Pro</option>
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="acoes-sorteio-sticky">
                    <Botao fullWidth onClick={realizarSorteio} className="btn-sortear">
                        <Zap size={20} /> Equilibrar e Sortear Times
                    </Botao>
                </div>

                {/* Resultado do Sorteio */}
                {equipes.length > 0 && (
                    <section className="sorteio-resultados animacao-entrada">
                        <div className="secao-titulo">
                            <h3>Times Definidos</h3>
                            <button onClick={compartilharWhatsApp} className="btn-share-mini">
                                <Share2 size={16} /> WhatsApp
                            </button>
                        </div>

                        <div className="grade-equipes-resultado">
                            {equipes.map((equipe, index) => (
                                <div key={index} className="cartao-equipe-resultado">
                                    <div className="equipe-header">
                                        <div className="equipe-nome-badge">
                                            <Trophy size={16} />
                                            TIME {String.fromCharCode(65 + index)}
                                        </div>
                                        <span className="equipe-stats">
                                            {equipe.length} jgd • Média {(equipe.reduce((acc, curr) => acc + curr.nivelAjustado, 0) / equipe.length).toFixed(1)}⭐
                                        </span>
                                    </div>
                                    <div className="equipe-jogadores-lista">
                                        {equipe.map(j => (
                                            <div key={j.id} className="equipe-item-jogador">
                                                <div className="atleta-avatar">
                                                    {j.foto ? <img src={j.foto} alt="" /> : <User size={12} />}
                                                </div>
                                                <span>{formatarNomeAtleta(j.nome)}</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <ShieldCheck 
                                            key={star} 
                                            size={14} 
                                            color={star <= j.nivelAjustado ? '#fbbf24' : 'rgba(255,255,255,0.05)'} 
                                            fill={star <= j.nivelAjustado ? '#fbbf24' : 'transparent'}
                                            style={{ opacity: star <= j.nivelAjustado ? 1 : 0.3 }}
                                        />
                                    ))}
                                    {j.fonte === 'Liderança' && <span title="Nota Privada da Liderança" style={{ fontSize: '10px', marginLeft: '2px' }}>🔒</span>}
                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                            <Botao variant="secundario" fullWidth onClick={() => setEquipes([])}>
                                <RotateCcw size={18} /> Limpar
                            </Botao>
                            <Botao fullWidth onClick={compartilharWhatsApp} style={{ background: '#25D366', color: 'white', border: 'none' }}>
                                <Share2 size={18} /> Mandar Tudo p/ WhatsApp
                            </Botao>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
};

export default PaginaSorteio;
