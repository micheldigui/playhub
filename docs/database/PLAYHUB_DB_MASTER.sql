-- ============================================================
-- PLAYHUB - BANCO DE DADOS CONSOLIDADO (REFERENCIA MASTER)
-- Data de unifica��o: 12/04/2026 00:03
-- 
-- Este arquivo cont�m o esquema de tabelas e todas as fun��es 
-- RPC para fins de backup e consulta t�cnica.
-- ============================================================


-- SECTION: SCHEMA COMPLETO (TABELAS E ESTRUTURA) --

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
  latitude FLOAT8,
  longitude FLOAT8,
  compartilhar_whatsapp_match BOOLEAN DEFAULT FALSE,
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
  latitude FLOAT8,
  longitude FLOAT8,
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
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'pendente', 'banido', 'saiu', 'removido')), -- Status do vínculo
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
  frequencia TEXT DEFAULT 'pendente' CHECK (frequencia IN ('P', 'F', 'pendente')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(partida_id, usuario_id)
);

-- 2.7.B PUNIÇÕES DISCIPLINARES (Faltas e Infrações)
CREATE TABLE IF NOT EXISTS public.punicoes_equipe (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipe_id UUID REFERENCES public.equipes(id) ON DELETE CASCADE NOT NULL,
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
  partida_id UUID REFERENCES public.partidas(id) ON DELETE SET NULL, -- Se a partida sumir, a punição vira histórica no time
  motivo TEXT NOT NULL,
  ativa BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
  equipe_id UUID REFERENCES public.equipes(id) ON DELETE CASCADE,
  partida_id UUID REFERENCES public.partidas(id) ON DELETE CASCADE NOT NULL,
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'isento')),
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
ALTER TABLE public.punicoes_equipe ENABLE ROW LEVEL SECURITY;

-- 4.1 POLÍTICAS PARA SUPER ADMINS (IDEMPOTENTES)
DO $$
DECLARE
  tables TEXT[] := ARRAY['usuarios', 'jogador_modalidades', 'equipes', 'membros_equipe', 'convites_equipe', 'partidas', 'partidas_presencas', 'punicoes_equipe', 'financeiro_config', 'ciclos_financeiros', 'mensalidades', 'pagamentos_avulsos'];
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
CREATE POLICY "Admin gerencia sua equipe" ON public.equipes 
FOR ALL 
USING (admin_id = auth.uid() OR (SELECT eh_super_admin FROM public.usuarios WHERE id = auth.uid() LIMIT 1) = true)
WITH CHECK (true); -- Permite transferência de posse (mudança de admin_id)

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

-- 4.5 POLÍTICAS DE PUNIÇÕES DA EQUIPE
DROP POLICY IF EXISTS "Jogadores veem proprias punicoes" ON public.punicoes_equipe;
CREATE POLICY "Jogadores veem proprias punicoes" ON public.punicoes_equipe FOR SELECT USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS "Admins gerenciam punicoes" ON public.punicoes_equipe;
CREATE POLICY "Admins gerenciam punicoes" ON public.punicoes_equipe FOR ALL USING (
  equipe_id IN (SELECT id FROM public.equipes WHERE admin_id = auth.uid()) 
  OR EXISTS (SELECT 1 FROM public.membros_equipe WHERE equipe_id = punicoes_equipe.equipe_id AND usuario_id = auth.uid() AND papel IN ('admin', 'sub_admin'))
);

-- ============================================================
-- 5. FUNÇÕES (RPCs) - CONTORNO DE RLS E REGRAS DE NEGÓCIO
-- ============================================================

-- Função opaca para evitar recursão infinita no RLS
CREATE OR REPLACE FUNCTION is_member_of_equipe(p_equipe_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_eh_membro BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.membros_equipe 
    WHERE equipe_id = p_equipe_id 
      AND usuario_id = auth.uid() 
      AND status IN ('ativo', 'pendente')
  ) INTO v_eh_membro;
  RETURN v_eh_membro;
END;
$$;

-- Transação segura para responder convites (Cria o membro de forma atômica)
CREATE OR REPLACE FUNCTION responder_convite_seguro(p_convite_id UUID, p_aceito BOOLEAN, p_usuario_id UUID, p_mensagem TEXT DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_equipe_id UUID;
  v_jogador_id UUID;
  v_status_atual TEXT;
BEGIN
  SELECT equipe_id, jogador_id, status INTO v_equipe_id, v_jogador_id, v_status_atual FROM public.convites_equipe WHERE id = p_convite_id;
  IF v_equipe_id IS NULL THEN RAISE EXCEPTION 'Convite não encontrado.'; END IF;
  IF v_jogador_id != p_usuario_id THEN RAISE EXCEPTION 'Este convite não pertence ao seu usuário.'; END IF;
  IF v_status_atual != 'pendente' THEN RAISE EXCEPTION 'Este convite já foi processado.'; END IF;

  UPDATE public.convites_equipe SET status = CASE WHEN p_aceito THEN 'aceito' ELSE 'recusado' END, mensagem_resposta = p_mensagem, respondido_em = now() WHERE id = p_convite_id;

  IF p_aceito = true THEN
    INSERT INTO public.membros_equipe (equipe_id, usuario_id, papel, status)
    VALUES (v_equipe_id, p_usuario_id, 'jogador', 'ativo')
    ON CONFLICT (equipe_id, usuario_id) DO UPDATE SET status = 'ativo', papel = 'jogador';
  END IF;

  RETURN 'resposta_processada';
END;
$$;

-- Solicitar Transferência de Posse
CREATE OR REPLACE FUNCTION solicitar_transferencia_posse(p_equipe_id UUID, p_novo_admin_id UUID, p_usuario_id UUID)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_super BOOLEAN;
  v_is_owner BOOLEAN;
  v_eh_capitao BOOLEAN;
BEGIN
  SELECT eh_super_admin INTO v_is_super FROM public.usuarios WHERE id = p_usuario_id;
  SELECT EXISTS(SELECT 1 FROM public.equipes WHERE id = p_equipe_id AND admin_id = p_usuario_id) INTO v_is_owner;
  SELECT EXISTS(SELECT 1 FROM public.membros_equipe WHERE equipe_id = p_equipe_id AND usuario_id = p_usuario_id AND papel = 'admin') INTO v_eh_capitao;
  
  IF v_is_super = true OR v_is_owner = true OR v_eh_capitao = true THEN
    UPDATE public.equipes SET admin_id_pendente = p_novo_admin_id, data_solicitacao_posse = now() WHERE id = p_equipe_id;
    RETURN 'transferido_com_sucesso';
  ELSE
    RAISE EXCEPTION 'Acesso Negado (Validação Falhou). ID Recebido: %', p_usuario_id;
  END IF;
END;
$$;

-- Aceitar Transferência
CREATE OR REPLACE FUNCTION aceitar_transferencia_posse(p_equipe_id UUID, p_usuario_id UUID)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_atual UUID;
  v_admin_pendente UUID;
BEGIN
  SELECT admin_id, admin_id_pendente INTO v_admin_atual, v_admin_pendente FROM public.equipes WHERE id = p_equipe_id;
  IF v_admin_pendente = p_usuario_id THEN
    UPDATE public.equipes SET admin_id = p_usuario_id, admin_id_pendente = null, data_solicitacao_posse = null WHERE id = p_equipe_id;
    UPDATE public.membros_equipe SET papel = 'sub_admin' WHERE equipe_id = p_equipe_id AND papel = 'admin' AND usuario_id != p_usuario_id;
    UPDATE public.membros_equipe SET papel = 'admin' WHERE equipe_id = p_equipe_id AND usuario_id = p_usuario_id;
    RETURN 'aceito_com_sucesso';
  ELSE
    RAISE EXCEPTION 'Apenas o usuário convidado pode aceitar. Convidado(DB): %, Clicou(App): %', v_admin_pendente, p_usuario_id;
  END IF;
END;
$$;

-- Cancelar Transferência
CREATE OR REPLACE FUNCTION cancelar_transferencia_posse(p_equipe_id UUID, p_usuario_id UUID)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.equipes WHERE id = p_equipe_id AND (admin_id = p_usuario_id OR admin_id_pendente = p_usuario_id))
  OR EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_usuario_id AND eh_super_admin = true) THEN
    UPDATE public.equipes SET admin_id_pendente = null, data_solicitacao_posse = null WHERE id = p_equipe_id;
    RETURN 'cancelado_com_sucesso';
  ELSE
    RAISE EXCEPTION 'Você não tem permissão para cancelar esta solicitação.';
  END IF;
END;
$$;

-- Função atômica para Super Admins excluírem convites contornando bloqueios RLS de Delete
CREATE OR REPLACE FUNCTION excluir_convite_seguro(p_convite_id UUID, p_usuario_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER 
AS $$
DECLARE
    v_eh_super_admin BOOLEAN;
    v_equipe_id UUID;
    v_jogador_id UUID;
    v_admin_id UUID;
BEGIN
    SELECT eh_super_admin INTO v_eh_super_admin FROM public.usuarios WHERE id = p_usuario_id;
    SELECT equipe_id, jogador_id INTO v_equipe_id, v_jogador_id FROM public.convites_equipe WHERE id = p_convite_id;
    
    IF NOT FOUND THEN RETURN FALSE; END IF;
    SELECT admin_id INTO v_admin_id FROM public.equipes WHERE id = v_equipe_id;

    IF (v_eh_super_admin = TRUE) OR (v_jogador_id = p_usuario_id) OR (v_admin_id = p_usuario_id) THEN
        DELETE FROM public.convites_equipe WHERE id = p_convite_id;
        RETURN TRUE;
    END IF;
    RETURN FALSE;
END;
$$;

-- Função atômica para Soft-Delete do time evitando Sucesso Fantasma no UPDATE
CREATE OR REPLACE FUNCTION sair_da_equipe_seguro(p_equipe_id UUID, p_usuario_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER 
AS $$
DECLARE
    v_rows_affected INTEGER;
BEGIN
    UPDATE public.membros_equipe 
    SET status = 'saiu' 
    WHERE equipe_id = p_equipe_id 
      AND usuario_id = p_usuario_id 
      AND status = 'ativo';
      
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    IF v_rows_affected > 0 THEN RETURN TRUE; ELSE RETURN FALSE; END IF;
END;
$$;

-- ============================================================
-- 6. ATUALIZAÇÕES CORRETIVAS DE RLS
-- ============================================================

-- Remove regras antigas da Tabela de Equipes para aplicar a versão que invoca is_member_of_equipe
DROP POLICY IF EXISTS "Leitura global de equipes" ON public.equipes;
DROP POLICY IF EXISTS "Equipes publicas sao visiveis" ON public.equipes;

CREATE POLICY "Leitura global de equipes" ON public.equipes FOR SELECT USING (
  visibilidade = 'publica' 
  OR admin_id = auth.uid() 
  OR (SELECT eh_super_admin FROM public.usuarios WHERE id = auth.uid() LIMIT 1) = true
  OR is_member_of_equipe(id)
  OR EXISTS (SELECT 1 FROM public.convites_equipe WHERE equipe_id = id AND jogador_id = auth.uid())
);

-- Permite que usuários convidados visualizem o card da equipe alvo e permite membros verem times privados
DROP POLICY IF EXISTS "Convidados veem equipe" ON public.equipes;
CREATE POLICY "Convidados veem equipe" ON public.equipes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.convites_equipe WHERE equipe_id = id AND jogador_id = auth.uid())
);

DROP POLICY IF EXISTS "Membros veem equipe" ON public.equipes;
CREATE POLICY "Membros veem equipe" ON public.equipes FOR SELECT USING (
  id IN (SELECT equipe_id FROM public.membros_equipe WHERE usuario_id = auth.uid() AND status IN ('ativo', 'pendente'))
);

-- Autoriza os usuários Envolvidos na ponta (Remetente ou Destinatário) a limparem lixeiras de Convites.
DROP POLICY IF EXISTS "Envolvidos podem deletar convites" ON public.convites_equipe;
CREATE POLICY "Envolvidos podem deletar convites" ON public.convites_equipe
FOR DELETE
USING (
    jogador_id = auth.uid() 
    OR 
    equipe_id IN (SELECT id FROM public.equipes WHERE admin_id = auth.uid())
    OR
    (SELECT eh_super_admin FROM public.usuarios WHERE id = auth.uid() LIMIT 1) = true
);

-- FINALIZAÇÃO
SELECT 'Schema PlayHub Consolidado Antes do Modulo de Partidas' as status;

-- ============================================================
-- MÓDULO DE PARTIDAS, FREQUÊNCIA E TESOURARIA AVULSA
-- ============================================================

CREATE TABLE IF NOT EXISTS public.partidas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  equipe_id uuid REFERENCES public.equipes(id) ON DELETE CASCADE,
  data date NOT NULL,
  hora time NOT NULL,
  local_nome text,
  limite_jogadores integer DEFAULT 999,
  abertura_inscricoes integer DEFAULT 48, -- horas antes
  fechamento_inscricoes integer DEFAULT 2, -- horas antes
  cancelamento_livre integer DEFAULT 12, -- horas antes
  valor_avulso numeric(10,2) DEFAULT 0.00,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.partidas_presencas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  partida_id uuid REFERENCES public.partidas(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES public.usuarios(id) ON DELETE CASCADE,
  status text CHECK (status IN ('confirmado', 'espera')),
  frequencia text CHECK (frequencia IN ('P', 'F', 'pendente')) DEFAULT 'pendente',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(partida_id, usuario_id)
);

CREATE TABLE IF NOT EXISTS public.punicoes_equipe (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  equipe_id uuid REFERENCES public.equipes(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES public.usuarios(id) ON DELETE CASCADE,
  partida_id uuid REFERENCES public.partidas(id) ON DELETE CASCADE,
  motivo text NOT NULL,
  status text CHECK (status IN ('ativa', 'anistiada')) DEFAULT 'ativa',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.pagamentos_avulsos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  equipe_id uuid REFERENCES public.equipes(id) ON DELETE CASCADE,
  partida_id uuid REFERENCES public.partidas(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES public.usuarios(id) ON DELETE CASCADE,
  valor_pago numeric(10,2) NOT NULL,
  status text CHECK (status IN ('pendente', 'pago')) DEFAULT 'pendente',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(partida_id, usuario_id)
);

-- ============================================================
-- 🔐 RLS POLICIES (MÓDULO DE PARTIDAS)
-- ============================================================

ALTER TABLE public.partidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partidas_presencas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.punicoes_equipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos_avulsos ENABLE ROW LEVEL SECURITY;

-- Partidas (Público ver, Admin/Dono cria)
CREATE POLICY "Leitura de partidas para membros e publico" ON public.partidas FOR SELECT USING (true);
CREATE POLICY "Gestao de partidas por admins" ON public.partidas FOR ALL USING (
  equipe_id IN (SELECT equipe_id FROM public.membros_equipe WHERE usuario_id = auth.uid() AND papel IN ('admin', 'sub_admin'))
  OR equipe_id IN (SELECT id FROM public.equipes WHERE admin_id = auth.uid())
  OR (SELECT eh_super_admin FROM public.usuarios WHERE id = auth.uid() LIMIT 1) = true
);

-- Sumula de Presença
CREATE POLICY "Leitura de presencas" ON public.partidas_presencas FOR SELECT USING (true);
CREATE POLICY "Admins c/u presencas" ON public.partidas_presencas FOR ALL USING (
  partida_id IN (
      SELECT id FROM public.partidas WHERE 
        equipe_id IN (SELECT equipe_id FROM public.membros_equipe WHERE usuario_id = auth.uid() AND papel IN ('admin', 'sub_admin'))
        OR equipe_id IN (SELECT id FROM public.equipes WHERE admin_id = auth.uid())
  )
  OR (SELECT eh_super_admin FROM public.usuarios WHERE id = auth.uid() LIMIT 1) = true
);
CREATE POLICY "Usuarios gerenciam propria presenca" ON public.partidas_presencas FOR ALL USING (
  usuario_id = auth.uid() OR auth.uid() IS NULL
);

-- Tribunal (Punições)
CREATE POLICY "Leitura de punicoes por membros" ON public.punicoes_equipe FOR SELECT USING (
  equipe_id IN (SELECT equipe_id FROM public.membros_equipe WHERE usuario_id = auth.uid())
);
CREATE POLICY "Gestao de punicoes por admins" ON public.punicoes_equipe FOR ALL USING (
  equipe_id IN (SELECT equipe_id FROM public.membros_equipe WHERE usuario_id = auth.uid() AND papel IN ('admin', 'sub_admin'))
  OR equipe_id IN (SELECT id FROM public.equipes WHERE admin_id = auth.uid())
  OR (SELECT eh_super_admin FROM public.usuarios WHERE id = auth.uid() LIMIT 1) = true
);

-- Tesouraria Avulsa
CREATE POLICY "Leitura_Pagamentos_Membros" ON public.pagamentos_avulsos FOR SELECT USING (
    equipe_id IN (SELECT equipe_id FROM public.membros_equipe WHERE usuario_id = auth.uid())
);
CREATE POLICY "Gestao_Pagamentos_Admins" ON public.pagamentos_avulsos FOR ALL USING (
    equipe_id IN (SELECT equipe_id FROM public.membros_equipe WHERE usuario_id = auth.uid() AND papel IN ('admin', 'sub_admin'))
    OR equipe_id IN (SELECT id FROM public.equipes WHERE admin_id = auth.uid())
    OR (SELECT eh_super_admin FROM public.usuarios WHERE id = auth.uid() LIMIT 1) = true
);

-- END MÓDULO PARTIDAS

-- Tabela de Interações Sociais (Cutucadas, etc)
CREATE TABLE public.interacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remetente_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
  destinatario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'cutucada',
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.interacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Interações podem ser criadas por quem envia" ON public.interacoes;
CREATE POLICY "Interações podem ser criadas por quem envia" ON public.interacoes
  FOR INSERT WITH CHECK (auth.uid() = remetente_id);

DROP POLICY IF EXISTS "Usuários podem ver interações que enviaram ou receberam" ON public.interacoes;
CREATE POLICY "Usuários podem ver interações que enviaram ou receberam" ON public.interacoes
  FOR SELECT USING (auth.uid() = remetente_id OR auth.uid() = destinatario_id);

DROP POLICY IF EXISTS "Usuários podem deletar interações recebidas" ON public.interacoes;
CREATE POLICY "Usuários podem deletar interações recebidas" ON public.interacoes
  FOR DELETE USING (auth.uid() = destinatario_id);

-- Habilita Tempo Real (Realtime)
ALTER PUBLICATION supabase_realtime ADD TABLE interacoes;

SELECT 'Schema PlayHub Consolidado v4!' as status;


-- SECTION: RPCs CONSOLIDADAS (GERENCIAMENTO E SEGURAN�A) --

-- ============================================================
-- PLAYHUB - CONSOLIDADO DE FUNÇÕES DE SEGURANÇA (RPCs) - FINAL
-- Copie e cole todo este código e clique em RUN no Supabase.
-- Isso recria as funções e manda o servidor limpar o cache.
-- ============================================================

-- Primeiro, limpar qualquer versão defeituosa
DROP FUNCTION IF EXISTS public.buscar_presencas_partida_seguro(UUID);
DROP FUNCTION IF EXISTS public.buscar_presencas_partida_seguro(UUID, UUID);
DROP FUNCTION IF EXISTS public.buscar_membros_equipe_seguro(UUID);
DROP FUNCTION IF EXISTS public.buscar_membros_equipe_seguro(UUID, UUID);
DROP FUNCTION IF EXISTS public.admin_listar_usuarios(TEXT, TEXT, INTEGER, INTEGER);

-- 3. LISTAR TODOS OS USUÁRIOS (ADMIN) - SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.admin_listar_usuarios(
    p_busca  TEXT    DEFAULT NULL,
    p_letra  TEXT    DEFAULT NULL,
    p_de     INTEGER DEFAULT 0,
    p_ate    INTEGER DEFAULT 19
)
RETURNS TABLE (
    id                          UUID,
    nome_completo               TEXT,
    apelido                     TEXT,
    email                       TEXT,
    foto_url                    TEXT,
    telefone                    TEXT,
    genero                      TEXT,
    data_nascimento             DATE,
    cep                         TEXT,
    rua                         TEXT,
    numero                      TEXT,
    complemento                 TEXT,
    bairro                      TEXT,
    cidade                      TEXT,
    estado                      TEXT,
    perfil_publico              BOOLEAN,
    compartilhar_whatsapp_match BOOLEAN,
    eh_super_admin              BOOLEAN,
    admin_permissoes            JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE public.usuarios.id = auth.uid()
          AND public.usuarios.eh_super_admin = true
    ) THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem listar todos os usuários.';
    END IF;

    RETURN QUERY
    SELECT
        u.id,
        u.nome_completo,
        u.apelido,
        u.email,
        u.foto_url,
        u.telefone,
        u.genero,
        u.data_nascimento,
        u.cep,
        u.rua,
        u.numero,
        u.complemento,
        u.bairro,
        u.cidade,
        u.estado,
        u.perfil_publico,
        u.compartilhar_whatsapp_match,
        u.eh_super_admin,
        u.admin_permissoes
    FROM public.usuarios u
    WHERE
        (
            p_busca IS NULL
            OR u.nome_completo ILIKE '%' || p_busca || '%'
            OR u.apelido       ILIKE '%' || p_busca || '%'
            OR u.email         ILIKE '%' || p_busca || '%'
        )
        AND (
            p_letra IS NULL
            OR u.nome_completo ILIKE p_letra || '%'
        )
    ORDER BY u.nome_completo ASC
    LIMIT  (p_ate - p_de + 1)
    OFFSET p_de;
END;
$$;

-- 1. BUSCAR PRESENÇAS DE UMA PARTIDA
CREATE OR REPLACE FUNCTION public.buscar_presencas_partida_seguro(p_partida_id UUID)
RETURNS TABLE (
  id UUID,
  status TEXT,
  frequencia TEXT,
  created_at TIMESTAMPTZ,
  usuario_id UUID,
  nome_completo TEXT,
  apelido TEXT,
  foto_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_equipe_id UUID;
BEGIN
  -- Qualificando tabelas públicas
  SELECT equipe_id INTO v_equipe_id FROM public.partidas WHERE public.partidas.id = p_partida_id;

  IF EXISTS (
    SELECT 1 FROM public.membros_equipe 
    WHERE public.membros_equipe.equipe_id = v_equipe_id 
    AND public.membros_equipe.usuario_id = auth.uid() 
    AND public.membros_equipe.status IN ('ativo', 'pendente')
  ) OR EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE public.usuarios.id = auth.uid() 
    AND public.usuarios.eh_super_admin = true
  ) THEN
    RETURN QUERY
    SELECT 
      pp.id,
      pp.status,
      pp.frequencia,
      pp.created_at,
      pp.usuario_id,
      u.nome_completo,
      u.apelido,
      u.foto_url
    FROM public.partidas_presencas pp
    JOIN public.usuarios u ON pp.usuario_id = u.id
    WHERE pp.partida_id = p_partida_id
    ORDER BY pp.created_at ASC;
  END IF;
END;
$$;

-- 2. BUSCAR MEMBROS DA EQUIPE
CREATE OR REPLACE FUNCTION public.buscar_membros_equipe_seguro(p_equipe_id UUID)
RETURNS TABLE (
    id UUID,
    usuario_id UUID,
    papel TEXT,
    permissoes JSONB,
    vinculo TEXT,
    status TEXT,
    entrou_em TIMESTAMPTZ,
    nome_completo TEXT,
    apelido TEXT,
    foto_url TEXT,
    cidade TEXT,
    estado TEXT,
    email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.membros_equipe 
        WHERE public.membros_equipe.equipe_id = p_equipe_id 
        AND public.membros_equipe.usuario_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.usuarios 
        WHERE public.usuarios.id = auth.uid() 
        AND (public.usuarios.eh_super_admin = true OR public.usuarios.email = 'michelssouza@gmail.com')
    ) THEN
        RETURN QUERY
        SELECT 
            me.id,
            me.usuario_id,
            me.papel,
            me.permissoes,
            me.vinculo,
            me.status,
            me.entrou_em,
            u.nome_completo,
            u.apelido,
            u.foto_url,
            u.cidade,
            u.estado,
            u.email
        FROM public.membros_equipe me
        JOIN public.usuarios u ON me.usuario_id = u.id
        WHERE me.equipe_id = p_equipe_id
          AND me.status IN ('ativo', 'pendente');
    END IF;
END;
$$;

-- Permissões Padrões
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Força o Supabase a recarregar a lista de funções disponíveis
NOTIFY pgrst, 'reload schema';


-- SECTION: ADMIN ESTATISTICAS SISTEMA --

-- ============================================================
-- PLAYHUB - ESTATÍSTICAS GLOBAIS & TRACKING DE ACESSOS (V4 - FIX LOCALIZAÇÃO)
-- 
-- Normalização agressiva de cidades para evitar duplicidade 
-- (Itaquaquecetuba, SP vs Itaquaquecetuba)
-- ============================================================

ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS ultimo_acesso TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_acessos INTEGER DEFAULT 0;

CREATE OR REPLACE FUNCTION public.registrar_acesso()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.usuarios
    SET ultimo_acesso = now(),
        total_acessos = total_acessos + 1
    WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_acesso() TO authenticated;

-- FUNÇÃO DE NORMALIZAÇÃO DE CIDADE (AUXILIAR INTERNA)
-- Remove estado, espaços extras e normaliza para título
CREATE OR REPLACE FUNCTION public.normalizar_nome_cidade(p_cidade TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_cidade TEXT;
BEGIN
    IF p_cidade IS NULL THEN RETURN NULL; END IF;
    
    -- Pega apenas o que vem antes da vírgula (se houver)
    v_cidade = split_part(p_cidade, ',', 1);
    -- Remove hífens de estado (ex: Curitiba-PR)
    v_cidade = split_part(v_cidade, '-', 1);
    -- Limpa espaços
    v_cidade = trim(v_cidade);
    -- Normaliza para Primeira Letra Maiúscula
    RETURN initcap(v_cidade);
END;
$$;

-- DASHBOARD DE ESTATÍSTICAS REFINADO
DROP FUNCTION IF EXISTS public.admin_obter_estatisticas_sistema();

CREATE OR REPLACE FUNCTION public.admin_obter_estatisticas_sistema()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_resultado JSONB;
    v_total_usuarios INTEGER;
    v_total_equipes INTEGER;
    v_total_partidas INTEGER;
BEGIN
    -- Verificar permissão de Super Admin
    IF NOT EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE id = auth.uid() AND (eh_super_admin = true OR email = 'michelssouza@gmail.com')
    ) THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem ver estatísticas globais.';
    END IF;

    -- Contagens Básicas
    SELECT count(*) INTO v_total_usuarios FROM public.usuarios;
    SELECT count(*) INTO v_total_equipes FROM public.equipes;
    SELECT count(*) INTO v_total_partidas FROM public.partidas;

    -- Construir JSON de resposta
    v_resultado = jsonb_build_object(
        'geral', jsonb_build_object(
            'total_usuarios', v_total_usuarios,
            'total_equipes', v_total_equipes,
            'total_partidas', v_total_partidas
        ),
        
        'vinculo_atletas', jsonb_build_object(
            'sem_equipe', (
                SELECT count(*) FROM public.usuarios u 
                WHERE NOT EXISTS (SELECT 1 FROM public.membros_equipe me WHERE me.usuario_id = u.id AND me.status = 'ativo')
            ),
            'uma_equipe', (
                SELECT count(*) FROM (
                    SELECT usuario_id FROM public.membros_equipe 
                    WHERE status = 'ativo'
                    GROUP BY usuario_id HAVING count(*) = 1
                ) sub
            ),
            'multi_equipe', (
                SELECT count(*) FROM (
                    SELECT usuario_id FROM public.membros_equipe 
                    WHERE status = 'ativo'
                    GROUP BY usuario_id HAVING count(*) > 1
                ) sub
            )
        ),

        'usuarios_demografia', jsonb_build_object(
            'genero', (
                SELECT jsonb_object_agg(coalesce(genero, 'Não Informado'), total)
                FROM (
                    SELECT genero, count(*) as total 
                    FROM public.usuarios 
                    GROUP BY genero
                ) s
            ),
            'faixa_etaria', (
                SELECT jsonb_build_object(
                    'maiores', count(*) FILTER (WHERE age(data_nascimento) >= interval '18 years'),
                    'menores', count(*) FILTER (WHERE age(data_nascimento) < interval '18 years'),
                    'nao_informado', count(*) FILTER (WHERE data_nascimento IS NULL)
                )
                FROM public.usuarios
            ),
            'cidades', (
                SELECT jsonb_agg(d)
                FROM (
                    SELECT public.normalizar_nome_cidade(cidade) as cidade, upper(trim(estado)) as estado, count(*) as total
                    FROM public.usuarios
                    WHERE cidade IS NOT NULL
                    GROUP BY public.normalizar_nome_cidade(cidade), upper(trim(estado))
                    ORDER BY total DESC
                    LIMIT 10
                ) d
            )
        ),

        'equipes_estatisticas', jsonb_build_object(
            'modalidades', (
                SELECT jsonb_agg(m)
                FROM (
                    SELECT modalidade, count(*) as total
                    FROM public.equipes
                    GROUP BY modalidade
                    ORDER BY total DESC
                    LIMIT 10
                ) m
            ),
            'cidades', (
                SELECT jsonb_agg(c)
                FROM (
                    SELECT public.normalizar_nome_cidade(cidade) as cidade, upper(trim(estado)) as estado, count(*) as total
                    FROM public.equipes
                    WHERE cidade IS NOT NULL
                    GROUP BY public.normalizar_nome_cidade(cidade), upper(trim(estado))
                    ORDER BY total DESC
                    LIMIT 10
                ) c
            )
        ),

        'esportes_interesses', (
            SELECT jsonb_agg(i)
            FROM (
                SELECT esporte, count(*) as total
                FROM (
                    SELECT unnest(esportes_interesse) as esporte
                    FROM public.usuarios
                    WHERE esportes_interesse IS NOT NULL
                ) sub
                GROUP BY esporte
                ORDER BY total DESC
                LIMIT 15
            ) i
        ),

        'logs_acesso', (
            SELECT jsonb_agg(l)
            FROM (
                SELECT 
                    coalesce(apelido, split_part(nome_completo, ' ', 1)) as nome,
                    total_acessos,
                    ultimo_acesso
                FROM public.usuarios
                WHERE total_acessos > 0
                ORDER BY ultimo_acesso DESC
                LIMIT 30
            ) l
        ),

        'logs_sistema', (
            SELECT jsonb_agg(ls)
            FROM (
                SELECT 
                    s.id,
                    s.criado_em,
                    s.tipo,
                    s.mensagem,
                    s.pagina,
                    u.nome_completo as usuario_nome
                FROM public.logs_sistema s
                LEFT JOIN public.usuarios u ON u.id = s.usuario_id
                ORDER BY s.criado_em DESC
                LIMIT 50
            ) ls
        )
    );

    RETURN v_resultado;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_obter_estatisticas_sistema() TO authenticated;

NOTIFY pgrst, 'reload schema';


-- SECTION: ADMIN ATUALIZAR USUARIO --

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


-- SECTION: ADMIN LOGS SISTEMA DETALHADO --

-- ============================================================
-- PLAYHUB - CENTRAL DE MONITORAMENTO GLOBAL (RPC AVANÇADA)
-- 
-- Função para busca paginada e filtrada de logs de sistema.
-- ============================================================

-- Remover função antiga para permitir mudança na assinatura (id -> log_id)
DROP FUNCTION IF EXISTS public.admin_listar_logs_sistema(TEXT, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.admin_listar_logs_sistema(
    p_tipo TEXT DEFAULT NULL,
    p_busca TEXT DEFAULT NULL,
    p_limite INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    log_id UUID,
    criado_em TIMESTAMPTZ,
    tipo TEXT,
    mensagem TEXT,
    pagina TEXT,
    metadata JSONB,
    usuario_nome TEXT,
    usuario_email TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verificar permissão de Super Admin
    IF NOT EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE id = auth.uid() AND (eh_super_admin = true OR email = 'michelssouza@gmail.com')
    ) THEN
        RAISE EXCEPTION 'Acesso negado.';
    END IF;

    RETURN QUERY
    SELECT 
        s.id as log_id,
        s.criado_em,
        s.tipo,
        s.mensagem,
        s.pagina,
        s.metadata,
        u.nome_completo as usuario_nome,
        u.email as usuario_email
    FROM public.logs_sistema s
    LEFT JOIN public.usuarios u ON u.id = s.usuario_id
    WHERE 
        (p_tipo IS NULL OR s.tipo = p_tipo)
        AND (
            p_busca IS NULL 
            OR s.mensagem ILIKE '%' || p_busca || '%'
            OR u.nome_completo ILIKE '%' || p_busca || '%'
            OR u.email ILIKE '%' || p_busca || '%'
            OR s.pagina ILIKE '%' || p_busca || '%'
        )
    ORDER BY s.criado_em DESC
    LIMIT p_limite
    OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_listar_logs_sistema(TEXT, TEXT, INTEGER, INTEGER) TO authenticated;


-- SECTION: EXCLUIR USUARIO SEGURO --

-- ============================================================
-- PLAYHUB - EXCLUSÃO SEGURA DE USUÁRIO (V2)
-- 
-- Esta função realiza a exclusão definitiva de um usuário,
-- garantindo que Capitães de equipes não deixem times órfãos.
-- ============================================================

-- Remove versão anterior se existir
DROP FUNCTION IF EXISTS public.admin_excluir_usuario(UUID);
DROP FUNCTION IF EXISTS public.admin_excluir_usuario_v2(UUID);

CREATE OR REPLACE FUNCTION public.admin_excluir_usuario_v2(
    p_usuario_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Permite deletar registros protegidos e acessar auth.users
SET search_path = public, auth
AS $$
DECLARE
    v_equipes_lideradas TEXT;
    v_is_super_admin BOOLEAN;
BEGIN
    -- 1. Verificar permissão: Ou é o próprio usuário ou é um Super Admin
    SELECT eh_super_admin INTO v_is_super_admin FROM public.usuarios WHERE id = auth.uid();
    
    IF auth.uid() <> p_usuario_id AND (v_is_super_admin IS NULL OR v_is_super_admin = false) THEN
        RAISE EXCEPTION 'Acesso negado: Você não tem permissão para excluir esta conta.';
    END IF;

    -- 2. Verificar se o usuário é capitão de equipes ativas
    SELECT string_agg(nome, ', ') INTO v_equipes_lideradas
    FROM public.equipes
    WHERE admin_id = p_usuario_id;

    IF v_equipes_lideradas IS NOT NULL THEN
        RAISE EXCEPTION 'Não é possível excluir a conta. Este usuário é Capitão das equipes: %. Transfira a posse ou exclua as equipes primeiro.', v_equipes_lideradas;
    END IF;

    -- 3. Limpar dados em tabelas relacionadas (Segurança extra caso não haja CASCADE)
    DELETE FROM public.partidas_presencas WHERE usuario_id = p_usuario_id;
    DELETE FROM public.membros_equipe WHERE usuario_id = p_usuario_id;
    
    -- 4. Excluir perfil público
    DELETE FROM public.usuarios WHERE id = p_usuario_id;

    -- 5. Excluir usuário do Supabase Auth (Sistema de Login)
    -- Nota: Requer que a função tenha SECURITY DEFINER e acesso ao schema auth
    DELETE FROM auth.users WHERE id = p_usuario_id;

END;
$$;

-- Permite que usuários autenticados chamem a função (a lógica interna valida se é a própria conta)
GRANT EXECUTE ON FUNCTION public.admin_excluir_usuario_v2(UUID) TO authenticated;

-- Força o Supabase a recarregar o esquema
NOTIFY pgrst, 'reload schema';


-- SECTION: HISTORICO DE MIGRATIONS (SUPABASE CLI) --


-- Migration: 20240326_corrige_cancelar_solicitacao.sql --

-- Função para cancelar solicitação de ingresso feita pelo próprio usuário
CREATE OR REPLACE FUNCTION cancelar_solicitacao_ingresso(
  p_equipe_id UUID,
  p_usuario_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_admin_id UUID;
  v_linhas_removidas INT;
BEGIN
  -- Verificar se o usuário está pedindo para si mesmo
  IF auth.uid() IS NULL OR p_usuario_id != auth.uid() THEN
    RAISE EXCEPTION 'Apenas o próprio usuário pode cancelar sua solicitação.';
  END IF;

  -- 1. Obter o admin_id da equipe para depois remover a notificação
  SELECT admin_id INTO v_admin_id FROM public.equipes WHERE id = p_equipe_id;

  -- 2. Remover a solicitação pendente do membro
  DELETE FROM public.membros_equipe 
  WHERE equipe_id = p_equipe_id 
    AND usuario_id = p_usuario_id 
    AND status = 'pendente';

  GET DIAGNOSTICS v_linhas_removidas = ROW_COUNT;

  IF v_linhas_removidas = 0 THEN
    RETURN FALSE; -- Nada foi removido
  END IF;

  -- 3. Tentar remover a notificação (interação) se existir
  IF v_admin_id IS NOT NULL THEN
    DELETE FROM public.interacoes
    WHERE remetente_id = p_usuario_id
      AND destinatario_id = v_admin_id
      AND tipo = 'solicitacao_ingresso'
      AND payload->>'equipe_id' = p_equipe_id::text;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migration: 20240326_corrige_interacoes_payload.sql --

-- 1. Adicionar a coluna payload (JSONB) à tabela interacoes, se não existir
ALTER TABLE public.interacoes ADD COLUMN IF NOT EXISTS payload JSONB;

-- 2. Atualizar a RPC para garantir que ela acesse o payload corretamente
CREATE OR REPLACE FUNCTION cancelar_solicitacao_ingresso(
  p_equipe_id UUID,
  p_usuario_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_admin_id UUID;
  v_linhas_removidas INT;
BEGIN
  -- Verificar se o usuário está pedindo para si mesmo
  IF auth.uid() IS NULL OR p_usuario_id != auth.uid() THEN
    RAISE EXCEPTION 'Apenas o próprio usuário pode cancelar sua solicitação.';
  END IF;

  SELECT admin_id INTO v_admin_id FROM public.equipes WHERE id = p_equipe_id;

  -- Remove a solicitação
  DELETE FROM public.membros_equipe 
  WHERE equipe_id = p_equipe_id AND usuario_id = p_usuario_id AND status = 'pendente';

  GET DIAGNOSTICS v_linhas_removidas = ROW_COUNT;
  IF v_linhas_removidas = 0 THEN
    RETURN FALSE; 
  END IF;

  -- Remove a notificação global do painel do Capitão
  IF v_admin_id IS NOT NULL THEN
    DELETE FROM public.interacoes
    WHERE remetente_id = p_usuario_id AND destinatario_id = v_admin_id AND tipo = 'solicitacao_ingresso' AND payload->>'equipe_id' = p_equipe_id::text;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
