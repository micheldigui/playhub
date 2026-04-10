-- ============================================================
-- PLAYHUB - EXCLUSÃO SEGURA DE USUÁRIO (V2)
-- 
-- Esta função realiza a exclusão definitiva de um usuário,
-- garantindo que Capitães de equipes não deixem times órfãos.
-- ============================================================

-- Remove versão anterior se existir
DROP FUNCTION IF EXISTS public.admin_excluir_usuario(UUID);
DROP FUNCTION IF EXISTS public.admin_excluir_usuario_v2(UUID);

CREATE OR REPLACE FUNCTION public.admin_excluir_usuario_v2(
    p_usuario_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Permite deletar registros protegidos e acessar auth.users
SET search_path = public, auth
AS $$
DECLARE
    v_equipes_lideradas TEXT;
    v_is_super_admin BOOLEAN;
BEGIN
    -- 1. Verificar permissão: Ou é o próprio usuário ou é um Super Admin
    SELECT eh_super_admin INTO v_is_super_admin FROM public.usuarios WHERE id = auth.uid();
    
    IF auth.uid() <> p_usuario_id AND (v_is_super_admin IS NULL OR v_is_super_admin = false) THEN
        RAISE EXCEPTION 'Acesso negado: Você não tem permissão para excluir esta conta.';
    END IF;

    -- 2. Verificar se o usuário é capitão de equipes ativas
    SELECT string_agg(nome, ', ') INTO v_equipes_lideradas
    FROM public.equipes
    WHERE admin_id = p_usuario_id;

    IF v_equipes_lideradas IS NOT NULL THEN
        RAISE EXCEPTION 'Não é possível excluir a conta. Este usuário é Capitão das equipes: %. Transfira a posse ou exclua as equipes primeiro.', v_equipes_lideradas;
    END IF;

    -- 3. Limpar dados em tabelas relacionadas (Segurança extra caso não haja CASCADE)
    DELETE FROM public.partidas_presencas WHERE usuario_id = p_usuario_id;
    DELETE FROM public.membros_equipe WHERE usuario_id = p_usuario_id;
    
    -- 4. Excluir perfil público
    DELETE FROM public.usuarios WHERE id = p_usuario_id;

    -- 5. Excluir usuário do Supabase Auth (Sistema de Login)
    -- Nota: Requer que a função tenha SECURITY DEFINER e acesso ao schema auth
    DELETE FROM auth.users WHERE id = p_usuario_id;

END;
$$;

-- Permite que usuários autenticados chamem a função (a lógica interna valida se é a própria conta)
GRANT EXECUTE ON FUNCTION public.admin_excluir_usuario_v2(UUID) TO authenticated;

-- Força o Supabase a recarregar o esquema
NOTIFY pgrst, 'reload schema';
