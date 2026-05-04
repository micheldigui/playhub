import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../servicos/supabase';
import { usarAutenticacao } from './AutenticacaoContexto';

const NotificacoesContexto = createContext();

export const NotificacoesProvedor = ({ children }) => {
    const { usuario } = usarAutenticacao();
    const [notificacoes, setNotificacoes] = useState([]);
    const [contagemNaoLidas, setContagemNaoLidas] = useState(0);

    const [matches, setMatches] = useState(new Set()); // Para quem eu enviei a bola
    const [matchesConfirmados, setMatchesConfirmados] = useState(new Set()); // Match mútuo
    
    // Cache de memória RAM imutável e instantâneo para exclusões
    const ocultasSessaoRef = useRef(new Set());

    const carregarNotificacoes = useCallback(async () => {
        if (!usuario?.id) return;
        
        try {
            // 1. Buscar convites de equipe pendentes
            const promessaConvites = supabase
                .from('convites_equipe')
                .select(`
                    id, status, criado_em, mensagem_convite,
                    equipes (
                        id, nome, modalidade, logo_url, nivel, local_cidade, local_estado,
                        admin:admin_id (nome_completo, apelido, foto_url)
                    )
                `)
                .eq('jogador_id', usuario.id)
                .eq('status', 'pendente');

            // 1. Buscar notificações recebidas (Passar a bola)
            // Fazemos uma busca simples e depois buscamos os perfis para garantir dados mesmo sem foreign key formal
            const { data: interacoesPuras, error: erroInter } = await supabase
                .from('interacoes')
                .select('*')
                .eq('destinatario_id', usuario.id)
                .neq('tipo', 'bola_arquivada')
                .order('criado_em', { ascending: false });

            // 2. Buscar dados dos remetentes manualmente (Manual Join)
            let interacoesComPerfil = [];
            if (interacoesPuras && interacoesPuras.length > 0) {
                const idsRemetentes = [...new Set(interacoesPuras.map(i => i.remetente_id))];
                const { data: perfis } = await supabase
                    .from('usuarios')
                    .select('*')
                    .in('id', idsRemetentes);

                const mapaPerfis = (perfis || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
                interacoesComPerfil = interacoesPuras.map(i => ({
                    ...i,
                    remetente: mapaPerfis[i.remetente_id] || null
                }));
            }

            const resConvites = await promessaConvites;

            // 3. Buscar TODAS as interações para lógica de Matches (enviadas e recebidas)
            const { data: todasRelacoes } = await supabase
                .from('interacoes')
                .select('remetente_id, destinatario_id, tipo')
                .or(`remetente_id.eq."${usuario.id}",destinatario_id.eq."${usuario.id}"`);

            // Lógica de Processamento de Matches (Regra de Ouro)
            const normalizarId = (id) => String(id || '').toLowerCase().trim();
            const ehTipoBolaValido = (tipo) => {
                if (!tipo) return true;
                const t = String(tipo).toLowerCase().trim();
                return t === 'bola' || t === 'bola_arquivada' || t === 'interação' || t === 'interacao';
            };

            const enviadas = new Set();
            const recebidas = new Set();
            const meuIdNormal = normalizarId(usuario.id);

            (todasRelacoes || []).forEach(inter => {
                if (ehTipoBolaValido(inter.tipo)) {
                    const remId = normalizarId(inter.remetente_id);
                    const destId = normalizarId(inter.destinatario_id);

                    if (remId === meuIdNormal) enviadas.add(destId);
                    if (destId === meuIdNormal) recebidas.add(remId);
                }
            });

            setMatches(enviadas);
            const matchesMutuos = [...enviadas].filter(id => recebidas.has(id));
            setMatchesConfirmados(new Set(matchesMutuos));

            // Formatação final das notificações para o componente
            const notificacoesFormatadas = interacoesComPerfil.map(i => ({
                ...i,
                tipo: i.tipo || 'interacao'
            }));

            const convitesFormatados = (resConvites.data || []).map(c => ({
                ...c,
                tipo: 'convite_equipe'
            }));

            const todasNotificacoes = [...notificacoesFormatadas, ...convitesFormatados].sort((a, b) => 
                new Date(b.criado_em) - new Date(a.criado_em)
            );

            // Só conta como notificação lida/não-lida pra UI as que NÃO estão arquivadas explicitamente ou via localStorage
            const apagadasMemoriaArr = JSON.parse(localStorage.getItem(`playhub_arquivadas_${usuario.id}`) || '[]');
            const apagadasMemoria = new Set(apagadasMemoriaArr.map(String));
            const notificacoesVisiveis = todasNotificacoes.filter(n => 
                 n.tipo !== 'bola_arquivada' && 
                 n.tipo !== 'bola_ignorada' &&
                 !apagadasMemoria.has(String(n.id)) &&
                 !ocultasSessaoRef.current.has(String(n.id))
            );

            setNotificacoes(notificacoesVisiveis);
            setContagemNaoLidas(notificacoesVisiveis.length);
        } catch (error) {
            console.error('Erro ao carregar notificações:', error);
        }
    }, [usuario]);

    useEffect(() => {
        carregarNotificacoes();

        // Inscrição em tempo real para novas notificações e convites
        if (usuario?.id) {
            const canal = supabase
                .channel(`realtime_notificacoes_${usuario.id}`)
                .on('postgres_changes', { 
                    event: '*', 
                    schema: 'public', 
                    table: 'interacoes',
                    filter: `destinatario_id=eq.${usuario.id}`
                }, (payload) => {
                    carregarNotificacoes();
                })
                .on('postgres_changes', { 
                    event: '*', 
                    schema: 'public', 
                    table: 'interacoes',
                    filter: `remetente_id=eq.${usuario.id}`
                }, (payload) => {
                    carregarNotificacoes();
                })
                .on('postgres_changes', { 
                    event: '*', 
                    schema: 'public', 
                    table: 'convites_equipe',
                    filter: `jogador_id=eq.${usuario.id}`
                }, (payload) => {
                    carregarNotificacoes();
                })
                .subscribe();

            return () => {
                supabase.removeChannel(canal);
            };
        }
    }, [usuario, carregarNotificacoes]);

    useEffect(() => {
        if (!usuario?.id) return;

        const recarregarAoVoltar = () => {
            if (document.visibilityState === 'visible') {
                carregarNotificacoes();
            }
        };

        window.addEventListener('focus', carregarNotificacoes);
        document.addEventListener('visibilitychange', recarregarAoVoltar);

        return () => {
            window.removeEventListener('focus', carregarNotificacoes);
            document.removeEventListener('visibilitychange', recarregarAoVoltar);
        };
    }, [usuario?.id, carregarNotificacoes]);

    const limparNotificacoes = useCallback(async () => {
        if (!usuario || notificacoes.length === 0) return;
        
        // Cópia garantida de todos os IDs sendo formatada para String imediatamente
        const idsSendoLimpos = notificacoes.map(n => String(n.id));
        
        // Bloqueio de Sessão: Injeta no useRef para esconder instantaneamente pro React (Anti-Zumbi)
        idsSendoLimpos.forEach(id => ocultasSessaoRef.current.add(id));
        
        // Feedback instantâneo para UI (otimista)
        setNotificacoes([]);
        setContagemNaoLidas(0);
        
        // 1. Redundância e Fallback (LocalStorage) - Executado PRIMEIRO, à prova de falhas assíncronas do DB
        try {
            const backupArquivadas = JSON.parse(localStorage.getItem(`playhub_arquivadas_${usuario.id}`) || '[]');
            const backupSetStrings = new Set(backupArquivadas.map(String));
            idsSendoLimpos.forEach(id => backupSetStrings.add(id));
            localStorage.setItem(`playhub_arquivadas_${usuario.id}`, JSON.stringify(Array.from(backupSetStrings)));
        } catch (e) {
            console.error('Erro no parser do LocalStorage ao limpar:', e);
        }

        try {
            // 2. Identificar e atualizar notificações da tabela 'interacoes' no banco central
            const interacoesIds = notificacoes
                .filter(n => n.tipo === 'bola' || n.tipo === 'interacao' || n.tipo === 'solicitacao_ingresso')
                .map(n => n.id);

            if (interacoesIds.length > 0) {
                // By-pass com RPC pq o usuário destinatario não costuma ter privilégio de update na row gerada pelo remetente
                const { error: erroRpc } = await supabase.rpc('usuario_arquivar_interacoes', {
                    p_ids: interacoesIds
                });
                
                // Fallback para policy convencional se RPC ainda não estiver criada
                if (erroRpc) {
                    console.warn('Tentativa via policy convencional devido à falta de RPC:', erroRpc.message);
                    const { error } = await supabase
                        .from('interacoes')
                        .update({ tipo: 'bola_arquivada' })
                        .in('id', interacoesIds);
                    if (error) console.error('Falha dupla ao tentar arquivar notificação:', error);
                }
            }

            // 3. Recarrega para garantir sincronia do estado real
            await carregarNotificacoes();
        } catch (error) {
            console.error('Erro crítico ao limpar notificações no banco:', error);
            await carregarNotificacoes();
        }
    }, [usuario, carregarNotificacoes, notificacoes]);

    return (
        <NotificacoesContexto.Provider value={{ 
            notificacoes, 
            contagemNaoLidas, 
            carregarNotificacoes,
            limparNotificacoes,
            matches,
            matchesConfirmados
        }}>
            {children}
        </NotificacoesContexto.Provider>
    );
};

export const usarNotificacoes = () => {
    const contexto = useContext(NotificacoesContexto);
    if (!contexto) {
        throw new Error('usarNotificacoes deve ser usado dentro de um NotificacoesProvedor');
    }
    return contexto;
};
