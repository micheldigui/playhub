-- ============================================================
-- PLAYHUB - FUNÇÃO: admin_listar_usuarios
-- Execute este script no Supabase SQL Editor para restaurar
-- a funcionalidade de busca de usuários no painel admin.
-- ============================================================

-- Remove versões antigas para evitar conflito de assinaturas
DROP FUNCTION IF EXISTS public.admin_listar_usuarios(TEXT, TEXT, INTEGER, INTEGER);

-- Cria a função com SECURITY DEFINER para bypassar RLS
-- e retornar TODOS os usuários (inclusive privados e menores de idade)
CREATE FUNCTION public.admin_listar_usuarios(
    p_busca  TEXT    DEFAULT NULL,
    p_letra  TEXT    DEFAULT NULL,
    p_de     INTEGER DEFAULT 0,
    p_ate    INTEGER DEFAULT 19
)
RETURNS TABLE (
    id                UUID,
    nome_completo     TEXT,
    apelido           TEXT,
    email             TEXT,
    foto_url          TEXT,
    telefone          TEXT,
    cidade            TEXT,
    estado            TEXT,
    data_nascimento   DATE,
    perfil_publico    BOOLEAN,
    eh_super_admin    BOOLEAN,
    admin_permissoes  JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Apenas Super Admins podem chamar esta função
    IF NOT EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE public.usuarios.id = auth.uid()
          AND public.usuarios.eh_super_admin = true
    ) THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem listar todos os usuários.';
    END IF;

    RETURN QUERY
    SELECT
        u.id,
        u.nome_completo,
        u.apelido,
        u.email,
        u.foto_url,
        u.telefone,
        u.cidade,
        u.estado,
        u.data_nascimento,
        u.perfil_publico,
        u.eh_super_admin,
        u.admin_permissoes
    FROM public.usuarios u
    WHERE
        -- Filtro de busca livre (nome, apelido ou e-mail)
        (
            p_busca IS NULL
            OR u.nome_completo ILIKE '%' || p_busca || '%'
            OR u.apelido       ILIKE '%' || p_busca || '%'
            OR u.email         ILIKE '%' || p_busca || '%'
        )
        -- Filtro por letra inicial do nome
        AND (
            p_letra IS NULL
            OR u.nome_completo ILIKE p_letra || '%'
        )
    ORDER BY u.nome_completo ASC
    LIMIT  (p_ate - p_de + 1)
    OFFSET p_de;
END;
$$;

-- Concede permissão de execução a usuários autenticados
-- (a função valida internamente se é admin)
GRANT EXECUTE ON FUNCTION public.admin_listar_usuarios(TEXT, TEXT, INTEGER, INTEGER) TO authenticated;

-- Força o PostgREST a recarregar o schema cache
NOTIFY pgrst, 'reload schema';
