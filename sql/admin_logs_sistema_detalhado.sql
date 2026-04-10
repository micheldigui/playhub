-- ============================================================
-- PLAYHUB - CENTRAL DE MONITORAMENTO GLOBAL (RPC AVANÇADA)
-- 
-- Função para busca paginada e filtrada de logs de sistema.
-- ============================================================

-- Remover função antiga para permitir mudança na assinatura (id -> log_id)
DROP FUNCTION IF EXISTS public.admin_listar_logs_sistema(TEXT, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.admin_listar_logs_sistema(
    p_tipo TEXT DEFAULT NULL,
    p_busca TEXT DEFAULT NULL,
    p_limite INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    log_id UUID,
    criado_em TIMESTAMPTZ,
    tipo TEXT,
    mensagem TEXT,
    pagina TEXT,
    metadata JSONB,
    usuario_nome TEXT,
    usuario_email TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verificar permissão de Super Admin
    IF NOT EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE id = auth.uid() AND (eh_super_admin = true OR email = 'michelssouza@gmail.com')
    ) THEN
        RAISE EXCEPTION 'Acesso negado.';
    END IF;

    RETURN QUERY
    SELECT 
        s.id as log_id,
        s.criado_em,
        s.tipo,
        s.mensagem,
        s.pagina,
        s.metadata,
        u.nome_completo as usuario_nome,
        u.email as usuario_email
    FROM public.logs_sistema s
    LEFT JOIN public.usuarios u ON u.id = s.usuario_id
    WHERE 
        (p_tipo IS NULL OR s.tipo = p_tipo)
        AND (
            p_busca IS NULL 
            OR s.mensagem ILIKE '%' || p_busca || '%'
            OR u.nome_completo ILIKE '%' || p_busca || '%'
            OR u.email ILIKE '%' || p_busca || '%'
            OR s.pagina ILIKE '%' || p_busca || '%'
        )
    ORDER BY s.criado_em DESC
    LIMIT p_limite
    OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_listar_logs_sistema(TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
