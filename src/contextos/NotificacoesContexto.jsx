import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../servicos/supabase';
import { usarAutenticacao } from './AutenticacaoContexto';

const NotificacoesContexto = createContext();

export const NotificacoesProvedor = ({ children }) => {
    const { usuario } = usarAutenticacao();
    const [notificacoes, setNotificacoes] = useState([]);
    const [contagemNaoLidas, setContagemNaoLidas] = useState(0);

    const [matches, setMatches] = useState(new Set()); // Para quem eu enviei a bola
    const [matchesConfirmados, setMatchesConfirmados] = useState(new Set()); // Match mútuo

    const carregarNotificacoes = useCallback(async () => {
        if (!usuario) return;
        
        try {
            // 1. Buscar notificações recebidas (Passar a bola)
            const promessaInteracoes = supabase
                .from('interacoes')
                .select(`
                    *,
                    remetente:usuarios!remetente_id (
                        id,
                        nome_completo,
                        apelido,
                        foto_url,
                        telefone,
                        data_nascimento,
                        compartilhar_whatsapp_match
                    )
                `)
                .eq('destinatario_id', usuario.id)
                .order('criado_em', { ascending: false });

            // 1.1 Buscar convites de equipe pendentes
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

            // 2. Buscar interações enviadas (para checar matches)
            const promessaEnviadas = supabase
                .from('interacoes')
                .select('destinatario_id')
                .eq('remetente_id', usuario.id);

            const [resInteracoes, resConvites, resEnviadas] = await Promise.all([
                promessaInteracoes, 
                promessaConvites, 
                promessaEnviadas
            ]);

            if (resInteracoes.error) throw resInteracoes.error;
            if (resConvites.error) throw resConvites.error;
            if (resEnviadas.error) throw resEnviadas.error;

            const interacoesFormatadas = (resInteracoes.data || []).map(i => ({ 
                ...i, 
                // Se o tipo já veio do banco (ex: solicitacao_ingresso), mantém. 
                // Se for nulo ou o padrão antigo, podemos rotular como 'interacao'.
                tipo: i.tipo || 'interacao' 
            }));
            const convitesFormatados = (resConvites.data || []).map(c => ({ ...c, tipo: 'convite_equipe' }));

            const todasNotificacoes = [...interacoesFormatadas, ...convitesFormatados].sort((a, b) => 
                new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
            );

            const idsEnviados = new Set((resEnviadas.data || []).map(e => e.destinatario_id));
            setMatches(idsEnviados);
            
            // Um "Match Confirmado" é quando EU enviei e eles me enviaram (mesmo que a notificação deles esteja arquivada)
            const idsRecebidos = new Set(
                (resInteracoes.data || [])
                .filter(i => i.tipo === 'bola' || i.tipo === 'bola_arquivada')
                .map(i => i.remetente_id)
            );
            const matchesMutuos = [...idsEnviados].filter(id => idsRecebidos.has(id));
            setMatchesConfirmados(new Set(matchesMutuos));
            
            // Só conta como notificação lida/não-lida pra UI as que NÃO estão arquivadas explicitamente ou via localStorage
            const apagadasMemoria = new Set(JSON.parse(localStorage.getItem(`playhub_arquivadas_${usuario.id}`) || '[]'));
            const notificacoesVisiveis = todasNotificacoes.filter(n => n.tipo !== 'bola_arquivada' && !apagadasMemoria.has(n.id));

            setNotificacoes(notificacoesVisiveis);
            setContagemNaoLidas(notificacoesVisiveis.length);
        } catch (error) {
            console.error('Erro ao carregar notificações:', error);
        }
    }, [usuario]);

    useEffect(() => {
        carregarNotificacoes();

        // Inscrição em tempo real para novas notificações e convites
        if (usuario) {
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

    const limparNotificacoes = useCallback(async () => {
        if (!usuario) return;
        try {
            // Utilizamos LocalStorage para ocultar as interacoes do usuário localmente.
            // Isso evita erro de Row-Level Security do Supabase ao tentar dar UPDATE, além de não DELETAR o registro, 
            // preservando firmemente os "Matches" e histórico para a lógica de contato.
            const apagadasAtuais = JSON.parse(localStorage.getItem(`playhub_arquivadas_${usuario.id}`) || '[]');
            
            // Pega os IDs de todas as interações de passadas de bola atuais e manda pro "limbo" visual
            const idsParaEsconder = notificacoes.filter(n => n.tipo === 'bola' || n.tipo === 'interacao').map(n => n.id);
            
            localStorage.setItem(`playhub_arquivadas_${usuario.id}`, JSON.stringify([...apagadasAtuais, ...idsParaEsconder]));
            
            carregarNotificacoes();
        } catch (error) {
            console.error('Erro ao limpar notificações:', error);
            alert('Erro ao limpar notificações.');
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
