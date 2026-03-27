-- 1. Adicionar a coluna payload (JSONB) à tabela interacoes, se não existir
ALTER TABLE public.interacoes ADD COLUMN IF NOT EXISTS payload JSONB;

-- 2. Atualizar a RPC para garantir que ela acesse o payload corretamente
CREATE OR REPLACE FUNCTION cancelar_solicitacao_ingresso(
  p_equipe_id UUID,
  p_usuario_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_admin_id UUID;
  v_linhas_removidas INT;
BEGIN
  -- Verificar se o usuário está pedindo para si mesmo
  IF auth.uid() IS NULL OR p_usuario_id != auth.uid() THEN
    RAISE EXCEPTION 'Apenas o próprio usuário pode cancelar sua solicitação.';
  END IF;

  SELECT admin_id INTO v_admin_id FROM public.equipes WHERE id = p_equipe_id;

  -- Remove a solicitação
  DELETE FROM public.membros_equipe 
  WHERE equipe_id = p_equipe_id AND usuario_id = p_usuario_id AND status = 'pendente';

  GET DIAGNOSTICS v_linhas_removidas = ROW_COUNT;
  IF v_linhas_removidas = 0 THEN
    RETURN FALSE; 
  END IF;

  -- Remove a notificação global do painel do Capitão
  IF v_admin_id IS NOT NULL THEN
    DELETE FROM public.interacoes
    WHERE remetente_id = p_usuario_id AND destinatario_id = v_admin_id AND tipo = 'solicitacao_ingresso' AND payload->>'equipe_id' = p_equipe_id::text;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
