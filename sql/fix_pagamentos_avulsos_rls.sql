-- Liberação de RLS para que jogadores avulsos possam gerar suas próprias cobranças
-- ao se inscreverem pelo "Tô Dentro", evitando o erro 403 Forbidden.

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Permitir upsert do próprio usuário avulso" ON pagamentos_avulsos;
    
    CREATE POLICY "Permitir upsert do próprio usuário avulso"
    ON pagamentos_avulsos
    FOR ALL
    USING (auth.uid() = usuario_id)
    WITH CHECK (auth.uid() = usuario_id);
END $$;
