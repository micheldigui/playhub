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
                    id, status, created_at,
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

    const confirmarPresenca = async (partidaId, status = 'confirmado') => {
        if (!usuario) return { sucesso: false, erro: 'Usuário não autenticado' };
        try {
            const { data, error } = await supabase
                .from('partidas_presencas')
                .upsert({ 
                    partida_id: partidaId, 
                    usuario_id: usuario.id, 
                    status 
                }, { onConflict: 'partida_id,usuario_id' })
                .select()
                .single();

            if (error) throw error;
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

    return (
        <PartidasContexto.Provider value={{
            carregarPartidas,
            criarPartida,
            excluirPartida,
            editarPartida,
            buscarPresencas,
            confirmarPresenca,
            cancelarPresenca,
            partidasCarregadas
        }}>
            {children}
        </PartidasContexto.Provider>
    );
};
