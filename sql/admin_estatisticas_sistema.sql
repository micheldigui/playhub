-- ============================================================
-- PLAYHUB - ESTATÍSTICAS GLOBAIS & TRACKING DE ACESSOS (V4 - FIX LOCALIZAÇÃO)
-- 
-- Normalização agressiva de cidades para evitar duplicidade 
-- (Itaquaquecetuba, SP vs Itaquaquecetuba)
-- ============================================================

ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS ultimo_acesso TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_acessos INTEGER DEFAULT 0;

CREATE OR REPLACE FUNCTION public.registrar_acesso()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.usuarios
    SET ultimo_acesso = now(),
        total_acessos = total_acessos + 1
    WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_acesso() TO authenticated;

-- FUNÇÃO DE NORMALIZAÇÃO DE CIDADE (AUXILIAR INTERNA)
-- Remove estado, espaços extras e normaliza para título
CREATE OR REPLACE FUNCTION public.normalizar_nome_cidade(p_cidade TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_cidade TEXT;
BEGIN
    IF p_cidade IS NULL THEN RETURN NULL; END IF;
    
    -- Pega apenas o que vem antes da vírgula (se houver)
    v_cidade = split_part(p_cidade, ',', 1);
    -- Remove hífens de estado (ex: Curitiba-PR)
    v_cidade = split_part(v_cidade, '-', 1);
    -- Limpa espaços
    v_cidade = trim(v_cidade);
    -- Normaliza para Primeira Letra Maiúscula
    RETURN initcap(v_cidade);
END;
$$;

-- DASHBOARD DE ESTATÍSTICAS REFINADO
DROP FUNCTION IF EXISTS public.admin_obter_estatisticas_sistema();

CREATE OR REPLACE FUNCTION public.admin_obter_estatisticas_sistema()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_resultado JSONB;
    v_total_usuarios INTEGER;
    v_total_equipes INTEGER;
    v_total_partidas INTEGER;
BEGIN
    -- Verificar permissão de Super Admin
    IF NOT EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE id = auth.uid() AND (eh_super_admin = true OR email = 'michelssouza@gmail.com')
    ) THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem ver estatísticas globais.';
    END IF;

    -- Contagens Básicas
    SELECT count(*) INTO v_total_usuarios FROM public.usuarios;
    SELECT count(*) INTO v_total_equipes FROM public.equipes;
    SELECT count(*) INTO v_total_partidas FROM public.partidas;

    -- Construir JSON de resposta
    v_resultado = jsonb_build_object(
        'geral', jsonb_build_object(
            'total_usuarios', v_total_usuarios,
            'total_equipes', v_total_equipes,
            'total_partidas', v_total_partidas
        ),
        
        'vinculo_atletas', jsonb_build_object(
            'sem_equipe', (
                SELECT count(*) FROM public.usuarios u 
                WHERE NOT EXISTS (SELECT 1 FROM public.membros_equipe me WHERE me.usuario_id = u.id AND me.status = 'ativo')
            ),
            'uma_equipe', (
                SELECT count(*) FROM (
                    SELECT usuario_id FROM public.membros_equipe 
                    WHERE status = 'ativo'
                    GROUP BY usuario_id HAVING count(*) = 1
                ) sub
            ),
            'multi_equipe', (
                SELECT count(*) FROM (
                    SELECT usuario_id FROM public.membros_equipe 
                    WHERE status = 'ativo'
                    GROUP BY usuario_id HAVING count(*) > 1
                ) sub
            )
        ),

        'usuarios_demografia', jsonb_build_object(
            'genero', (
                SELECT jsonb_object_agg(coalesce(genero, 'Não Informado'), total)
                FROM (
                    SELECT genero, count(*) as total 
                    FROM public.usuarios 
                    GROUP BY genero
                ) s
            ),
            'faixa_etaria', (
                SELECT jsonb_build_object(
                    'maiores', count(*) FILTER (WHERE age(data_nascimento) >= interval '18 years'),
                    'menores', count(*) FILTER (WHERE age(data_nascimento) < interval '18 years'),
                    'nao_informado', count(*) FILTER (WHERE data_nascimento IS NULL)
                )
                FROM public.usuarios
            ),
            'cidades', (
                SELECT jsonb_agg(d)
                FROM (
                    SELECT public.normalizar_nome_cidade(cidade) as cidade, upper(trim(estado)) as estado, count(*) as total
                    FROM public.usuarios
                    WHERE cidade IS NOT NULL
                    GROUP BY public.normalizar_nome_cidade(cidade), upper(trim(estado))
                    ORDER BY total DESC
                    LIMIT 10
                ) d
            )
        ),

        'equipes_estatisticas', jsonb_build_object(
            'modalidades', (
                SELECT jsonb_agg(m)
                FROM (
                    SELECT modalidade, count(*) as total
                    FROM public.equipes
                    GROUP BY modalidade
                    ORDER BY total DESC
                    LIMIT 10
                ) m
            ),
            'cidades', (
                SELECT jsonb_agg(c)
                FROM (
                    SELECT public.normalizar_nome_cidade(cidade) as cidade, upper(trim(estado)) as estado, count(*) as total
                    FROM public.equipes
                    WHERE cidade IS NOT NULL
                    GROUP BY public.normalizar_nome_cidade(cidade), upper(trim(estado))
                    ORDER BY total DESC
                    LIMIT 10
                ) c
            )
        ),

        'esportes_interesses', (
            SELECT jsonb_agg(i)
            FROM (
                SELECT esporte, count(*) as total
                FROM (
                    SELECT unnest(esportes_interesse) as esporte
                    FROM public.usuarios
                    WHERE esportes_interesse IS NOT NULL
                ) sub
                GROUP BY esporte
                ORDER BY total DESC
                LIMIT 15
            ) i
        ),

        'logs_acesso', (
            SELECT jsonb_agg(l)
            FROM (
                SELECT 
                    coalesce(apelido, split_part(nome_completo, ' ', 1)) as nome,
                    total_acessos,
                    ultimo_acesso
                FROM public.usuarios
                WHERE total_acessos > 0
                ORDER BY ultimo_acesso DESC
                LIMIT 30
            ) l
        )
    );

    RETURN v_resultado;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_obter_estatisticas_sistema() TO authenticated;

NOTIFY pgrst, 'reload schema';
