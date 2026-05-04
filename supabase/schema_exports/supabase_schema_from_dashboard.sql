-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.ciclos_financeiros (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  equipe_id uuid NOT NULL,
  periodo text NOT NULL,
  valor_mensalidade_snapshot numeric NOT NULL,
  custo_quadra_snapshot numeric DEFAULT 0,
  status text DEFAULT 'aberto'::text CHECK (status = ANY (ARRAY['aberto'::text, 'fechado'::text])),
  chave_pix_snapshot text,
  dia_vencimento_snapshot integer,
  criado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT ciclos_financeiros_pkey PRIMARY KEY (id),
  CONSTRAINT ciclos_financeiros_equipe_id_fkey FOREIGN KEY (equipe_id) REFERENCES public.equipes(id)
);
CREATE TABLE public.convites_equipe (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  equipe_id uuid,
  jogador_id uuid,
  admin_id uuid,
  mensagem_convite text,
  mensagem_resposta text,
  status text DEFAULT 'pendente'::text CHECK (status = ANY (ARRAY['pendente'::text, 'aceito'::text, 'recusado'::text])),
  criado_em timestamp with time zone DEFAULT now(),
  respondido_em timestamp with time zone,
  CONSTRAINT convites_equipe_pkey PRIMARY KEY (id),
  CONSTRAINT convites_equipe_jogador_id_fkey FOREIGN KEY (jogador_id) REFERENCES public.usuarios(id),
  CONSTRAINT convites_equipe_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.usuarios(id),
  CONSTRAINT convites_equipe_equipe_id_fkey FOREIGN KEY (equipe_id) REFERENCES public.equipes(id)
);
CREATE TABLE public.equipes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  modalidade text NOT NULL,
  icone text DEFAULT 'trophy'::text,
  visibilidade text DEFAULT 'publica'::text,
  status text DEFAULT 'ativo'::text,
  max_jogadores integer DEFAULT 20,
  observacoes text,
  admin_id uuid,
  ultima_atividade timestamp with time zone DEFAULT now(),
  criado_em timestamp with time zone DEFAULT now(),
  cidade text,
  estado text,
  nivel text,
  logo_url text,
  slug_convite text DEFAULT encode(gen_random_bytes(6), 'hex'::text) UNIQUE,
  localizacao text,
  local_cep text,
  local_rua text,
  local_bairro text,
  local_cidade text,
  local_estado text,
  local_complemento text,
  local_nome text,
  local_numero text,
  local_mapa_link text,
  link_grupo text,
  regras jsonb,
  admin_id_pendente uuid,
  data_solicitacao_posse timestamp with time zone,
  latitude double precision,
  longitude double precision,
  gestao_financeira boolean DEFAULT true,
  aceitando_membros boolean DEFAULT true,
  CONSTRAINT equipes_pkey PRIMARY KEY (id),
  CONSTRAINT equipes_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.usuarios(id),
  CONSTRAINT equipes_admin_id_pendente_fkey FOREIGN KEY (admin_id_pendente) REFERENCES public.usuarios(id)
);
CREATE TABLE public.financeiro_config (
  equipe_id uuid NOT NULL,
  valor_mensalidade numeric DEFAULT 50,
  valor_avulso_padrao numeric DEFAULT 20,
  dia_vencimento integer DEFAULT 10,
  dia_tolerancia integer DEFAULT 15,
  atualizado_em timestamp with time zone DEFAULT now(),
  custo_quadra numeric DEFAULT 0,
  limite_vencimento_horas integer DEFAULT 24,
  chave_pix text,
  CONSTRAINT financeiro_config_pkey PRIMARY KEY (equipe_id),
  CONSTRAINT financeiro_config_equipe_id_fkey FOREIGN KEY (equipe_id) REFERENCES public.equipes(id)
);
CREATE TABLE public.interacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  remetente_id uuid,
  destinatario_id uuid,
  tipo text NOT NULL DEFAULT 'cutucada'::text,
  criado_em timestamp with time zone DEFAULT now(),
  payload jsonb,
  CONSTRAINT interacoes_pkey PRIMARY KEY (id),
  CONSTRAINT interacoes_remetente_id_fkey FOREIGN KEY (remetente_id) REFERENCES public.usuarios(id),
  CONSTRAINT interacoes_destinatario_id_fkey FOREIGN KEY (destinatario_id) REFERENCES public.usuarios(id)
);
CREATE TABLE public.jogador_modalidades (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  modalidade text NOT NULL,
  posicao text,
  nivel_habilidade text,
  criado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT jogador_modalidades_pkey PRIMARY KEY (id),
  CONSTRAINT jogador_modalidades_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id)
);
CREATE TABLE public.logs_sistema (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  criado_em timestamp with time zone DEFAULT now(),
  usuario_id uuid,
  tipo text,
  mensagem text,
  pagina text,
  metadata jsonb,
  CONSTRAINT logs_sistema_pkey PRIMARY KEY (id),
  CONSTRAINT logs_sistema_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id)
);
CREATE TABLE public.membros_equipe (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  equipe_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  papel text DEFAULT 'jogador'::text,
  permissoes jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pendente'::text,
  entrou_em timestamp with time zone DEFAULT now(),
  vinculo text DEFAULT 'avulso'::text CHECK (vinculo = ANY (ARRAY['avulso'::text, 'mensalista'::text])),
  nivel_lideranca integer CHECK (nivel_lideranca >= 1 AND nivel_lideranca <= 5),
  CONSTRAINT membros_equipe_pkey PRIMARY KEY (id),
  CONSTRAINT membros_equipe_equipe_id_fkey FOREIGN KEY (equipe_id) REFERENCES public.equipes(id),
  CONSTRAINT membros_equipe_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id)
);
CREATE TABLE public.mensalidades (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  equipe_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  periodo text NOT NULL,
  valor_configurado numeric NOT NULL,
  status text DEFAULT 'pendente'::text CHECK (status = ANY (ARRAY['pendente'::text, 'pago'::text, 'isento'::text, 'atrasado'::text])),
  pago_em timestamp with time zone,
  criado_em timestamp with time zone DEFAULT now(),
  atualizado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT mensalidades_pkey PRIMARY KEY (id),
  CONSTRAINT mensalidades_equipe_id_fkey FOREIGN KEY (equipe_id) REFERENCES public.equipes(id),
  CONSTRAINT mensalidades_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id)
);
CREATE TABLE public.pagamentos_avulsos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partida_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  valor_pago numeric NOT NULL,
  pago_em timestamp with time zone DEFAULT now(),
  status text DEFAULT 'pendente'::text CHECK (status = ANY (ARRAY['pendente'::text, 'pago'::text])),
  equipe_id uuid,
  CONSTRAINT pagamentos_avulsos_pkey PRIMARY KEY (id),
  CONSTRAINT pagamentos_avulsos_partida_id_fkey FOREIGN KEY (partida_id) REFERENCES public.partidas(id),
  CONSTRAINT pagamentos_avulsos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id),
  CONSTRAINT pagamentos_avulsos_equipe_id_fkey FOREIGN KEY (equipe_id) REFERENCES public.equipes(id)
);
CREATE TABLE public.partida_presencas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partida_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  status text DEFAULT 'confirmado'::text,
  tipo_jogador text DEFAULT 'avulso'::text,
  criado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT partida_presencas_pkey PRIMARY KEY (id),
  CONSTRAINT partida_presencas_partida_id_fkey FOREIGN KEY (partida_id) REFERENCES public.partidas(id),
  CONSTRAINT partida_presencas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id)
);
CREATE TABLE public.partidas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  equipe_id uuid NOT NULL,
  data date NOT NULL,
  hora time without time zone NOT NULL,
  local_nome text,
  vagas integer NOT NULL DEFAULT 14,
  valor_avulso numeric DEFAULT 0.00,
  status text DEFAULT 'agendada'::text,
  criado_em timestamp with time zone DEFAULT now(),
  times_sorteados jsonb,
  CONSTRAINT partidas_pkey PRIMARY KEY (id),
  CONSTRAINT partidas_equipe_id_fkey FOREIGN KEY (equipe_id) REFERENCES public.equipes(id)
);
CREATE TABLE public.partidas_presencas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partida_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'confirmado'::text CHECK (status = ANY (ARRAY['confirmado'::text, 'espera'::text, 'cancelado'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  frequencia text DEFAULT 'pendente'::text CHECK (frequencia = ANY (ARRAY['P'::text, 'F'::text, 'pendente'::text])),
  CONSTRAINT partidas_presencas_pkey PRIMARY KEY (id),
  CONSTRAINT partidas_presencas_partida_id_fkey FOREIGN KEY (partida_id) REFERENCES public.partidas(id),
  CONSTRAINT partidas_presencas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id)
);
CREATE TABLE public.punicoes_equipe (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  equipe_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  partida_id uuid,
  motivo text NOT NULL,
  ativa boolean DEFAULT true,
  criado_em timestamp with time zone DEFAULT now(),
  tipo_cartao text DEFAULT 'vermelho'::text,
  CONSTRAINT punicoes_equipe_pkey PRIMARY KEY (id),
  CONSTRAINT punicoes_equipe_equipe_id_fkey FOREIGN KEY (equipe_id) REFERENCES public.equipes(id),
  CONSTRAINT punicoes_equipe_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id),
  CONSTRAINT punicoes_equipe_partida_id_fkey FOREIGN KEY (partida_id) REFERENCES public.partidas(id)
);
CREATE TABLE public.usuarios (
  id uuid NOT NULL,
  nome_completo text NOT NULL,
  email text NOT NULL,
  eh_super_admin boolean DEFAULT false,
  status text DEFAULT 'ativo'::text,
  criado_em timestamp with time zone DEFAULT now(),
  apelido text,
  data_nascimento date,
  genero text,
  telefone text,
  cep text,
  rua text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  foto_url text,
  perfil_publico boolean DEFAULT true,
  esportes_interesse ARRAY DEFAULT '{}'::text[],
  atualizado_em timestamp with time zone DEFAULT now(),
  latitude double precision,
  longitude double precision,
  compartilhar_whatsapp_match boolean DEFAULT false,
  admin_permissoes jsonb DEFAULT '{"equipes": false, "usuarios": false}'::jsonb,
  ultimo_acesso timestamp with time zone,
  total_acessos integer DEFAULT 0,
  CONSTRAINT usuarios_pkey PRIMARY KEY (id),
  CONSTRAINT usuarios_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.votos_mvp (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partida_id uuid,
  eleitor_id uuid,
  candidato_id uuid,
  equipe_id uuid,
  posicao smallint CHECK (posicao = ANY (ARRAY[1, 2, 3])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT votos_mvp_pkey PRIMARY KEY (id),
  CONSTRAINT votos_mvp_partida_id_fkey FOREIGN KEY (partida_id) REFERENCES public.partidas(id),
  CONSTRAINT votos_mvp_eleitor_id_fkey FOREIGN KEY (eleitor_id) REFERENCES public.usuarios(id),
  CONSTRAINT votos_mvp_candidato_id_fkey FOREIGN KEY (candidato_id) REFERENCES public.usuarios(id),
  CONSTRAINT votos_mvp_equipe_id_fkey FOREIGN KEY (equipe_id) REFERENCES public.equipes(id)
);
CREATE TABLE public.votos_time (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partida_id uuid,
  equipe_id uuid,
  eleitor_id uuid,
  time_escolhido text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  posicao integer DEFAULT 1,
  CONSTRAINT votos_time_pkey PRIMARY KEY (id),
  CONSTRAINT votos_time_partida_id_fkey FOREIGN KEY (partida_id) REFERENCES public.partidas(id),
  CONSTRAINT votos_time_equipe_id_fkey FOREIGN KEY (equipe_id) REFERENCES public.equipes(id),
  CONSTRAINT votos_time_eleitor_id_fkey FOREIGN KEY (eleitor_id) REFERENCES public.usuarios(id)
);
