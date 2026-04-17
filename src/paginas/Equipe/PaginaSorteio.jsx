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
    'Soccer': ['Futsal', 'Futebol de Campo', 'Futebol Society'],
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
                fonte: modoFonte,
                presente: true, // Todos começam como presentes
                separar: false // Pilares para separar nos times
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
            j.id === id ? { ...j, nivelAjustado: parseInt(novoNivel), fonte: 'Liderança' } : j
        ));
    };

    const handleAlternarPresenca = (id) => {
        setJogadores(prev => prev.map(j => 
            j.id === id ? { ...j, presente: !j.presente } : j
        ));
    };

    const handleAlternarSeparar = (id) => {
        setJogadores(prev => prev.map(j => 
            j.id === id ? { ...j, separar: !j.separar } : j
        ));
    };

    const realizarSorteio = () => {
        const jogadoresPresentes = jogadores.filter(j => j.presente);
        
        if (jogadoresPresentes.length < 2) {
            alert("É necessário pelo menos 2 jogadores presentes para realizar um sorteio.");
            return;
        }

        // Bloqueio se algum jogador presente NÃO tiver classificação da liderança definida
        if (jogadoresPresentes.some(j => j.fonte !== 'Liderança')) {
            alert("Atenção: Todos os jogadores PRESENTES precisam de um Rank Técnico antes do sorteio. Ajuste a nota de quem está sem rank da Liderança.");
            return;
        }

        // 1. Preparar jogadores com Score Técnico Pesado
        // Peso das estrelas é 10.000 para garantir que mandem em tudo.
        // Idade entra como fator secundário (mais novos = score levemente maior).
        const listaSorteio = jogadoresPresentes.map(j => ({
            ...j,
            score: (j.nivelAjustado * 10000) + (100 - j.idade)
        }));

        // 2. Definir número de times base
        const numTimes = Math.max(2, Math.ceil(listaSorteio.length / jogadoresPorTime));
        const gridTimes = Array.from({ length: numTimes }, () => []);

        // 3. Separar Pilares (Goleiros, Craques, etc) para distribuí-ons no grid primeiro
        const pilares = listaSorteio.filter(j => j.separar).sort((a, b) => b.score - a.score);
        const restantes = listaSorteio.filter(j => !j.separar);
        
        let timeAtual = 0;
        let direcao = 1;

        // Distribui os Pilares primeiro (1 por time idealmente)
        pilares.forEach(p => {
            gridTimes[timeAtual].push(p);
            timeAtual += direcao;
            if (timeAtual >= numTimes) {
                timeAtual = numTimes - 1;
                direcao = -1;
            } else if (timeAtual < 0) {
                timeAtual = 0;
                direcao = 1;
            }
        });

        // 4. Ordenação rigorosa por Rank Técnico do restante
        const mulheres = restantes.filter(j => j.genero === 'Feminino').sort((a, b) => b.score - a.score);
        const homens = restantes.filter(j => j.genero !== 'Feminino').sort((a, b) => b.score - a.score);

        // Retoma o Snake Draft para as Mulheres, tentando distribuir níveis iguais em equipes diferentes
        // Mantemos um mapa de níveis já presentes em cada equipe para as mulheres
        const niveisMulheresPorEquipe = Array.from({ length: numTimes }, () => new Set());
        mulheres.forEach(m => {
            // Determina o tamanho mínimo atual das equipes
            const tamanhoMin = Math.min(...gridTimes.map(t => t.length));
            // Equipes que ainda não têm esse nível e têm tamanho mínimo
            const equipesSemNivel = gridTimes
                .map((t, i) => ({ idx: i, tamanho: t.length, temNivel: niveisMulheresPorEquipe[i].has(m.nivelAjustado) }))
                .filter(e => e.tamanho === tamanhoMin && !e.temNivel);
            let equipeEscolhidaIdx;
            if (equipesSemNivel.length > 0) {
                // Escolhe a primeira equipe disponível (pode ser aleatória)
                equipeEscolhidaIdx = equipesSemNivel[0].idx;
            } else {
                // Caso todas as equipes já tenham esse nível, escolhe a equipe com tamanho mínimo
                const equipesTamanhoMin = gridTimes
                    .map((t, i) => ({ idx: i, tamanho: t.length }))
                    .filter(e => e.tamanho === tamanhoMin);
                equipeEscolhidaIdx = equipesTamanhoMin[0].idx;
            }
            gridTimes[equipeEscolhidaIdx].push(m);
            // Registra o nível na equipe escolhida
            niveisMulheresPorEquipe[equipeEscolhidaIdx].add(m.nivelAjustado);
        });

        // Pós‑processamento: garantir que nenhuma equipe tenha duas mulheres do mesmo nível quando houver outra equipe disponível
        for (let i = 0; i < numTimes; i++) {
            const contagemNiveis = {};
            gridTimes[i].forEach(p => {
                if (p.genero === 'Feminino') {
                    const nivel = p.nivelAjustado;
                    contagemNiveis[nivel] = (contagemNiveis[nivel] || 0) + 1;
                }
            });
            Object.entries(contagemNiveis).forEach(([nivelStr, cnt]) => {
                const nivel = parseInt(nivelStr);
                if (cnt > 1) {
                    // procura outra equipe que ainda não tenha esse nível entre as mulheres
                    for (let j = 0; j < numTimes; j++) {
                        if (j === i) continue;
                        const temNivel = gridTimes[j].some(p => p.genero === 'Feminino' && p.nivelAjustado === nivel);
                        if (!temNivel) {
                            const idx = gridTimes[i].findIndex(p => p.genero === 'Feminino' && p.nivelAjustado === nivel);
                            if (idx !== -1) {
                                const [player] = gridTimes[i].splice(idx, 1);
                                gridTimes[j].push(player);
                                // atualiza os sets de níveis
                                niveisMulheresPorEquipe[i].delete(nivel);
                                niveisMulheresPorEquipe[j].add(nivel);
                            }
                            break;
                        }
                    }
                }
            });
        }

        homens.forEach(h => {
            // Tenta colocar no time com menos jogadores no momento para balancear
            const numMinJogadores = Math.min(...gridTimes.map(t => t.length));
            const timesComVaga = gridTimes.map((t, i) => ({ t, i })).filter(obj => obj.t.length === numMinJogadores);
            
            // Se houver times com vaga, coloca no primeiro disponível via snake draft
            let timeEscolhido = timeAtual;
            if (!timesComVaga.some(obj => obj.i === timeAtual)) {
                // Se o time atual não for o com menos jogadores, joga no time mais vazio
                timeEscolhido = timesComVaga[0].i;
            }

            gridTimes[timeEscolhido].push(h);

            // Continua movimento da cobra no sentido normal
            timeAtual += direcao;
            if (timeAtual >= numTimes) {
                timeAtual = numTimes - 1;
                direcao = -1;
            } else if (timeAtual < 0) {
                timeAtual = 0;
                direcao = 1;
            }
        });

        // Pós‑processamento de balanceamento global de níveis entre equipes
        // Calcula média de nível técnico de cada equipe e tenta equalizar trocando jogadores
        const MAX_ITER = 10; // limite de iterações para evitar loops infinitos
        let iter = 0;
        const calcularMedia = (equipe) => {
            if (equipe.length === 0) return 0;
            const soma = equipe.reduce((acc, p) => acc + p.nivelAjustado, 0);
            return soma / equipe.length;
        };
        while (iter < MAX_ITER) {
            // calcula médias
            const medias = gridTimes.map(calcularMedia);
            // encontra equipe com maior média e menor média
            const idxMax = medias.indexOf(Math.max(...medias));
            const idxMin = medias.indexOf(Math.min(...medias));
            const diff = medias[idxMax] - medias[idxMin];
            if (diff <= 0.5) break; // diferença aceitável
            // tenta encontrar jogador de nível alto na equipe max e jogador de nível baixo na equipe min
            const candidatoAlto = gridTimes[idxMax].find(p => p.nivelAjustado > 1 && p.separar === false);
            const candidatoBaixo = gridTimes[idxMin].find(p => p.nivelAjustado < 5 && p.separar === false);
            if (!candidatoAlto || !candidatoBaixo) break; // não há candidatos elegíveis
            // troca
            const idxAlto = gridTimes[idxMax].indexOf(candidatoAlto);
            const idxBaixo = gridTimes[idxMin].indexOf(candidatoBaixo);
            gridTimes[idxMax].splice(idxAlto, 1, candidatoBaixo);
            gridTimes[idxMin].splice(idxBaixo, 1, candidatoAlto);
            iter++;
        }
        
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
                        <span>{jogadores.filter(j => j.presente).length} atletas presentes</span>
                    </div>

                    {jogadores.filter(j => j.presente).some(j => j.fonte !== 'Liderança') && (
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
                                background: j.fonte !== 'Liderança' ? 'rgba(239, 68, 68, 0.02)' : 'transparent',
                                opacity: j.presente ? 1 : 0.5
                            }}>
                                <div className="atleta-info-base">
                                    <div className="atleta-avatar">
                                        {j.foto ? <img src={j.foto} alt="" /> : <User size={18} />}
                                    </div>
                                    <div className="atleta-nome-hab">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                            <span className="nome" style={{ textDecoration: !j.presente ? 'line-through' : 'none', wordBreak: 'break-word' }}>{formatarNomeAtleta(j.nome)}</span>
                                            {j.fonte !== 'Liderança' ? (
                                                <span title="Sem Rank de Liderança" style={{ color: '#f87171', background: 'rgba(239, 68, 68, 0.1)', padding: '4px', borderRadius: '4px', display: 'flex' }}>
                                                    <ShieldAlert size={14} />
                                                </span>
                                            ) : (
                                                <span title="Rank validado pelo Capitão" style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '4px', borderRadius: '4px', display: 'flex' }}>
                                                    <ShieldCheck size={14} />
                                                </span>
                                            )}
                                        </div>
                                        <span className="modalidade-link">{j.modalidade} • {j.idade} anos</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1 }}>
                                    <button 
                                        onClick={() => handleAlternarSeparar(j.id)}
                                        title={j.separar ? "Pilar do time (Goleiro, Craque). Não cairá com outro Pilar." : "Marcar como Pilar para separar no sorteio"}
                                        style={{ 
                                            background: j.separar ? '#8b5cf6' : 'rgba(255,255,255,0.05)',
                                            border: 'none',
                                            color: j.separar ? '#fff' : '#94a3b8',
                                            padding: '6px 8px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            fontSize: '0.75rem',
                                            fontWeight: 'bold',
                                            gap: '4px'
                                        }}
                                    >
                                        <ShieldCheck size={14} /> <span className="hide-mobile">Separar</span>
                                    </button>

                                    <button 
                                        onClick={() => handleAlternarPresenca(j.id)}
                                        style={{ 
                                            background: j.presente ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                                            border: j.presente ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                                            color: j.presente ? '#10b981' : '#64748b',
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        {j.presente ? '✓' : '✕'}
                                    </button>

                                    <div className="atleta-rank-ajuste" style={{ display: 'flex', gap: '4px' }}>
                                        {j.fonte !== 'Liderança' && j.presente && (
                                            <button 
                                                onClick={() => handleAjustarNivel(j.id, j.nivelAjustado)}
                                                style={{ 
                                                    background: '#10b981', 
                                                    color: 'white', 
                                                    border: 'none', 
                                                    borderRadius: '6px', 
                                                    padding: '0 10px', 
                                                    cursor: 'pointer',
                                                    fontWeight: 'bold'
                                                }}
                                                title="Confirmar nível sugerido"
                                            >
                                                ✓
                                            </button>
                                        )}
                                        <select 
                                            value={j.nivelAjustado} 
                                            onChange={(e) => handleAjustarNivel(j.id, e.target.value)}
                                            className={`rank-select val-${j.nivelAjustado}`}
                                            disabled={!j.presente}
                                            style={{ minWidth: '110px' }}
                                        >
                                            <option value="1">1⭐ - Lazer</option>
                                            <option value="2">2⭐ - Iniciante</option>
                                            <option value="3">3⭐ - Intermed.</option>
                                            <option value="4">4⭐ - Avançado</option>
                                            <option value="5">5⭐ - Pro</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="acoes-sorteio-sticky">
                    <Botao 
                        fullWidth 
                        onClick={realizarSorteio} 
                        className="btn-sortear" 
                        disabled={jogadores.filter(j => j.presente).some(j => j.fonte !== 'Liderança') || jogadores.filter(j => j.presente).length < 2}
                    >
                        <Zap size={20} /> Sortear Times
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
