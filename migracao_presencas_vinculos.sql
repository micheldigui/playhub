-- 1. ADICIONANDO VINCULO AOS MEMBROS DA EQUIPE
ALTER TABLE public.membros_equipe 
ADD COLUMN IF NOT EXISTS vinculo TEXT DEFAULT 'avulso' CHECK (vinculo IN ('avulso', 'mensalista'));

-- O papel 'sub_admin' não precisa de alteração estrutural caso sua coluna "papel" já seja do tipo texto ou lide nativamente com isso.
-- Caso seja um ENUM no seu banco, e der erro futuramente, precisaremos rodar um ALTER TYPE, mas se for varchar/text é apenas lógica JavaScript!

-- 2. CRIANDO A TABELA DE PRESENÇAS EM PARTIDAS
CREATE TABLE IF NOT EXISTS public.partidas_presencas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partida_id UUID NOT NULL REFERENCES public.partidas(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'confirmado' CHECK (status IN ('confirmado', 'espera', 'cancelado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(partida_id, usuario_id)
);

-- 3. HABILITANDO SEGURANÇA (RLS)
ALTER TABLE public.partidas_presencas ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS DE ACESSO (PERMISSÕES NO SUPABASE)
-- Todos podem ler quem vai nas partidas
CREATE POLICY "Permitir leitura de presencas" 
    ON public.partidas_presencas FOR SELECT 
    USING (true);

-- O próprio usuário logado pode inserir a sua inscrição
CREATE POLICY "Permitir usuario inscrever-se" 
    ON public.partidas_presencas FOR INSERT 
    WITH CHECK (auth.uid() = usuario_id);

-- O próprio usuário logado pode alterar seu status (ex: virar cancelado)
CREATE POLICY "Permitir usuario alterar inscricao" 
    ON public.partidas_presencas FOR UPDATE 
    USING (auth.uid() = usuario_id);

-- O próprio usuário pode remover seu nome da lista
CREATE POLICY "Permitir usuario excluir inscricao" 
    ON public.partidas_presencas FOR DELETE 
    USING (auth.uid() = usuario_id);
