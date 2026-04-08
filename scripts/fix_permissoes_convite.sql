-- SCRIPT PARA ATUALIZAR AS PERMISSÕES DE CONVITE (VICE-CAPITÃO)
-- Execute este script no SQL Editor do seu painel Supabase.

CREATE OR REPLACE FUNCTION public.enviar_convite_seguro(
    p_equipe_id uuid,
    p_jogador_id uuid,
    p_admin_id uuid,
    p_mensagem text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_convite_id uuid;
    v_tem_permissao boolean;
BEGIN
    -- 1. Verifica se quem está enviando tem permissão (Capitão ou Vice com permissão de membros)
    SELECT EXISTS (
        SELECT 1 
        FROM public.membros_equipe 
        WHERE equipe_id = p_equipe_id 
          AND usuario_id = p_admin_id 
          AND status = 'ativo'
          AND (
            papel = 'admin' 
            OR (papel = 'sub_admin' AND permissoes @> ARRAY['gerenciar_membros']::text[])
          )
    ) INTO v_tem_permissao;

    -- Se não for membro com permissão, verifica se é o Admin direto da equipe (redundância de segurança)
    IF NOT v_tem_permissao THEN
        SELECT (admin_id = p_admin_id) INTO v_tem_permissao
        FROM public.equipes
        WHERE id = p_equipe_id;
    END IF;

    IF NOT v_tem_permissao THEN
        RAISE EXCEPTION 'Privilégios insuficientes para convidar atletas nesta equipe.';
    END IF;

    -- 2. Verifica se o jogador já é membro ou já tem convite pendente
    IF EXISTS (
        SELECT 1 FROM public.membros_equipe 
        WHERE equipe_id = p_equipe_id AND usuario_id = p_jogador_id AND status IN ('ativo', 'pendente')
    ) THEN
        RAISE EXCEPTION 'Este atleta já faz parte do time ou possui uma solicitação pendente.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.convites_equipe 
        WHERE equipe_id = p_equipe_id AND jogador_id = p_jogador_id AND status = 'pendente'
    ) THEN
        RAISE EXCEPTION 'Já existe um convite pendente para este atleta.';
    END IF;

    -- 3. Insere o convite
    INSERT INTO public.convites_equipe (
        equipe_id,
        jogador_id,
        mensagem_convite,
        status,
        criado_por
    ) VALUES (
        p_equipe_id,
        p_jogador_id,
        p_mensagem,
        'pendente',
        p_admin_id
    )
    RETURNING id INTO v_convite_id;

    -- 4. Cria a notificação na tabela de interacoes
    INSERT INTO public.interacoes (
        remetente_id,
        destinatario_id,
        tipo,
        payload
    ) VALUES (
        p_admin_id,
        p_jogador_id,
        'convite_equipe',
        jsonb_build_object(
            'equipe_id', p_equipe_id,
            'convite_id', v_convite_id,
            'mensagem', COALESCE(p_mensagem, 'Convidou você para entrar na equipe.')
        )
    );

    RETURN v_convite_id;
END;
$function$;
