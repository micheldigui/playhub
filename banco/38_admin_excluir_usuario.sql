-- ============================================================
-- SCRIPT DE BANCO DE DADOS: EXCLUIR USUÁRIO COMO SUPER ADMIN
-- Este script cria uma função (RPC) para que Super Admins
-- possam remover completamente as contas de jogadores do sistema,
-- apagando do auth.users e cascateando para todas as tabelas.
-- ============================================================

CREATE OR REPLACE FUNCTION admin_excluir_usuario(p_usuario_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_eh_super_admin BOOLEAN;
BEGIN
  -- Verificar se quem pede é super admin (usando auth.uid())
  SELECT eh_super_admin INTO v_eh_super_admin FROM public.usuarios WHERE id = auth.uid();
  
  IF v_eh_super_admin = true THEN
    -- Deletar a conta raiz da infraestrutura de autenticação do Supabase.
    -- Como a tabela public.usuarios tem "REFERENCES auth.users ON DELETE CASCADE",
    -- e as tabelas filhas referenciam public.usuarios "ON DELETE CASCADE",
    -- esta única deleção irá limpar todo o rastro do usuário no sistema.
    DELETE FROM auth.users WHERE id = p_usuario_id;
    RETURN true;
  ELSE
    RAISE EXCEPTION 'Acesso Negado. Apenas super admins podem excluir contas de jogadores.';
  END IF;
END;
$$;
