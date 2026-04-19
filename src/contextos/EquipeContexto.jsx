import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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
    const { usuario, ehSuperAdmin } = usarAutenticacao();
    const [equipes, setEquipes] = useState([]);
    const [equipeAtiva, setEquipeAtiva] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [convitesPendentesGlobais, setConvitesPendentesGlobais] = useState(0);
    const [solicitacoesPendentesGlobais, setSolicitacoesPendentesGlobais] = useState(0);
    const [minhasSolicitacoes, setMinhasSolicitacoes] = useState([]);
    const [modalCriacaoAberto, setModalCriacaoAberto] = useState(false);
    
    // Limite de equipes que o usuário pode ser Administrador (Dono)
    const LIMITE_EQUIPES_AD_POR_CONTA = 3;
    
    // Filtramos apenas as equipes onde o usuário é o ADMIN (CRIADOR/PROPRIETÁRIO) principal
    // Usamos um Set de IDs para garantir que duplicatas no estado não afetem a contagem
    const idsAdmin = new Set(equipes.filter(e => e.papel === 'admin' && !membroGestaoGlobal(e.id)).map(e => e.id));
    const totalCriadas = idsAdmin.size;
    const podeCriarEquipe = totalCriadas < LIMITE_EQUIPES_AD_POR_CONTA;

    function membroGestaoGlobal(id) {
        // Ajuda a evitar que equipes em modo manutenção do super admin contem no limite pessoal dele
        const eq = equipes.find(eqp => eqp.id === id);
        return eq?.gestao_global === true;
    }

    // Efeito para manter a contagem de aprovações pendentes em dia (SOMA P/ GESTORES)
    useEffect(() => {
        if (!equipes || equipes.length === 0) {
            setSolicitacoesPendentesGlobais(0);
            return;
        }

        const equipesGeridas = equipes.filter(e => e.papel === 'admin' || e.papel === 'sub_admin').map(e => e.id);
        if (equipesGeridas.length === 0) {
            setSolicitacoesPendentesGlobais(0);
            return;
        }

        const carregarContagemSolicitacoes = async () => {
            try {
                const { count, error } = await supabase
                    .from('membros_equipe')
                    .select('*', { count: 'exact', head: true })
                    .in('equipe_id', equipesGeridas)
                    .eq('status', 'pendente');
                
                if (!error) {
                    setSolicitacoesPendentesGlobais(count || 0);
                }
            } catch (err) {
                console.error('Erro contagem solicitacoes:', err);
            }
        };

        carregarContagemSolicitacoes();
    }, [equipes]);

    // buscarVotacoesPendentes foi movido para o PartidasContexto para melhor organização
    // Removendo duplicação para evitar confusão e reduzir o tamanho do contexto

    // Removendo função auxiliar duplicada
    

    const carregarEquipes = useCallback(async () => {
        if (!usuario?.id) return;
        setCarregando(true);
        try {
            const { data, error } = await supabase
                .from('membros_equipe')
                .select(`
                    id, papel, vinculo, permissoes, status, equipe_id,
                    equipes ( 
                        id, nome, modalidade, logo_url, admin_id, local_cidade, regras,
                        gestao_financeira, aceitando_membros, admin_id_pendente,
                        admin:usuarios!equipes_admin_id_fkey (id, nome_completo, apelido, foto_url)
                    )
                `)
                .eq('usuario_id', usuario.id)
                .in('status', ['ativo', 'pendente']);

            if (error) throw error;
            
            const listaCompleta = data.map(m => {
                const eq = m.equipes || {};
                const dadosAdmin = Array.isArray(eq.admin) ? eq.admin[0] : eq.admin;
                
                return {
                    ...eq,
                    admin: dadosAdmin,
                    id: m.equipe_id,
                    papel: eq.admin_id === usuario.id ? 'admin' : m.papel,
                    vinculo: m.vinculo,
                    permissoes: m.permissoes || [],
                    membroStatus: m.status
                };
            }).filter(e => e.id);

            const listaAtivas = listaCompleta.filter(e => e.membroStatus === 'ativo');
            const listaPendentes = listaCompleta.filter(e => e.membroStatus === 'pendente');

            setEquipes(listaAtivas);
            setMinhasSolicitacoes(listaPendentes);
            
            // Tenta recuperar a equipe ativa do localStorage ou pega a primeira
            const equipeSalva = localStorage.getItem('playhub_equipe_ativa');
            if (equipeSalva) {
                const encontrada = listaAtivas.find(e => e.id === equipeSalva);
                setEquipeAtiva(encontrada || listaAtivas[0] || null);
            } else {
                setEquipeAtiva(listaAtivas[0] || null);
            }
        } catch (error) {
            console.error('Erro ao carregar equipes:', error.message);
        } finally {
            setCarregando(false);
        }
    }, [usuario?.id]);

    useEffect(() => {
        let timeoutId;

        const debouncedCarregarEquipes = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                carregarEquipes();
            }, 1000);
        };

        if (usuario?.id) {
            carregarEquipes();

            // 1. Listener para o PRÓPRIO usuário (detalhes do seu vínculo)
            const canalProprio = supabase
                .channel(`membros_equipe_user_${usuario.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'membros_equipe',
                        filter: `usuario_id=eq.${usuario.id}`
                    },
                    (payload) => {
                        debouncedCarregarEquipes();
                    }
                )
                .subscribe();

            // 2. Listener para GESTORES (detectar novas solicitações de entrada e mudanças de membros)
            const canalGestao = supabase
                .channel(`membros_equipe_gestao_${usuario.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'membros_equipe'
                    },
                    (payload) => {
                        // Verifica se a mudança pertence a alguma equipe que o usuário gerencia em tempo real
                        const novaEquipeId = payload.new?.equipe_id;
                        const antigaEquipeId = payload.old?.equipe_id;
                        
                        // Buscamos as equipes que o usuário gerencia (Admin ou Sub-Admin)
                        const idsGeridos = equipes
                            .filter(e => e.papel === 'admin' || e.papel === 'sub_admin')
                            .map(e => e.id);

                        if (idsGeridos.includes(novaEquipeId) || idsGeridos.includes(antigaEquipeId)) {
                            debouncedCarregarEquipes();
                        }
                    }
                )
                .subscribe();

            return () => {
                clearTimeout(timeoutId);
                supabase.removeChannel(canalProprio);
                supabase.removeChannel(canalGestao);
            };
        } else {
            setEquipes([]);
            setEquipeAtiva(null);
            setCarregando(false);
            setConvitesPendentesGlobais(0);
            setSolicitacoesPendentesGlobais(0);
        }
    }, [usuario?.id, carregarEquipes]);


    const selecionarEquipe = useCallback((equipeId) => {
        const encontrada = equipes.find(e => e.id === equipeId);
        if (encontrada) {
            setEquipeAtiva(encontrada);
            localStorage.setItem('playhub_equipe_ativa', equipeId);
        }
    }, [equipes]);

    const selecionarEquipeGlobal = useCallback((equipe) => {
        const equipeComPapel = {
            ...equipe,
            papel: 'admin',
            gestao_global: true
        };
        setEquipeAtiva(equipeComPapel);
        localStorage.setItem('playhub_equipe_ativa', equipe.id);
    }, []);

    // Função auxiliar para converter CEP em coordenadas geográficas (Geocoding)
    const getCoordenadasPorCEP = async (cep) => {
        if (!cep) return { lat: null, lon: null };
        try {
            const cepLimpo = cep.replace(/\D/g, '');
            if (cepLimpo.length !== 8) return { lat: null, lon: null };

            // Timeout de 2 segundos para evitar que a aplicação trave se o Nominatim estiver instável
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);

            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&postalcode=${cepLimpo}&country=Brazil&limit=1`, {
                headers: { 'Accept-Language': 'pt-BR' },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            const data = await response.json();
            
            if (data && data.length > 0) {
                return { 
                    lat: parseFloat(data[0].lat), 
                    lon: parseFloat(data[0].lon) 
                };
            }
        } catch (error) {
            console.warn('Busca de coordenadas ignorada (timeout ou erro):', error.name === 'AbortError' ? 'Timeout' : error);
        }
        return { lat: null, lon: null };
    };

    const criarEquipe = async (dadosDaEquipe, arquivoLogo) => {
        // Validação extra no lado do "servidor" (contexto) com consulta em tempo real
        try {
            const { count: totalAtual, error: errCount } = await supabase
                .from('equipes')
                .select('*', { count: 'exact', head: true })
                .eq('admin_id', usuario.id);
            
            if (!errCount && totalAtual >= LIMITE_EQUIPES_AD_POR_CONTA) {
                return { sucesso: false, erro: `Limite de ${LIMITE_EQUIPES_AD_POR_CONTA} equipes atingido. Você já possui ${totalAtual} equipes sob sua administração.` };
            }
        } catch (e) {
            console.warn('Falha ao validar limite em tempo real, procedendo com estado local...');
            if (!podeCriarEquipe) {
                return { sucesso: false, erro: `Limite de ${LIMITE_EQUIPES_AD_POR_CONTA} equipes atingido. Exclua uma equipe para criar outra.` };
            }
        }

        try {
            // 0. Obter coordenadas se houver CEP
            const coords = await getCoordenadasPorCEP(dadosDaEquipe.local_cep);

            // 1. Inserir equipe
            const slugGerado = Math.random().toString(36).substring(2, 10).toLowerCase();

            const { data: equipeNova, error: equipeErro } = await supabase
                .from('equipes')
                .insert({
                    nome: dadosDaEquipe.nome,
                    modalidade: dadosDaEquipe.modalidade,
                    observacoes: dadosDaEquipe.observacoes || null,
                    visibilidade: dadosDaEquipe.visibilidade,
                    admin_id: usuario.id,
                    estado: dadosDaEquipe.estado,
                    nivel: dadosDaEquipe.nivel,
                    local_nome: dadosDaEquipe.local_nome || null,
                    local_cep: dadosDaEquipe.local_cep || null,
                    local_rua: dadosDaEquipe.local_rua || null,
                    local_bairro: dadosDaPeipe?.local_bairro || dadosDaEquipe.local_bairro || null,
                    local_cidade: dadosDaEquipe.local_cidade || null,
                    local_estado: dadosDaEquipe.local_estado || null,
                    local_numero: dadosDaEquipe.local_numero || null,
                    local_complemento: dadosDaEquipe.local_complemento || null,
                    local_mapa_link: dadosDaEquipe.local_mapa_link || null,
                    link_grupo: dadosDaEquipe.link_grupo || null,
                    latitude: coords.lat,
                    longitude: coords.lon,
                    gestao_financeira: dadosDaEquipe.gestao_financeira ?? true,
                    aceitando_membros: dadosDaEquipe.aceitando_membros ?? true,
                    regras: dadosDaEquipe.regras || {},
                    slug_convite: slugGerado
                })
                .select(`
                    *,
                    admin:usuarios!equipes_admin_id_fkey (id, nome_completo, apelido, foto_url)
                `)
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
                    status: 'ativo',
                    permissoes: ['gerenciar_equipe', 'gerenciar_membros']
                });

            if (membroErro) throw membroErro;

            // 3.5. Inicializar módulo financeiro integrado (se aplicável/defaults)
            const configFinanceira = {
                equipe_id: equipeId,
                valor_mensalidade: Number(dadosDaEquipe.regras?.mensalidade || 0),
                dia_vencimento: Number(dadosDaEquipe.regras?.vencimento_dia || 10),
                custo_quadra: Number(dadosDaEquipe.regras?.custo_quadra || 0),
                limite_vencimento_horas: Number(dadosDaEquipe.regras?.horas_limite_pagamento || 24),
                chave_pix: String(dadosDaEquipe.regras?.chave_pix || '')
            };
            
            const { error: errFinanceiro } = await supabase
                .from('financeiro_config')
                .upsert(configFinanceira);
                
            if (errFinanceiro) console.warn('Aviso: Erro ao preencher configuracao inicial financeira:', errFinanceiro.message);

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
            // 0. Obter coordenadas se houver CEP
            const coords = await getCoordenadasPorCEP(dadosDaEquipe.local_cep);

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
                    link_grupo: dadosDaEquipe.link_grupo || null,
                    latitude: coords.lat,
                    longitude: coords.lon,
                    gestao_financeira: dadosDaEquipe.gestao_financeira,
                    aceitando_membros: dadosDaEquipe.aceitando_membros,
                    regras: dadosDaEquipe.regras
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
            
            // 4. Sincronizar os dados financeiros preenchidos no form da equipe
            const configFinanceira = {
                equipe_id: equipeId,
                valor_mensalidade: Number(dadosDaEquipe.regras?.mensalidade || 0),
                dia_vencimento: Number(dadosDaEquipe.regras?.vencimento_dia || 10),
                custo_quadra: Number(dadosDaEquipe.regras?.custo_quadra || 0),
                limite_vencimento_horas: Number(dadosDaEquipe.regras?.horas_limite_pagamento || 24),
                chave_pix: String(dadosDaEquipe.regras?.chave_pix || '')
            };
            
            const ehOutroTime = equipeAtiva && equipeAtiva.id === equipeId && equipeAtiva.admin_id !== usuario.id;
            const necessitaBypass = ehSuperAdmin && ehOutroTime;
            
            if (necessitaBypass) {
                // By-Pass para o SuperAdmin tbm no sync financeiro do modal
                 await supabase.rpc('admin_bypass_update_financeiro', { p_equipe_id: equipeId, p_config: configFinanceira });
            } else {
                 await supabase.from('financeiro_config').upsert(configFinanceira);
            }

            setEquipes(prev => prev.map(e => e.id === equipeId ? equipeAtualizada : e));
            setEquipeAtiva(equipeAtualizada);

            // Recarrega a página para garantir sincronização total (App.jsx manterá a aba ativa)
            window.location.reload();

            return { sucesso: true, equipe: equipeAtualizada };
        } catch (error) {
            console.error('Erro ao editar equipe:', error);
            return { sucesso: false, erro: error.message };
        }
    };

    const atualizarConfiguracoesEquipe = async (equipeId, configuracoes) => {
        try {
            // Se for Gestor (Admin ou Vice) acessando a própria equipe ou SuperAdmin em manutenção
            const ehGestor = equipeAtiva && equipeAtiva.id === equipeId && (equipeAtiva.papel === 'admin' || equipeAtiva.papel === 'sub_admin');
            const ehOutroTime = equipeAtiva && equipeAtiva.id === equipeId && equipeAtiva.admin_id !== usuario?.id;
            
            // Usamos bypass se for SuperAdmin OU se for um Vice-Capitão tentando salvar configurações (que podem ser bloqueadas por RLS no update direto)
            const necessitaBypass = (ehSuperAdmin && ehOutroTime) || (equipeAtiva?.papel === 'sub_admin');

            if (necessitaBypass) {
                // Configurações vem como um objeto ex: { gestao_financeira: false }
                const chaves = Object.keys(configuracoes);
                for (const chave of chaves) {
                    const { error } = await supabase.rpc('admin_bypass_update_equipe', { 
                        p_equipe_id: equipeId, 
                        p_campo: chave,
                        p_valor: configuracoes[chave]
                    });
                    if (error) throw error;
                }
            } else {
                const { error } = await supabase
                    .from('equipes')
                    .update(configuracoes)
                    .eq('id', equipeId);
                if (error) throw error;
            }

            // Atualiza estado local
            setEquipes(prev => prev.map(e => e.id === equipeId ? { ...e, ...configuracoes } : e));
            if (equipeAtiva?.id === equipeId) {
                setEquipeAtiva(prev => ({ ...prev, ...configuracoes }));
            }

            return { sucesso: true };
        } catch (error) {
            console.error('Erro ao atualizar configurações:', error);
            return { sucesso: false, erro: error.message };
        }
    };

    const atualizarRegrasEquipe = async (equipeId, novasRegras) => {
        try {
            const ehOutroTime = equipeAtiva && equipeAtiva.id === equipeId && equipeAtiva.admin_id !== usuario?.id;
            const necessitaBypass = (ehSuperAdmin && ehOutroTime) || (equipeAtiva?.papel === 'sub_admin');

            // 1. Atualizar regras no JSONB da equipe
            if (necessitaBypass) {
                const { error: errEquipeRpc } = await supabase.rpc('admin_bypass_update_equipe', {
                    p_equipe_id: equipeId,
                    p_campo: 'regras',
                    p_valor: novasRegras
                });
                if (errEquipeRpc) throw errEquipeRpc;
            } else {
                const { error: errEquipe } = await supabase
                    .from('equipes')
                    .update({ regras: novasRegras })
                    .eq('id', equipeId);
                if (errEquipe) throw errEquipe;
            }

            // 2. Sincronizar com financeiro_config (para consistência entre contextos)
            // Extraímos apenas os campos financeiros das regras
            const configFinanceira = {
                equipe_id: equipeId,
                valor_mensalidade: Number(novasRegras.mensalidade || 0),
                dia_vencimento: Number(novasRegras.vencimento_dia || 10),
                custo_quadra: Number(novasRegras.custo_quadra || 0),
                limite_vencimento_horas: Number(novasRegras.horas_limite_pagamento || 24),
                chave_pix: String(novasRegras.chave_pix || '')
            };

            if (necessitaBypass) {
                const { error: errFinanceiroRpc } = await supabase.rpc('admin_bypass_update_financeiro', { p_equipe_id: equipeId, p_config: configFinanceira });
                if (errFinanceiroRpc) console.warn('Aviso: Erro ao sincronizar financeiro_config via RPC:', errFinanceiroRpc.message);
            } else {
                const { error: errFinanceiro } = await supabase
                    .from('financeiro_config')
                    .upsert(configFinanceira);
                if (errFinanceiro) console.warn('Aviso: Erro ao sincronizar financeiro_config:', errFinanceiro.message);
            }

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
            // 1. Verificar se a equipe tem OUTROS membros reais (com conta ativa) além do admin atual
            // O JOIN com usuarios garante que registros fantasmas (de contas deletadas) sejam ignorados
            const { data: membros, error: countError } = await supabase
                .from('membros_equipe')
                .select('usuario_id, usuarios!inner(id)')
                .eq('equipe_id', equipeId)
                .in('status', ['ativo', 'pendente']);

            if (countError) throw countError;

            // Filtramos para ver se existe alguém que não seja o usuário logado E que ainda tenha conta ativa
            const outrosMembros = membros.filter(m => String(m.usuario_id) !== String(usuario.id));

            if (outrosMembros.length > 0) {
                throw new Error('Não é possível excluir uma equipe que ainda possui outros membros vinculados. Remova-os primeiro.');
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

            // Forçar recarregamento para limpar estados residuais e redirecionar ao Dashboard
            window.location.reload();

            return { sucesso: true };
        } catch (error) {
            console.error('Erro ao excluir equipe:', error);
            return { sucesso: false, erro: error.message };
        }
    };

    const buscarEquipes = useCallback(async (filtros = {}, apenasPublicas = true) => {
        setCarregando(true);
        try {
            let query = supabase
                .from('equipes')
                .select('*, membros_equipe(count)');
            
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
            return [];
        } finally {
            setCarregando(false);
        }
    }, []);

    const buscarJogadores = async (filtros = {}) => {
        setCarregando(true);
        try {
            // Calcular data de corte para 18 anos
            const hoje = new Date();
            const dataCorte = new Date(hoje.getFullYear() - 18, hoje.getMonth(), hoje.getDate())
                .toISOString().split('T')[0];

            let query = supabase
                .from('usuarios')
                .select(`
                    id, nome_completo, apelido, cidade, estado, foto_url,
                    esportes_interesse, data_nascimento
                `)
                .eq('perfil_publico', true)
                .lte('data_nascimento', dataCorte); // Apenas maiores de 18

            if (filtros.termo) {
                query = query.or(`nome_completo.ilike.%${filtros.termo}%,apelido.ilike.%${filtros.termo}%`);
            }

            if (filtros.cidade) {
                query = query.ilike('cidade', `%${filtros.cidade}%`);
            }

            if (filtros.modalidade) {
                // Se a coluna esportes_interesse for JSONB, precisamos passar o valor como string JSON
                // para que o Postgres use o operador jsonb @> jsonb em vez de jsonb @> text[]
                query = query.contains('esportes_interesse', JSON.stringify([filtros.modalidade]));
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
                if (existente.status === 'pendente') {
                    await carregarEquipes();
                    return { sucesso: true };
                }
                
                // Se o status era 'saiu', 'removido' ou 'recusado', permite solicitar novamente (reativação)
                const { error: errUpdate } = await supabase
                    .from('membros_equipe')
                    .update({ 
                        status: 'pendente',
                        papel: 'jogador',
                        entrou_em: new Date().toISOString()
                    })
                    .eq('equipe_id', equipeId)
                    .eq('usuario_id', usuario.id);
                
                if (errUpdate) throw errUpdate;
                await carregarEquipes();
                return { sucesso: true };
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

            // Criar Alerta Global (Sino) para TODOS os gestores (ADMIN e SUB_ADMIN) da equipe
            const { data: gestores } = await supabase
                .from('membros_equipe')
                .select('usuario_id')
                .eq('equipe_id', equipeId)
                .in('papel', ['admin', 'sub_admin'])
                .eq('status', 'ativo');

            if (gestores && gestores.length > 0) {
                const { data: equipeAlvo } = await supabase
                    .from('equipes')
                    .select('nome')
                    .eq('id', equipeId)
                    .maybeSingle();

                const notificacoes = gestores.map(g => ({
                    remetente_id: usuario.id,
                    destinatario_id: g.usuario_id,
                    tipo: 'solicitacao_ingresso',
                    payload: {
                        equipe_id: equipeId,
                        nome_equipe: equipeAlvo?.nome || 'Equipe',
                        mensagem: `Solicitou ingresso na equipe ${equipeAlvo?.nome || ''}`
                    }
                }));

                await supabase.from('interacoes').insert(notificacoes);
            }

            await carregarEquipes();
            return { sucesso: true };
        } catch (error) {
            console.error('Erro ao solicitar ingresso:', error);
            return { sucesso: false, erro: error.message };
        }
    };

    const cancelarSolicitacaoIngresso = async (equipeId) => {
        try {
            // Utilizamos uma RPC para garantir bypass das regras de RLS (que estavam gerando falso-sucesso na deleção)
            // e para fazer a exclusão do membro e da notificação em uma única transação atômica.
            const { error } = await supabase.rpc('cancelar_solicitacao_ingresso', {
                p_equipe_id: equipeId,
                p_usuario_id: usuario.id
            });

            if (error) throw error;

            await carregarEquipes();
            return { sucesso: true };
        } catch (error) {
            console.error('Erro ao cancelar solicitação:', error);
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
                        estado,
                        data_nascimento
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
            // Busca dados da solicitação antes para saber quem e qual equipe é (para limpar notificações)
            const { data: solicitacao } = await supabase
                .from('membros_equipe')
                .select('usuario_id, equipe_id')
                .eq('id', membroId)
                .single();

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

            // Limpa as notificações (Soluções de ingresso) para TODOS os gestores envolvidos
            if (solicitacao) {
                await supabase
                    .from('interacoes')
                    .delete()
                    .eq('tipo', 'solicitacao_ingresso')
                    .eq('remetente_id', solicitacao.usuario_id)
                    .filter('payload->>equipe_id', 'eq', solicitacao.equipe_id);
            }

            return { sucesso: true };
        } catch (error) {
            console.error('Erro ao responder solicitação:', error);
            return { sucesso: false, erro: error.message };
        }
    };

    const carregarMembrosEquipe = useCallback(async (equipeId) => {
        try {
            // Tenta primeiro via RPC para garantir nomes mesmo em perfis privados (Security Definer)
            const { data: dataRpc, error: errorRpc } = await supabase.rpc('buscar_membros_equipe_seguro', { p_equipe_id: equipeId });

            if (!errorRpc && dataRpc) {
                // Formata o retorno da RPC para bater com a estrutura esperada (usuarios como sub-objeto)
                return dataRpc.map(m => {
                    // Determina o papel de forma automática: Dono da equipe é sempre Capitão (admin)
                    // Isso garante que mesmo que ele esteja como 'jogador' na tabela de membros, a coroa apareça.
                    const papelReal = m.usuario_id === equipeAtiva?.admin_id ? 'admin' : m.papel;
                    
                    return {
                        id: m.id,
                        usuario_id: m.usuario_id,
                        papel: papelReal,
                        permissoes: m.permissoes,
                        vinculo: m.vinculo,
                        status: m.status,
                        entrou_em: m.entrou_em,
                        nivel_lideranca: m.nivel_lideranca,
                        usuarios: {
                            id: m.usuario_id,
                            nome_completo: m.nome_completo,
                            apelido: m.apelido,
                            foto_url: m.foto_url
                        }
                    };
                });
            }

            // Fallback: Busca padrão via join (respeita RLS original)
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
                    nivel_lideranca,
                    usuarios (
                        id,
                        nome_completo,
                        apelido,
                        foto_url
                    )
                `)
                .eq('equipe_id', equipeId)
                .eq('status', 'ativo');

            if (error) throw error;
            
            // Aplica o mesmo mapeamento de papel automático no fallback
            return (data || []).map(m => ({
                ...m,
                papel: m.usuario_id === equipeAtiva?.admin_id ? 'admin' : m.papel
            }));
        } catch (error) {
            console.error('Erro ao carregar membros:', error);
            return [];
        }
    }, [equipeAtiva?.admin_id]);

    const removerMembro = useCallback(async (membroId) => {
        try {
            // Soft-delete para preservar históricos de pagamentos/partidas
            const { error } = await supabase
                .from('membros_equipe')
                .update({ status: 'removido' })
                .eq('id', membroId);
            if (error) throw error;
            return { sucesso: true };
        } catch (error) {
            console.error('Erro ao remover membro (soft-delete):', error);
            return { sucesso: false, erro: error.message };
        }
    }, []);

    const atualizarMembro = useCallback(async (membroId, atualizacoes) => {
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
    }, []);

    // ── SISTEMA DE CONVITES ──────────────────────────────────────────

    const enviarConvite = async (jogadorId, equipeId, mensagem = '') => {
        if (!temPermissaoEquipe('gerenciar_membros')) {
            return { sucesso: false, erro: 'Você não tem privilégios para convidar atletas nesta equipe. Solicite ao capitão a permissão de "Gerenciar Membros".' };
        }

        try {
            // Usar RPC com SECURITY DEFINER para contornar bloqueios de RLS
            const { data: conviteId, error } = await supabase.rpc('enviar_convite_seguro', {
                p_equipe_id: equipeId,
                p_jogador_id: jogadorId,
                p_admin_id: usuario.id,
                p_mensagem: mensagem ? String(mensagem).trim() : null
            });

            if (error) throw error;

            return { sucesso: true, conviteId };
        } catch (error) {
            console.error('Erro ao enviar convite:', error);
            return { sucesso: false, erro: error.message };
        }
    };

    const cancelarConvite = async (conviteId) => {
        try {
            const { data: sucesso, error } = await supabase.rpc('excluir_convite_seguro', {
                p_convite_id: conviteId,
                p_usuario_id: usuario.id
            });
            
            if (error) throw error;
            if (!sucesso) throw new Error('Permissão negada ou convite já excluído.');
            
            return { sucesso: true };
        } catch (error) {
            console.error('Erro ao cancelar/excluir convite:', error);
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
                        admin:admin_id (nome_completo, apelido, foto_url)
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
            // Em vez de deletar/atualizar com Supabase puro (que sofre de "Sucesso Fantasma" do RLS), 
            // usamos RPC Atomic para forçar a baixa do encargo
            const { data: sucesso, error: errUpdate } = await supabase.rpc('sair_da_equipe_seguro', {
                p_equipe_id: equipeId,
                p_usuario_id: usuario.id
            });

            if (errUpdate) {
                console.error('[Sair] Erro RLS ao atualizar status:', errUpdate);
                throw errUpdate;
            }
            if (!sucesso) {
                throw new Error('Não foi possível sair (Você pode já ter saído ou o time não foi localizado).');
            }

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
            console.error('Erro ao processar saída (soft-delete):', error);
            return { sucesso: false, erro: error.message };
        }
    };

    const transferirTitularidade = async (equipeId, novoAdminMembroId) => {
        try {
            // 1. Buscar usuario_id do novo admin
            const { data: novoMembroDados, error: errBusca } = await supabase
                .from('membros_equipe')
                .select('usuario_id')
                .eq('id', novoAdminMembroId)
                .single();
            
            if (errBusca || !novoMembroDados?.usuario_id) {
                throw new Error('Não foi possível localizar o usuário para transferência.');
            }

            
            // Usar RPC para ignorar falsos bloqueios de RLS
            const { error: errEquipe } = await supabase.rpc('solicitar_transferencia_posse', {
                p_equipe_id: equipeId,
                p_novo_admin_id: novoMembroDados.usuario_id,
                p_usuario_id: usuario.id
            });
            
            if (errEquipe) {
                console.error("Erro RPC:", errEquipe);
                throw new Error(errEquipe.message || 'Falha ao processar solicitação no servidor.');
            }

            await carregarEquipes();
            return { sucesso: true };
        } catch (error) {
            console.error('Erro ao solicitar transferência:', error);
            return { sucesso: false, erro: error.message };
        }
    };

    const aceitarTransferenciaPosse = async (equipeId) => {
        try {
            if (!usuario) throw new Error('Usuário não autenticado');

            // Efetivar a troca inteira (equipe + membros) em uma transação segura via RPC
            const { error: errEquipe } = await supabase.rpc('aceitar_transferencia_posse', {
                p_equipe_id: equipeId,
                p_usuario_id: usuario.id
            });
            
            if (errEquipe) throw new Error(errEquipe.message);

            await carregarEquipes();
            return { sucesso: true };
        } catch (error) {
            console.error('Erro ao aceitar transferência:', error);
            return { sucesso: false, erro: error.message };
        }
    };

    const recusarTransferenciaPosse = async (equipeId) => {
        try {
            const { error } = await supabase.rpc('cancelar_transferencia_posse', {
                p_equipe_id: equipeId,
                p_usuario_id: usuario.id
            });
            
            if (error) throw new Error(error.message);
            await carregarEquipes();
            return { sucesso: true };
        } catch (error) {
            console.error('Erro ao recusar transferência:', error);
            return { sucesso: false, erro: error.message };
        }
    };

    const responderConvite = async (conviteId, aceito, mensagemResposta = '') => {
        try {
            // Usa a nova RPC atômica que garante a inclusão do membro no mesmo fôlego do aceite
            const { error: errRpc } = await supabase.rpc('responder_convite_seguro', {
                p_convite_id: conviteId,
                p_aceito: aceito,
                p_usuario_id: usuario.id,
                p_mensagem: mensagemResposta || null
            });
            
            if (errRpc) throw errRpc;
            
            // Se aceito, atualiza a árvore global de memória para a tela principal
            if (aceito) {
                await carregarEquipes();
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

    const carregarStatusMembro = async (equipeId, usuarioId) => {
        try {
            const { data, error } = await supabase
                .from('membros_equipe')
                .select('status, papel, permissoes')
                .eq('equipe_id', equipeId)
                .eq('usuario_id', usuarioId)
                .maybeSingle();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao carregar status do membro:', error);
            return null;
        }
    };

    // Conta quantas solicitações de posse pendentes o usuário atual recebeu (para exibir o badge no menu)
    const transferenciasPendentesGlobais = equipes.filter(e => e.admin_id_pendente === usuario?.id).length;

    const temPermissaoEquipe = useCallback((perm) => {
        if (!equipeAtiva) return false;
        if (ehSuperAdmin && equipeAtiva.gestao_global) return true;
        if (equipeAtiva.papel === 'admin') return true;
        if (equipeAtiva.papel === 'sub_admin' && equipeAtiva.permissoes?.includes(perm)) return true;
        return false;
    }, [equipeAtiva, ehSuperAdmin]);

    const getLabelVinculo = (vinculo, financeiroAtivo = equipeAtiva?.gestao_financeira) => {
        if (vinculo === 'mensalista') {
            return financeiroAtivo ? 'Mensalista' : 'Fixo';
        }
        return financeiroAtivo ? 'Avulso' : 'Convidado';
    };

    const getAcaoVinculo = (vinculo, financeiroAtivo = equipeAtiva?.gestao_financeira) => {
        if (vinculo === 'mensalista') {
            return financeiroAtivo ? 'Virar Avulso' : 'Virar Convidado';
        }
        return financeiroAtivo ? 'Virar Mensalista' : 'Virar Fixo';
    };

    const valor = useMemo(() => ({
        equipes,
        equipeAtiva,
        carregando,
        selecionarEquipe,
        temPermissaoEquipe,
        atualizarEquipes: carregarEquipes,
        criarEquipe,
        editarEquipe,
        excluirEquipe,
        atualizarRegrasEquipe,
        atualizarConfiguracoesEquipe,
        buscarEquipes,
        selecionarEquipeGlobal,
        solicitarIngresso,
        cancelarSolicitacaoIngresso,
        carregarSolicitacoes,
        responderSolicitacao,
        buscarJogadores,
        buscarAtletas: buscarJogadores,
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
        solicitacoesPendentesGlobais,
        transferenciasPendentesGlobais,
        minhasSolicitacoes,
        carregarStatusMembro,
        transferirTitularidade,
        aceitarTransferenciaPosse,
        recusarTransferenciaPosse,
        sairDaEquipe,
        podeCriarEquipe,
        totalCriadas,
        limiteEquipes: LIMITE_EQUIPES_AD_POR_CONTA,
        modalCriacaoAberto,
        setModalCriacaoAberto,
        getLabelVinculo,
        getAcaoVinculo
    }), [
        equipes, equipeAtiva, carregando, convitesPendentesGlobais, solicitacoesPendentesGlobais, 
        minhasSolicitacoes, podeCriarEquipe, totalCriadas, modalCriacaoAberto,
        selecionarEquipe, carregarEquipes, criarEquipe, editarEquipe, excluirEquipe, 
        atualizarRegrasEquipe, atualizarConfiguracoesEquipe, buscarEquipes, 
        selecionarEquipeGlobal, solicitarIngresso, cancelarSolicitacaoIngresso, 
        carregarSolicitacoes, responderSolicitacao, buscarJogadores, 
        carregarMembrosEquipe, atualizarMembro, atualizarPermissoesMembro, 
        removerMembro, enviarConvite, cancelarConvite, carregarConvitesRecebidos, 
        responderConvite, carregarConvitesEnviados, carregarStatusMembro, 
        transferirTitularidade, aceitarTransferenciaPosse, recusarTransferenciaPosse, 
        sairDaEquipe, getLabelVinculo, getAcaoVinculo
    ]);


    return (
        <EquipeContexto.Provider value={valor}>
            {children}
        </EquipeContexto.Provider>
    );
};
