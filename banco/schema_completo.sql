-- ============================================================
-- PLAYHUB - SCHEMA COMPLETO E CONSOLIDADO (V3 - FINAL)
-- Este script configura todo o banco de dados do zero.
-- Inclui: Usuários, Equipes, Financeiro, Perfil Esportivo e RLS.
-- ============================================================

-- EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. LIMPEZA DE TABELAS SINGULARES REDUNDANTES
-- ============================================================
DROP TABLE IF EXISTS public.partida_presencas CASCADE;

-- ============================================================
-- 2. DEFINIÇÃO DAS TABELAS
-- ============================================================

-- 2.1 USUÁRIOS
CREATE TABLE IF NOT EXISTS public.usuarios (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome_completo TEXT NOT NULL DEFAULT 'Novo Jogador',
  email TEXT NOT NULL,
  apelido TEXT,
  data_nascimento DATE,
  genero TEXT,
  telefone TEXT,
  foto_url TEXT,
  cep TEXT, rua TEXT, numero TEXT, complemento TEXT, bairro TEXT, cidade TEXT, estado TEXT,
  perfil_publico BOOLEAN DEFAULT TRUE,
  esportes_interesse TEXT[] DEFAULT '{}',
  eh_super_admin BOOLEAN DEFAULT FALSE,
  eh_sub_super_admin BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'ativo',
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.2 PERFIL ESPORTIVO (HABILIDADES)
CREATE TABLE IF NOT EXISTS public.jogador_modalidades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
  modalidade TEXT NOT NULL,
  posicao TEXT,
  nivel_habilidade TEXT NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(usuario_id, modalidade, posicao)
);

-- 2.3 EQUIPES
CREATE TABLE IF NOT EXISTS public.equipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  modalidade TEXT NOT NULL,
  logo_url TEXT,
  visibilidade TEXT DEFAULT 'publica',
  status TEXT DEFAULT 'ativo',
  admin_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  slug_convite TEXT UNIQUE DEFAULT LOWER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
  local_nome TEXT, local_cep TEXT, local_rua TEXT, local_numero TEXT, 
  local_complemento TEXT, local_bairro TEXT, local_cidade TEXT, local_estado TEXT,
  local_mapa_link TEXT, localizacao TEXT, nivel TEXT,
  max_jogadores INTEGER DEFAULT 20,
  link_grupo TEXT,
  regras JSONB DEFAULT '{}',
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.4 MEMBROS DA EQUIPE
CREATE TABLE IF NOT EXISTS public.membros_equipe (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipe_id UUID REFERENCES public.equipes(id) ON DELETE CASCADE NOT NULL,
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
  papel TEXT DEFAULT 'jogador', -- admin, sub_admin, jogador
  status TEXT DEFAULT 'ativo', -- ativo, pendente, banido
  vinculo TEXT DEFAULT 'avulso', -- avulso, mensalista
  entrou_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(equipe_id, usuario_id)
);

-- 2.5 CONVITES
CREATE TABLE IF NOT EXISTS public.convites_equipe (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipe_id UUID REFERENCES public.equipes(id) ON DELETE CASCADE,
  jogador_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  mensagem_convite TEXT,
  mensagem_resposta TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito', 'recusado')),
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  respondido_em TIMESTAMPTZ,
  UNIQUE(equipe_id, jogador_id)
);

-- 2.6 PARTIDAS
CREATE TABLE IF NOT EXISTS public.partidas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipe_id UUID REFERENCES public.equipes(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  hora TIME NOT NULL,
  local TEXT,
  vagas INTEGER DEFAULT 12,
  valor_avulso DECIMAL(10,2) DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 2.7 PRESENÇAS EM PARTIDAS (Pluralizado)
CREATE TABLE IF NOT EXISTS public.partidas_presencas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partida_id UUID NOT NULL REFERENCES public.partidas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmado' CHECK (status IN ('confirmado', 'espera', 'cancelado')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(partida_id, usuario_id)
);

-- 2.8 CONFIGURAÇÃO FINANCEIRA (Global)
CREATE TABLE IF NOT EXISTS public.financeiro_config (
  equipe_id UUID REFERENCES public.equipes(id) ON DELETE CASCADE PRIMARY KEY,
  valor_mensalidade DECIMAL(10,2) DEFAULT 50,
  valor_avulso_padrao DECIMAL(10,2) DEFAULT 20,
  dia_vencimento INTEGER DEFAULT 10,
  dia_tolerancia INTEGER DEFAULT 15,
  custo_quadra DECIMAL(10,2) DEFAULT 0,
  limite_vencimento_horas INTEGER DEFAULT 24,
  chave_pix TEXT,
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.9 CICLOS FINANCEIROS (Metadados Mensais)
CREATE TABLE IF NOT EXISTS public.ciclos_financeiros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipe_id UUID REFERENCES public.equipes(id) ON DELETE CASCADE NOT NULL,
  periodo TEXT NOT NULL, -- Formato "YYYY-MM"
  valor_mensalidade_snapshot DECIMAL(10,2) NOT NULL,
  custo_quadra_snapshot DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
  chave_pix_snapshot TEXT,
  dia_vencimento_snapshot INTEGER,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(equipe_id, periodo)
);

-- 2.10 MENSALIDADES (Pagamentos do Ciclo)
CREATE TABLE IF NOT EXISTS public.mensalidades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipe_id UUID REFERENCES public.equipes(id) ON DELETE CASCADE NOT NULL,
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
  periodo TEXT NOT NULL,
  valor_configurado DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'isento', 'atrasado')),
  pago_em TIMESTAMP WITH TIME ZONE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(equipe_id, usuario_id, periodo)
);

-- 2.11 PAGAMENTOS AVULSOS
CREATE TABLE IF NOT EXISTS public.pagamentos_avulsos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  partida_id UUID REFERENCES public.partidas(id) ON DELETE CASCADE NOT NULL,
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
  valor_pago DECIMAL(10,2) NOT NULL,
  pago_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(partida_id, usuario_id)
);

-- ============================================================
-- 3. TRIGGERS E FUNÇÕES
-- ============================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.criar_perfil_ao_registrar();

CREATE OR REPLACE FUNCTION public.criar_perfil_ao_registrar()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nome_completo)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome_completo', 'Novo Jogador'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.criar_perfil_ao_registrar();

-- ============================================================
-- 4. SEGURANÇA (RLS)
-- ============================================================

-- Habilitar RLS em tudo
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jogador_modalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membros_equipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convites_equipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partidas_presencas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ciclos_financeiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos_avulsos ENABLE ROW LEVEL SECURITY;

-- 4.1 POLÍTICAS PARA SUPER ADMINS (IDEMPOTENTES)
DO $$
DECLARE
  tables TEXT[] := ARRAY['usuarios', 'jogador_modalidades', 'equipes', 'membros_equipe', 'convites_equipe', 'partidas', 'partidas_presencas', 'financeiro_config', 'ciclos_financeiros', 'mensalidades', 'pagamentos_avulsos'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE 'DROP POLICY IF EXISTS "Super Admins can manage all ' || t || '" ON public.' || t;
    EXECUTE 'CREATE POLICY "Super Admins can manage all ' || t || '" ON public.' || t || ' FOR ALL USING (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND eh_super_admin = true))';
  END LOOP;
END $$;

-- 4.2 POLÍTICAS DE USUÁRIOS E PERFIS
DROP POLICY IF EXISTS "Usuarios podem ver perfis publicos" ON public.usuarios;
CREATE POLICY "Usuarios podem ver perfis publicos" ON public.usuarios FOR SELECT USING (perfil_publico = true OR id = auth.uid());

DROP POLICY IF EXISTS "Usuarios editam proprio perfil" ON public.usuarios;
CREATE POLICY "Usuarios editam proprio perfil" ON public.usuarios FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "Usuarios gerenciam proprias habilidades" ON public.jogador_modalidades;
CREATE POLICY "Usuarios gerenciam proprias habilidades" ON public.jogador_modalidades FOR ALL USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS "Qualquer um vê habilidades publicas" ON public.jogador_modalidades;
CREATE POLICY "Qualquer um vê habilidades publicas" ON public.jogador_modalidades FOR SELECT USING (true);

-- 4.3 POLÍTICAS DE EQUIPES E MEMBROS
DROP POLICY IF EXISTS "Equipes publicas sao visiveis" ON public.equipes;
CREATE POLICY "Equipes publicas sao visiveis" ON public.equipes FOR SELECT USING (visibilidade = 'publica' OR admin_id = auth.uid() OR id IN (SELECT equipe_id FROM public.membros_equipe WHERE usuario_id = auth.uid()));

DROP POLICY IF EXISTS "Admin gerencia sua equipe" ON public.equipes;
CREATE POLICY "Admin gerencia sua equipe" ON public.equipes FOR ALL USING (admin_id = auth.uid());

DROP POLICY IF EXISTS "Membros veem colegas" ON public.membros_equipe;
CREATE POLICY "Membros veem colegas" ON public.membros_equipe FOR SELECT USING (usuario_id = auth.uid() OR equipe_id IN (SELECT id FROM public.equipes WHERE admin_id = auth.uid() OR id IN (SELECT equipe_id FROM public.membros_equipe WHERE usuario_id = auth.uid())));

DROP POLICY IF EXISTS "Membros podem sair ou ser excluidos" ON public.membros_equipe;
CREATE POLICY "Membros podem sair ou ser excluidos" ON public.membros_equipe FOR ALL USING (usuario_id = auth.uid() OR equipe_id IN (SELECT id FROM public.equipes WHERE admin_id = auth.uid()));

-- 4.4 POLÍTICAS FINANCEIRAS (ADMS E JOGADORES)
DROP POLICY IF EXISTS "Admins gerenciam config financeira" ON public.financeiro_config;
CREATE POLICY "Admins gerenciam config financeira" ON public.financeiro_config FOR ALL USING (EXISTS (SELECT 1 FROM public.equipes WHERE id = equipe_id AND admin_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.membros_equipe WHERE equipe_id = financeiro_config.equipe_id AND usuario_id = auth.uid() AND papel = 'sub_admin'));

DROP POLICY IF EXISTS "Admins gerenciam ciclos" ON public.ciclos_financeiros;
CREATE POLICY "Admins gerenciam ciclos" ON public.ciclos_financeiros FOR ALL USING (EXISTS (SELECT 1 FROM public.equipes WHERE id = equipe_id AND admin_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.membros_equipe WHERE equipe_id = ciclos_financeiros.equipe_id AND usuario_id = auth.uid() AND papel = 'sub_admin'));

DROP POLICY IF EXISTS "Admins gerenciam mensalidades" ON public.mensalidades;
CREATE POLICY "Admins gerenciam mensalidades" ON public.mensalidades FOR ALL USING (EXISTS (SELECT 1 FROM public.equipes WHERE id = equipe_id AND admin_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.membros_equipe WHERE equipe_id = mensalidades.equipe_id AND usuario_id = auth.uid() AND papel = 'sub_admin'));

DROP POLICY IF EXISTS "Jogadores veem ciclos" ON public.ciclos_financeiros;
CREATE POLICY "Jogadores veem ciclos" ON public.ciclos_financeiros FOR SELECT USING (EXISTS (SELECT 1 FROM public.membros_equipe WHERE equipe_id = ciclos_financeiros.equipe_id AND usuario_id = auth.uid()));

DROP POLICY IF EXISTS "Jogadores veem proprias mensalidades" ON public.mensalidades;
CREATE POLICY "Jogadores veem proprias mensalidades" ON public.mensalidades FOR SELECT USING (usuario_id = auth.uid());

-- FINALIZAÇÃO
SELECT 'Schema PlayHub Consolidado (V3) com Sucesso!' as status;
