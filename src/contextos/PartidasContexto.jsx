import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '../servicos/supabase';
import { usarAutenticacao } from './AutenticacaoContexto';

const PartidasContexto = createContext();

// Pesos constantes para Rankeamento MVP (Modelo Exponencial)
const PESO_MEDALHA = { 1: 4, 2: 2, 3: 1 };
const TETO_UNICO_MVP = 4; // Um votante escolhendo alguém como Ouro dá 4 pontos

export const usarPartidas = () => useContext(PartidasContexto);

export const PartidasProvider = ({ children }) => {
    const { usuario } = usarAutenticacao();
    const [partidasCarregadas, setPartidasCarregadas] = useState([]);

    const carregarPartidas = useCallback(async (equipeId) => {
        try {
            if (!equipeId) return [];
            const { data, error } = await supabase
                .from('partidas')
                .select('*')
                .eq('equipe_id', equipeId)
                .order('data', { ascending: true })
                .order('hora', { ascending: true });

            if (error) throw error;
            setPartidasCarregadas(data);
            return data;
        } catch (error) {
            console.error('Erro ao carregar partidas:', error);
            return [];
        }
    }, []);

    const criarPartida = useCallback(async (partida) => {
        try {
            const { data, error } = await supabase
                .from('partidas')
                .insert([partida])
                .select()
                .single();

            if (error) throw error;
            
            setPartidasCarregadas(prev => {
                const updated = [...prev, data];
                return updated.sort((a, b) => {
                    const dateA = new Date(a.data + 'T' + a.hora);
                    const dateB = new Date(b.data + 'T' + b.hora);
                    return dateA - dateB;
                });
            });

            return { sucesso: true, partida: data };
        } catch (error) {
            console.error('Erro ao criar partida:', error);
            return { sucesso: false, erro: error.message };
        }
    }, []);

    const excluirPartida = useCallback(async (id) => {
        try {
            const { count, error: errCount } = await supabase
                .from('partidas_presencas')
                .select('id', { count: 'exact', head: true })
                .eq('partida_id', id);

            if (errCount) throw errCount;
            if (count > 0) {
                return { sucesso: false, erro: `Não é possível excluir: ${count} atleta(s) já estão inscritos.` };
            }

            const { error } = await supabase.from('partidas').delete().eq('id', id);
            if (error) throw error;
            setPartidasCarregadas(prev => prev.filter(p => p.id !== id));
            return { sucesso: true };
        } catch (error) {
            return { sucesso: false, erro: error.message };
        }
    }, []);

    const editarPartida = useCallback(async (id, atualizacoes) => {
        try {
            const { data, error } = await supabase
                .from('partidas')
                .update(atualizacoes)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            
            setPartidasCarregadas(prev => {
                const updated = prev.map(p => p.id === id ? data : p);
                return updated.sort((a, b) => {
                    const dateA = new Date(a.data + 'T' + a.hora);
                    const dateB = new Date(b.data + 'T' + b.hora);
                    return dateA - dateB;
                });
            });

            return { sucesso: true, partida: data };
        } catch (error) {
            return { sucesso: false, erro: error.message };
        }
    }, []);

    const buscarPartidaPorId = useCallback(async (id) => {
        try {
            const { data, error } = await supabase
                .from('partidas')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return { sucesso: true, partida: data };
        } catch (error) {
            return { sucesso: false, erro: error.message };
        }
    }, []);

    const buscarPresencas = useCallback(async (partidaId) => {
        try {
            const { data, error } = await supabase.rpc('buscar_presencas_partida_seguro', {
                p_partida_id: partidaId
            });

            if (error) {
                const queryFallback = await supabase
                    .from('partidas_presencas')
                    .select('id, status, frequencia, created_at, usuario_id, usuarios ( id, nome_completo, apelido, foto_url )')
                    .eq('partida_id', partidaId)
                    .order('created_at', { ascending: true });
                
                if (queryFallback.error) throw queryFallback.error;
                return { sucesso: true, presencas: queryFallback.data };
            }

            const presencasFormatadas = data ? data.map(p => ({
                id: p.id,
                status: p.status,
                frequencia: p.frequencia,
                created_at: p.created_at,
                usuario_id: p.usuario_id,
                usuarios: {
                    id: p.usuario_id,
                    nome_completo: p.nome_completo,
                    apelido: p.apelido,
                    foto_url: p.foto_url
                }
            })) : [];

            return { sucesso: true, presencas: presencasFormatadas };
        } catch (error) {
            return { sucesso: false, erro: error.message };
        }
    }, []);

    const confirmarPresenca = useCallback(async (partida, status = 'confirmado', vinculo = 'avulso') => {
        if (!usuario?.id) return { sucesso: false, erro: 'Usuário não autenticado' };
        
        try {
            const { data: suspensoesAtivas } = await supabase
                .from('punicoes_equipe')
                .select('id, motivo, criado_em, partida_id')
                .eq('equipe_id', partida.equipe_id)
                .eq('usuario_id', usuario.id)
                .eq('tipo_cartao', 'vermelho')
                .eq('ativa', true);
            
            if (suspensoesAtivas && suspensoesAtivas.length > 0) {
                for (const sup of suspensoesAtivas) {
                    const { data: partidaCard } = await supabase
                        .from('partidas')
                        .select('data')
                        .eq('id', sup.partida_id)
                        .single();

                    if (partidaCard) {
                        const { count } = await supabase
                            .from('partidas')
                            .select('id', { count: 'exact', head: true })
                            .eq('equipe_id', partida.equipe_id)
                            .gt('data', partidaCard.data)
                            .lt('data', partida.data);

                        if (count > 0) {
                            await supabase.from('punicoes_equipe').update({ ativa: false }).eq('id', sup.id);
                        } else {
                            return { sucesso: false, erro: `❌ Inscrição Negada: Você está suspenso.` };
                        }
                    }
                }
            }
        } catch (err) {}

        try {
            const { data, error } = await supabase
                .from('partidas_presencas')
                .upsert({ 
                    partida_id: partida.id, 
                    usuario_id: usuario.id, 
                    status,
                    frequencia: 'P'
                }, { onConflict: 'partida_id,usuario_id' })
                .select()
                .single();

            if (error) throw error;

            if (vinculo === 'avulso' && status === 'confirmado') {
                 await supabase.from('pagamentos_avulsos').upsert({
                     equipe_id: partida.equipe_id,
                     partida_id: partida.id,
                     usuario_id: usuario.id,
                     status: 'pendente',
                     valor_pago: partida.valor_avulso || 0
                 }, { onConflict: 'partida_id,usuario_id' });
            }

            return { sucesso: true, presenca: data };
        } catch (error) {
            return { sucesso: false, erro: error.message };
        }
    }, [usuario?.id]);

    const cancelarPresenca = useCallback(async (partidaId) => {
        if (!usuario?.id) return { sucesso: false, erro: 'Usuário não autenticado' };
        try {
            const { error } = await supabase
                .from('partidas_presencas')
                .delete()
                .eq('partida_id', partidaId)
                .eq('usuario_id', usuario.id);

            if (error) throw error;
            
            await supabase
                .from('pagamentos_avulsos')
                .delete()
                .eq('partida_id', partidaId)
                .eq('usuario_id', usuario.id)
                .eq('status', 'pendente');

            return { sucesso: true };
        } catch (error) {
            return { sucesso: false, erro: error.message };
        }
    }, [usuario?.id]);

    // ====== GESTÃO DE FREQUÊNCIA E PUNIÇÕES (ADMIN) ======
    const lancarFrequencia = async (partida, targetUserId, frequencia, vinculo, tipoCartao = 'vermelho') => {
        try {
            // 1. Grava a marcação da prancheta
            const { error } = await supabase
                .from('partidas_presencas')
                .update({ frequencia })
                .eq('partida_id', partida.id)
                .eq('usuario_id', targetUserId);
                
            if (error) throw error;
            
            // 2. Fluxo de FAIR PLAY (Cartões) p/ Faltosos
            if (frequencia === 'F') {
                // Remove rastro anterior antes de inserir novo (importante para troca de cartão)
                await supabase.from('punicoes_equipe').delete()
                    .eq('partida_id', partida.id).eq('usuario_id', targetUserId);

                const dataPart = new Date(partida.data + 'T' + partida.hora);
                
                // Define se a punição nasce ativa (bloqueante)
                // Cartão AZUL (Justificado) NÃO suspende. Amarelo e Vermelho sim.
                const isAtiva = tipoCartao === 'amarelo' || tipoCartao === 'vermelho';
                const emoji = tipoCartao === 'amarelo' ? '🟨' : tipoCartao === 'vermelho' ? '🟥' : '🟦';
                const label = tipoCartao === 'justificado' ? 'Falta Justificada' : `Cartão ${tipoCartao === 'amarelo' ? 'Amarelo' : 'Vermelho'}`;

                // Inserir a punição com o tipo de cartão
                await supabase.from('punicoes_equipe').insert({
                    equipe_id: partida.equipe_id,
                    usuario_id: targetUserId,
                    partida_id: partida.id,
                    tipo_cartao: tipoCartao,
                    ativa: isAtiva,
                    motivo: `${label} ${emoji} aplicado na partida do dia ${dataPart.toLocaleDateString('pt-BR')}`
                });

                // Lógica de Acúmulo Automático (3 Amarelos = 1 Vermelho)
                if (tipoCartao === 'amarelo') {
                    const { data: amarelos, error: errCount } = await supabase
                        .from('punicoes_equipe')
                        .select('id')
                        .eq('equipe_id', partida.equipe_id)
                        .eq('usuario_id', targetUserId)
                        .eq('tipo_cartao', 'amarelo')
                        .eq('ativa', true); 

                    if (!errCount && amarelos.length >= 3) {
                        // Desativa os 3 amarelos (ciclo cumprido)
                        const ids = amarelos.map(a => a.id);
                        await supabase.from('punicoes_equipe').update({ ativa: false }).in('id', ids);

                        // Gera um vermelho automático por acúmulo
                        await supabase.from('punicoes_equipe').insert({
                            equipe_id: partida.equipe_id,
                            usuario_id: targetUserId,
                            partida_id: partida.id,
                            tipo_cartao: 'vermelho',
                            ativa: true,
                            motivo: `Cartão Vermelho Automático 🟥 (Acúmulo de 3 Amarelos)`
                        });
                    }
                }
                
                // Remove qualquer pagamento cobrado indevidamente
                await supabase.from('pagamentos_avulsos').delete()
                    .eq('partida_id', partida.id).eq('usuario_id', targetUserId);
            } else {
                // Se NÃO for 'F' (seja 'P' ou 'pendente'), remove eventuais punições atreladas à partida
                await supabase.from('punicoes_equipe').delete()
                    .eq('partida_id', partida.id).eq('usuario_id', targetUserId);
            }
            
            // 3. Fluxo FINANCEIRO (Só injeta se for P e for Avulso)
            if (frequencia === 'P' && vinculo === 'avulso') {
                 // Upsert pra garantir que a comanda física será lançada
                 await supabase.from('pagamentos_avulsos').upsert({
                     equipe_id: partida.equipe_id,
                     partida_id: partida.id,
                     usuario_id: targetUserId,
                     status: 'pendente',
                     valor_pago: partida.valor_avulso || 0
                 }, { onConflict: 'partida_id,usuario_id' });
            }

            // 4. Fluxo LIMPEZA GERAL FINANCEIRA (Se a marcação foi desfeita p/ 'pendente')
            if (frequencia === 'pendente') {
                await supabase.from('pagamentos_avulsos').delete()
                    .eq('partida_id', partida.id).eq('usuario_id', targetUserId);
            }

            return { sucesso: true };
        } catch (error) {
            console.error('Erro ao lançar frequencia:', error);
            return { sucesso: false, erro: error.message };
        }
    };

    const removerInscricaoAdmin = async (partidaId, targetUserId) => {
        // Remove a presença INTEIRA sem punir, o famoso "salvar a pele do cara"
        try {
            const { error } = await supabase
                .from('partidas_presencas')
                .delete()
                .eq('partida_id', partidaId)
                .eq('usuario_id', targetUserId);
            if (error) throw error;
            
            // Apaga rastros de punição e dindin
            await supabase.from('punicoes_equipe').delete().eq('partida_id', partidaId).eq('usuario_id', targetUserId);
            await supabase.from('pagamentos_avulsos').delete().eq('partida_id', partidaId).eq('usuario_id', targetUserId);

            return { sucesso: true };
        } catch (error) {
            return { sucesso: false, erro: error.message };
        }
    };

    const adicionarInscricaoAdmin = async (partida, targetUserId, vinculo = 'mensalista') => {
        try {
            // Usa upsert para curar o bug de re-inserir caso já exista registro conflituoso apagado/velho
            const { error } = await supabase
                .from('partidas_presencas')
                .upsert({ 
                    partida_id: partida.id, 
                    usuario_id: targetUserId, 
                    status: 'confirmado',
                    frequencia: 'P' // By default 'P'
                }, { onConflict: 'partida_id,usuario_id' });
            if (error) throw error;

            // Se o admin inserir na marra um avulso com 'P', rola a comanda
            if (vinculo === 'avulso') {
                 await supabase.from('pagamentos_avulsos').upsert({
                     equipe_id: partida.equipe_id,
                     partida_id: partida.id,
                     usuario_id: targetUserId,
                     status: 'pendente',
                     valor_pago: partida.valor_avulso || 0
                 }, { onConflict: 'partida_id,usuario_id' });
            }

            return { sucesso: true };
        } catch (error) {
            console.error('Falha hard ao inserir admin:', error);
            return { sucesso: false, erro: error.message };
        }
    };

    const alternarPagamentoAvulso = async (idPagamento, statusAtual) => {
        try {
            const novoStatus = statusAtual === 'pago' ? 'pendente' : 'pago';
            const { error } = await supabase
                .from('pagamentos_avulsos')
                .update({ status: novoStatus })
                .eq('id', idPagamento);
            if (error) throw error;
            return { sucesso: true };
        } catch (error) {
            return { sucesso: false, erro: error.message };
        }
    };

    const buscarPagamentosAvulsosPartida = async (partidaId) => {
        try {
            const { data, error } = await supabase
                .from('pagamentos_avulsos')
                .select('*')
                .eq('partida_id', partidaId);
            if (error) throw error;
            return { sucesso: true, pagamentos: data };
        } catch (error) {
            console.error('Erro buscar pagamentos:', error);
            return { sucesso: false, pagamentos: [] };
        }
    };

    const registrarPagamentoAvulso = async (pagamento) => {
        try {
            const { error } = await supabase.from('pagamentos_avulsos').upsert(pagamento, { onConflict: 'partida_id,usuario_id' });
            if (error) throw error;
            return { sucesso: true };
        } catch (error) {
            return { sucesso: false, erro: error.message };
        }
    };

    const removerPagamentoAvulso = async (partidaId, usuarioId) => {
        try {
            const { error } = await supabase.from('pagamentos_avulsos').delete().eq('partida_id', partidaId).eq('usuario_id', usuarioId);
            if (error) throw error;
            return { sucesso: true };
        } catch (error) {
            return { sucesso: false, erro: error.message };
        }
    };

    const buscarPunicoesPartida = async (partidaId) => {
        try {
            const { data, error } = await supabase
                .from('punicoes_equipe')
                .select('usuario_id, tipo_cartao, partida_id')
                .eq('partida_id', partidaId);
            if (error) throw error;
            return { sucesso: true, punicoes: data || [] };
        } catch (error) {
            console.error('Erro ao buscar punições da partida:', error);
            return { sucesso: false, punicoes: [] };
        }
    };

    const buscarHabilidadesParticipantes = async (usuarioIds, equipeId = null) => {
        try {
            if (!usuarioIds || usuarioIds.length === 0) return { sucesso: true, habilidades: [], usuariosData: [], notasLideranca: [] };

            // 1. Busca todas as habilidades cadastradas por esses usuários
            const { data: habilidades, error: errHab } = await supabase
                .from('jogador_modalidades')
                .select('usuario_id, modalidade, nivel_habilidade, posicao')
                .in('usuario_id', usuarioIds);

            if (errHab) throw errHab;

            // 2. Busca dados básicos (gênero e idade) para esses usuários
            const { data: usuarios, error: errUser } = await supabase
                .from('usuarios')
                .select('id, genero, data_nascimento')
                .in('id', usuarioIds);
            
            if (errUser) throw errUser;

            // 3. Busca notas privadas da liderança se houver uma equipe no contexto
            let notasLideranca = [];
            if (equipeId) {
                const { data: notas, error: errNotas } = await supabase
                    .from('membros_equipe')
                    .select('usuario_id, nivel_lideranca')
                    .eq('equipe_id', equipeId)
                    .in('usuario_id', usuarioIds)
                    .not('nivel_lideranca', 'is', null);
                
                if (!errNotas) {
                    notasLideranca = notas;
                }
            }

            return { 
                sucesso: true, 
                habilidades: habilidades || [],
                usuariosData: usuarios || [],
                notasLideranca
            };
        } catch (error) {
            console.error('Erro ao buscar habilidades dos participantes:', error);
            return { sucesso: false, erro: error.message };
        }
    };


    // ====== SISTEMA DE MVP (CRAQUE DA GALERA) ======
    const votarMVP = async (partidaId, equipeId, votos) => {
        // votos deve ser [{candidato_id: '...', posicao: 1}, {candidato_id: '...', posicao: 2}, ...]
        if (!usuario) return { sucesso: false, erro: 'Acesso negado' };
        try {
            const inserts = votos.map(v => ({
                partida_id: partidaId,
                equipe_id: equipeId,
                eleitor_id: usuario.id,
                candidato_id: v.candidato_id,
                posicao: v.posicao
            }));

            const { error } = await supabase
                .from('votos_mvp')
                .insert(inserts);

            if (error) {
                if (error.code === '23505') throw new Error('Você já registrou seu voto nesta partida.');
                throw error;
            }
            return { sucesso: true };
        } catch (error) {
            console.error('Erro ao votar no MVP:', error);
            return { sucesso: false, erro: error.message };
        }
    };

    const buscarVotosMVP = useCallback(async (partidaId) => {
        try {
            const { data, error } = await supabase
                .from('votos_mvp')
                .select('candidato_id, eleitor_id, posicao')
                .eq('partida_id', partidaId);
            if (error) throw error;
            return { sucesso: true, votos: data || [] };
        } catch (error) {
            return { sucesso: false, votos: [] };
        }
    }, []);

    // ====== SISTEMA DE TIMES E MELHOR TIME ======
    const salvarTimesSorteados = async (partidaId, equipes) => {
        try {
            const { error } = await supabase
                .from('partidas')
                .update({ times_sorteados: equipes })
                .eq('id', partidaId);

            if (error) throw error;
            
            setPartidasCarregadas(prev => prev.map(p => 
                p.id === partidaId ? { ...p, times_sorteados: equipes } : p
            ));

            return { sucesso: true };
        } catch (error) {
            console.error('Erro ao salvar times sorteados:', error);
            return { sucesso: false, erro: error.message };
        }
    };

    const votarMelhorTime = async (partidaId, equipeId, votosTimeArray) => {
        // votosTimeArray = [{ time_escolhido: "Time A", posicao: 1 }, ...]
        if (!usuario) return { sucesso: false, erro: 'Acesso negado' };
        try {
            const rows = votosTimeArray.map(v => ({
                partida_id: partidaId,
                equipe_id: equipeId,
                eleitor_id: usuario.id,
                time_escolhido: v.time_escolhido,
                posicao: v.posicao
            }));

            const { error } = await supabase
                .from('votos_time')
                .insert(rows);

            if (error) {
                if (error.code === '23505') throw new Error('Você já votou nos times desta partida.');
                throw error;
            }
            return { sucesso: true };
        } catch (error) {
            console.error('Erro ao votar no melhor time:', error);
            return { sucesso: false, erro: error.message };
        }
    };

    const buscarVotosTime = async (partidaId) => {
        try {
            const { data, error } = await supabase
                .from('votos_time')
                .select('time_escolhido, eleitor_id, posicao')
                .eq('partida_id', partidaId);
            if (error) throw error;
            return { sucesso: true, votos: data || [] };
        } catch (error) {
            return { sucesso: false, votos: [] };
        }
    };

    const buscarRankingMVP = async (equipeId, filtroMes = false) => {
        try {
            // 1. Busca votos
            let query = supabase
                .from('votos_mvp')
                .select('candidato_id, posicao, partida_id, eleitor_id, partidas!inner(data)')
                .eq('equipe_id', equipeId);
            
            if (filtroMes) {
                const agora = new Date();
                const primeiroDia = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();
                query = query.gte('partidas.data', primeiroDia);
            }

            const { data: votos, error: errVotos } = await query;
            if (errVotos) throw errVotos;

            // 2. Busca contagem de partidas jogadas por cada um (Preparo p/ média)
            const { data: presencas, error: errPres } = await supabase
                .from('partidas_presencas')
                .select('usuario_id, partida_id, partidas!inner(data)')
                .eq('frequencia', 'P')
                .eq('partidas.equipe_id', equipeId);
            
            if (errPres) throw errPres;

            // Filtra presenças pelo mês se necessário
            let presencasFiltradas = presencas;
            if (filtroMes) {
                const agora = new Date();
                const primeiroDia = new Date(agora.getFullYear(), agora.getMonth(), 1).getTime();
                presencasFiltradas = presencas.filter(p => new Date(p.partidas.data + 'T00:00:00').getTime() >= primeiroDia);
            }

            const { data: todosUsuarios } = await supabase.from('usuarios').select('id, nome_completo');
            const perfisMap = (todosUsuarios || []).reduce((acc, u) => ({ ...acc, [u.id]: u.nome_completo }), {});

            const totalPartidasAtleta = {};
            presencasFiltradas.forEach(p => {
                totalPartidasAtleta[p.usuario_id] = (totalPartidasAtleta[p.usuario_id] || 0) + 1;
            });

            // 3. Busca total de partidas da equipe no período (p/ trava dinâmica)
            const idsPartidasPeriodo = new Set(presencasFiltradas.map(p => p.partida_id));
            const totalPartidasEquipe = idsPartidasPeriodo.size;
            const travaPresenca = Math.min(3, Math.ceil(totalPartidasEquipe / 2));

            // 4. Agrupa Votantes Únicos por partida
            const votantesPorPartida = {};
            votos.forEach(v => {
                if (!votantesPorPartida[v.partida_id]) votantesPorPartida[v.partida_id] = new Set();
                if (v.eleitor_id) votantesPorPartida[v.partida_id].add(v.eleitor_id);
            });

            const stats = {};
            votos.forEach(v => {
                const pts = PESO_MEDALHA[v.posicao] || (Number(v.posicao) === 1 ? 4 : Number(v.posicao) === 2 ? 2 : 1);
                
                if (!stats[v.candidato_id]) {
                    stats[v.candidato_id] = { 
                        usuario_id: v.candidato_id, pontos: 0, ouros: 0, pratas: 0, bronzes: 0, 
                        jogos: totalPartidasAtleta[v.candidato_id] || 0 
                    };
                }
                stats[v.candidato_id].pontos += pts;
                if (Number(v.posicao) === 1) stats[v.candidato_id].ouros++;
                if (Number(v.posicao) === 2) stats[v.candidato_id].pratas++;
                if (Number(v.posicao) === 3) stats[v.candidato_id].bronzes++;
            });

            // 5. True Consensus Calculation
            const ranking = Object.values(stats)
                .map(s => {
                    // 1. Identifica todas as partidas onde o jogador esteve presente OU recebeu votos
                    const idsPartidas = new Set([
                        ...presencasFiltradas.filter(p => p.usuario_id === s.usuario_id).map(p => p.partida_id),
                        ...votos.filter(v => v.candidato_id === s.usuario_id).map(v => v.partida_id)
                    ]);
                    
                    let somaPontosGanhos = 0;
                    let somaMaxPossivelGlobal = 0;

                    // 1. Soma pontos REAIS (de todas as partidas identificadas)
                    votos.forEach(v => {
                        if (v.candidato_id === s.usuario_id && idsPartidas.has(v.partida_id)) {
                            somaPontosGanhos += (PESO_MEDALHA[v.posicao] || (Number(v.posicao) === 1 ? 4 : Number(v.posicao) === 2 ? 2 : 1));
                        }
                    });

                    // 2. Calcula Teto (apenas de partidas onde ele participou/recebeu voto e que tiveram votos)
                    idsPartidas.forEach(pId => {
                        const qtdVotantes = votantesPorPartida[pId] ? votantesPorPartida[pId].size : 0;
                        if (qtdVotantes === 0) return;
                        somaMaxPossivelGlobal += (qtdVotantes * TETO_UNICO_MVP);
                    });

                    const percentualBruto = somaMaxPossivelGlobal > 0 ? (somaPontosGanhos / somaMaxPossivelGlobal) : 0;
                    const notaFinal = percentualBruto * 10.0;

                    return {
                        ...s,
                        media: Math.min(10.0, notaFinal)
                    };
                })
                .filter(s => s.jogos >= travaPresenca)
                .sort((a, b) => {
                    // Ordenação: 1. Nota (Média) | 2. Ouros | 3. Pratas | 4. Bronzes
                    if (Math.abs(b.media - a.media) > 0.001) return b.media - a.media;
                    if (b.ouros !== a.ouros) return b.ouros - a.ouros;
                    if (b.pratas !== a.pratas) return b.pratas - a.pratas;
                    if (b.bronzes !== a.bronzes) return b.bronzes - a.bronzes;
                    return b.media - a.media;
                });

            return { sucesso: true, ranking, travaPresenca, totalPartidasEquipe };
        } catch (error) {
            console.error('Erro ao buscar ranking MVP:', error);
            return { sucesso: false, ranking: [] };
        }
    };

    const buscarVencedoresPartida = async (partidaId) => {
        try {
            const { data, error } = await supabase.rpc('buscar_vencedores_partida', {
                p_partida_id: partidaId
            });
            if (error) throw error;
            return { sucesso: true, vencedores: data || [] };
        } catch (error) {
            console.error('Erro ao buscar vencedores da partida:', error);
            return { sucesso: false, vencedores: [] };
        }
    };

    const buscarVotacoesPendentes = useCallback(async () => {
        if (!usuario?.id) return { sucesso: true, partidas: [] };
        
        try {
            const doisDiasAtras = new Date();
            doisDiasAtras.setDate(doisDiasAtras.getDate() - 3);
            const dataLimite = doisDiasAtras.toISOString().split('T')[0];

            const { data: presencas, error: errPres } = await supabase
                .from('partidas_presencas')
                .select('partida_id, partidas!inner ( id, data, local_nome, equipe_id, times_sorteados )')
                .eq('usuario_id', usuario.id)
                .eq('frequencia', 'P')
                .filter('partidas.data', 'gte', dataLimite);

            if (errPres) {
                const { data: simples } = await supabase
                    .from('partidas_presencas')
                    .select('partida_id, partidas ( id, data, local_nome, equipe_id, times_sorteados )')
                    .eq('usuario_id', usuario.id)
                    .eq('frequencia', 'P');
                
                const filtradas = (simples || [])
                    .filter(p => p.partidas && p.partidas.data >= dataLimite)
                    .map(p => p.partidas);
                return processarVotosPendentes(filtradas);
            }

            return processarVotosPendentes(presencas.map(p => p.partidas));
        } catch (error) {
            console.error('Erro ao buscar votações pendentes:', error);
            return { sucesso: false, partidas: [] };
        }
    }, [usuario?.id]);

    // Função auxiliar interna para evitar duplicidade de lógica
    const processarVotosPendentes = async (partidasRecentes) => {
        if (!partidasRecentes || partidasRecentes.length === 0) return { sucesso: true, partidas: [] };

        try {
            const idsPartidas = partidasRecentes.map(p => p.id);
            const { data: votos, error: errVotos } = await supabase
                .from('votos_mvp')
                .select('partida_id')
                .eq('eleitor_id', usuario.id)
                .in('partida_id', idsPartidas);

            if (errVotos) throw errVotos;

            const idsVotados = votos.map(v => v.partida_id);
            const pendentes = partidasRecentes.filter(p => {
                const temTimesSorteados = p.times_sorteados && p.times_sorteados.length > 0;
                return !idsVotados.includes(p.id) && temTimesSorteados;
            });

            return { sucesso: true, partidas: pendentes };
        } catch (err) {
            return { sucesso: false, partidas: [] };
        }
    };

    const buscarRankingColetivo = async (equipeId, filtroMes = false) => {
        try {
            let queryVotos = supabase
                .from('votos_time')
                .select('partida_id, time_escolhido, posicao, eleitor_id, partidas!inner(data)')
                .eq('equipe_id', equipeId);
            
            if (filtroMes) {
                const agora = new Date();
                const primeiroDia = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();
                queryVotos = queryVotos.gte('partidas.data', primeiroDia);
            }

            const { data: votos, error: errVotos } = await queryVotos;
            if (errVotos) throw errVotos;

            // Busca partidas e presenças
            const { data: partidas, error: errPartidas } = await supabase
                .from('partidas')
                .select('id, times_sorteados, data')
                .eq('equipe_id', equipeId)
                .not('times_sorteados', 'is', null);
            
            if (errPartidas) throw errPartidas;

            const { data: presencas, error: errPres } = await supabase
                .from('partidas_presencas')
                .select('usuario_id, partida_id')
                .eq('frequencia', 'P');
            
            if (errPres) throw errPres;

            // Filtragem por mês local (JS) para garantir consistência
            let partidasFiltradas = partidas;
            if (filtroMes) {
                const agora = new Date();
                const primeiroDia = new Date(agora.getFullYear(), agora.getMonth(), 1).getTime();
                partidasFiltradas = partidas.filter(p => new Date(p.data + 'T00:00:00').getTime() >= primeiroDia);
            }

            const idsPartidasPeriodo = new Set(partidasFiltradas.map(p => p.id));
            const travaPresenca = Math.min(3, Math.ceil(idsPartidasPeriodo.size / 2));

            const totalPartidasAtleta = {};
            presencas.forEach(p => {
                if (idsPartidasPeriodo.has(p.partida_id)) {
                    totalPartidasAtleta[p.usuario_id] = (totalPartidasAtleta[p.usuario_id] || 0) + 1;
                }
            });

            const mapPartidas = {};
            partidasFiltradas.forEach(p => {
                mapPartidas[p.id] = {};
                (p.times_sorteados || []).forEach(t => {
                    mapPartidas[p.id][t.nome] = t.jogadores || [];
                });
            });

            // 4. Agrupa Votantes Únicos por Partida
            const votantesPorPartidaT = {};
            votos.forEach(v => {
                if (!votantesPorPartidaT[v.partida_id]) votantesPorPartidaT[v.partida_id] = new Set();
                if (v.eleitor_id) votantesPorPartidaT[v.partida_id].add(v.eleitor_id);
            });

            const ptsJogadores = {};
            const ptsPartidaCol = {}; // { usuario_id: { partida_id: pts_da_equipe } }

            votos.forEach(v => {
                const jogadoresDoTime = mapPartidas[v.partida_id]?.[v.time_escolhido] || [];
                const pts = v.posicao === 1 ? 4 : v.posicao === 2 ? 2 : 1;
                
                jogadoresDoTime.forEach(jogador => {
                    const key = jogador.id ? String(jogador.id) : null;
                    if (!key) return;
                    
                    if (!ptsJogadores[key]) {
                        ptsJogadores[key] = {
                            usuario_id: jogador.id,
                            nome_completo: jogador.nome,
                            pontos: 0, ouros: 0, pratas: 0, bronzes: 0,
                            jogos: totalPartidasAtleta[key] || 0
                        };
                    }
                    
                    ptsJogadores[key].pontos += pts;
                    if (v.posicao === 1) ptsJogadores[key].ouros++;
                    if (v.posicao === 2) ptsJogadores[key].pratas++;
                    if (v.posicao === 3) ptsJogadores[key].bronzes++;

                    if (!ptsPartidaCol[key]) ptsPartidaCol[key] = {};
                    // Como a equipe toda ganha, soma para a partida
                    ptsPartidaCol[key][v.partida_id] = (ptsPartidaCol[key][v.partida_id] || 0) + pts;
                });
            });

            const ranking = Object.values(ptsJogadores)
                .map(s => {
                    const partidasDoJogador = presencas.filter(p => p.usuario_id === s.usuario_id && idsPartidasPeriodo.has(p.partida_id));
                    let somaPontosGanhos = 0;
                    let somaMaxPossivelGlobal = 0;

                    partidasDoJogador.forEach(p => {
                        const pId = p.partida_id;
                        const qtdVotantes = votantesPorPartidaT[pId] ? votantesPorPartidaT[pId].size : 0;
                        if (qtdVotantes === 0) return;

                        const maxPossivelDaPartida = qtdVotantes * TETO_UNICO_MVP;
                        const ganhosDaPartida = (ptsPartidaCol[s.usuario_id] && ptsPartidaCol[s.usuario_id][pId]) ? ptsPartidaCol[s.usuario_id][pId] : 0;
                        
                        somaPontosGanhos += ganhosDaPartida;
                        somaMaxPossivelGlobal += maxPossivelDaPartida;
                    });

                    const percentualBruto = somaMaxPossivelGlobal > 0 ? (somaPontosGanhos / somaMaxPossivelGlobal) : 0;
                    
                    // Escala Pura Coletiva
                    const notaFinal = percentualBruto * 10.0;

                    return {
                        ...s,
                        media: Math.min(10.0, notaFinal)
                    };
                })
                .filter(s => s.jogos >= travaPresenca)
                .sort((a, b) => {
                    if (b.media !== a.media) return b.media - a.media;
                    return b.jogos - a.jogos;
                });

            return { sucesso: true, ranking, travaPresenca, totalPartidasEquipe: idsPartidasPeriodo.size };
        } catch (error) {
            console.error('Erro ao buscar ranking coletivo:', error);
            return { sucesso: false, ranking: [] };
        }
    };

    return (
        <PartidasContexto.Provider value={{
            partidasCarregadas,
            carregarPartidas,
            criarPartida,
            editarPartida,
            excluirPartida,
            buscarPresencas,
            confirmarPresenca,
            cancelarPresenca,
            buscarPagamentosAvulsosPartida,
            registrarPagamentoAvulso,
            removerPagamentoAvulso,
            lancarFrequencia,
            removerInscricaoAdmin,
            adicionarInscricaoAdmin,
            alternarPagamentoAvulso,
            buscarPunicoesPartida,
            buscarHabilidadesParticipantes,
            buscarPartidaPorId,
            votarMVP,
            buscarVotosMVP,
            buscarRankingMVP,
            buscarVotacoesPendentes,
            buscarVencedoresPartida,
            salvarTimesSorteados,
            votarMelhorTime,
            buscarVotosTime,
            buscarRankingColetivo
        }}>
            {children}
        </PartidasContexto.Provider>
    );
};
