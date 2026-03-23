-- =============================================
-- PLAYHUB - SCHEMA COMPLETO E CONSOLIDADO (V2)
-- Este script configura todo o banco de dados, triggers e políticas RLS.
-- Execute no SQL Editor do Supabase.
-- =============================================

-- 0. LIMPEZA INICIAL (Opcional - use com cautela se o banco já estiver em uso)
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS public.criar_perfil_ao_registrar();

-- 1. TABELA DE USUÁRIOS
CREATE TABLE IF NOT EXISTS public.usuarios (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome_completo TEXT NOT NULL DEFAULT 'Novo Jogador',
  email TEXT NOT NULL,
  apelido TEXT,
  data_nascimento DATE,
  genero TEXT,
  telefone TEXT,
  foto_url TEXT,
  
  -- Endereço
  cep TEXT,
  rua TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  
  -- Status e Preferências
  perfil_publico BOOLEAN DEFAULT TRUE,
  esportes_interesse TEXT[] DEFAULT '{}',
  eh_super_admin BOOLEAN DEFAULT FALSE,
  eh_sub_super_admin BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'ativo', -- ativo, bloqueado
  
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABELA DE EQUIPES
CREATE TABLE IF NOT EXISTS public.equipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  modalidade TEXT NOT NULL,
  logo_url TEXT,
  visibilidade TEXT DEFAULT 'publica', -- publica, privada
  status TEXT DEFAULT 'ativo', -- ativo, arquivado, excluido
  admin_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  slug_convite TEXT UNIQUE DEFAULT LOWER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
  local_nome TEXT,
  local_cep TEXT,
  local_rua TEXT,
  local_numero TEXT,
  local_complemento TEXT,
  local_bairro TEXT,
  local_cidade TEXT,
  local_estado TEXT,
  local_mapa_link TEXT,
  localizacao TEXT,
  nivel TEXT,
  max_jogadores INTEGER DEFAULT 20,
  link_grupo TEXT,
  regras JSONB DEFAULT '{}',
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABELA DE MEMBROS DA EQUIPE
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

-- 4. TABELA DE CONVITES DE EQUIPE
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

-- 5. TABELA DE PARTIDAS
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

-- 6. TABELA DE PRESENÇAS EM PARTIDAS
CREATE TABLE IF NOT EXISTS public.partidas_presencas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partida_id UUID NOT NULL REFERENCES public.partidas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmado' CHECK (status IN ('confirmado', 'espera', 'cancelado')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(partida_id, usuario_id)
);

-- 7. TRIGGER DE CRIAÇÃO DE PERFIL AUTOMÁTICO
CREATE OR REPLACE FUNCTION public.criar_perfil_ao_registrar()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nome_completo)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome_completo', 'Novo Jogador'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.criar_perfil_ao_registrar();

-- 8. SEGURANÇA (RLS)
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membros_equipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convites_equipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partidas_presencas ENABLE ROW LEVEL SECURITY;

-- 8.1 POLÍTICAS PARA SUPER ADMIN (Bypass Global)
-- Estas políticas permitem que usuários com eh_super_admin = true vejam e gerenciem tudo.

CREATE POLICY "Super Admins can view all teams" ON public.equipes FOR SELECT USING (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND eh_super_admin = true));
CREATE POLICY "Super Admins can manage all teams" ON public.equipes FOR ALL USING (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND eh_super_admin = true));

CREATE POLICY "Super Admins can view all members" ON public.membros_equipe FOR SELECT USING (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND eh_super_admin = true));
CREATE POLICY "Super Admins can manage all members" ON public.membros_equipe FOR ALL USING (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND eh_super_admin = true));

CREATE POLICY "Super Admins can view all matches" ON public.partidas FOR SELECT USING (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND eh_super_admin = true));
CREATE POLICY "Super Admins can manage all matches" ON public.partidas FOR ALL USING (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND eh_super_admin = true));

CREATE POLICY "Super Admins can view all attendances" ON public.partidas_presencas FOR SELECT USING (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND eh_super_admin = true));
CREATE POLICY "Super Admins can manage all attendances" ON public.partidas_presencas FOR ALL USING (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND eh_super_admin = true));

-- 8.2 POLÍTICAS DE ACESSO REGULAR (Usuários e Membros)
CREATE POLICY "Usuarios podem ver perfis publicos" ON public.usuarios FOR SELECT USING (perfil_publico = true OR id = auth.uid());
CREATE POLICY "Usuarios editam proprio perfil" ON public.usuarios FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Equipes publicas sao visiveis" ON public.equipes FOR SELECT USING (visibilidade = 'publica' OR admin_id = auth.uid() OR id IN (SELECT equipe_id FROM public.membros_equipe WHERE usuario_id = auth.uid()));
CREATE POLICY "Admin gerencia sua equipe" ON public.equipes FOR ALL USING (admin_id = auth.uid());

CREATE POLICY "Membros veem colegas" ON public.membros_equipe FOR SELECT USING (usuario_id = auth.uid() OR equipe_id IN (SELECT id FROM public.equipes WHERE admin_id = auth.uid() OR id IN (SELECT equipe_id FROM public.membros_equipe WHERE usuario_id = auth.uid())));
CREATE POLICY "Membros podem sair ou ser excluidos" ON public.membros_equipe FOR ALL USING (usuario_id = auth.uid() OR equipe_id IN (SELECT id FROM public.equipes WHERE admin_id = auth.uid()));

CREATE POLICY "Inscricoes de partidas sao publicas" ON public.partidas_presencas FOR SELECT USING (true);
CREATE POLICY "Usuarios gerenciam propria inscricao" ON public.partidas_presencas FOR ALL USING (usuario_id = auth.uid());

-- 9. CONFIGURAÇÃO DE STORAGE
-- (Bucket 'avatares' e 'escudos' devem ser criados via Painel Supabase)

SELECT 'Schema PlayHub Consolidado com Sucesso!' as status;
