import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../servicos/supabase';
import { usarAutenticacao } from './AutenticacaoContexto';

const NotificacoesContexto = createContext();

export const NotificacoesProvedor = ({ children }) => {
    const { usuario } = usarAutenticacao();
    const [notificacoes, setNotificacoes] = useState([]);
    const [contagemNaoLidas, setContagemNaoLidas] = useState(0);

    const [matches, setMatches] = useState(new Set());

    const carregarNotificacoes = useCallback(async () => {
        if (!usuario) return;
        
        try {
            // 1. Buscar notificações recebidas
            const { data: recebidas, error: errorRecebidas } = await supabase
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

            if (errorRecebidas) throw errorRecebidas;

            // 2. Buscar interações enviadas (para checar matches)
            const { data: enviadas, error: errorEnviadas } = await supabase
                .from('interacoes')
                .select('destinatario_id')
                .eq('remetente_id', usuario.id);

            if (errorEnviadas) throw errorEnviadas;

            const idsEnviados = new Set(enviadas.map(e => e.destinatario_id));
            setMatches(idsEnviados);
            setNotificacoes(recebidas || []);
            setContagemNaoLidas((recebidas || []).length);
        } catch (error) {
            console.error('Erro ao carregar notificações:', error);
        }
    }, [usuario]);

    useEffect(() => {
        carregarNotificacoes();

        // Inscrição em tempo real para novas notificações
        if (usuario) {
            const canal = supabase
                .channel(`public:interacoes:${usuario.id}`)
                .on('postgres_changes', { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'interacoes'
                }, (payload) => {
                    // Verificação robusta do destinatário
                    if (payload.new && payload.new.destinatario_id === usuario.id) {
                        carregarNotificacoes();
                    }
                })
                .subscribe((status) => {
                    // status da conexão
                });

            return () => {
                supabase.removeChannel(canal);
            };
        }
    }, [usuario, carregarNotificacoes]);

    const limparNotificacoes = useCallback(async () => {
        if (!usuario) return;
        try {
            const { error } = await supabase
                .from('interacoes')
                .delete()
                .eq('destinatario_id', usuario.id);
            
            if (error) throw error;
            setNotificacoes([]);
            setContagemNaoLidas(0);
        } catch (error) {
            console.error('Erro ao limpar notificações:', error);
            alert('Erro ao limpar notificações.');
        }
    }, [usuario]);

    return (
        <NotificacoesContexto.Provider value={{ 
            notificacoes, 
            contagemNaoLidas, 
            carregarNotificacoes,
            limparNotificacoes,
            matches
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
