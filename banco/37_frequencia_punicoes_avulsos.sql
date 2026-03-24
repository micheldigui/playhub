-- ============================================================
-- PLAYHUB - MIGRAÇÃO DE BANCO - FREQUÊNCIAS E PUNIÇÕES
-- ============================================================

-- 1. ADICIONA COLUNA DE FREQUÊNCIA NAS PRESENÇAS ONDE AINDA NÃO EXISTIR
ALTER TABLE public.partidas_presencas 
ADD COLUMN IF NOT EXISTS frequencia TEXT DEFAULT 'pendente' CHECK (frequencia IN ('P', 'F', 'pendente'));

-- 2. CRIAÇÃO DA TABELA DE PUNIÇÕES DA EQUIPE
CREATE TABLE IF NOT EXISTS public.punicoes_equipe (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipe_id UUID REFERENCES public.equipes(id) ON DELETE CASCADE NOT NULL,
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
  partida_id UUID REFERENCES public.partidas(id) ON DELETE SET NULL,
  motivo TEXT NOT NULL,
  ativa BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativa Segurança Nível de Linha (RLS) para Punições
ALTER TABLE public.punicoes_equipe ENABLE ROW LEVEL SECURITY;

-- Política 1: O Jogador Puxa Sua Própria Capivara (Cadastro Disciplinar)
CREATE POLICY "Jogadores veem proprias punicoes" 
ON public.punicoes_equipe 
FOR SELECT 
USING (usuario_id = auth.uid());

-- Política 2: Os Donos e Sub-Admins Julgam
CREATE POLICY "Admins gerenciam punicoes" 
ON public.punicoes_equipe 
FOR ALL 
USING (
  equipe_id IN (SELECT id FROM public.equipes WHERE admin_id = auth.uid()) 
  OR 
  EXISTS (SELECT 1 FROM public.membros_equipe WHERE equipe_id = punicoes_equipe.equipe_id AND usuario_id = auth.uid() AND papel IN ('admin', 'sub_admin'))
  OR
  (SELECT eh_super_admin FROM public.usuarios WHERE id = auth.uid() LIMIT 1) = true
);

-- 3. EXPANSÃO DO GERENCIAMENTO DE AVULSOS
ALTER TABLE public.pagamentos_avulsos 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'isento')),
ADD COLUMN IF NOT EXISTS equipe_id UUID REFERENCES public.equipes(id) ON DELETE CASCADE;

-- FINALIZAÇÃO
SELECT 'Tabelas Auxiliares de Frequência, Punições e Receitas Avulsas instanciadas com Sucesso!' as status;
