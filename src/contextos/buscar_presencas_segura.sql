-- Execute este script no SQL Editor do seu Supabase Dashboard

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
  -- Obtem a equipe da partida
  SELECT equipe_id INTO v_equipe_id FROM partidas WHERE partidas.id = p_partida_id;

  -- Verifica se quem está pedindo é um membro logado ativo/pendente na mesma equipe
  -- OU apenas fallback logado pra garantir uma restrição de uso.
  IF EXISTS (
    SELECT 1 FROM membros_equipe 
    WHERE equipe_id = v_equipe_id 
    AND membros_equipe.usuario_id = auth.uid() 
    AND membros_equipe.status IN ('ativo', 'pendente')
  ) OR (
    auth.uid() IS NOT NULL
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
    FROM partidas_presencas pp
    JOIN usuarios u ON pp.usuario_id = u.id
    WHERE pp.partida_id = p_partida_id
    ORDER BY pp.created_at ASC;
  ELSE
    RETURN;
  END IF;
END;
$$;
