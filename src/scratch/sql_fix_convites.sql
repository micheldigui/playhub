-- RPC para excluir convite com permissão de ADMIN/SUB_ADMIN
-- Esta função garante que quem enviou o convite ou quem é gestor da equipe possa cancelá-lo.

CREATE OR REPLACE FUNCTION excluir_convite_seguro_v2(p_convite_id UUID, p_usuario_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_equipe_id UUID;
    v_autorizado BOOLEAN := FALSE;
BEGIN
    -- 1. Buscar a equipe do convite
    SELECT equipe_id INTO v_equipe_id FROM convites_equipe WHERE id = p_convite_id;
    
    IF v_equipe_id IS NULL THEN
        RETURN FALSE; -- Convite não existe
    END IF;

    -- 2. Verificar se o usuário é o ADMIN (Capitão) ou tem permissão de 'gerenciar_membros'
    -- (O Root tbm passa por aqui se o ID for dele, mas ele costuma usar o bypass de Admin)
    SELECT EXISTS (
        SELECT 1 FROM membros_equipe 
        WHERE equipe_id = v_equipe_id 
        AND usuario_id = p_usuario_id 
        AND status = 'ativo'
        AND (papel = 'admin' OR (papel = 'sub_admin' AND 'gerenciar_membros' = ANY(permissoes)))
    ) INTO v_autorizado;

    -- 3. Se autorizado, deleta o convite e as notificações relacionadas
    IF v_autorizado THEN
        -- Deleta notificações/interações relacionadas a este convite
        -- (Isso limpa o "Sino" do atleta)
        DELETE FROM interacoes 
        WHERE tipo = 'convite_equipe' 
        AND (payload->>'convite_id')::UUID = p_convite_id;

        -- Deleta o convite em si
        DELETE FROM convites_equipe WHERE id = p_convite_id;
        
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
