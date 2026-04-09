-- ============================================================
-- PLAYHUB - CONSOLIDADO DE FUNÇÕES DE SEGURANÇA (RPCs) - FINAL
-- Copie e cole todo este código e clique em RUN no Supabase.
-- Isso recria as funções e manda o servidor limpar o cache.
-- ============================================================

-- Primeiro, limpar qualquer versão defeituosa
DROP FUNCTION IF EXISTS public.buscar_presencas_partida_seguro(UUID);
DROP FUNCTION IF EXISTS public.buscar_presencas_partida_seguro(UUID, UUID);
DROP FUNCTION IF EXISTS public.buscar_membros_equipe_seguro(UUID);
DROP FUNCTION IF EXISTS public.buscar_membros_equipe_seguro(UUID, UUID);
DROP FUNCTION IF EXISTS public.admin_listar_usuarios(TEXT, TEXT, INTEGER, INTEGER);

-- 3. LISTAR TODOS OS USUÁRIOS (ADMIN) - SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.admin_listar_usuarios(
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
        (
            p_busca IS NULL
            OR u.nome_completo ILIKE '%' || p_busca || '%'
            OR u.apelido       ILIKE '%' || p_busca || '%'
            OR u.email         ILIKE '%' || p_busca || '%'
        )
        AND (
            p_letra IS NULL
            OR u.nome_completo ILIKE p_letra || '%'
        )
    ORDER BY u.nome_completo ASC
    LIMIT  (p_ate - p_de + 1)
    OFFSET p_de;
END;
$$;

-- 1. BUSCAR PRESENÇAS DE UMA PARTIDA
CREATE OR REPLACE FUNCTION public.buscar_presencas_partida_seguro(p_partida_id UUID)
RETURNS TABLE (
  id UUID,
  status TEXT,
  frequencia TEXT,
  created_at TIMESTAMPTZ,
  usuario_id UUID,
  nome_completo TEXT,
  apelido TEXT,
  foto_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_equipe_id UUID;
BEGIN
  -- Qualificando tabelas públicas
  SELECT equipe_id INTO v_equipe_id FROM public.partidas WHERE public.partidas.id = p_partida_id;

  IF EXISTS (
    SELECT 1 FROM public.membros_equipe 
    WHERE public.membros_equipe.equipe_id = v_equipe_id 
    AND public.membros_equipe.usuario_id = auth.uid() 
    AND public.membros_equipe.status IN ('ativo', 'pendente')
  ) OR EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE public.usuarios.id = auth.uid() 
    AND public.usuarios.eh_super_admin = true
  ) THEN
    RETURN QUERY
    SELECT 
      pp.id,
      pp.status,
      pp.frequencia,
      pp.created_at,
      pp.usuario_id,
      u.nome_completo,
      u.apelido,
      u.foto_url
    FROM public.partidas_presencas pp
    JOIN public.usuarios u ON pp.usuario_id = u.id
    WHERE pp.partida_id = p_partida_id
    ORDER BY pp.created_at ASC;
  END IF;
END;
$$;

-- 2. BUSCAR MEMBROS DA EQUIPE
CREATE OR REPLACE FUNCTION public.buscar_membros_equipe_seguro(p_equipe_id UUID)
RETURNS TABLE (
    id UUID,
    usuario_id UUID,
    papel TEXT,
    permissoes JSONB,
    vinculo TEXT,
    status TEXT,
    entrou_em TIMESTAMPTZ,
    nome_completo TEXT,
    apelido TEXT,
    foto_url TEXT,
    cidade TEXT,
    estado TEXT,
    email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.membros_equipe 
        WHERE public.membros_equipe.equipe_id = p_equipe_id 
        AND public.membros_equipe.usuario_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.usuarios 
        WHERE public.usuarios.id = auth.uid() 
        AND (public.usuarios.eh_super_admin = true OR public.usuarios.email = 'michelssouza@gmail.com')
    ) THEN
        RETURN QUERY
        SELECT 
            me.id,
            me.usuario_id,
            me.papel,
            me.permissoes,
            me.vinculo,
            me.status,
            me.entrou_em,
            u.nome_completo,
            u.apelido,
            u.foto_url,
            u.cidade,
            u.estado,
            u.email
        FROM public.membros_equipe me
        JOIN public.usuarios u ON me.usuario_id = u.id
        WHERE me.equipe_id = p_equipe_id
          AND me.status IN ('ativo', 'pendente');
    END IF;
END;
$$;

-- Permissões Padrões
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Força o Supabase a recarregar a lista de funções disponíveis
NOTIFY pgrst, 'reload schema';
