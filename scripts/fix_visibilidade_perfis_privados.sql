-- SCRIPT CORRIGIDO: EVITA RECURSÃO INFINITA (LOOP) NO RLS
-- Execute este script no SQL Editor do seu painel Supabase.

-- 1. Remove a política que causou o erro de recursão
DROP POLICY IF EXISTS "visualizar_perfil_gestao" ON public.usuarios;

-- 2. Cria uma função auxiliar com SECURITY DEFINER (ignora o RLS dentro da função)
-- Isso evita que o banco entre em loop tentando verificar permissões de forma circular.
CREATE OR REPLACE FUNCTION public.eh_gestor_deste_atleta(atleta_id uuid, gestor_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- IMPORTANTE: Ignora o RLS e quebra a recursão
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.membros_equipe me_destino
        WHERE me_destino.usuario_id = atleta_id
          AND me_destino.equipe_id IN (
              SELECT me_gestor.equipe_id 
              FROM public.membros_equipe me_gestor
              WHERE me_gestor.usuario_id = gestor_id
                AND me_gestor.status = 'ativo'
                AND me_gestor.papel IN ('admin', 'sub_admin')
          )
    );
END;
$$;

-- 3. Cria a nova política usando a função auxiliar
-- Agora a regra é segura e extremamente performática.
CREATE POLICY "visualizar_perfil_gestao_v2" ON public.usuarios
FOR SELECT
TO authenticated
USING (
    perfil_publico = true 
    OR id = auth.uid()
    OR public.eh_gestor_deste_atleta(id, auth.uid())
);

-- 4. Notificação de Super Admin (Bypass extra)
-- Se você usa uma conta que não é o Admin do time mas é SuperAdmin do sistema:
-- A política acima já deve cobrir, mas garantimos que o perfil_publico seja o fallback principal.
