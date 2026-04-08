-- Função para buscar membros da equipe com nomes, ignorando perfil_publico
-- restrito a usuários que também sejam membros da mesma equipe.
CREATE OR REPLACE FUNCTION buscar_membros_equipe_seguro(p_equipe_id UUID)
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
    foto_url TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER -- Ignora RLS
SET search_path = public
AS $$
BEGIN
    -- Validação: O usuário que chama deve ser membro da equipe (ou ser super admin)
    -- Para simplificar, validamos apenas se o auth.uid() está na membros_equipe da p_equipe_id
    IF NOT EXISTS (
        SELECT 1 FROM membros_equipe 
        WHERE equipe_id = p_equipe_id AND usuario_id = auth.uid() AND status = 'ativo'
    ) AND NOT EXISTS (
        SELECT 1 FROM usuarios WHERE id = auth.uid() AND eh_super_admin = true
    ) THEN
        RAISE EXCEPTION 'Acesso negado: Você não possui vínculo ativo com esta equipe.';
    END IF;

    RETURN QUERY
    SELECT 
        m.id,
        m.usuario_id,
        m.papel,
        m.permissoes,
        m.vinculo,
        m.status,
        m.entrou_em,
        u.nome_completo,
        u.apelido,
        u.foto_url
    FROM membros_equipe m
    JOIN usuarios u ON u.id = m.usuario_id
    WHERE m.equipe_id = p_equipe_id
    AND m.status = 'ativo'
    ORDER BY m.entrou_em ASC;
END;
$$;

-- Conceder permissão de execução
GRANT EXECUTE ON FUNCTION buscar_membros_equipe_seguro(UUID) TO authenticated;
