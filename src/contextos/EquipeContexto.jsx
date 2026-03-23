import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../servicos/supabase';
import { usarAutenticacao } from './AutenticacaoContexto';

const EquipeContexto = createContext({});

export const usarEquipe = () => {
    const contexto = useContext(EquipeContexto);
    if (!contexto) {
        throw new Error('usarEquipe deve ser usado dentro de um EquipeProvedor');
    }
    return contexto;
};

export const EquipeProvedor = ({ children }) => {
    const { usuario } = usarAutenticacao();
    const [equipes, setEquipes] = useState([]);
    const [equipeAtiva, setEquipeAtiva] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [convitesPendentesGlobais, setConvitesPendentesGlobais] = useState(0);

    useEffect(() => {
        if (usuario) {
            carregarEquipes();
            carregarConvitesRecebidos();

            // Listener realtime: detecta quando o próprio usuário é removido de uma equipe
            const canal = supabase
                .channel(`membros_equipe_user_${usuario.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*', // INSERT, UPDATE, DELETE
                        schema: 'public',
                        table: 'membros_equipe',
                        filter: `usuario_id=eq.${usuario.id}`
                    },
                    (payload) => {
                        // Recarrega a lista de equipes para refletir a mudança (remoção, atualização de papel etc.)
                        console.log('[Realtime] membros_equipe mudou:', payload.eventType);
                        carregarEquipes();
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(canal);
            };
        } else {
            setEquipes([]);
            setEquipeAtiva(null);
            setCarregando(false);
            setConvitesPendentesGlobais(0);
        }
    }, [usuario?.id]);

    const carregarEquipes = async () => {
        setCarregando(true);
        try {
            const { data, error } = await supabase
                .from('membros_equipe')
                .select(`
                    equipe_id,
                    papel,
                    permissoes,
                    vinculo,
                    status,
                    equipes (
                        id,
                        nome,
                        modalidade,
                        icone,
                        logo_url,
                        visibilidade,
                        status,
                        cidade,
                        estado,
                        nivel,
                        slug_convite,
                        local_nome,
                        local_cep,
                        local_rua,
                        local_bairro,
                        local_cidade,
                        local_estado,
                        local_numero,
                        local_complemento,
                        local_mapa_link,
                        link_grupo,
                        regras
                    )
                `)
                .eq('usuario_id', usuario.id);

            if (error) throw error;
            
            const listaEquipes = data.map(m => ({
                ...m.equipes,
                papel: m.papel,
                permissoes: m.permissoes || [],
                membroStatus: m.status
            }));

            setEquipes(listaEquipes);
            
            // Tenta recuperar a equipe ativa do localStorage ou pega a primeira
            const equipeSalva = localStorage.getItem('playhub_equipe_ativa');
            if (equipeSalva) {
                const encontrada = listaEquipes.find(e => e.id === equipeSalva);
                setEquipeAtiva(encontrada || listaEquipes[0] || null);
            } else {
                setEquipeAtiva(listaEquipes[0] || null);
            }
        } catch (error) {
            console.error('Erro ao carregar equipes:', error.message);
        } finally {
            setCarregando(false);
        }
    };

    const selecionarEquipe = (equipeId) => {
        const encontrada = equipes.find(e => e.id === equipeId);
        if (encontrada) {
            setEquipeAtiva(encontrada);
            localStorage.setItem('playhub_equipe_ativa', equipeId);
        }
    };

    const selecionarEquipeGlobal = (equipe) => {
        // Para Super Admin, permitimos selecionar qualquer equipe e damos papel de admin "virtual"
        const equipeComPapel = {
            ...equipe,
            papel: 'admin',
            gestao_global: true
        };
        setEquipeAtiva(equipeComPapel);
        localStorage.setItem('playhub_equipe_ativa', equipe.id);
    };

    const criarEquipe = async (dadosDaEquipe, arquivoLogo) => {
        try {
            // 1. Inserir equipe
            const { data: equipeNova, error: equipeErro } = await supabase
                .from('equipes')
                .insert({
                    nome: dadosDaEquipe.nome,
                    modalidade: dadosDaEquipe.modalidade,
                    observacoes: dadosDaEquipe.observacoes || null,
                    visibilidade: dadosDaEquipe.visibilidade,
                    status: 'ativo',
                    admin_id: usuario.id,
                    estado: dadosDaEquipe.estado,
                    nivel: dadosDaEquipe.nivel,
                    local_nome: dadosDaEquipe.local_nome || null,
                    local_cep: dadosDaEquipe.local_cep || null,
                    local_rua: dadosDaEquipe.local_rua || null,
                    local_bairro: dadosDaEquipe.local_bairro || null,
                    local_cidade: dadosDaEquipe.local_cidade || null,
                    local_estado: dadosDaEquipe.local_estado || null,
                    local_numero: dadosDaEquipe.local_numero || null,
                    local_complemento: dadosDaEquipe.local_complemento || null,
                    local_mapa_link: dadosDaEquipe.local_mapa_link || null,
                    link_grupo: dadosDaEquipe.link_grupo || null
                })
                .select()
                .single();

            if (equipeErro) throw equipeErro;

            const equipeId = equipeNova.id;

            // 2. Upload da Imagem (se selecionada)
            let logoUrl = null;
            if (arquivoLogo) {
                const fileExt = arquivoLogo.name.split('.').pop();
                const filePath = `${equipeId}/logo-${Date.now()}.${fileExt}`;
                
                const { error: uploadError } = await supabase.storage
                    .from('escudos')
                    .upload(filePath, arquivoLogo);
                    
                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from('escudos')
                    .getPublicUrl(filePath);
                    
                logoUrl = publicUrlData.publicUrl;

                await supabase
                    .from('equipes')
                    .update({ logo_url: logoUrl })
                    .eq('id', equipeId);
            }

            // 3. Inserir membro fundador (admin)
            const { error: membroErro } = await supabase
                .from('membros_equipe')
                .insert({
                    equipe_id: equipeId,
                    usuario_id: usuario.id,
                    papel: 'admin',
                    permissoes: ['gerenciar_equipe', 'gerenciar_membros']
                });

            if (membroErro) throw membroErro;

            // 4. Preparar objeto completo da nova equipe para o estado
            const novaEquipeCompleta = {
                ...equipeNova,
                logo_url: logoUrl, // Usa a URL atualizada (se houver)
                papel: 'admin'
            };

            setEquipes(prev => [...prev, novaEquipeCompleta]);
            setEquipeAtiva(novaEquipeCompleta);
            localStorage.setItem('playhub_equipe_ativa', equipeId);

            return { sucesso: true, equipe: novaEquipeCompleta };
        } catch (error) {
            console.error('Erro ao processar criação de equipe:', error);
            return { sucesso: false, erro: error.message };
        }
    };

    const editarEquipe = async (equipeId, dadosDaEquipe, arquivoLogo) => {
        try {
            // 1. Atualizar dados básicos
            const { error: updateErro } = await supabase
                .from('equipes')
                .update({
                    nome: dadosDaEquipe.nome,
                    modalidade: dadosDaEquipe.modalidade,
                    observacoes: dadosDaEquipe.observacoes || null,
                    visibilidade: dadosDaEquipe.visibilidade,
                    cidade: dadosDaEquipe.local_cidade || dadosDaEquipe.cidade,
                    estado: dadosDaEquipe.local_estado || dadosDaEquipe.estado,
                    nivel: dadosDaEquipe.nivel,
                    local_nome: dadosDaEquipe.local_nome || null,
                    local_cep: dadosDaEquipe.local_cep || null,
                    local_rua: dadosDaEquipe.local_rua || null,
                    local_bairro: dadosDaEquipe.local_bairro || null,
                    local_cidade: dadosDaEquipe.local_cidade || null,
                    local_estado: dadosDaEquipe.local_estado || null,
                    local_numero: dadosDaEquipe.local_numero || null,
                    local_complemento: dadosDaEquipe.local_complemento || null,
                    local_mapa_link: dadosDaEquipe.local_mapa_link || null,
                    link_grupo: dadosDaEquipe.link_grupo || null
                })
                .eq('id', equipeId);

            if (updateErro) throw updateErro;

            // 2. Upload da Imagem (se selecionada)
            let logoUrl = dadosDaEquipe.logo_url;
            if (arquivoLogo) {
                const fileExt = arquivoLogo.name.split('.').pop();
                const filePath = `${equipeId}/logo-${Date.now()}.${fileExt}`;
                
                const { error: uploadError } = await supabase.storage
                    .from('escudos')
                    .upload(filePath, arquivoLogo);
                    
                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from('escudos')
                    .getPublicUrl(filePath);
                    
                logoUrl = publicUrlData.publicUrl;

                await supabase
                    .from('equipes')
                    .update({ logo_url: logoUrl })
                    .eq('id', equipeId);
            }

            // 3. Atualizar estado local
            const equipeAtualizada = {
                ...equipeAtiva,
                ...dadosDaEquipe,
                logo_url: logoUrl
            };

            setEquipes(prev => prev.map(e => e.id === equipeId ? equipeAtualizada : e));
            setEquipeAtiva(equipeAtualizada);

            return { sucesso: true, equipe: equipeAtualizada };
        } catch (error) {
            console.error('Erro ao editar equipe:', error);
            return { sucesso: false, erro: error.message };
        }
    };

    const atualizarRegrasEquipe = async (equipeId, novasRegras) => {
        try {
            // 1. Atualizar regras no JSONB da equipe
            const { error: errEquipe } = await supabase
                .from('equipes')
                .update({ regras: novasRegras })
                .eq('id', equipeId);

            if (errEquipe) throw errEquipe;

            // 2. Sincronizar com financeiro_config (para consistência entre contextos)
            // Extraímos apenas os campos financeiros das regras
            const configFinanceira = {
                equipe_id: equipeId,
                valor_mensalidade: Number(novasRegras.mensalidade) || 50,
                dia_vencimento: Number(novasRegras.vencimento_dia) || 10,
                custo_quadra: Number(novasRegras.custo_quadra) || 0,
                limite_vencimento_horas: Number(novasRegras.horas_limite_pagamento) || 24,
                chave_pix: novasRegras.chave_pix || ''
            };

            const { error: errFinanceiro } = await supabase
                .from('financeiro_config')
                .upsert(configFinanceira);
            
            // Nota: Se a tabela não tiver as novas colunas ainda, o upsert ignorará ou dará erro silencioso 
            // dependendo da configuração do PostgREST. Aqui tratamos como aviso se falhar.
            if (errFinanceiro) console.warn('Aviso: Erro ao sincronizar financeiro_config:', errFinanceiro.message);

            setEquipes(prev => prev.map(e => e.id === equipeId ? { ...e, regras: novasRegras } : e));
            setEquipeAtiva(prev => prev.id === equipeId ? { ...prev, regras: novasRegras } : prev);

            return { sucesso: true };
        } catch (error) {
            console.error('Erro ao atualizar regras:', error);
            return { sucesso: false, erro: error.message };
        }
    };

    const excluirEquipe = async (equipeId) => {
        try {
            // 1. Verificar se a equipe tem membros (além do admin)
            const { count, error: countError } = await supabase
                .from('membros_equipe')
                .select('*', { count: 'exact', head: true })
                .eq('equipe_id', equipeId);

            if (countError) throw countError;

            if (count > 1) {
                throw new Error('Não é possível excluir uma equipe que ainda possui membros vinculados além de você.');
            }

            // 2. Excluir membros (o admin)
            await supabase.from('membros_equipe').delete().eq('equipe_id', equipeId);

            // 3. Excluir equipe
            const { error: deleteError } = await supabase
                .from('equipes')
                .delete()
                .eq('id', equipeId);

            if (deleteError) throw deleteError;

            // 4. Atualizar estado local
            const novasEquipes = equipes.filter(e => e.id !== equipeId);
            setEquipes(novasEquipes);
            setEquipeAtiva(novasEquipes[0] || null);
            if (novasEquipes[0]) {
                localStorage.setItem('playhub_equipe_ativa', novasEquipes[0].id);
            } else {
                localStorage.removeItem('playhub_equipe_ativa');
            }

            return { sucesso: true };
        } catch (error) {
            console.error('Erro ao excluir equipe:', error);
            return { sucesso: false, erro: error.message };
        }
    };

    const buscarEquipes = async (filtros = {}, apenasPublicas = true) => {
        setCarregando(true);
        try {
            let query = supabase
                .from('equipes')
                .select('*, membros_equipe(count)')
                .eq('status', 'ativo');

            if (apenasPublicas) {
                query = query.eq('visibilidade', 'publica');
            }

            if (filtros.modalidade) {
                query = query.eq('modalidade', filtros.modalidade);
            }

            if (filtros.cidade) {
                query = query.ilike('local_cidade', `%${filtros.cidade}%`);
            }

            if (filtros.termo) {
                query = query.or(`nome.ilike.%${filtros.termo}%,slug_convite.eq.${filtros.termo}`);
            }

            const { data, error } = await query.limit(20);
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao buscar equipes:', error.message);
            return [];
        } finally {
            setCarregando(false);
        }
    };

    const buscarJogadores = async (filtros = {}) => {
        setCarregando(true);
        try {
            let query = supabase
                .from('usuarios')
                .select(`
                    id, nome_completo, apelido, cidade, estado, foto_url,
                    esportes_interesse
                `)
                .eq('perfil_publico', true);

            if (filtros.termo) {
                query = query.or(`nome_completo.ilike.%${filtros.termo}%,apelido.ilike.%${filtros.termo}%`);
            }

            if (filtros.cidade) {
                query = query.ilike('cidade', `%${filtros.cidade}%`);
            }

            if (filtros.modalidade) {
                // Filtra jogadores que tenham a modalidade nos esportes de interesse (se for array)
                // Ou podemos usar cs (contains) se for TEXT[]
                query = query.contains('esportes_interesse', [filtros.modalidade]);
            }

            const { data, error } = await query.limit(24);
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao buscar jogadores:', error);
            return [];
        } finally {
            setCarregando(false);
        }
    };

    const solicitarIngresso = async (equipeId) => {
        try {
            // Verificar se já existe solicitação ou se já é membro
            const { data: existente, error: buscaErro } = await supabase
                .from('membros_equipe')
                .select('status')
                .eq('equipe_id', equipeId)
                .eq('usuario_id', usuario.id)
                .maybeSingle();

            if (existente) {
                if (existente.status === 'ativo') return { sucesso: false, erro: 'Você já é membro deste time.' };
                if (existente.status === 'pendente') return { sucesso: false, erro: 'Sua solicitação já está pendente.' };
            }

            const { error } = await supabase
                .from('membros_equipe')
                .insert({
                    equipe_id: equipeId,
                    usuario_id: usuario.id,
                    status: 'pendente',
                    papel: 'jogador'
                });

            if (error) throw error;
            return { sucesso: true };
        } catch (error) {
            console.error('Erro ao solicitar ingresso:', error);
            return { sucesso: false, erro: error.message };
        }
    };

    const carregarSolicitacoes = async (equipeId) => {
        try {
            const { data, error } = await supabase
                .from('membros_equipe')
                .select(`
                    id,
                    status,
                    entrou_em,
                    usuarios (
                        id,
                        nome_completo,
                        apelido,
                        foto_url,
                        cidade,
                        estado
                    )
                `)
                .eq('equipe_id', equipeId)
                .eq('status', 'pendente');

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao carregar solicitações:', error);
            return [];
        }
    };

    const responderSolicitacao = async (membroId, aprovado) => {
        try {
            if (aprovado) {
                const { error } = await supabase
                    .from('membros_equipe')
                    .update({ status: 'ativo' })
                    .eq('id', membroId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('membros_equipe')
                    .delete()
                    .eq('id', membroId);
                if (error) throw error;
            }
            return { sucesso: true };
        } catch (error) {
            console.error('Erro ao responder solicitação:', error);
            return { sucesso: false, erro: error.message };
        }
    };

    const carregarMembrosEquipe = async (equipeId) => {
        try {
            const { data, error } = await supabase
                .from('membros_equipe')
                .select(`
                    id,
                    usuario_id,
                    papel,
                    permissoes,
                    vinculo,
                    status,
                    entrou_em,
                    usuarios (
                        id,
                        nome_completo,
                        apelido,
                        foto_url,
                        email,
                        telefone,
                        cidade,
                        estado
                    )
                `)
                .eq('equipe_id', equipeId)
                .in('status', ['ativo', 'pendente']);

            if (error) throw error;
            console.log('carregarMembrosEquipe retornou:', data?.length, 'membros', data?.[0]);
            return data;
        } catch (error) {
            console.error('Erro ao carregar membros ativos:', error);
            return [];
        }
    };

    const removerMembro = async (membroId) => {
        try {
            const { error } = await supabase
                .from('membros_equipe')
                .delete()
                .eq('id', membroId);
            if (error) throw error;
            return { sucesso: true };
        } catch (error) {
            console.error('Erro ao remover membro:', error);
            return { sucesso: false, erro: error.message };
        }
    };

    const atualizarMembro = async (membroId, atualizacoes) => {
        try {
            const { error } = await supabase
                .from('membros_equipe')
                .update(atualizacoes)
                .eq('id', membroId);
            if (error) throw error;
            return { sucesso: true };
        } catch (error) {
            console.error('Erro ao atualizar membro:', error);
            return { sucesso: false, erro: error.message };
        }
    };

    // ── SISTEMA DE CONVITES ──────────────────────────────────────────

    const enviarConvite = async (jogadorId, equipeId, mensagem = '') => {
        try {
            // Verificar se já existe convite pendente
            const { data: existente } = await supabase
                .from('convites_equipe')
                .select('id, status')
                .eq('equipe_id', equipeId)
                .eq('jogador_id', jogadorId)
                .single();

            if (existente) {
                if (existente.status === 'pendente') {
                    return { sucesso: false, erro: 'Já existe um convite pendente para este jogador.' };
                }
                if (existente.status === 'aceito') {
                    return { sucesso: false, erro: 'Este jogador já é membro da equipe.' };
                }
                // Se recusado, reenviar (update)
                const { error } = await supabase
                    .from('convites_equipe')
                    .update({ status: 'pendente', mensagem_convite: mensagem, mensagem_resposta: null, respondido_em: null, criado_em: new Date().toISOString() })
                    .eq('id', existente.id);
                if (error) throw error;
                return { sucesso: true, reenviado: true };
            }

            const { error } = await supabase
                .from('convites_equipe')
                .insert({
                    equipe_id: equipeId,
                    jogador_id: jogadorId,
                    admin_id: usuario.id,
                    mensagem_convite: mensagem || null,
                    status: 'pendente'
                });
            if (error) throw error;
            return { sucesso: true };
        } catch (error) {
            console.error('Erro ao enviar convite:', error);
            return { sucesso: false, erro: error.message };
        }
    };

    const cancelarConvite = async (conviteId) => {
        try {
            const { error } = await supabase
                .from('convites_equipe')
                .delete()
                .eq('id', conviteId);
            
            if (error) throw error;
            return { sucesso: true };
        } catch (error) {
            console.error('Erro ao cancelar convite:', error);
            return { sucesso: false, erro: error.message };
        }
    };

    const carregarConvitesRecebidos = async () => {
        try {
            const { data, error } = await supabase
                .from('convites_equipe')
                .select(`
                    id, status, mensagem_convite, criado_em,
                    equipes (
                        id, nome, modalidade, logo_url, nivel,
                        local_cidade, local_estado,
                        admin:usuarios!equipes_admin_id_fkey (nome_completo, apelido, foto_url)
                    )
                `)
                .eq('jogador_id', usuario.id)
                .order('criado_em', { ascending: false });
            if (error) throw error;
            setConvitesPendentesGlobais(data?.filter(c => c.status === 'pendente').length || 0);
            return data || [];
        } catch (error) {
            console.error('Erro ao carregar convites recebidos:', error);
            return [];
        }
    };

    const sairDaEquipe = async (equipeId) => {
        try {
            const { data: membro } = await supabase
                .from('membros_equipe')
                .select('id, papel')
                .eq('equipe_id', equipeId)
                .eq('usuario_id', usuario.id)
                .single();
            
            if (!membro) return { sucesso: false, erro: 'Você não é membro desta equipe.' };
            if (membro.papel === 'admin') return { sucesso: false, erro: 'O administrador geral não pode sair. Transfira a titularidade antes.' };

            const { error } = await supabase
                .from('membros_equipe')
                .delete()
                .eq('id', membro.id);

            if (error) throw error;

            // Remove equipe da lista local e reseta a ativa
            setEquipes(prev => {
                const nova = prev.filter(e => e.id !== equipeId);
                setEquipeAtiva(nova[0] || null);
                if (nova[0]) localStorage.setItem('playhub_equipe_ativa', nova[0].id);
                else localStorage.removeItem('playhub_equipe_ativa');
                return nova;
            });

            return { sucesso: true };
        } catch (error) {
            console.error('Erro ao sair da equipe:', error);
            return { sucesso: false, erro: error.message };
        }
    };

    const transferirTitularidade = async (equipeId, novoAdminMembroId) => {
        try {
            // Buscar usuario_id do novo admin para atualizar admin_id na tabela equipes
            const { data: novoMembroDados } = await supabase
                .from('membros_equipe')
                .select('usuario_id')
                .eq('id', novoAdminMembroId)
                .single();

            // Promover o novo admin na tabela membros_equipe
            const { error: errPromover } = await supabase
                .from('membros_equipe')
                .update({ papel: 'admin', permissoes: [] })
                .eq('id', novoAdminMembroId);
            if (errPromover) throw errPromover;

            // Rebaixar o admin atual para sub_admin
            const { data: membroAtual } = await supabase
                .from('membros_equipe')
                .select('id')
                .eq('equipe_id', equipeId)
                .eq('usuario_id', usuario.id)
                .single();

            if (membroAtual) {
                await supabase
                    .from('membros_equipe')
                    .update({ papel: 'sub_admin', permissoes: [] })
                    .eq('id', membroAtual.id);
            }

            // Atualizar admin_id na tabela equipes (para refletir na busca pública)
            if (novoMembroDados?.usuario_id) {
                await supabase
                    .from('equipes')
                    .update({ admin_id: novoMembroDados.usuario_id })
                    .eq('id', equipeId);
            }

            // Recarrega as equipes para refletir o novo papel
            await carregarEquipes();
            return { sucesso: true };
        } catch (error) {
            console.error('Erro ao transferir titularidade:', error);
            return { sucesso: false, erro: error.message };
        }
    };

    const responderConvite = async (conviteId, aceito, mensagemResposta = '') => {

        try {
            const { data: convite, error: errBusca } = await supabase
                .from('convites_equipe')
                .select('equipe_id')
                .eq('id', conviteId)
                .single();
            if (errBusca) throw errBusca;

            const { error: errUpdate } = await supabase
                .from('convites_equipe')
                .update({
                    status: aceito ? 'aceito' : 'recusado',
                    mensagem_resposta: mensagemResposta || null,
                    respondido_em: new Date().toISOString()
                })
                .eq('id', conviteId);
            if (errUpdate) throw errUpdate;

            // Se aceito, adicionar como membro ativo
            if (aceito) {
                const { error: errMembro } = await supabase
                    .from('membros_equipe')
                    .upsert({
                        equipe_id: convite.equipe_id,
                        usuario_id: usuario.id,
                        papel: 'jogador',
                        status: 'ativo'
                    }, { onConflict: 'equipe_id,usuario_id' });
                if (errMembro) throw errMembro;
                await carregarEquipes(); // Recarregar lista de equipes
            }
            return { sucesso: true };
        } catch (error) {
            console.error('Erro ao responder convite:', error);
            return { sucesso: false, erro: error.message };
        }
    };

    const carregarConvitesEnviados = async (equipeId) => {
        try {
            const { data, error } = await supabase
                .from('convites_equipe')
                .select(`
                    id, status, mensagem_convite, mensagem_resposta, criado_em, respondido_em,
                    jogador:usuarios!convites_equipe_jogador_id_fkey (
                        id, nome_completo, apelido, foto_url, cidade, estado
                    )
                `)
                .eq('equipe_id', equipeId)
                .order('criado_em', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Erro ao carregar convites enviados:', error);
            return [];
        }
    };

    const atualizarPermissoesMembro = async (membroId, novasPermissoes) => {
        try {
            const { error } = await supabase
                .from('membros_equipe')
                .update({ permissoes: novasPermissoes })
                .eq('id', membroId);

            if (error) throw error;
            return { sucesso: true };
        } catch (error) {
            console.error('Erro ao atualizar permissões:', error);
            return { sucesso: false, erro: error.message };
        }
    };

    const valor = {
        equipes,
        equipeAtiva,
        carregando,
        selecionarEquipe,
        atualizarEquipes: carregarEquipes,
        criarEquipe,
        editarEquipe,
        excluirEquipe,
        atualizarRegrasEquipe,
        buscarEquipes,
        selecionarEquipeGlobal,
        solicitarIngresso,
        carregarSolicitacoes,
        responderSolicitacao,
        buscarJogadores,
        carregarMembrosEquipe,
        atualizarMembro,
        atualizarPermissoesMembro,
        removerMembro,
        enviarConvite,
        cancelarConvite,
        carregarConvitesRecebidos,
        responderConvite,
        carregarConvitesEnviados,
        convitesPendentesGlobais,
        sairDaEquipe,
        transferirTitularidade,
    };


    return (
        <EquipeContexto.Provider value={valor}>
            {children}
        </EquipeContexto.Provider>
    );
};
