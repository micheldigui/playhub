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
    const lancarFrequencia = async (partida, targetUserId, frequencia, vinculo) => {
        try {
            // 1. Grava a marcação da prancheta
            const { error } = await supabase
                .from('partidas_presencas')
                .update({ frequencia })
                .eq('partida_id', partida.id)
                .eq('usuario_id', targetUserId);
                
            if (error) throw error;
            
            // 2. Fluxo PUNITIVO p/ Faltosos
            if (frequencia === 'F') {
                // Prevê cliques duplos deletando rastro anterior antes de inserir
                await supabase.from('punicoes_equipe').delete()
                    .eq('partida_id', partida.id).eq('usuario_id', targetUserId);

                const dataPart = new Date(partida.data + 'T' + partida.hora);
                await supabase.from('punicoes_equipe').insert({
                    equipe_id: partida.equipe_id,
                    usuario_id: targetUserId,
                    partida_id: partida.id,
                    motivo: `Falta marcada na partida do dia ${dataPart.toLocaleDateString('pt-BR')}`
                });
                
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
            alternarPagamentoAvulso
        }}>
            {children}
        </PartidasContexto.Provider>
    );
};
