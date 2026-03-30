import React, { createContext, useContext, useState } from 'react';
import { supabase } from '../servicos/supabase';
import { usarAutenticacao } from './AutenticacaoContexto';

const PartidasContexto = createContext();

export const usarPartidas = () => useContext(PartidasContexto);

export const PartidasProvider = ({ children }) => {
    const { usuario } = usarAutenticacao();
    const [partidasCarregadas, setPartidasCarregadas] = useState([]);

    const carregarPartidas = async (equipeId) => {
        try {
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
    };

    const criarPartida = async (partida) => {
        try {
            const { data, error } = await supabase
                .from('partidas')
                .insert([partida])
                .select()
                .single();

            if (error) throw error;
            
            // Atualiza estado local adicionando e ordenando
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
    };

    const excluirPartida = async (id) => {
        try {
            // Verifica se há inscritos antes de excluir
            const { count, error: errCount } = await supabase
                .from('partidas_presencas')
                .select('id', { count: 'exact', head: true })
                .eq('partida_id', id);

            if (errCount) throw errCount;

            if (count > 0) {
                return { 
                    sucesso: false, 
                    erro: `Não é possível excluir: ${count} atleta(s) já estão inscritos nesta partida.` 
                };
            }

            const { error } = await supabase
                .from('partidas')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setPartidasCarregadas(prev => prev.filter(p => p.id !== id));
            return { sucesso: true };
        } catch (error) {
            console.error('Erro ao excluir partida:', error);
            return { sucesso: false, erro: error.message };
        }
    };

    const editarPartida = async (id, atualizacoes) => {
        try {
            const { data, error } = await supabase
                .from('partidas')
                .update(atualizacoes)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            
            // Atualiza estado local 
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
            console.error('Erro ao editar partida:', error);
            return { sucesso: false, erro: error.message };
        }
    };

    const buscarPresencas = async (partidaId) => {
        try {
            const { data, error } = await supabase
                .from('partidas_presencas')
                .select(`
                    id, status, frequencia, created_at,
                    usuarios ( id, nome_completo, apelido, foto_url )
                `)
                .eq('partida_id', partidaId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return { sucesso: true, presencas: data };
        } catch (error) {
            console.error('Erro buscar presencas:', error);
            return { sucesso: false, erro: error.message };
        }
    };

    const confirmarPresenca = async (partida, status = 'confirmado', vinculo = 'avulso') => {
        if (!usuario) return { sucesso: false, erro: 'Usuário não autenticado' };
        
        // 0. Verificação de Suspensão com Auto-Reset (Lógica de 1 Jogo de Gancho)
        try {
            const { data: suspensoesAtivas, error: errSusp } = await supabase
                .from('punicoes_equipe')
                .select('id, motivo, criado_em, partida_id')
                .eq('equipe_id', partida.equipe_id)
                .eq('usuario_id', usuario.id)
                .eq('tipo_cartao', 'vermelho')
                .eq('ativa', true); // Coluna 'ativa' booleana é melhor que status string para performance
            
            if (!errSusp && suspensoesAtivas && suspensoesAtivas.length > 0) {
                for (const sup of suspensoesAtivas) {
                    // Refinamento do Auto-Reset: 
                    // Se existiu qualquer partida da equipe cujo (data) seja MAIOR que a data da partida que gerou o cartão,
                    // e MENOR que a data da partida atual, significa que o jogador já "cumpriu" o seu jogo de fora.
                    
                    // Primeiro, buscamos a data da partida que gerou a punição
                    const { data: partidaCard } = await supabase
                        .from('partidas')
                        .select('data, hora')
                        .eq('id', sup.partida_id)
                        .single();

                    if (partidaCard) {
                        const dataCardStr = partidaCard.data;
                        
                        // Buscamos se houve alguma partida realizada entre o cartão e o jogo atual
                        const { count, error: errCount } = await supabase
                            .from('partidas')
                            .select('id', { count: 'exact', head: true })
                            .eq('equipe_id', partida.equipe_id)
                            .gt('data', dataCardStr)
                            .lt('data', partida.data);

                        if (!errCount && count > 0) {
                            // O jogador já cumpriu o gancho (teve jogo no meio)
                            await supabase.from('punicoes_equipe').update({ ativa: false }).eq('id', sup.id);
                        } else {
                            // Se não houve jogo no meio, mas ele está tentando se inscrever em um jogo 
                            // que é DIFERENTE do que ele levou o cartão (obviamente), e é o PRÓXIMO jogo,
                            // ele ainda deve estar bloqueado.
                            
                            // Caso especial: Se a partida que ele levou vermelho ainda é a última partida realizada, 
                            // ele continua suspenso para a próxima (que é esta que ele tenta entrar).
                            return { 
                                sucesso: false, 
                                erro: `❌ Inscrição Negada: Você está cumprindo suspensão. Motivo: ${sup.motivo}` 
                            };
                        }
                    } else {
                        // Backup caso a partida original tenha sido excluída: usa a data de criação da punição
                        const { count } = await supabase
                            .from('partidas')
                            .select('id', { count: 'exact', head: true })
                            .eq('equipe_id', partida.equipe_id)
                            .gt('created_at', sup.criado_em)
                            .lt('data', partida.data);
                            
                        if (count > 0) {
                            await supabase.from('punicoes_equipe').update({ ativa: false }).eq('id', sup.id);
                        } else {
                            return { sucesso: false, erro: `❌ Inscrição Negada: Você está cumprindo suspensão.` };
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Erro ao validar suspensao:', err);
        }

        // Regra atualizada: Todo mundo ganha 'P' automaticamente ao se inscrever (Self-Service)
        const frequenciaAutomatica = 'P';

        try {
            const { data, error } = await supabase
                .from('partidas_presencas')
                .upsert({ 
                    partida_id: partida.id, 
                    usuario_id: usuario.id, 
                    status,
                    frequencia: frequenciaAutomatica
                }, { onConflict: 'partida_id,usuario_id' })
                .select()
                .single();

            if (error) throw error;

            // Se for avulso e ganhou 'P' na confirmação, gera a comanda pendente
            if (frequenciaAutomatica === 'P' && vinculo === 'avulso' && status === 'confirmado') {
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
    };

    const cancelarPresenca = async (partidaId) => {
        if (!usuario) return { sucesso: false, erro: 'Usuário não autenticado' };
        try {
            const { error } = await supabase
                .from('partidas_presencas')
                .delete()
                .eq('partida_id', partidaId)
                .eq('usuario_id', usuario.id);

            if (error) throw error;
            return { sucesso: true };
        } catch (error) {
            return { sucesso: false, erro: error.message };
        }
    };

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
            buscarPunicoesPartida
        }}>
            {children}
        </PartidasContexto.Provider>
    );
};
