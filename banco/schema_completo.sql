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
SELECT 'Schema PlayHub Consolidado Completamente com RPCs, RLS Refinado e Modulo de Partidas!' as status;
