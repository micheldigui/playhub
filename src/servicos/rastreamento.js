import { supabase } from './supabase';

/**
 * PLAYHUB ANALYTICS & LOGS (v1)
 * 
 * Serviço centralizado para rastreamento de eventos, navegação e erros.
 * Projetado para ser não-bloqueante (fire and forget).
 */

const LOG_ATIVO = true; // Chave mestre para desligar logs se necessário

/**
 * Captura metadados globais úteis para análise de tráfego, especialmente anônimo.
 */
const obterMetadadosGlobais = () => {
    try {
        return {
            origem: document.referrer || 'Direto / Desconhecido',
            idioma: navigator.language,
            plataforma: navigator.platform,
            resolucao: `${window.screen.width}x${window.screen.height}`,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
        };
    } catch (e) {
        return { timestamp: new Date().toISOString() };
    }
};

export const rastrear = {
    /**
     * Registra uma navegação de página
     */
    pagina: async (nomePagina, metadata = {}) => {
        if (!LOG_ATIVO) return;
        
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const usuarioId = session?.user?.id || null;

            // Envio silencioso (não usamos await na chamada final para não travar a UI)
            supabase.from('logs_sistema').insert([{
                usuario_id: usuarioId,
                tipo: 'NAVEGACAO',
                mensagem: `Visitou: ${nomePagina}`,
                pagina: window.location.pathname,
                metadata: {
                    ...obterMetadadosGlobais(),
                    ...metadata
                }
            }]).then(({ error }) => {
                if (error) console.debug('Log falhou (silencioso):', error.message);
            });
        } catch (e) {
            // Falha silenciosa absoluta
        }
    },

    /**
     * Registra um clique ou ação do usuário
     */
    clique: async (idElemento, descricao, metadata = {}) => {
        if (!LOG_ATIVO) return;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const usuarioId = session?.user?.id || null;

            supabase.from('logs_sistema').insert([{
                usuario_id: usuarioId,
                tipo: 'CLIQUE',
                mensagem: descricao || `Clicou em: ${idElemento}`,
                pagina: window.location.pathname,
                metadata: {
                    ...obterMetadadosGlobais(),
                    elemento_id: idElemento,
                    ...metadata
                }
            }]).then(({ error }) => {
                if (error) console.debug('Log falhou (silencioso):', error.message);
            });
        } catch (e) {
            // Falha silenciosa absoluta
        }
    },

    /**
     * Registra um erro do sistema ou de API
     */
    erro: async (mensagem, contexto = '', erroObjeto = null) => {
        if (!LOG_ATIVO) return;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const usuarioId = session?.user?.id || null;

            console.error(`[PlayHub Log] Erro capturado em ${contexto}:`, mensagem);

            supabase.from('logs_sistema').insert([{
                usuario_id: usuarioId,
                tipo: 'ERRO',
                mensagem: mensagem,
                pagina: window.location.pathname,
                metadata: {
                    ...obterMetadadosGlobais(),
                    contexto,
                    detalhes: erroObjeto?.message || 'N/A',
                    stack: erroObjeto?.stack || 'N/A'
                }
            }]).then(({ error }) => {
                if (error) console.debug('Log falhou (silencioso):', error.message);
            });
        } catch (e) {
            // Falha silenciosa absoluta
        }
    }
};
