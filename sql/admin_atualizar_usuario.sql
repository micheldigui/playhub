-- ============================================================
-- PLAYHUB - FUNÇÃO: admin_atualizar_usuario
-- Execute este script COMPLETO no Supabase SQL Editor.
-- Ele remove versões antigas e recria a função corretamente.
-- ============================================================

-- Passo 1: Remover TODAS as versões antigas da função
-- (cobre assinaturas com ou sem JSONB e com ou sem 'public.')
DROP FUNCTION IF EXISTS public.admin_atualizar_usuario(UUID, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS public.admin_atualizar_usuario(UUID, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS public.admin_atualizar_usuario(UUID, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, JSONB);

-- Aliases sem schema (por segurança)
DROP FUNCTION IF EXISTS admin_atualizar_usuario(UUID, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS admin_atualizar_usuario(UUID, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS admin_atualizar_usuario(UUID, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, JSONB);

-- ============================================================
-- Passo 2: Garantir coluna admin_permissoes (se não existir)
-- ============================================================

ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS admin_permissoes JSONB DEFAULT '{"usuarios": false, "equipes": false}'::jsonb;

-- ============================================================
-- Passo 3: Criar a função com a assinatura correta e completa
-- Usa CREATE OR REPLACE para evitar conflito se já existir.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_atualizar_usuario(
    p_usuario_id                UUID,
    p_nome_completo             TEXT    DEFAULT NULL,
    p_apelido                   TEXT    DEFAULT NULL,
    p_telefone                  TEXT    DEFAULT NULL,
    p_data_nascimento           DATE    DEFAULT NULL,
    p_genero                    TEXT    DEFAULT NULL,
    p_cep                       TEXT    DEFAULT NULL,
    p_rua                       TEXT    DEFAULT NULL,
    p_numero                    TEXT    DEFAULT NULL,
    p_complemento               TEXT    DEFAULT NULL,
    p_bairro                    TEXT    DEFAULT NULL,
    p_cidade                    TEXT    DEFAULT NULL,
    p_estado                    TEXT    DEFAULT NULL,
    p_perfil_publico            BOOLEAN DEFAULT NULL,
    p_compartilhar_whatsapp_match BOOLEAN DEFAULT NULL,
    p_eh_super_admin            BOOLEAN DEFAULT NULL,
    p_admin_permissoes          JSONB   DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Apenas o Super Admin Root pode executar esta operação
    IF NOT EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE id = auth.uid()
          AND eh_super_admin = true
    ) THEN
        RAISE EXCEPTION 'Acesso negado: apenas o Super Admin pode executar esta operação.';
    END IF;

    UPDATE public.usuarios SET
        nome_completo               = COALESCE(p_nome_completo, nome_completo),
        apelido                     = COALESCE(p_apelido, apelido),
        telefone                    = COALESCE(p_telefone, telefone),
        data_nascimento             = p_data_nascimento,
        genero                      = COALESCE(p_genero, genero),
        cep                         = COALESCE(p_cep, cep),
        rua                         = COALESCE(p_rua, rua),
        numero                      = COALESCE(p_numero, numero),
        complemento                 = COALESCE(p_complemento, complemento),
        bairro                      = COALESCE(p_bairro, bairro),
        cidade                      = COALESCE(p_cidade, cidade),
        estado                      = COALESCE(p_estado, estado),
        perfil_publico              = COALESCE(p_perfil_publico, perfil_publico),
        compartilhar_whatsapp_match = COALESCE(p_compartilhar_whatsapp_match, compartilhar_whatsapp_match),
        eh_super_admin              = COALESCE(p_eh_super_admin, eh_super_admin),
        admin_permissoes            = COALESCE(p_admin_permissoes, admin_permissoes)
    WHERE id = p_usuario_id;
END;
$$;

-- ============================================================
-- Passo 4: Conceder permissões e recarregar schema cache
-- ============================================================

GRANT EXECUTE ON FUNCTION public.admin_atualizar_usuario(
    UUID, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT,
    TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, JSONB
) TO authenticated;

-- Força o PostgREST a recarregar o schema cache (OBRIGATÓRIO)
NOTIFY pgrst, 'reload schema';
