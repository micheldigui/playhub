import React, { useState, useEffect } from 'react';
import { 
    Users, 
    ArrowLeft, 
    Zap, 
    Trophy, 
    Share2, 
    RotateCcw,
    User,
    ShieldAlert,
    ShieldCheck,
    Settings2,
    CheckCircle2,
    Circle,
    Save
} from 'lucide-react';
import { usarPartidas } from '../../contextos/PartidasContexto';
import { usarEquipe } from '../../contextos/EquipeContexto';
import Botao from '../../componentes/Botao/Botao';
import './PaginaSorteioV4.css';

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

const PaginaSorteioV4 = ({ aoVoltar, participantes = [], partida, modalidadePrincipal }) => {
    const { buscarHabilidadesParticipantes, buscarPresencas, buscarPartidaPorId, carregarPartidas, salvarTimesSorteados } = usarPartidas();
    const { equipeAtiva } = usarEquipe();
    const [jogadores, setJogadores] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [equipes, setEquipes] = useState([]);
    const [jogadoresPorTime, setJogadoresPorTime] = useState(4);
    
    // Novas estados para Modo Seleção Global
    const [partidasDisponiveis, setPartidasDisponiveis] = useState([]);
    const [partidaSelecionada, setPartidaSelecionada] = useState(partida || null);
    const [buscandoMaisPartidas, setBuscandoMaisPartidas] = useState(false);
    const [salvandoTimes, setSalvandoTimes] = useState(false);
    
    // Novas Regras Configuráveis
    const [regras, setRegras] = useState({
        prioridadeLider: true,
        separarPilares: true,
        equilibrarGenero: true,
        distribuicaoGranular: true,
        desempatePerfil: true
    });

    useEffect(() => {
        const inicializar = async () => {
            let infoPartida = partida;
            
            // MODO INTELIGENTE: Se não veio partida, buscamos as da equipe
            if (!infoPartida && equipeAtiva?.id) {
                setBuscandoMaisPartidas(true);
                const todas = await carregarPartidas(equipeAtiva.id);
                
                // Filtro acordado: 30 dias atrás + Futuras
                const trintaDiasAtras = new Date();
                trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
                
                const filtradas = todas.filter(p => new Date(p.data + 'T' + (p.hora || '00:00')) >= trintaDiasAtras);
                setPartidasDisponiveis(filtradas);

                if (filtradas.length > 0) {
                    const agora = new Date();
                    
                    // 1. Tenta a próxima futura
                    const futuras = filtradas
                        .filter(p => new Date(p.data + 'T' + (p.hora || '00:00')) >= agora)
                        .sort((a, b) => new Date(a.data + 'T' + (a.hora || '00:00')) - new Date(b.data + 'T' + (b.hora || '00:00')));
                    
                    if (futuras.length > 0) {
                        infoPartida = futuras[0];
                    } else {
                        // 2. Se não houver futura, pega a última realizada (mais recente)
                        const passadas = filtradas
                            .filter(p => new Date(p.data + 'T' + (p.hora || '00:00')) < agora)
                            .sort((a, b) => new Date(b.data + 'T' + (b.hora || '00:00')) - new Date(a.data + 'T' + (a.hora || '00:00')));
                        
                        if (passadas.length > 0) {
                            infoPartida = passadas[0];
                        }
                    }
                }
                setBuscandoMaisPartidas(false);
            }
            
            // Fallback para Refresh se ainda estiver nulo
            if (!infoPartida) {
                const salvaId = localStorage.getItem('playhub_v4_partida_id');
                if (salvaId) {
                    const resp = await buscarPartidaPorId(salvaId);
                    if (resp.sucesso && resp.partida?.equipe_id === equipeAtiva.id) {
                        infoPartida = resp.partida;
                    } else if (resp.sucesso) {
                        // Limpa cache se for de outra equipe
                        localStorage.removeItem('playhub_v4_partida_id');
                    }
                }
            }

            if (infoPartida?.id) {
                setPartidaSelecionada(infoPartida);
                localStorage.setItem('playhub_v4_partida_id', infoPartida.id);
                
                if (infoPartida.vagas && !jogadoresPorTime) {
                    setJogadoresPorTime(Math.max(2, Math.floor(infoPartida.vagas / 2) || 4));
                }
                carregarHabilidades(infoPartida);
            } else {
                setCarregando(false);
            }
        };

        inicializar();
    }, [partida, equipeAtiva?.id]);

    const handleTrocarPartida = async (novaPartidaId) => {
        const nova = partidasDisponiveis.find(p => p.id === novaPartidaId);
        if (nova) {
            setPartidaSelecionada(nova);
            setEquipes([]); // Limpa resultados anteriores
            carregarHabilidades(nova);
        }
    };

    const carregarHabilidades = async (partidaParaCarregar = partida) => {
        if (!partidaParaCarregar?.id) return;
        
        setCarregando(true);
        let habilidades = [];
        let usuariosData = [];
        let rankingLideranca = [];

        // Salva o ID no localStorage para garantir persistência em futuros refreshs nesta tela
        localStorage.setItem('playhub_v4_partida_id', partidaParaCarregar.id);

        let listaParticipantes = participantes;
        if ((!listaParticipantes || listaParticipantes.length === 0) && partidaParaCarregar?.id) {
            try {
                const { sucesso, presencas } = await buscarPresencas(partidaParaCarregar.id);
                if (sucesso && presencas) {
                    const limite = partidaParaCarregar.vagas || 999;
                    listaParticipantes = presencas
                        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                        .slice(0, limite);
                }
            } catch (err) {
                console.error('Erro ao carregar fallbacks de presenca:', err);
            }
        }

        const idsParaBuscar = (listaParticipantes || []).map(p => p.usuario_id || p.id);

        try {
            const resp = await buscarHabilidadesParticipantes(idsParaBuscar, partidaParaCarregar?.equipe_id);
            if (resp.sucesso) {
                habilidades = resp.habilidades || [];
                usuariosData = resp.usuariosData || [];
                rankingLideranca = resp.notasLideranca || [];
            }
        } catch (err) {
            console.error('Erro ao carregar dados extras:', err);
        }

        const jogadoresProcessados = (listaParticipantes || []).map(p => {
            const u = p.usuarios || {};
            const userId = p.usuario_id || u.id;
            const extraData = usuariosData.find(ud => ud.id === userId) || {};
            const notaPrivada = rankingLideranca.find(nl => nl.usuario_id === userId);
            
            const playerHabs = habilidades.filter(h => h.usuario_id === userId);
            
            let habilidadeSugerida = null;
            let modoFonte = 'Geral';

            if (notaPrivada?.nivel_lideranca) {
                habilidadeSugerida = { nivel_habilidade: String(notaPrivada.nivel_lideranca), modalidade: 'Ajuste Líder 🔒' };
                modoFonte = 'Liderança';
            } else {
                habilidadeSugerida = playerHabs.find(h => h.modalidade === modalidadePrincipal);
                if (habilidadeSugerida) modoFonte = 'Fixo';
                
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

                if (!habilidadeSugerida && playerHabs.length > 0) {
                    habilidadeSugerida = [...playerHabs].sort((a, b) => 
                        NIVEL_VALORES[b.nivel_habilidade] - NIVEL_VALORES[a.nivel_habilidade]
                    )[0];
                    if (habilidadeSugerida) modoFonte = 'Histórico';
                }
            }

            const nivelFinal = (notaPrivada && notaPrivada.nivel_lideranca) 
                ? notaPrivada.nivel_lideranca 
                : (NIVEL_VALORES[habilidadeSugerida?.nivel_habilidade] || 3);

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
                posicoes: playerHabs.map(h => h.posicao).filter(Boolean),
                fonte: modoFonte,
                presente: true,
                separar: false
            };
        });

        const jogadoresOrdenados = [...jogadoresProcessados].sort((a, b) => b.nivelAjustado - a.nivelAjustado);
        setJogadores(jogadoresOrdenados);
        setCarregando(false);
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

    const obterIniciais = (nome) => {
        if (!nome) return '?';
        const partes = nome.trim().split(/\s+/);
        if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
        return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
    };

    const handleAlternarRegra = (chave) => {
        setRegras(prev => ({ ...prev, [chave]: !prev[chave] }));
    };

    const realizarSorteioV4 = () => {
        const jogadoresPresentes = jogadores.filter(j => j.presente);
        
        if (jogadoresPresentes.length < 2) {
            alert("É necessário pelo menos 2 jogadores presentes para realizar um sorteio.");
            return;
        }

        // Validação Obrigatória: Todos os presentes precisam ter nota da Liderança
        const semNota = jogadoresPresentes.filter(j => j.fonte !== 'Liderança');
        if (semNota.length > 0) {
            const nomes = semNota.map(j => j.nome).join(', ');
            alert(`⚠️ Bloqueado: Os seguintes jogadores precisam ter as estrelas definidas pelo capitão antes de sortear:\n\n${nomes}`);
            return;
        }

        const numTimes = Math.max(2, Math.ceil(jogadoresPresentes.length / jogadoresPorTime));
        
        let melhorSorteio = null;
        let menorScoreDiscrepancia = Infinity;

        // MOTOR DE ULTRA PRECISÃO: Simula 1500 variações e aplica refinamento local (Local Search)
        for (let i = 0; i < 1500; i++) {
            let gridCandidato = gerarSorteioCandidato(jogadoresPresentes, numTimes);
            
            // Refinamento Local (Hill Climbing): Tenta trocar jogadores entre times para lapidar o equilíbrio
            gridCandidato = refinarSorteioLocal(gridCandidato);

            const score = calcularScoreDesequilibrio(gridCandidato);

            if (score < menorScoreDiscrepancia) {
                menorScoreDiscrepancia = score;
                melhorSorteio = gridCandidato;
            }

            // Se chegarmos em um equilíbrio estatístico perfeito, podemos parar
            if (score < 0.1) break;
        }

        setEquipes(melhorSorteio);
    };

    const refinarSorteioLocal = (grid) => {
        const novoGrid = grid.map(t => [...t]);
        let melhorou = true;
        let passagens = 0;

        // Tenta até 10 passagens de refinamento por troca
        while (melhorou && passagens < 10) {
            melhorou = false;
            passagens++;

            const scoreAtual = calcularScoreDesequilibrio(novoGrid);

            // Tenta trocar pares de jogadores entre todos os times
            for (let i = 0; i < novoGrid.length; i++) {
                for (let j = i + 1; j < novoGrid.length; j++) {
                    const timeA = novoGrid[i];
                    const timeB = novoGrid[j];

                    for (let pA = 0; pA < timeA.length; pA++) {
                        for (let pB = 0; pB < timeB.length; pB++) {
                            // Só troca se os jogadores tiverem níveis diferentes (senão a média não muda)
                            if (timeA[pA].nivelAjustado === timeB[pB].nivelAjustado) continue;

                            // Realiza troca temporária
                            const temp = timeA[pA];
                            timeA[pA] = timeB[pB];
                            timeB[pB] = temp;

                            const novoScore = calcularScoreDesequilibrio(novoGrid);

                            if (novoScore < scoreAtual) {
                                melhorou = true;
                                break; // Aceita a troca e recomeça a busca
                            } else {
                                // Desfaz a troca se não melhorou
                                const tempVolta = timeA[pA];
                                timeA[pA] = timeB[pB];
                                timeB[pB] = tempVolta;
                            }
                        }
                        if (melhorou) break;
                    }
                    if (melhorou) break;
                }
                if (melhorou) break;
            }
        }
        return novoGrid;
    };

    const gerarSorteioCandidato = (jogadoresPresentes, numTimes) => {
        const grid = Array.from({ length: numTimes }, () => []);
        let listaTrabalho = [...jogadoresPresentes];

        // 1. Pilares
        if (regras.separarPilares) {
            const pilares = listaTrabalho.filter(j => j.separar).sort((a, b) => b.nivelAjustado - a.nivelAjustado);
            listaTrabalho = listaTrabalho.filter(j => !j.separar);
            
            let tIdx = 0;
            let dir = 1;
            pilares.forEach(p => {
                grid[tIdx].push(p);
                tIdx += dir;
                if (tIdx >= numTimes) { tIdx = numTimes - 1; dir = -1; }
                else if (tIdx < 0) { tIdx = 0; dir = 1; }
            });
        }

        // 2. Gênero
        if (regras.equilibrarGenero) {
            const mulheres = listaTrabalho.filter(j => j.genero === 'Feminino');
            listaTrabalho = listaTrabalho.filter(j => j.genero !== 'Feminino');
            for (let n = 5; n >= 1; n--) {
                const bucket = mulheres.filter(m => m.nivelAjustado === n);
                distribuirEmGrid(embaralhar(bucket), grid);
            }
        }

        // 3. Nível (Granular ou Snake)
        if (regras.distribuicaoGranular) {
            for (let n = 5; n >= 1; n--) {
                const bucket = listaTrabalho.filter(j => j.nivelAjustado === n);
                distribuirEmGrid(embaralhar(bucket), grid);
            }
        } else {
            const sortingList = listaTrabalho.sort((a, b) => b.nivelAjustado - a.nivelAjustado);
            distribuirEmGrid(sortingList, grid);
        }

        return grid;
    };

    const calcularScoreDesequilibrio = (grid) => {
        const somasTecnicas = grid.map(time => time.reduce((acc, p) => acc + p.nivelAjustado, 0));
        const numJogadores = grid.map(time => time.length);
        const mediasTecnicas = grid.map((time, i) => somasTecnicas[i] / (numJogadores[i] || 1));
        
        // Fator 1: Variância das Médias Técnicas (Minimização de Desvio Padrão)
        // Esta é a métrica mais rigorosa: quanto menor a variância, mais homogêneos são os times.
        const mediaGlobal = mediasTecnicas.reduce((a, b) => a + b, 0) / mediasTecnicas.length;
        const variancia = mediasTecnicas.reduce((acc, m) => acc + Math.pow(m - mediaGlobal, 2), 0) / mediasTecnicas.length;
        let score = variancia * 5000; 

        // Fator 2: Desvio de Média Máximo (Peso adicional para os extremos)
        const maxMedia = Math.max(...mediasTecnicas);
        const minMedia = Math.min(...mediasTecnicas);
        score += (maxMedia - minMedia) * 1000;

        // Fator 3: Concentração de Elite (5 estrelas)
        const elitePorTime = grid.map(time => time.filter(p => p.nivelAjustado >= 5).length);
        const maxElite = Math.max(...elitePorTime);
        const minElite = Math.min(...elitePorTime);
        score += (maxElite - minElite) * 200;

        // Fator 4: Equilíbrio de Posições (Defesa vs Ataque)
        const posicoesCriticas = ['Goleiro', 'Zagueiro', 'Fixo', 'Defensor'];
        posicoesCriticas.forEach(pos => {
            const contagemPos = grid.map(time => time.filter(p => p.posicoes.includes(pos)).length);
            const timesSemPos = contagemPos.filter(c => c === 0).length;
            const timesComPos = contagemPos.filter(c => c > 0).length;
            if (timesSemPos > 0 && timesComPos > 0) {
                score += 50;
            }
        });

        // Fator 5: Desvio de Tamanho Proporcional
        const maxTam = Math.max(...numJogadores);
        const minTam = Math.min(...numJogadores);
        score += (maxTam - minTam) * 500;

        return score;
    };

    const distribuirEmGrid = (lista, grid) => {
        if (lista.length === 0) return;

        lista.forEach(jogador => {
            const indicesMelhores = encontrarMelhoresTimes(jogador, grid);
            const escolhidoIdx = indicesMelhores[Math.floor(Math.random() * indicesMelhores.length)];
            grid[escolhidoIdx].push(jogador);
        });
    };

    const encontrarMelhoresTimes = (jogador, grid) => {
        const tamanhos = grid.map(t => t.length);
        const minTamanho = Math.min(...tamanhos);
        let candidatos = grid.map((t, i) => ({ t, i })).filter(obj => obj.t.length === minTamanho);

        if (regras.distribuicaoGranular) {
            const semNivel = candidatos.filter(obj => !obj.t.some(p => p.nivelAjustado === jogador.nivelAjustado));
            if (semNivel.length > 0) candidatos = semNivel;
        }

        if (regras.desempatePerfil && jogador.posicoes && jogador.posicoes.length > 0) {
            const semPosicao = candidatos.filter(obj => {
                const posicoesDoTime = obj.t.flatMap(p => p.posicoes || []);
                return !jogador.posicoes.some(pos => posicoesDoTime.includes(pos));
            });
            if (semPosicao.length > 0) candidatos = semPosicao;
        }

        const calcularSoma = (equipe) => equipe.reduce((acc, p) => acc + p.nivelAjustado, 0);
        const menorSoma = Math.min(...candidatos.map(obj => calcularSoma(obj.t)));
        candidatos = candidatos.filter(obj => calcularSoma(obj.t) === menorSoma);

        return candidatos.map(obj => obj.i);
    };

    const embaralhar = (array) => {
        const novo = [...array];
        for (let i = novo.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [novo[i], novo[j]] = [novo[j], novo[i]];
        }
        return novo;
    };

    const compartilharWhatsApp = () => {
        if (equipes.length === 0) return;
        let msg = `*⚖️ EQUIPES SORTEADAS - ${partidaSelecionada?.local_nome || 'PLAYHUB'}*\n\n`;
        equipes.forEach((equipe, index) => {
            if (equipe.length === 0) return;
            msg += `*TIME ${String.fromCharCode(65 + index)}* 🛡️\n`;
            equipe.forEach((j, i) => {
                msg += `${i + 1}. ${formatarNomeAtleta(j.nome)}\n`;
            });
            msg += `\n`;
        });
        msg += `👉 _Acesse: playhubapp.com.br_ 🚀`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
    };

    if (carregando) return <div className="sorteio-loading">Carregando Sandbox V4...</div>;

    return (
        <div className="pagina-sorteio-v4 animacao-entrada">
            <header className="sorteio-header">
                <div className="header-container">
                    <button onClick={aoVoltar} className="btn-voltar-v4" title="Voltar">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="header-titles">
                        <h1>Balanceamento de Equipes</h1>
                        <p>Configuração avançada de equilíbrio e regras</p>
                    </div>
                </div>

                {/* SELETOR DE PARTIDA INTELIGENTE */}
                <div className="seletor-partida-v4 animate-slide-down">
                    <select 
                        value={partidaSelecionada?.id || ''} 
                        onChange={(e) => handleTrocarPartida(e.target.value)}
                        disabled={carregando || partidasDisponiveis.length === 0}
                    >
                        {partidasDisponiveis.length === 0 && !partidaSelecionada && (
                            <option value="">Nenhuma partida encontrada</option>
                        )}
                        {partidasDisponiveis.length === 0 && partidaSelecionada && (
                            <option value={partidaSelecionada.id}>
                                {new Date(partidaSelecionada.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} | {partidaSelecionada.hora ? partidaSelecionada.hora.substring(0, 5) : '--:--'} - {partidaSelecionada.local_nome || 'Partida Atual'}
                            </option>
                        )}
                        {partidasDisponiveis.map(p => {
                            const dataFormatada = new Date(p.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                            const horaFormatada = p.hora ? p.hora.substring(0, 5) : '--:--';
                            const localCurto = p.local_nome; // Deixa o CSS cuidar do corte agora
                            
                            return (
                                <option key={p.id} value={p.id}>
                                    {dataFormatada} | {horaFormatada} - {localCurto || 'Local não definido'}
                                </option>
                            );
                        })}
                    </select>
                    <div className="status-partida-v4">
                        {buscandoMaisPartidas ? 'Buscando partidas...' : 
                         partidasDisponiveis.length === 0 ? 'Nenhuma partida agendada' :
                         `${partidaSelecionada ? 'Partida selecionada' : 'Selecione uma partida'}`}
                    </div>
                </div>
            </header>

            <main className="sorteio-content">
                {/* Configurações de Regras */}
                <section className="secao-regras-config">
                    <div className="secao-titulo">
                        <h3><Settings2 size={18} /> Regras Ativas</h3>
                        <p>Ajuste os critérios que o algoritmo deve priorizar</p>
                    </div>
                    
                    <div className="grid-regras">
                        <div className={`card-regra ${regras.prioridadeLider ? 'ativa' : ''}`} onClick={() => handleAlternarRegra('prioridadeLider')}>
                            <div className="regra-check">
                                {regras.prioridadeLider ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                            </div>
                            <div className="regra-info">
                                <strong>Prioridade Liderança</strong>
                                <span>Usa apenas notas 🔒 do Capitão</span>
                            </div>
                        </div>

                        <div className={`card-regra ${regras.separarPilares ? 'ativa' : ''}`} onClick={() => handleAlternarRegra('separarPilares')}>
                            <div className="regra-check">
                                {regras.separarPilares ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                            </div>
                            <div className="regra-info">
                                <strong>Separar Pilares</strong>
                                <span>Impede craques no mesmo time</span>
                            </div>
                        </div>

                        <div className={`card-regra ${regras.equilibrarGenero ? 'ativa' : ''}`} onClick={() => handleAlternarRegra('equilibrarGenero')}>
                            <div className="regra-check">
                                {regras.equilibrarGenero ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                            </div>
                            <div className="regra-info">
                                <strong>Equilibrar Gênero</strong>
                                <span>Distribui mulheres por nível</span>
                            </div>
                        </div>

                        <div className={`card-regra ${regras.distribuicaoGranular ? 'ativa' : ''}`} onClick={() => handleAlternarRegra('distribuicaoGranular')}>
                            <div className="regra-check">
                                {regras.distribuicaoGranular ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                            </div>
                            <div className="regra-info">
                                <strong>Distribuição Granular</strong>
                                <span>Equilibra qtd de estrelas (ex: 3⭐)</span>
                            </div>
                        </div>

                        <div className={`card-regra ${regras.desempatePerfil ? 'ativa' : ''}`} onClick={() => handleAlternarRegra('desempatePerfil')}>
                            <div className="regra-check">
                                {regras.desempatePerfil ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                            </div>
                            <div className="regra-info">
                                <strong>Desempate por Perfil</strong>
                                <span>Usa posições p/ evitar times só de ataque</span>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="sorteio-secao-config">
                    <div className="card-config-v4">
                        <div className="config-label">
                            <Users size={20} color="#8b5cf6" />
                            <span>Jogadores por Time</span>
                        </div>
                        <div className="contador-vagas-v4">
                            <button onClick={() => setJogadoresPorTime(Math.max(2, jogadoresPorTime - 1))}>-</button>
                            <span className="valor-vagas">{jogadoresPorTime}</span>
                            <button onClick={() => setJogadoresPorTime(Math.min(22, jogadoresPorTime + 1))}>+</button>
                        </div>
                    </div>
                </section>

                <div className="sorteio-acoes-final">
                    <Botao 
                        onClick={realizarSorteioV4} 
                        className="btn-sortear-v4" 
                        disabled={jogadores.filter(j => j.presente).length < 2}
                    >
                        <Zap size={20} /> Sortear
                    </Botao>
                </div>

                {/* Lista de Atletas para Review */}
                <section className="sorteio-secao-ajustes">
                    <div className="secao-titulo">
                        <h3>Atletas Presentes</h3>
                        <p>Ajuste as presenças e defina os Pilares (Goleiros/Craques)</p>
                    </div>
                    <div className="lista-atletas-v4">
                        {jogadores.map(j => (
                            <div key={j.id} className={`item-atleta-v4 nivel-card-${j.nivelAjustado} ${j.fonte !== 'Liderança' ? 'v4-card-sem-nota' : ''}`} style={{ 
                                opacity: j.presente ? 1 : 0.4,
                                borderLeft: j.fonte !== 'Liderança' ? '4px solid #f43f5e' : `4px solid var(--cor-nivel-${j.nivelAjustado})`
                            }}>
                                <div className="v4-avatar" onClick={() => handleAlternarPresenca(j.id)} style={{ cursor: 'pointer' }}>
                                    {j.foto ? (
                                        <img src={j.foto} alt="" />
                                    ) : (
                                        <div className="avatar-iniciais">{obterIniciais(j.nome)}</div>
                                    )}
                                </div>
                                <div className="v4-info" style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span className="v4-nome" style={{ textDecoration: j.presente ? 'none' : 'line-through' }}>{formatarNomeAtleta(j.nome)}</span>
                                        {j.fonte === 'Liderança' ? <ShieldCheck size={14} className="icon-lider-static" /> : <ShieldAlert size={14} style={{ color: '#f43f5e' }} />}
                                    </div>
                                    <div className="v4-tags">
                                        <select 
                                            value={j.nivelAjustado} 
                                            onChange={(e) => handleAjustarNivel(j.id, e.target.value)}
                                            className="v4-select-nivel"
                                            disabled={!j.presente}
                                        >
                                            <option value="1">1⭐</option>
                                            <option value="2">2⭐</option>
                                            <option value="3">3⭐</option>
                                            <option value="4">4⭐</option>
                                            <option value="5">5⭐</option>
                                        </select>
                                        <button 
                                            onClick={() => handleAlternarSeparar(j.id)}
                                            style={{
                                                background: j.separar ? '#8b5cf6' : 'transparent',
                                                border: '1px solid #8b5cf6',
                                                color: j.separar ? '#fff' : '#8b5cf6',
                                                fontSize: '0.6rem',
                                                padding: '1px 6px',
                                                borderRadius: '4px'
                                            }}
                                            disabled={!j.presente}
                                        >
                                            {j.separar ? 'Pilar' : 'Separar'}
                                        </button>
                                        {j.posicoes.slice(0, 2).map((p, idx) => (
                                            <span key={idx} className="tag-posicao">{p}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="v4-acoes-presenca">
                                    <button 
                                        onClick={() => handleAlternarPresenca(j.id)}
                                        style={{ background: 'none', border: 'none', color: j.presente ? '#10b981' : '#64748b', cursor: 'pointer' }}
                                    >
                                        {j.presente ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Resultados */}
                {equipes.length > 0 && (
                    <section className="sorteio-resultados animacao-entrada">
                        <div className="secao-titulo-resultados" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <h3>Times Equilibrados</h3>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    {(equipeAtiva.papel === 'admin' || equipeAtiva.papel === 'sub_admin') && partidaSelecionada?.id && (
                                        <Botao 
                                            onClick={async () => {
                                                if(partidaSelecionada.times_sorteados) {
                                                    if(!window.confirm('Atenção: Já existe um sorteio salvo para esta partida no banco de dados. Deseja sobrescrever os times oficiais anteriores?')) return;
                                                } else {
                                                    if(!window.confirm('Salvar os times sorteados oficialmente no banco de dados? Após gravar, os jogadores poderão votar no Melhor Time ao final da partida.')) return;
                                                }
                                                
                                                setSalvandoTimes(true);
                                                const timesOficiais = equipes.map((equipe, index) => ({
                                                    nome: `Time ${String.fromCharCode(65 + index)}`,
                                                    jogadores: equipe.map(j => ({ id: j.id, nome: j.nome, nivel: j.nivelAjustado }))
                                                }));
                                                
                                                const resp = await salvarTimesSorteados(partidaSelecionada.id, timesOficiais);
                                                if(resp.sucesso) {
                                                    alert('✅ Times da partida salvos com sucesso!');
                                                    setPartidaSelecionada(prev => ({ ...prev, times_sorteados: timesOficiais }));
                                                } else {
                                                    alert('Erro ao salvar no banco de dados: ' + resp.erro);
                                                }
                                                setSalvandoTimes(false);
                                            }}
                                            disabled={salvandoTimes}
                                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff', fontSize: '0.85rem' }}
                                        >
                                            {salvandoTimes ? <Circle size={18} className="animate-spin" /> : <Save size={18} />} {salvandoTimes ? 'Salvando...' : 'Salvar Escalação Oficial DB'}
                                        </Botao>
                                    )}
                                    <Botao onClick={compartilharWhatsApp} className="btn-share-v4" style={{ fontSize: '0.85rem' }}>
                                        <Share2 size={18} /> {window.innerWidth > 600 ? 'Compartilhar no WhatsApp' : 'WhatsApp'}
                                    </Botao>
                                </div>
                            </div>
                        </div>

                        <div className="grade-equipes-resultado">
                            {equipes.map((equipe, index) => (
                                <div key={index} className="cartao-equipe-v4">
                                    <div className="equipe-header">
                                        <div className="equipe-nome">
                                            <Trophy size={16} />
                                            TIME {String.fromCharCode(65 + index)}
                                        </div>
                                        <span className="equipe-media">
                                            Média: {(equipe.reduce((acc, curr) => acc + curr.nivelAjustado, 0) / equipe.length).toFixed(1)}⭐
                                        </span>
                                    </div>
                                    <div className="equipe-jogadores-lista">
                                        {equipe.map(j => (
                                            <div key={j.id} className="equipe-jogador-item">
                                                <span>{formatarNomeAtleta(j.nome)}</span>
                                                <div className="stars-mini">
                                                    {[1,2,3,4,5].map(s => (
                                                        <div key={s} className={`dot ${s <= j.nivelAjustado ? 'active' : ''}`} />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
};

export default PaginaSorteioV4;
