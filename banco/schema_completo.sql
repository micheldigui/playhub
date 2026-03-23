-- =============================================
-- PLAYHUB - SCHEMA COMPLETO E CONSOLIDADO
-- Este script configura todo o banco de dados, triggers e políticas RLS.
-- Execute no SQL Editor do Supabase.
-- =============================================

-- 0. LIMPEZA INICIAL (Remover conflitos de nomes antigos)
DROP TRIGGER IF EXISTS ao_criar_usuario ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS ao_registrar_usuario ON auth.users;
DROP FUNCTION IF EXISTS public.criar_perfil_ao_registrar();
DROP FUNCTION IF EXISTS public.criar_usuario_ao_registrar();

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

-- Garantir colunas se a tabela já existir
DO $$ 
BEGIN 
  BEGIN ALTER TABLE public.usuarios ADD COLUMN apelido TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.usuarios ADD COLUMN data_nascimento DATE; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.usuarios ADD COLUMN genero TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.usuarios ADD COLUMN telefone TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.usuarios ADD COLUMN cep TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.usuarios ADD COLUMN rua TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.usuarios ADD COLUMN numero TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.usuarios ADD COLUMN complemento TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.usuarios ADD COLUMN bairro TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.usuarios ADD COLUMN cidade TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.usuarios ADD COLUMN estado TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.usuarios ADD COLUMN perfil_publico BOOLEAN DEFAULT TRUE; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.usuarios ADD COLUMN esportes_interesse TEXT[] DEFAULT '{}'; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.usuarios ADD COLUMN atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

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
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Garantir novas colunas na equipes
DO $$ 
BEGIN 
  BEGIN ALTER TABLE public.equipes ADD COLUMN logo_url TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.equipes ADD COLUMN slug_convite TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'); EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.equipes ADD COLUMN local_nome TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.equipes ADD COLUMN local_cep TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.equipes ADD COLUMN local_rua TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.equipes ADD COLUMN local_numero TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.equipes ADD COLUMN local_complemento TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.equipes ADD COLUMN local_bairro TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.equipes ADD COLUMN local_cidade TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.equipes ADD COLUMN local_estado TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.equipes ADD COLUMN local_mapa_link TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.equipes ADD COLUMN localizacao TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.equipes ADD COLUMN nivel TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

-- 3. TABELA DE MEMBROS DA EQUIPE
CREATE TABLE IF NOT EXISTS public.membros_equipe (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipe_id UUID REFERENCES public.equipes(id) ON DELETE CASCADE NOT NULL,
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
  papel TEXT DEFAULT 'jogador', -- admin, sub-admin, jogador
  status TEXT DEFAULT 'ativo', -- ativo, pendente, banido
  entrou_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(equipe_id, usuario_id)
);

-- 4. TRIGGER DE CRIAÇÃO DE PERFIL COM METADADOS (V4)
CREATE OR REPLACE FUNCTION public.criar_perfil_ao_registrar()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (
    id, email, nome_completo, apelido, telefone,
    data_nascimento, genero,
    cep, rua, numero, complemento, bairro, cidade, estado,
    perfil_publico
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', 'Novo Jogador'),
    NEW.raw_user_meta_data->>'apelido',
    NEW.raw_user_meta_data->>'telefone',
    NULLIF(NEW.raw_user_meta_data->>'data_nascimento', '')::DATE,
    NEW.raw_user_meta_data->>'genero',
    NEW.raw_user_meta_data->>'cep',
    NEW.raw_user_meta_data->>'rua',
    NEW.raw_user_meta_data->>'numero',
    NEW.raw_user_meta_data->>'complemento',
    NEW.raw_user_meta_data->>'bairro',
    NEW.raw_user_meta_data->>'cidade',
    NEW.raw_user_meta_data->>'estado',
    COALESCE((NEW.raw_user_meta_data->>'perfil_publico')::BOOLEAN, TRUE)
  )
  ON CONFLICT (id) DO UPDATE SET
    nome_completo = EXCLUDED.nome_completo,
    apelido = EXCLUDED.apelido,
    telefone = EXCLUDED.telefone,
    data_nascimento = EXCLUDED.data_nascimento,
    genero = EXCLUDED.genero,
    atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.criar_perfil_ao_registrar();

-- 5. POLÍTICAS RLS (V3 - Sem Recursão)
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membros_equipe ENABLE ROW LEVEL SECURITY;

-- Limpar políticas antigas
DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('usuarios', 'equipes', 'membros_equipe')) 
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON ' || pol.tablename;
  END LOOP;
END $$;

-- USUÁRIOS
CREATE POLICY "usuarios_select_own" ON public.usuarios FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "usuarios_update_own" ON public.usuarios FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "usuarios_select_public" ON public.usuarios FOR SELECT TO authenticated USING (perfil_publico = true);

-- EQUIPES
CREATE POLICY "equipes_select_base" ON public.equipes FOR SELECT TO authenticated 
USING (admin_id = auth.uid() OR visibilidade = 'publica');

CREATE POLICY "equipes_admin_actions" ON public.equipes FOR ALL TO authenticated 
USING (admin_id = auth.uid()) 
WITH CHECK (admin_id = auth.uid());

-- MEMBROS
CREATE POLICY "membros_self_access" ON public.membros_equipe FOR SELECT TO authenticated USING (usuario_id = auth.uid());
CREATE POLICY "membros_view_colleagues" ON public.membros_equipe FOR SELECT TO authenticated 
USING (
  equipe_id IN (SELECT id FROM public.equipes WHERE admin_id = auth.uid() OR visibilidade = 'publica')
);
CREATE POLICY "membros_self_insert" ON public.membros_equipe FOR INSERT TO authenticated WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "membros_admin_management" ON public.membros_equipe FOR ALL TO authenticated 
USING (
  equipe_id IN (SELECT id FROM public.equipes WHERE admin_id = auth.uid())
);

-- 6. CONFIGURAÇÃO DE STORAGE (Buckets e Políticas)
-- Bucket: 'avatares'
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatares', 'avatares', true) ON CONFLICT (id) DO NOTHING;

-- Bucket: 'escudos'
INSERT INTO storage.buckets (id, name, public) 
VALUES ('escudos', 'escudos', true) ON CONFLICT (id) DO NOTHING;

-- Limpar políticas de storage antes de recriar
DROP POLICY IF EXISTS "avatares_select_public" ON storage.objects;
DROP POLICY IF EXISTS "avatares_insert_self" ON storage.objects;
DROP POLICY IF EXISTS "avatares_update_self" ON storage.objects;
DROP POLICY IF EXISTS "avatares_delete_self" ON storage.objects;
DROP POLICY IF EXISTS "escudos_select_public" ON storage.objects;
DROP POLICY IF EXISTS "escudos_all_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "Imagens de times são públicas" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload de escudos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem atualizar os escudos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem excluir escudos velhos" ON storage.objects;
DROP POLICY IF EXISTS "Avatares são públicos" ON storage.objects;
DROP POLICY IF EXISTS "Usuário pode fazer upload do seu próprio avatar" ON storage.objects;
DROP POLICY IF EXISTS "Usuário pode atualizar seu avatar" ON storage.objects;
DROP POLICY IF EXISTS "Usuário pode deletar seu avatar" ON storage.objects;

-- Políticas para 'avatares'
CREATE POLICY "avatares_select_public" ON storage.objects FOR SELECT USING (bucket_id = 'avatares');
CREATE POLICY "avatares_insert_self" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatares' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatares_update_self" ON storage.objects FOR UPDATE USING (bucket_id = 'avatares' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatares_delete_self" ON storage.objects FOR DELETE USING (bucket_id = 'avatares' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Políticas para 'escudos'
CREATE POLICY "escudos_select_public" ON storage.objects FOR SELECT USING (bucket_id = 'escudos');
CREATE POLICY "escudos_all_authenticated" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'escudos') WITH CHECK (bucket_id = 'escudos');

-- 7. SINCRONIZAÇÃO RETROATIVA
UPDATE public.usuarios u
SET 
  apelido = COALESCE(u.apelido, au.raw_user_meta_data->>'apelido'),
  data_nascimento = COALESCE(u.data_nascimento, NULLIF(au.raw_user_meta_data->>'data_nascimento', '')::DATE),
  genero = COALESCE(u.genero, au.raw_user_meta_data->>'genero'),
  telefone = COALESCE(u.telefone, au.raw_user_meta_data->>'telefone')
FROM auth.users au
WHERE u.id = au.id AND (u.apelido IS NULL OR u.data_nascimento IS NULL);

-- 8. CAMPO LINK DO GRUPO NA TABELA EQUIPES
DO $$ BEGIN
  ALTER TABLE public.equipes ADD COLUMN link_grupo TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END;
$$;

-- 9. TABELA DE CONVITES DE EQUIPE (Admin convida jogador)
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

-- RLS para convites_equipe
ALTER TABLE public.convites_equipe ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Jogador vê seus convites" ON public.convites_equipe;
DROP POLICY IF EXISTS "Admin vê convites da equipe" ON public.convites_equipe;
DROP POLICY IF EXISTS "Admin cria convites" ON public.convites_equipe;
DROP POLICY IF EXISTS "Jogador responde convite" ON public.convites_equipe;

CREATE POLICY "Jogador vê seus convites" ON public.convites_equipe
  FOR SELECT USING (jogador_id = auth.uid() OR admin_id = auth.uid());

CREATE POLICY "Admin cria convites" ON public.convites_equipe
  FOR INSERT WITH CHECK (admin_id = auth.uid());

CREATE POLICY "Jogador responde convite" ON public.convites_equipe
  FOR UPDATE USING (jogador_id = auth.uid() OR admin_id = auth.uid());

SELECT 'Schema completo aplicado com sucesso!' as status;
