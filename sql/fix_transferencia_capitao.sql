-- ============================================================
-- PLAYHUB - FIX: aceitar_transferencia_posse (Transferência de Capitão)
-- 
-- PROBLEMA: A RPC anterior atualizava equipes.admin_id mas NÃO garantia
-- que membros_equipe.papel do novo capitão fosse 'admin', nem que o
-- papel do antigo capitão fosse rebaixado — causando inconsistência
-- onde o novo capitão era reconhecido como admin no banco de equipes
-- mas ainda aparecia como sub_admin/jogador em membros_equipe, perdendo
-- todos os privilégios na interface.
--
-- SOLUÇÃO: Esta versão atualiza atomicamente as DUAS tabelas:
--   1. equipes → zera admin_id_pendente, define novo admin_id
--   2. membros_equipe → novo capitão recebe papel 'admin'
--   3. membros_equipe → antigo capitão recebe papel 'sub_admin'
-- ============================================================

-- Remove versão anterior
DROP FUNCTION IF EXISTS public.aceitar_transferencia_posse(UUID, UUID);

CREATE OR REPLACE FUNCTION public.aceitar_transferencia_posse(
    p_equipe_id  UUID,
    p_usuario_id UUID  -- ID do novo capitão (quem está aceitando)
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_atual UUID;
BEGIN
    -- 1. Verificar que o usuário realmente é o pendente de aceitar
    SELECT admin_id INTO v_admin_atual
    FROM public.equipes
    WHERE id = p_equipe_id
      AND admin_id_pendente = p_usuario_id;

    IF v_admin_atual IS NULL THEN
        RAISE EXCEPTION 'Transferência inválida: sem pendência para este usuário nesta equipe.';
    END IF;

    -- 2. Atualizar a equipe: novo admin_id, limpar pendente
    UPDATE public.equipes
    SET 
        admin_id         = p_usuario_id,
        admin_id_pendente = NULL
    WHERE id = p_equipe_id;

    -- 3. Novo capitão → papel 'admin' em membros_equipe
    UPDATE public.membros_equipe
    SET papel = 'admin'
    WHERE equipe_id  = p_equipe_id
      AND usuario_id = p_usuario_id;

    -- 4. Antigo capitão → rebaixar para 'sub_admin' (mantém na equipe)
    --    Só rebaixa se ainda estiver como 'admin' (segurança contra duplo rebaixamento)
    UPDATE public.membros_equipe
    SET papel = 'sub_admin'
    WHERE equipe_id  = p_equipe_id
      AND usuario_id = v_admin_atual
      AND papel      = 'admin';

END;
$$;

GRANT EXECUTE ON FUNCTION public.aceitar_transferencia_posse(UUID, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';


-- ============================================================
-- FIX RETROATIVO: Corrigir inconsistências existentes no banco
-- 
-- Executa um UPDATE para corrigir qualquer caso onde o admin_id
-- da equipe não bate com o papel 'admin' em membros_equipe.
-- SEGURO: apenas sobrescreve papel quando estiver errado.
-- ============================================================

UPDATE public.membros_equipe me
SET papel = 'admin'
FROM public.equipes eq
WHERE eq.id        = me.equipe_id
  AND eq.admin_id  = me.usuario_id
  AND me.papel    <> 'admin'
  AND me.status    = 'ativo';

-- Feedback da correção retroativa
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Fix retroativo: % registro(s) de membros_equipe corrigido(s) para papel=admin.', v_count;
END;
$$;
