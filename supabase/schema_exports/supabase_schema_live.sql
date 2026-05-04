-- PlayHub Supabase live schema introspection
-- Generated at 2026-05-04T14:29:45.582Z
-- Schema-only export. No table data included.

-- extension: pg_stat_statements 1.11
-- extension: pgcrypto 1.3
-- extension: plpgsql 1.0
-- extension: supabase_vault 0.3.1
-- extension: uuid-ossp 1.1

CREATE TABLE "auth"."audit_log_entries" (
  "instance_id" uuid,
  "id" uuid NOT NULL,
  "payload" json,
  "created_at" timestamp with time zone,
  "ip_address" character varying(64) DEFAULT ''::character varying NOT NULL
);
ALTER TABLE "auth"."audit_log_entries" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "auth"."custom_oauth_providers" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "provider_type" text NOT NULL,
  "identifier" text NOT NULL,
  "name" text NOT NULL,
  "client_id" text NOT NULL,
  "client_secret" text NOT NULL,
  "acceptable_client_ids" text[] DEFAULT '{}'::text[] NOT NULL,
  "scopes" text[] DEFAULT '{}'::text[] NOT NULL,
  "pkce_enabled" boolean DEFAULT true NOT NULL,
  "attribute_mapping" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "authorization_params" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "email_optional" boolean DEFAULT false NOT NULL,
  "issuer" text,
  "discovery_url" text,
  "skip_nonce_check" boolean DEFAULT false NOT NULL,
  "cached_discovery" jsonb,
  "discovery_cached_at" timestamp with time zone,
  "authorization_url" text,
  "token_url" text,
  "userinfo_url" text,
  "jwks_uri" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "auth"."flow_state" (
  "id" uuid NOT NULL,
  "user_id" uuid,
  "auth_code" text,
  "code_challenge_method" auth.code_challenge_method,
  "code_challenge" text,
  "provider_type" text NOT NULL,
  "provider_access_token" text,
  "provider_refresh_token" text,
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone,
  "authentication_method" text NOT NULL,
  "auth_code_issued_at" timestamp with time zone,
  "invite_token" text,
  "referrer" text,
  "oauth_client_state_id" uuid,
  "linking_target_id" uuid,
  "email_optional" boolean DEFAULT false NOT NULL
);
ALTER TABLE "auth"."flow_state" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "auth"."identities" (
  "provider_id" text NOT NULL,
  "user_id" uuid NOT NULL,
  "identity_data" jsonb NOT NULL,
  "provider" text NOT NULL,
  "last_sign_in_at" timestamp with time zone,
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone,
  "email" text DEFAULT lower((identity_data ->> 'email'::text)),
  "id" uuid DEFAULT gen_random_uuid() NOT NULL
);
ALTER TABLE "auth"."identities" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "auth"."instances" (
  "id" uuid NOT NULL,
  "uuid" uuid,
  "raw_base_config" text,
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone
);
ALTER TABLE "auth"."instances" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "auth"."mfa_amr_claims" (
  "session_id" uuid NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL,
  "authentication_method" text NOT NULL,
  "id" uuid NOT NULL
);
ALTER TABLE "auth"."mfa_amr_claims" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "auth"."mfa_challenges" (
  "id" uuid NOT NULL,
  "factor_id" uuid NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  "verified_at" timestamp with time zone,
  "ip_address" inet NOT NULL,
  "otp_code" text,
  "web_authn_session_data" jsonb
);
ALTER TABLE "auth"."mfa_challenges" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "auth"."mfa_factors" (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "friendly_name" text,
  "factor_type" auth.factor_type NOT NULL,
  "status" auth.factor_status NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL,
  "secret" text,
  "phone" text,
  "last_challenged_at" timestamp with time zone,
  "web_authn_credential" jsonb,
  "web_authn_aaguid" uuid,
  "last_webauthn_challenge_data" jsonb
);
ALTER TABLE "auth"."mfa_factors" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "auth"."oauth_authorizations" (
  "id" uuid NOT NULL,
  "authorization_id" text NOT NULL,
  "client_id" uuid NOT NULL,
  "user_id" uuid,
  "redirect_uri" text NOT NULL,
  "scope" text NOT NULL,
  "state" text,
  "resource" text,
  "code_challenge" text,
  "code_challenge_method" auth.code_challenge_method,
  "response_type" auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
  "status" auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
  "authorization_code" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
  "approved_at" timestamp with time zone,
  "nonce" text
);

CREATE TABLE "auth"."oauth_client_states" (
  "id" uuid NOT NULL,
  "provider_type" text NOT NULL,
  "code_verifier" text,
  "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "auth"."oauth_clients" (
  "id" uuid NOT NULL,
  "client_secret_hash" text,
  "registration_type" auth.oauth_registration_type NOT NULL,
  "redirect_uris" text NOT NULL,
  "grant_types" text NOT NULL,
  "client_name" text,
  "client_uri" text,
  "logo_uri" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  "client_type" auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
  "token_endpoint_auth_method" text NOT NULL
);

CREATE TABLE "auth"."oauth_consents" (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "client_id" uuid NOT NULL,
  "scopes" text NOT NULL,
  "granted_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revoked_at" timestamp with time zone
);

CREATE TABLE "auth"."one_time_tokens" (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "token_type" auth.one_time_token_type NOT NULL,
  "token_hash" text NOT NULL,
  "relates_to" text NOT NULL,
  "created_at" timestamp without time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp without time zone DEFAULT now() NOT NULL
);
ALTER TABLE "auth"."one_time_tokens" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "auth"."refresh_tokens" (
  "instance_id" uuid,
  "id" bigint DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass) NOT NULL,
  "token" character varying(255),
  "user_id" character varying(255),
  "revoked" boolean,
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone,
  "parent" character varying(255),
  "session_id" uuid
);
ALTER TABLE "auth"."refresh_tokens" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "auth"."saml_providers" (
  "id" uuid NOT NULL,
  "sso_provider_id" uuid NOT NULL,
  "entity_id" text NOT NULL,
  "metadata_xml" text NOT NULL,
  "metadata_url" text,
  "attribute_mapping" jsonb,
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone,
  "name_id_format" text
);
ALTER TABLE "auth"."saml_providers" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "auth"."saml_relay_states" (
  "id" uuid NOT NULL,
  "sso_provider_id" uuid NOT NULL,
  "request_id" text NOT NULL,
  "for_email" text,
  "redirect_to" text,
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone,
  "flow_state_id" uuid
);
ALTER TABLE "auth"."saml_relay_states" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "auth"."schema_migrations" (
  "version" character varying(255) NOT NULL
);
ALTER TABLE "auth"."schema_migrations" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "auth"."sessions" (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone,
  "factor_id" uuid,
  "aal" auth.aal_level,
  "not_after" timestamp with time zone,
  "refreshed_at" timestamp without time zone,
  "user_agent" text,
  "ip" inet,
  "tag" text,
  "oauth_client_id" uuid,
  "refresh_token_hmac_key" text,
  "refresh_token_counter" bigint,
  "scopes" text
);
ALTER TABLE "auth"."sessions" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "auth"."sso_domains" (
  "id" uuid NOT NULL,
  "sso_provider_id" uuid NOT NULL,
  "domain" text NOT NULL,
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone
);
ALTER TABLE "auth"."sso_domains" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "auth"."sso_providers" (
  "id" uuid NOT NULL,
  "resource_id" text,
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone,
  "disabled" boolean
);
ALTER TABLE "auth"."sso_providers" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "auth"."users" (
  "instance_id" uuid,
  "id" uuid NOT NULL,
  "aud" character varying(255),
  "role" character varying(255),
  "email" character varying(255),
  "encrypted_password" character varying(255),
  "email_confirmed_at" timestamp with time zone,
  "invited_at" timestamp with time zone,
  "confirmation_token" character varying(255),
  "confirmation_sent_at" timestamp with time zone,
  "recovery_token" character varying(255),
  "recovery_sent_at" timestamp with time zone,
  "email_change_token_new" character varying(255),
  "email_change" character varying(255),
  "email_change_sent_at" timestamp with time zone,
  "last_sign_in_at" timestamp with time zone,
  "raw_app_meta_data" jsonb,
  "raw_user_meta_data" jsonb,
  "is_super_admin" boolean,
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone,
  "phone" text DEFAULT NULL::character varying,
  "phone_confirmed_at" timestamp with time zone,
  "phone_change" text DEFAULT ''::character varying,
  "phone_change_token" character varying(255) DEFAULT ''::character varying,
  "phone_change_sent_at" timestamp with time zone,
  "confirmed_at" timestamp with time zone DEFAULT LEAST(email_confirmed_at, phone_confirmed_at),
  "email_change_token_current" character varying(255) DEFAULT ''::character varying,
  "email_change_confirm_status" smallint DEFAULT 0,
  "banned_until" timestamp with time zone,
  "reauthentication_token" character varying(255) DEFAULT ''::character varying,
  "reauthentication_sent_at" timestamp with time zone,
  "is_sso_user" boolean DEFAULT false NOT NULL,
  "deleted_at" timestamp with time zone,
  "is_anonymous" boolean DEFAULT false NOT NULL
);
ALTER TABLE "auth"."users" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "auth"."webauthn_challenges" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "challenge_type" text NOT NULL,
  "session_data" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL
);

CREATE TABLE "auth"."webauthn_credentials" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "credential_id" bytea NOT NULL,
  "public_key" bytea NOT NULL,
  "attestation_type" text DEFAULT ''::text NOT NULL,
  "aaguid" uuid,
  "sign_count" bigint DEFAULT 0 NOT NULL,
  "transports" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "backup_eligible" boolean DEFAULT false NOT NULL,
  "backed_up" boolean DEFAULT false NOT NULL,
  "friendly_name" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_used_at" timestamp with time zone
);

CREATE TABLE "public"."ciclos_financeiros" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "equipe_id" uuid NOT NULL,
  "periodo" text NOT NULL,
  "valor_mensalidade_snapshot" numeric(10,2) NOT NULL,
  "custo_quadra_snapshot" numeric(10,2) DEFAULT 0,
  "status" text DEFAULT 'aberto'::text,
  "chave_pix_snapshot" text,
  "dia_vencimento_snapshot" integer,
  "criado_em" timestamp with time zone DEFAULT now()
);
ALTER TABLE "public"."ciclos_financeiros" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."convites_equipe" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "equipe_id" uuid,
  "jogador_id" uuid,
  "admin_id" uuid,
  "mensagem_convite" text,
  "mensagem_resposta" text,
  "status" text DEFAULT 'pendente'::text,
  "criado_em" timestamp with time zone DEFAULT now(),
  "respondido_em" timestamp with time zone
);
ALTER TABLE "public"."convites_equipe" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."equipes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "nome" text NOT NULL,
  "modalidade" text NOT NULL,
  "icone" text DEFAULT 'trophy'::text,
  "visibilidade" text DEFAULT 'publica'::text,
  "status" text DEFAULT 'ativo'::text,
  "max_jogadores" integer DEFAULT 20,
  "observacoes" text,
  "admin_id" uuid,
  "ultima_atividade" timestamp with time zone DEFAULT now(),
  "criado_em" timestamp with time zone DEFAULT now(),
  "cidade" text,
  "estado" text,
  "nivel" text,
  "logo_url" text,
  "slug_convite" text DEFAULT encode(extensions.gen_random_bytes(6), 'hex'::text),
  "localizacao" text,
  "local_cep" text,
  "local_rua" text,
  "local_bairro" text,
  "local_cidade" text,
  "local_estado" text,
  "local_complemento" text,
  "local_nome" text,
  "local_numero" text,
  "local_mapa_link" text,
  "link_grupo" text,
  "regras" jsonb,
  "admin_id_pendente" uuid,
  "data_solicitacao_posse" timestamp with time zone,
  "latitude" double precision,
  "longitude" double precision,
  "gestao_financeira" boolean DEFAULT true,
  "aceitando_membros" boolean DEFAULT true
);
ALTER TABLE "public"."equipes" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."financeiro_config" (
  "equipe_id" uuid NOT NULL,
  "valor_mensalidade" numeric(10,2) DEFAULT 50,
  "valor_avulso_padrao" numeric(10,2) DEFAULT 20,
  "dia_vencimento" integer DEFAULT 10,
  "dia_tolerancia" integer DEFAULT 15,
  "atualizado_em" timestamp with time zone DEFAULT now(),
  "custo_quadra" numeric(10,2) DEFAULT 0,
  "limite_vencimento_horas" integer DEFAULT 24,
  "chave_pix" text
);
ALTER TABLE "public"."financeiro_config" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."interacoes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "remetente_id" uuid,
  "destinatario_id" uuid,
  "tipo" text DEFAULT 'cutucada'::text NOT NULL,
  "criado_em" timestamp with time zone DEFAULT now(),
  "payload" jsonb
);
ALTER TABLE "public"."interacoes" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."jogador_modalidades" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "usuario_id" uuid NOT NULL,
  "modalidade" text NOT NULL,
  "posicao" text,
  "nivel_habilidade" text,
  "criado_em" timestamp with time zone DEFAULT now()
);
ALTER TABLE "public"."jogador_modalidades" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."logs_sistema" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "criado_em" timestamp with time zone DEFAULT now(),
  "usuario_id" uuid,
  "tipo" text,
  "mensagem" text,
  "pagina" text,
  "metadata" jsonb
);
ALTER TABLE "public"."logs_sistema" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."membros_equipe" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "equipe_id" uuid NOT NULL,
  "usuario_id" uuid NOT NULL,
  "papel" text DEFAULT 'jogador'::text,
  "permissoes" jsonb DEFAULT '{}'::jsonb,
  "status" text DEFAULT 'pendente'::text,
  "entrou_em" timestamp with time zone DEFAULT now(),
  "vinculo" text DEFAULT 'avulso'::text,
  "nivel_lideranca" integer
);
ALTER TABLE "public"."membros_equipe" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."mensalidades" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "equipe_id" uuid NOT NULL,
  "usuario_id" uuid NOT NULL,
  "periodo" text NOT NULL,
  "valor_configurado" numeric(10,2) NOT NULL,
  "status" text DEFAULT 'pendente'::text,
  "pago_em" timestamp with time zone,
  "criado_em" timestamp with time zone DEFAULT now(),
  "atualizado_em" timestamp with time zone DEFAULT now()
);
ALTER TABLE "public"."mensalidades" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."pagamentos_avulsos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "partida_id" uuid NOT NULL,
  "usuario_id" uuid NOT NULL,
  "valor_pago" numeric(10,2) NOT NULL,
  "pago_em" timestamp with time zone DEFAULT now(),
  "status" text DEFAULT 'pendente'::text,
  "equipe_id" uuid
);
ALTER TABLE "public"."pagamentos_avulsos" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."partida_presencas" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "partida_id" uuid NOT NULL,
  "usuario_id" uuid NOT NULL,
  "status" text DEFAULT 'confirmado'::text,
  "tipo_jogador" text DEFAULT 'avulso'::text,
  "criado_em" timestamp with time zone DEFAULT now()
);
ALTER TABLE "public"."partida_presencas" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."partidas" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "equipe_id" uuid NOT NULL,
  "data" date NOT NULL,
  "hora" time without time zone NOT NULL,
  "local_nome" text,
  "vagas" integer DEFAULT 14 NOT NULL,
  "valor_avulso" numeric(10,2) DEFAULT 0.00,
  "status" text DEFAULT 'agendada'::text,
  "criado_em" timestamp with time zone DEFAULT now(),
  "times_sorteados" jsonb
);
ALTER TABLE "public"."partidas" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."partidas_presencas" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "partida_id" uuid NOT NULL,
  "usuario_id" uuid NOT NULL,
  "status" text DEFAULT 'confirmado'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "frequencia" text DEFAULT 'pendente'::text
);
ALTER TABLE "public"."partidas_presencas" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."punicoes_equipe" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "equipe_id" uuid NOT NULL,
  "usuario_id" uuid NOT NULL,
  "partida_id" uuid,
  "motivo" text NOT NULL,
  "ativa" boolean DEFAULT true,
  "criado_em" timestamp with time zone DEFAULT now(),
  "tipo_cartao" text DEFAULT 'vermelho'::text
);
ALTER TABLE "public"."punicoes_equipe" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."usuarios" (
  "id" uuid NOT NULL,
  "nome_completo" text NOT NULL,
  "email" text NOT NULL,
  "eh_super_admin" boolean DEFAULT false,
  "status" text DEFAULT 'ativo'::text,
  "criado_em" timestamp with time zone DEFAULT now(),
  "apelido" text,
  "data_nascimento" date,
  "genero" text,
  "telefone" text,
  "cep" text,
  "rua" text,
  "numero" text,
  "complemento" text,
  "bairro" text,
  "cidade" text,
  "estado" text,
  "foto_url" text,
  "perfil_publico" boolean DEFAULT true,
  "esportes_interesse" text[] DEFAULT '{}'::text[],
  "atualizado_em" timestamp with time zone DEFAULT now(),
  "latitude" double precision,
  "longitude" double precision,
  "compartilhar_whatsapp_match" boolean DEFAULT false,
  "admin_permissoes" jsonb DEFAULT '{"equipes": false, "usuarios": false}'::jsonb,
  "ultimo_acesso" timestamp with time zone,
  "total_acessos" integer DEFAULT 0
);
ALTER TABLE "public"."usuarios" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."votos_mvp" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "partida_id" uuid,
  "eleitor_id" uuid,
  "candidato_id" uuid,
  "equipe_id" uuid,
  "posicao" smallint,
  "created_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE "public"."votos_mvp" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."votos_time" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "partida_id" uuid,
  "equipe_id" uuid,
  "eleitor_id" uuid,
  "time_escolhido" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "posicao" integer DEFAULT 1
);
ALTER TABLE "public"."votos_time" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "storage"."buckets" (
  "id" text NOT NULL,
  "name" text NOT NULL,
  "owner" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "public" boolean DEFAULT false,
  "avif_autodetection" boolean DEFAULT false,
  "file_size_limit" bigint,
  "allowed_mime_types" text[],
  "owner_id" text,
  "type" storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);
ALTER TABLE "storage"."buckets" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "storage"."buckets_analytics" (
  "name" text NOT NULL,
  "type" storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
  "format" text DEFAULT 'ICEBERG'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "deleted_at" timestamp with time zone
);
ALTER TABLE "storage"."buckets_analytics" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "storage"."buckets_vectors" (
  "id" text NOT NULL,
  "type" storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "storage"."buckets_vectors" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "storage"."migrations" (
  "id" integer NOT NULL,
  "name" character varying(100) NOT NULL,
  "hash" character varying(40) NOT NULL,
  "executed_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "storage"."migrations" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "storage"."objects" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "bucket_id" text,
  "name" text,
  "owner" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "last_accessed_at" timestamp with time zone DEFAULT now(),
  "metadata" jsonb,
  "path_tokens" text[] DEFAULT string_to_array(name, '/'::text),
  "version" text,
  "owner_id" text,
  "user_metadata" jsonb
);
ALTER TABLE "storage"."objects" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "storage"."s3_multipart_uploads" (
  "id" text NOT NULL,
  "in_progress_size" bigint DEFAULT 0 NOT NULL,
  "upload_signature" text NOT NULL,
  "bucket_id" text NOT NULL,
  "key" text NOT NULL,
  "version" text NOT NULL,
  "owner_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "user_metadata" jsonb,
  "metadata" jsonb
);
ALTER TABLE "storage"."s3_multipart_uploads" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "storage"."s3_multipart_uploads_parts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "upload_id" text NOT NULL,
  "size" bigint DEFAULT 0 NOT NULL,
  "part_number" integer NOT NULL,
  "bucket_id" text NOT NULL,
  "key" text NOT NULL,
  "etag" text NOT NULL,
  "owner_id" text,
  "version" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "storage"."s3_multipart_uploads_parts" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "storage"."vector_indexes" (
  "id" text DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "bucket_id" text NOT NULL,
  "data_type" text NOT NULL,
  "dimension" integer NOT NULL,
  "distance_metric" text NOT NULL,
  "metadata_configuration" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "storage"."vector_indexes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE ONLY "auth"."audit_log_entries" ADD CONSTRAINT "audit_log_entries_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_authorization_url_https" CHECK (authorization_url IS NULL OR authorization_url ~~ 'https://%'::text);
ALTER TABLE ONLY "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_authorization_url_length" CHECK (authorization_url IS NULL OR char_length(authorization_url) <= 2048);
ALTER TABLE ONLY "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_client_id_length" CHECK (char_length(client_id) >= 1 AND char_length(client_id) <= 512);
ALTER TABLE ONLY "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_discovery_url_length" CHECK (discovery_url IS NULL OR char_length(discovery_url) <= 2048);
ALTER TABLE ONLY "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_identifier_format" CHECK (identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text);
ALTER TABLE ONLY "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_identifier_key" UNIQUE (identifier);
ALTER TABLE ONLY "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_issuer_length" CHECK (issuer IS NULL OR char_length(issuer) >= 1 AND char_length(issuer) <= 2048);
ALTER TABLE ONLY "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_jwks_uri_https" CHECK (jwks_uri IS NULL OR jwks_uri ~~ 'https://%'::text);
ALTER TABLE ONLY "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_jwks_uri_length" CHECK (jwks_uri IS NULL OR char_length(jwks_uri) <= 2048);
ALTER TABLE ONLY "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_name_length" CHECK (char_length(name) >= 1 AND char_length(name) <= 100);
ALTER TABLE ONLY "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_oauth2_requires_endpoints" CHECK (provider_type <> 'oauth2'::text OR authorization_url IS NOT NULL AND token_url IS NOT NULL AND userinfo_url IS NOT NULL);
ALTER TABLE ONLY "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_oidc_discovery_url_https" CHECK (provider_type <> 'oidc'::text OR discovery_url IS NULL OR discovery_url ~~ 'https://%'::text);
ALTER TABLE ONLY "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_oidc_issuer_https" CHECK (provider_type <> 'oidc'::text OR issuer IS NULL OR issuer ~~ 'https://%'::text);
ALTER TABLE ONLY "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_oidc_requires_issuer" CHECK (provider_type <> 'oidc'::text OR issuer IS NOT NULL);
ALTER TABLE ONLY "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_provider_type_check" CHECK (provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text]));
ALTER TABLE ONLY "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_token_url_https" CHECK (token_url IS NULL OR token_url ~~ 'https://%'::text);
ALTER TABLE ONLY "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_token_url_length" CHECK (token_url IS NULL OR char_length(token_url) <= 2048);
ALTER TABLE ONLY "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_userinfo_url_https" CHECK (userinfo_url IS NULL OR userinfo_url ~~ 'https://%'::text);
ALTER TABLE ONLY "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_userinfo_url_length" CHECK (userinfo_url IS NULL OR char_length(userinfo_url) <= 2048);
ALTER TABLE ONLY "auth"."flow_state" ADD CONSTRAINT "flow_state_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "auth"."identities" ADD CONSTRAINT "identities_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "auth"."identities" ADD CONSTRAINT "identities_provider_id_provider_unique" UNIQUE (provider_id, provider);
ALTER TABLE ONLY "auth"."identities" ADD CONSTRAINT "identities_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY "auth"."instances" ADD CONSTRAINT "instances_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "auth"."mfa_amr_claims" ADD CONSTRAINT "amr_id_pk" PRIMARY KEY (id);
ALTER TABLE ONLY "auth"."mfa_amr_claims" ADD CONSTRAINT "mfa_amr_claims_session_id_authentication_method_pkey" UNIQUE (session_id, authentication_method);
ALTER TABLE ONLY "auth"."mfa_amr_claims" ADD CONSTRAINT "mfa_amr_claims_session_id_fkey" FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;
ALTER TABLE ONLY "auth"."mfa_challenges" ADD CONSTRAINT "mfa_challenges_auth_factor_id_fkey" FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;
ALTER TABLE ONLY "auth"."mfa_challenges" ADD CONSTRAINT "mfa_challenges_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "auth"."mfa_factors" ADD CONSTRAINT "mfa_factors_last_challenged_at_key" UNIQUE (last_challenged_at);
ALTER TABLE ONLY "auth"."mfa_factors" ADD CONSTRAINT "mfa_factors_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "auth"."mfa_factors" ADD CONSTRAINT "mfa_factors_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_authorization_code_key" UNIQUE (authorization_code);
ALTER TABLE ONLY "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_authorization_code_length" CHECK (char_length(authorization_code) <= 255);
ALTER TABLE ONLY "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_authorization_id_key" UNIQUE (authorization_id);
ALTER TABLE ONLY "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_client_id_fkey" FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;
ALTER TABLE ONLY "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_code_challenge_length" CHECK (char_length(code_challenge) <= 128);
ALTER TABLE ONLY "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_expires_at_future" CHECK (expires_at > created_at);
ALTER TABLE ONLY "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_nonce_length" CHECK (char_length(nonce) <= 255);
ALTER TABLE ONLY "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_redirect_uri_length" CHECK (char_length(redirect_uri) <= 2048);
ALTER TABLE ONLY "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_resource_length" CHECK (char_length(resource) <= 2048);
ALTER TABLE ONLY "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_scope_length" CHECK (char_length(scope) <= 4096);
ALTER TABLE ONLY "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_state_length" CHECK (char_length(state) <= 4096);
ALTER TABLE ONLY "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY "auth"."oauth_client_states" ADD CONSTRAINT "oauth_client_states_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "auth"."oauth_clients" ADD CONSTRAINT "oauth_clients_client_name_length" CHECK (char_length(client_name) <= 1024);
ALTER TABLE ONLY "auth"."oauth_clients" ADD CONSTRAINT "oauth_clients_client_uri_length" CHECK (char_length(client_uri) <= 2048);
ALTER TABLE ONLY "auth"."oauth_clients" ADD CONSTRAINT "oauth_clients_logo_uri_length" CHECK (char_length(logo_uri) <= 2048);
ALTER TABLE ONLY "auth"."oauth_clients" ADD CONSTRAINT "oauth_clients_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "auth"."oauth_clients" ADD CONSTRAINT "oauth_clients_token_endpoint_auth_method_check" CHECK (token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text]));
ALTER TABLE ONLY "auth"."oauth_consents" ADD CONSTRAINT "oauth_consents_client_id_fkey" FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;
ALTER TABLE ONLY "auth"."oauth_consents" ADD CONSTRAINT "oauth_consents_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "auth"."oauth_consents" ADD CONSTRAINT "oauth_consents_revoked_after_granted" CHECK (revoked_at IS NULL OR revoked_at >= granted_at);
ALTER TABLE ONLY "auth"."oauth_consents" ADD CONSTRAINT "oauth_consents_scopes_length" CHECK (char_length(scopes) <= 2048);
ALTER TABLE ONLY "auth"."oauth_consents" ADD CONSTRAINT "oauth_consents_scopes_not_empty" CHECK (char_length(TRIM(BOTH FROM scopes)) > 0);
ALTER TABLE ONLY "auth"."oauth_consents" ADD CONSTRAINT "oauth_consents_user_client_unique" UNIQUE (user_id, client_id);
ALTER TABLE ONLY "auth"."oauth_consents" ADD CONSTRAINT "oauth_consents_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY "auth"."one_time_tokens" ADD CONSTRAINT "one_time_tokens_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "auth"."one_time_tokens" ADD CONSTRAINT "one_time_tokens_token_hash_check" CHECK (char_length(token_hash) > 0);
ALTER TABLE ONLY "auth"."one_time_tokens" ADD CONSTRAINT "one_time_tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY "auth"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "auth"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_session_id_fkey" FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;
ALTER TABLE ONLY "auth"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_token_unique" UNIQUE (token);
ALTER TABLE ONLY "auth"."saml_providers" ADD CONSTRAINT "entity_id not empty" CHECK (char_length(entity_id) > 0);
ALTER TABLE ONLY "auth"."saml_providers" ADD CONSTRAINT "metadata_url not empty" CHECK (metadata_url = NULL::text OR char_length(metadata_url) > 0);
ALTER TABLE ONLY "auth"."saml_providers" ADD CONSTRAINT "metadata_xml not empty" CHECK (char_length(metadata_xml) > 0);
ALTER TABLE ONLY "auth"."saml_providers" ADD CONSTRAINT "saml_providers_entity_id_key" UNIQUE (entity_id);
ALTER TABLE ONLY "auth"."saml_providers" ADD CONSTRAINT "saml_providers_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "auth"."saml_providers" ADD CONSTRAINT "saml_providers_sso_provider_id_fkey" FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;
ALTER TABLE ONLY "auth"."saml_relay_states" ADD CONSTRAINT "request_id not empty" CHECK (char_length(request_id) > 0);
ALTER TABLE ONLY "auth"."saml_relay_states" ADD CONSTRAINT "saml_relay_states_flow_state_id_fkey" FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;
ALTER TABLE ONLY "auth"."saml_relay_states" ADD CONSTRAINT "saml_relay_states_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "auth"."saml_relay_states" ADD CONSTRAINT "saml_relay_states_sso_provider_id_fkey" FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;
ALTER TABLE ONLY "auth"."schema_migrations" ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY (version);
ALTER TABLE ONLY "auth"."sessions" ADD CONSTRAINT "sessions_oauth_client_id_fkey" FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;
ALTER TABLE ONLY "auth"."sessions" ADD CONSTRAINT "sessions_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "auth"."sessions" ADD CONSTRAINT "sessions_scopes_length" CHECK (char_length(scopes) <= 4096);
ALTER TABLE ONLY "auth"."sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY "auth"."sso_domains" ADD CONSTRAINT "domain not empty" CHECK (char_length(domain) > 0);
ALTER TABLE ONLY "auth"."sso_domains" ADD CONSTRAINT "sso_domains_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "auth"."sso_domains" ADD CONSTRAINT "sso_domains_sso_provider_id_fkey" FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;
ALTER TABLE ONLY "auth"."sso_providers" ADD CONSTRAINT "resource_id not empty" CHECK (resource_id = NULL::text OR char_length(resource_id) > 0);
ALTER TABLE ONLY "auth"."sso_providers" ADD CONSTRAINT "sso_providers_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "auth"."users" ADD CONSTRAINT "users_email_change_confirm_status_check" CHECK (email_change_confirm_status >= 0 AND email_change_confirm_status <= 2);
ALTER TABLE ONLY "auth"."users" ADD CONSTRAINT "users_phone_key" UNIQUE (phone);
ALTER TABLE ONLY "auth"."users" ADD CONSTRAINT "users_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "auth"."webauthn_challenges" ADD CONSTRAINT "webauthn_challenges_challenge_type_check" CHECK (challenge_type = ANY (ARRAY['signup'::text, 'registration'::text, 'authentication'::text]));
ALTER TABLE ONLY "auth"."webauthn_challenges" ADD CONSTRAINT "webauthn_challenges_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "auth"."webauthn_challenges" ADD CONSTRAINT "webauthn_challenges_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY "auth"."webauthn_credentials" ADD CONSTRAINT "webauthn_credentials_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "auth"."webauthn_credentials" ADD CONSTRAINT "webauthn_credentials_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ciclos_financeiros" ADD CONSTRAINT "ciclos_financeiros_equipe_id_fkey" FOREIGN KEY (equipe_id) REFERENCES equipes(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ciclos_financeiros" ADD CONSTRAINT "ciclos_financeiros_equipe_id_periodo_key" UNIQUE (equipe_id, periodo);
ALTER TABLE ONLY "public"."ciclos_financeiros" ADD CONSTRAINT "ciclos_financeiros_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."ciclos_financeiros" ADD CONSTRAINT "ciclos_financeiros_status_check" CHECK (status = ANY (ARRAY['aberto'::text, 'fechado'::text]));
ALTER TABLE ONLY "public"."convites_equipe" ADD CONSTRAINT "convites_equipe_admin_id_fkey" FOREIGN KEY (admin_id) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE ONLY "public"."convites_equipe" ADD CONSTRAINT "convites_equipe_equipe_id_fkey" FOREIGN KEY (equipe_id) REFERENCES equipes(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."convites_equipe" ADD CONSTRAINT "convites_equipe_equipe_id_jogador_id_key" UNIQUE (equipe_id, jogador_id);
ALTER TABLE ONLY "public"."convites_equipe" ADD CONSTRAINT "convites_equipe_jogador_id_fkey" FOREIGN KEY (jogador_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."convites_equipe" ADD CONSTRAINT "convites_equipe_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."convites_equipe" ADD CONSTRAINT "convites_equipe_status_check" CHECK (status = ANY (ARRAY['pendente'::text, 'aceito'::text, 'recusado'::text]));
ALTER TABLE ONLY "public"."equipes" ADD CONSTRAINT "equipes_admin_id_fkey" FOREIGN KEY (admin_id) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE ONLY "public"."equipes" ADD CONSTRAINT "equipes_admin_id_pendente_fkey" FOREIGN KEY (admin_id_pendente) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE ONLY "public"."equipes" ADD CONSTRAINT "equipes_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."equipes" ADD CONSTRAINT "equipes_slug_convite_key" UNIQUE (slug_convite);
ALTER TABLE ONLY "public"."financeiro_config" ADD CONSTRAINT "financeiro_config_equipe_id_fkey" FOREIGN KEY (equipe_id) REFERENCES equipes(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."financeiro_config" ADD CONSTRAINT "financeiro_config_pkey" PRIMARY KEY (equipe_id);
ALTER TABLE ONLY "public"."interacoes" ADD CONSTRAINT "interacoes_destinatario_id_fkey" FOREIGN KEY (destinatario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."interacoes" ADD CONSTRAINT "interacoes_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."interacoes" ADD CONSTRAINT "interacoes_remetente_id_fkey" FOREIGN KEY (remetente_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."jogador_modalidades" ADD CONSTRAINT "jogador_modalidades_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."jogador_modalidades" ADD CONSTRAINT "jogador_modalidades_usuario_id_fkey" FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."jogador_modalidades" ADD CONSTRAINT "jogador_modalidades_usuario_id_modalidade_posicao_key" UNIQUE (usuario_id, modalidade, posicao);
ALTER TABLE ONLY "public"."logs_sistema" ADD CONSTRAINT "logs_sistema_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."logs_sistema" ADD CONSTRAINT "logs_sistema_usuario_id_fkey" FOREIGN KEY (usuario_id) REFERENCES auth.users(id);
ALTER TABLE ONLY "public"."membros_equipe" ADD CONSTRAINT "check_nivel_lideranca" CHECK (nivel_lideranca >= 1 AND nivel_lideranca <= 5);
ALTER TABLE ONLY "public"."membros_equipe" ADD CONSTRAINT "membros_equipe_equipe_id_fkey" FOREIGN KEY (equipe_id) REFERENCES equipes(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."membros_equipe" ADD CONSTRAINT "membros_equipe_equipe_id_usuario_id_key" UNIQUE (equipe_id, usuario_id);
ALTER TABLE ONLY "public"."membros_equipe" ADD CONSTRAINT "membros_equipe_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."membros_equipe" ADD CONSTRAINT "membros_equipe_usuario_id_fkey" FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."membros_equipe" ADD CONSTRAINT "membros_equipe_vinculo_check" CHECK (vinculo = ANY (ARRAY['avulso'::text, 'mensalista'::text]));
ALTER TABLE ONLY "public"."mensalidades" ADD CONSTRAINT "mensalidades_equipe_id_fkey" FOREIGN KEY (equipe_id) REFERENCES equipes(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."mensalidades" ADD CONSTRAINT "mensalidades_equipe_id_usuario_id_periodo_key" UNIQUE (equipe_id, usuario_id, periodo);
ALTER TABLE ONLY "public"."mensalidades" ADD CONSTRAINT "mensalidades_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."mensalidades" ADD CONSTRAINT "mensalidades_status_check" CHECK (status = ANY (ARRAY['pendente'::text, 'pago'::text, 'isento'::text, 'atrasado'::text]));
ALTER TABLE ONLY "public"."mensalidades" ADD CONSTRAINT "mensalidades_usuario_id_fkey" FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."pagamentos_avulsos" ADD CONSTRAINT "pagamentos_avulsos_equipe_id_fkey" FOREIGN KEY (equipe_id) REFERENCES equipes(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."pagamentos_avulsos" ADD CONSTRAINT "pagamentos_avulsos_partida_id_fkey" FOREIGN KEY (partida_id) REFERENCES partidas(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."pagamentos_avulsos" ADD CONSTRAINT "pagamentos_avulsos_partida_id_usuario_id_key" UNIQUE (partida_id, usuario_id);
ALTER TABLE ONLY "public"."pagamentos_avulsos" ADD CONSTRAINT "pagamentos_avulsos_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."pagamentos_avulsos" ADD CONSTRAINT "pagamentos_avulsos_status_check" CHECK (status = ANY (ARRAY['pendente'::text, 'pago'::text]));
ALTER TABLE ONLY "public"."pagamentos_avulsos" ADD CONSTRAINT "pagamentos_avulsos_usuario_id_fkey" FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."partida_presencas" ADD CONSTRAINT "partida_presencas_partida_id_fkey" FOREIGN KEY (partida_id) REFERENCES partidas(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."partida_presencas" ADD CONSTRAINT "partida_presencas_partida_id_usuario_id_key" UNIQUE (partida_id, usuario_id);
ALTER TABLE ONLY "public"."partida_presencas" ADD CONSTRAINT "partida_presencas_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."partida_presencas" ADD CONSTRAINT "partida_presencas_usuario_id_fkey" FOREIGN KEY (usuario_id) REFERENCES auth.users(id);
ALTER TABLE ONLY "public"."partidas" ADD CONSTRAINT "partidas_equipe_id_fkey" FOREIGN KEY (equipe_id) REFERENCES equipes(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."partidas" ADD CONSTRAINT "partidas_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."partidas_presencas" ADD CONSTRAINT "partidas_presencas_frequencia_check" CHECK (frequencia = ANY (ARRAY['P'::text, 'F'::text, 'pendente'::text]));
ALTER TABLE ONLY "public"."partidas_presencas" ADD CONSTRAINT "partidas_presencas_partida_id_fkey" FOREIGN KEY (partida_id) REFERENCES partidas(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."partidas_presencas" ADD CONSTRAINT "partidas_presencas_partida_id_usuario_id_key" UNIQUE (partida_id, usuario_id);
ALTER TABLE ONLY "public"."partidas_presencas" ADD CONSTRAINT "partidas_presencas_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."partidas_presencas" ADD CONSTRAINT "partidas_presencas_status_check" CHECK (status = ANY (ARRAY['confirmado'::text, 'espera'::text, 'cancelado'::text]));
ALTER TABLE ONLY "public"."partidas_presencas" ADD CONSTRAINT "partidas_presencas_usuario_id_fkey" FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."punicoes_equipe" ADD CONSTRAINT "punicoes_equipe_equipe_id_fkey" FOREIGN KEY (equipe_id) REFERENCES equipes(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."punicoes_equipe" ADD CONSTRAINT "punicoes_equipe_partida_id_fkey" FOREIGN KEY (partida_id) REFERENCES partidas(id) ON DELETE SET NULL;
ALTER TABLE ONLY "public"."punicoes_equipe" ADD CONSTRAINT "punicoes_equipe_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."punicoes_equipe" ADD CONSTRAINT "punicoes_equipe_usuario_id_fkey" FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."usuarios" ADD CONSTRAINT "usuarios_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."usuarios" ADD CONSTRAINT "usuarios_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."votos_mvp" ADD CONSTRAINT "unique_voto_candidato" UNIQUE (partida_id, eleitor_id, candidato_id);
ALTER TABLE ONLY "public"."votos_mvp" ADD CONSTRAINT "unique_voto_posicao" UNIQUE (partida_id, eleitor_id, posicao);
ALTER TABLE ONLY "public"."votos_mvp" ADD CONSTRAINT "votos_mvp_candidato_id_fkey" FOREIGN KEY (candidato_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."votos_mvp" ADD CONSTRAINT "votos_mvp_eleitor_id_fkey" FOREIGN KEY (eleitor_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."votos_mvp" ADD CONSTRAINT "votos_mvp_equipe_id_fkey" FOREIGN KEY (equipe_id) REFERENCES equipes(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."votos_mvp" ADD CONSTRAINT "votos_mvp_partida_id_fkey" FOREIGN KEY (partida_id) REFERENCES partidas(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."votos_mvp" ADD CONSTRAINT "votos_mvp_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."votos_mvp" ADD CONSTRAINT "votos_mvp_posicao_check" CHECK (posicao = ANY (ARRAY[1, 2, 3]));
ALTER TABLE ONLY "public"."votos_time" ADD CONSTRAINT "votos_time_eleitor_id_fkey" FOREIGN KEY (eleitor_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."votos_time" ADD CONSTRAINT "votos_time_equipe_id_fkey" FOREIGN KEY (equipe_id) REFERENCES equipes(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."votos_time" ADD CONSTRAINT "votos_time_partida_eleitor_posicao_unique" UNIQUE (partida_id, eleitor_id, posicao);
ALTER TABLE ONLY "public"."votos_time" ADD CONSTRAINT "votos_time_partida_id_fkey" FOREIGN KEY (partida_id) REFERENCES partidas(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."votos_time" ADD CONSTRAINT "votos_time_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "storage"."buckets" ADD CONSTRAINT "buckets_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "storage"."buckets_analytics" ADD CONSTRAINT "buckets_analytics_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "storage"."buckets_vectors" ADD CONSTRAINT "buckets_vectors_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "storage"."migrations" ADD CONSTRAINT "migrations_name_key" UNIQUE (name);
ALTER TABLE ONLY "storage"."migrations" ADD CONSTRAINT "migrations_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "storage"."objects" ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);
ALTER TABLE ONLY "storage"."objects" ADD CONSTRAINT "objects_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "storage"."s3_multipart_uploads" ADD CONSTRAINT "s3_multipart_uploads_bucket_id_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);
ALTER TABLE ONLY "storage"."s3_multipart_uploads" ADD CONSTRAINT "s3_multipart_uploads_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts" ADD CONSTRAINT "s3_multipart_uploads_parts_bucket_id_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);
ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts" ADD CONSTRAINT "s3_multipart_uploads_parts_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts" ADD CONSTRAINT "s3_multipart_uploads_parts_upload_id_fkey" FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;
ALTER TABLE ONLY "storage"."vector_indexes" ADD CONSTRAINT "vector_indexes_bucket_id_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);
ALTER TABLE ONLY "storage"."vector_indexes" ADD CONSTRAINT "vector_indexes_pkey" PRIMARY KEY (id);

CREATE UNIQUE INDEX audit_log_entries_pkey ON auth.audit_log_entries USING btree (id);
CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);
CREATE INDEX custom_oauth_providers_created_at_idx ON auth.custom_oauth_providers USING btree (created_at);
CREATE INDEX custom_oauth_providers_enabled_idx ON auth.custom_oauth_providers USING btree (enabled);
CREATE INDEX custom_oauth_providers_identifier_idx ON auth.custom_oauth_providers USING btree (identifier);
CREATE UNIQUE INDEX custom_oauth_providers_identifier_key ON auth.custom_oauth_providers USING btree (identifier);
CREATE UNIQUE INDEX custom_oauth_providers_pkey ON auth.custom_oauth_providers USING btree (id);
CREATE INDEX custom_oauth_providers_provider_type_idx ON auth.custom_oauth_providers USING btree (provider_type);
CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);
CREATE UNIQUE INDEX flow_state_pkey ON auth.flow_state USING btree (id);
CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);
CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);
CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);
CREATE UNIQUE INDEX identities_pkey ON auth.identities USING btree (id);
CREATE UNIQUE INDEX identities_provider_id_provider_unique ON auth.identities USING btree (provider_id, provider);
CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);
CREATE UNIQUE INDEX instances_pkey ON auth.instances USING btree (id);
CREATE UNIQUE INDEX amr_id_pk ON auth.mfa_amr_claims USING btree (id);
CREATE UNIQUE INDEX mfa_amr_claims_session_id_authentication_method_pkey ON auth.mfa_amr_claims USING btree (session_id, authentication_method);
CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);
CREATE UNIQUE INDEX mfa_challenges_pkey ON auth.mfa_challenges USING btree (id);
CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);
CREATE UNIQUE INDEX mfa_factors_last_challenged_at_key ON auth.mfa_factors USING btree (last_challenged_at);
CREATE UNIQUE INDEX mfa_factors_pkey ON auth.mfa_factors USING btree (id);
CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);
CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);
CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);
CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);
CREATE UNIQUE INDEX oauth_authorizations_authorization_code_key ON auth.oauth_authorizations USING btree (authorization_code);
CREATE UNIQUE INDEX oauth_authorizations_authorization_id_key ON auth.oauth_authorizations USING btree (authorization_id);
CREATE UNIQUE INDEX oauth_authorizations_pkey ON auth.oauth_authorizations USING btree (id);
CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);
CREATE UNIQUE INDEX oauth_client_states_pkey ON auth.oauth_client_states USING btree (id);
CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);
CREATE UNIQUE INDEX oauth_clients_pkey ON auth.oauth_clients USING btree (id);
CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);
CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);
CREATE UNIQUE INDEX oauth_consents_pkey ON auth.oauth_consents USING btree (id);
CREATE UNIQUE INDEX oauth_consents_user_client_unique ON auth.oauth_consents USING btree (user_id, client_id);
CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);
CREATE UNIQUE INDEX one_time_tokens_pkey ON auth.one_time_tokens USING btree (id);
CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);
CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);
CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);
CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);
CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);
CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);
CREATE UNIQUE INDEX refresh_tokens_pkey ON auth.refresh_tokens USING btree (id);
CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);
CREATE UNIQUE INDEX refresh_tokens_token_unique ON auth.refresh_tokens USING btree (token);
CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);
CREATE UNIQUE INDEX saml_providers_entity_id_key ON auth.saml_providers USING btree (entity_id);
CREATE UNIQUE INDEX saml_providers_pkey ON auth.saml_providers USING btree (id);
CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);
CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);
CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);
CREATE UNIQUE INDEX saml_relay_states_pkey ON auth.saml_relay_states USING btree (id);
CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);
CREATE UNIQUE INDEX schema_migrations_pkey ON auth.schema_migrations USING btree (version);
CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);
CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);
CREATE UNIQUE INDEX sessions_pkey ON auth.sessions USING btree (id);
CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);
CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);
CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));
CREATE UNIQUE INDEX sso_domains_pkey ON auth.sso_domains USING btree (id);
CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);
CREATE UNIQUE INDEX sso_providers_pkey ON auth.sso_providers USING btree (id);
CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));
CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);
CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);
CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);
CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);
CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);
CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);
CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);
CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));
CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);
CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);
CREATE UNIQUE INDEX users_phone_key ON auth.users USING btree (phone);
CREATE UNIQUE INDEX users_pkey ON auth.users USING btree (id);
CREATE INDEX webauthn_challenges_expires_at_idx ON auth.webauthn_challenges USING btree (expires_at);
CREATE UNIQUE INDEX webauthn_challenges_pkey ON auth.webauthn_challenges USING btree (id);
CREATE INDEX webauthn_challenges_user_id_idx ON auth.webauthn_challenges USING btree (user_id);
CREATE UNIQUE INDEX webauthn_credentials_credential_id_key ON auth.webauthn_credentials USING btree (credential_id);
CREATE UNIQUE INDEX webauthn_credentials_pkey ON auth.webauthn_credentials USING btree (id);
CREATE INDEX webauthn_credentials_user_id_idx ON auth.webauthn_credentials USING btree (user_id);
CREATE UNIQUE INDEX ciclos_financeiros_equipe_id_periodo_key ON public.ciclos_financeiros USING btree (equipe_id, periodo);
CREATE UNIQUE INDEX ciclos_financeiros_pkey ON public.ciclos_financeiros USING btree (id);
CREATE UNIQUE INDEX convites_equipe_equipe_id_jogador_id_key ON public.convites_equipe USING btree (equipe_id, jogador_id);
CREATE UNIQUE INDEX convites_equipe_pkey ON public.convites_equipe USING btree (id);
CREATE UNIQUE INDEX equipes_pkey ON public.equipes USING btree (id);
CREATE UNIQUE INDEX equipes_slug_convite_key ON public.equipes USING btree (slug_convite);
CREATE UNIQUE INDEX financeiro_config_pkey ON public.financeiro_config USING btree (equipe_id);
CREATE UNIQUE INDEX interacoes_pkey ON public.interacoes USING btree (id);
CREATE UNIQUE INDEX jogador_modalidades_pkey ON public.jogador_modalidades USING btree (id);
CREATE UNIQUE INDEX jogador_modalidades_usuario_id_modalidade_posicao_key ON public.jogador_modalidades USING btree (usuario_id, modalidade, posicao);
CREATE UNIQUE INDEX logs_sistema_pkey ON public.logs_sistema USING btree (id);
CREATE UNIQUE INDEX membros_equipe_equipe_id_usuario_id_key ON public.membros_equipe USING btree (equipe_id, usuario_id);
CREATE UNIQUE INDEX membros_equipe_pkey ON public.membros_equipe USING btree (id);
CREATE UNIQUE INDEX mensalidades_equipe_id_usuario_id_periodo_key ON public.mensalidades USING btree (equipe_id, usuario_id, periodo);
CREATE UNIQUE INDEX mensalidades_pkey ON public.mensalidades USING btree (id);
CREATE UNIQUE INDEX pagamentos_avulsos_partida_id_usuario_id_key ON public.pagamentos_avulsos USING btree (partida_id, usuario_id);
CREATE UNIQUE INDEX pagamentos_avulsos_pkey ON public.pagamentos_avulsos USING btree (id);
CREATE UNIQUE INDEX partida_presencas_partida_id_usuario_id_key ON public.partida_presencas USING btree (partida_id, usuario_id);
CREATE UNIQUE INDEX partida_presencas_pkey ON public.partida_presencas USING btree (id);
CREATE UNIQUE INDEX partidas_pkey ON public.partidas USING btree (id);
CREATE UNIQUE INDEX partidas_presencas_partida_id_usuario_id_key ON public.partidas_presencas USING btree (partida_id, usuario_id);
CREATE UNIQUE INDEX partidas_presencas_pkey ON public.partidas_presencas USING btree (id);
CREATE UNIQUE INDEX punicoes_equipe_pkey ON public.punicoes_equipe USING btree (id);
CREATE UNIQUE INDEX usuarios_pkey ON public.usuarios USING btree (id);
CREATE UNIQUE INDEX unique_voto_candidato ON public.votos_mvp USING btree (partida_id, eleitor_id, candidato_id);
CREATE UNIQUE INDEX unique_voto_posicao ON public.votos_mvp USING btree (partida_id, eleitor_id, posicao);
CREATE UNIQUE INDEX votos_mvp_pkey ON public.votos_mvp USING btree (id);
CREATE UNIQUE INDEX votos_time_partida_eleitor_posicao_unique ON public.votos_time USING btree (partida_id, eleitor_id, posicao);
CREATE UNIQUE INDEX votos_time_pkey ON public.votos_time USING btree (id);
CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);
CREATE UNIQUE INDEX buckets_pkey ON storage.buckets USING btree (id);
CREATE UNIQUE INDEX buckets_analytics_pkey ON storage.buckets_analytics USING btree (id);
CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX buckets_vectors_pkey ON storage.buckets_vectors USING btree (id);
CREATE UNIQUE INDEX migrations_name_key ON storage.migrations USING btree (name);
CREATE UNIQUE INDEX migrations_pkey ON storage.migrations USING btree (id);
CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);
CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");
CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C");
CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);
CREATE UNIQUE INDEX objects_pkey ON storage.objects USING btree (id);
CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);
CREATE UNIQUE INDEX s3_multipart_uploads_pkey ON storage.s3_multipart_uploads USING btree (id);
CREATE UNIQUE INDEX s3_multipart_uploads_parts_pkey ON storage.s3_multipart_uploads_parts USING btree (id);
CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);
CREATE UNIQUE INDEX vector_indexes_pkey ON storage.vector_indexes USING btree (id);

CREATE OR REPLACE FUNCTION auth.email()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$function$

CREATE OR REPLACE FUNCTION auth.jwt()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$function$

CREATE OR REPLACE FUNCTION auth.role()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$function$

CREATE OR REPLACE FUNCTION auth.uid()
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$function$

CREATE OR REPLACE FUNCTION public.aceitar_transferencia_posse(p_equipe_id uuid, p_usuario_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_admin_atual UUID;
BEGIN
    -- 1. Verificar que o usuário realmente é o pendente de aceitar
    SELECT admin_id INTO v_admin_atual
    FROM public.equipes
    WHERE id = p_equipe_id
      AND admin_id_pendente = p_usuario_id;

    IF v_admin_atual IS NULL THEN
        RAISE EXCEPTION 'Transferência inválida: sem pendência para este usuário nesta equipe.';
    END IF;

    -- 2. Atualizar a equipe: novo admin_id, limpar pendente
    UPDATE public.equipes
    SET 
        admin_id         = p_usuario_id,
        admin_id_pendente = NULL
    WHERE id = p_equipe_id;

    -- 3. Novo capitão → papel 'admin' em membros_equipe
    UPDATE public.membros_equipe
    SET papel = 'admin'
    WHERE equipe_id  = p_equipe_id
      AND usuario_id = p_usuario_id;

    -- 4. Antigo capitão → rebaixar para 'sub_admin' (mantém na equipe)
    --    Só rebaixa se ainda estiver como 'admin' (segurança contra duplo rebaixamento)
    UPDATE public.membros_equipe
    SET papel = 'sub_admin'
    WHERE equipe_id  = p_equipe_id
      AND usuario_id = v_admin_atual
      AND papel      = 'admin';

END;
$function$

CREATE OR REPLACE FUNCTION public.admin_atualizar_usuario(p_usuario_id uuid, p_nome_completo text DEFAULT NULL::text, p_apelido text DEFAULT NULL::text, p_telefone text DEFAULT NULL::text, p_data_nascimento date DEFAULT NULL::date, p_genero text DEFAULT NULL::text, p_cep text DEFAULT NULL::text, p_rua text DEFAULT NULL::text, p_numero text DEFAULT NULL::text, p_complemento text DEFAULT NULL::text, p_bairro text DEFAULT NULL::text, p_cidade text DEFAULT NULL::text, p_estado text DEFAULT NULL::text, p_perfil_publico boolean DEFAULT NULL::boolean, p_compartilhar_whatsapp_match boolean DEFAULT NULL::boolean, p_eh_super_admin boolean DEFAULT NULL::boolean, p_admin_permissoes jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$

CREATE OR REPLACE FUNCTION public.admin_bypass_update_equipe(p_equipe_id uuid, p_campo text, p_valor jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF p_campo = 'regras' THEN
    UPDATE equipes SET regras = p_valor WHERE id = p_equipe_id;
  ELSIF p_campo = 'gestao_financeira' THEN
    UPDATE equipes SET gestao_financeira = (p_valor#>>'{}')::boolean WHERE id = p_equipe_id;
  ELSIF p_campo = 'aceitando_membros' THEN
    UPDATE equipes SET aceitando_membros = (p_valor#>>'{}')::boolean WHERE id = p_equipe_id;
  END IF;
END;
$function$

CREATE OR REPLACE FUNCTION public.admin_bypass_update_equipe(p_equipe_id uuid, p_dados jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$ BEGIN IF EXISTS (SELECT 1 FROM equipes WHERE id = p_equipe_id AND admin_id = auth.uid()) OR EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND eh_super_admin = true) THEN UPDATE equipes SET nome = COALESCE((p_dados->>'nome'), nome), modalidade = COALESCE((p_dados->>'modalidade'), modalidade), visibilidade = COALESCE((p_dados->>'visibilidade'), visibilidade), logo_url = COALESCE((p_dados->>'logo_url'), logo_url), local_nome = COALESCE((p_dados->>'local_nome'), local_nome), max_jogadores = COALESCE((p_dados->>'max_jogadores')::int, max_jogadores) WHERE id = p_equipe_id; ELSE RAISE EXCEPTION 'Acesso negado'; END IF; END; $function$

CREATE OR REPLACE FUNCTION public.admin_excluir_usuario_v2(p_usuario_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
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
$function$

CREATE OR REPLACE FUNCTION public.admin_limpar_logs_sistema()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.logs_sistema
  WHERE id IS NOT NULL;

  INSERT INTO public.logs_sistema (usuario_id, tipo, mensagem, pagina, metadata)
  VALUES (
    auth.uid(),
    'SISTEMA',
    '⚠️ Base de logs limpa pelo administrador.',
    '/admin/logs',
    jsonb_build_object('acao', 'limpeza_total', 'timestamp', now())
  );

  RETURN true;
END;
$function$

CREATE OR REPLACE FUNCTION public.admin_listar_logs_sistema(p_tipo text DEFAULT NULL::text, p_busca text DEFAULT NULL::text, p_limite integer DEFAULT 100, p_offset integer DEFAULT 0)
 RETURNS TABLE(log_id uuid, criado_em timestamp with time zone, tipo text, mensagem text, pagina text, metadata jsonb, usuario_nome text, usuario_email text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$

CREATE OR REPLACE FUNCTION public.admin_listar_usuarios(p_busca text DEFAULT NULL::text, p_letra text DEFAULT NULL::text, p_de integer DEFAULT 0, p_ate integer DEFAULT 19)
 RETURNS TABLE(id uuid, nome_completo text, apelido text, email text, foto_url text, telefone text, genero text, data_nascimento date, cep text, rua text, numero text, complemento text, bairro text, cidade text, estado text, perfil_publico boolean, compartilhar_whatsapp_match boolean, eh_super_admin boolean, admin_permissoes jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$

CREATE OR REPLACE FUNCTION public.admin_obter_estatisticas_sistema()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        )
    );

    RETURN v_resultado;
END;
$function$

CREATE OR REPLACE FUNCTION public.buscar_lideranca_equipe_publica(p_equipe_id uuid)
 RETURNS TABLE(usuario_id uuid, nome_completo text, apelido text, foto_url text, papel text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY SELECT DISTINCT u.id, u.nome_completo, u.apelido, u.foto_url, CASE WHEN e.admin_id = u.id THEN 'admin' ELSE me.papel END
    FROM public.equipes e LEFT JOIN public.membros_equipe me ON me.equipe_id = e.id AND (me.papel = 'sub_admin' OR me.usuario_id = e.admin_id)
    JOIN public.usuarios u ON (u.id = e.admin_id OR u.id = me.usuario_id)
    WHERE e.id = p_equipe_id AND e.visibilidade = 'publica' AND (me.status = 'ativo' OR me.id IS NULL);
END; $function$

CREATE OR REPLACE FUNCTION public.buscar_membros_equipe_seguro(p_equipe_id uuid)
 RETURNS TABLE(id uuid, usuario_id uuid, papel text, permissoes jsonb, vinculo text, status text, entrou_em timestamp with time zone, nivel_lideranca integer, nome_completo text, apelido text, foto_url text, cidade text, estado text, email text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY SELECT 
        me.id, me.usuario_id, me.papel, me.permissoes, me.vinculo, me.status, me.entrou_em, 
        me.nivel_lideranca, u.nome_completo, u.apelido, u.foto_url, u.cidade, u.estado, u.email
    FROM public.membros_equipe me JOIN public.usuarios u ON me.usuario_id = u.id
    WHERE me.equipe_id = p_equipe_id AND me.status IN ('ativo', 'pendente');
END; $function$

CREATE OR REPLACE FUNCTION public.buscar_presencas_partida_seguro(p_partida_id uuid)
 RETURNS TABLE(id uuid, status text, frequencia text, created_at timestamp with time zone, usuario_id uuid, nome_completo text, apelido text, foto_url text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY SELECT pp.id, pp.status, pp.frequencia, pp.created_at, pp.usuario_id, u.nome_completo, u.apelido, u.foto_url
    FROM public.partidas_presencas pp JOIN public.usuarios u ON pp.usuario_id = u.id 
    WHERE pp.partida_id = p_partida_id;
END; $function$

CREATE OR REPLACE FUNCTION public.buscar_ranking_mvp_equipe(p_equipe_id uuid)
 RETURNS TABLE(usuario_id uuid, nome_completo text, apelido text, foto_url text, pontos bigint, ouros bigint, pratas bigint, bronzes bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as usuario_id, 
        u.nome_completo, 
        u.apelido, 
        u.foto_url,
        SUM(CASE 
            WHEN v.posicao = 1 THEN 5 
            WHEN v.posicao = 2 THEN 3 
            WHEN v.posicao = 3 THEN 1 
            ELSE 0 END) as pontos,
        COUNT(v.id) FILTER (WHERE v.posicao = 1) as ouros,
        COUNT(v.id) FILTER (WHERE v.posicao = 2) as pratas,
        COUNT(v.id) FILTER (WHERE v.posicao = 3) as bronzes
    FROM public.usuarios u
    JOIN public.votos_mvp v ON v.candidato_id = u.id
    WHERE v.equipe_id = p_equipe_id
    GROUP BY u.id, u.nome_completo, u.apelido, u.foto_url
    ORDER BY pontos DESC, ouros DESC;
END;
$function$

CREATE OR REPLACE FUNCTION public.buscar_vencedores_partida(p_partida_id uuid)
 RETURNS TABLE(usuario_id uuid, nome_completo text, apelido text, foto_url text, pontos bigint, ouros bigint, pratas bigint, bronzes bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as usuario_id, 
        u.nome_completo, 
        u.apelido, 
        u.foto_url,
        SUM(CASE 
            WHEN v.posicao = 1 THEN 5 
            WHEN v.posicao = 2 THEN 3 
            WHEN v.posicao = 3 THEN 1 
            ELSE 0 END) as pontos,
        COUNT(v.id) FILTER (WHERE v.posicao = 1) as ouros,
        COUNT(v.id) FILTER (WHERE v.posicao = 2) as pratas,
        COUNT(v.id) FILTER (WHERE v.posicao = 3) as bronzes
    FROM public.usuarios u
    JOIN public.votos_mvp v ON v.candidato_id = u.id
    WHERE v.partida_id = p_partida_id
    GROUP BY u.id, u.nome_completo, u.apelido, u.foto_url
    ORDER BY pontos DESC, ouros DESC
    LIMIT 3;
END;
$function$

CREATE OR REPLACE FUNCTION public.cancelar_solicitacao_ingresso(p_equipe_id uuid, p_usuario_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_admin_id UUID;
  v_linhas_removidas INT;
BEGIN
  IF auth.uid() IS NULL OR p_usuario_id != auth.uid() THEN
    RAISE EXCEPTION 'Apenas o próprio usuário pode cancelar sua solicitação.';
  END IF;

  SELECT admin_id INTO v_admin_id FROM public.equipes WHERE id = p_equipe_id;

  DELETE FROM public.membros_equipe 
  WHERE equipe_id = p_equipe_id AND usuario_id = p_usuario_id AND status = 'pendente';

  GET DIAGNOSTICS v_linhas_removidas = ROW_COUNT;
  IF v_linhas_removidas = 0 THEN
    RETURN FALSE; 
  END IF;

  IF v_admin_id IS NOT NULL THEN
    DELETE FROM public.interacoes
    WHERE remetente_id = p_usuario_id AND destinatario_id = v_admin_id AND tipo = 'solicitacao_ingresso' AND payload->>'equipe_id' = p_equipe_id::text;
  END IF;

  RETURN TRUE;
END;
$function$

CREATE OR REPLACE FUNCTION public.cancelar_transferencia_posse(p_equipe_id uuid, p_usuario_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM public.equipes WHERE id = p_equipe_id AND (admin_id = p_usuario_id OR admin_id_pendente = p_usuario_id))
  OR EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_usuario_id AND eh_super_admin = true) THEN
    
    UPDATE public.equipes 
    SET admin_id_pendente = null, 
        data_solicitacao_posse = null
    WHERE id = p_equipe_id;

    RETURN 'cancelado_com_sucesso';
  ELSE
    RAISE EXCEPTION 'Você não tem permissão para cancelar esta solicitação.';
  END IF;
END;
$function$

CREATE OR REPLACE FUNCTION public.criar_perfil_ao_registrar()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$

CREATE OR REPLACE FUNCTION public.eh_gestor_deste_atleta(atleta_id uuid, gestor_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$

CREATE OR REPLACE FUNCTION public.enviar_convite_seguro(p_equipe_id uuid, p_jogador_id uuid, p_admin_id uuid, p_mensagem text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_convite_id uuid;
BEGIN
    -- Verifica se o remetente é admin da equipe ou super_admin
    IF NOT EXISTS (
        SELECT 1 FROM public.membros_equipe 
        WHERE equipe_id = p_equipe_id AND usuario_id = p_admin_id AND papel IN ('admin', 'sub_admin')
        UNION
        SELECT 1 FROM public.usuarios WHERE id = p_admin_id AND eh_super_admin = true
    ) THEN
        RAISE EXCEPTION 'Permissão negada para enviar convites.';
    END IF;

    -- Tenta inserir o convite
    INSERT INTO public.convites_equipe (equipe_id, jogador_id, admin_id, mensagem_convite)
    VALUES (p_equipe_id, p_jogador_id, p_admin_id, p_mensagem)
    RETURNING id INTO v_convite_id;

    RETURN v_convite_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.excluir_convite_seguro(p_convite_id uuid, p_usuario_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$

CREATE OR REPLACE FUNCTION public.get_equipe_convite(p_slug text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_equipe RECORD;
  v_admin RECORD;
  v_total_membros INTEGER;
BEGIN
  -- Busca a equipe pelo slug
  SELECT * INTO v_equipe FROM equipes WHERE slug_convite = p_slug LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Busca dados do capitão
  SELECT id, nome_completo, apelido, foto_url 
  INTO v_admin 
  FROM usuarios 
  WHERE id = v_equipe.admin_id 
  LIMIT 1;
  
  -- Conta membros ativos
  SELECT COUNT(*) INTO v_total_membros
  FROM membros_equipe
  WHERE equipe_id = v_equipe.id AND status = 'ativo';
  
  -- Retorna tudo junto
  RETURN json_build_object(
    'id', v_equipe.id,
    'nome', v_equipe.nome,
    'modalidade', v_equipe.modalidade,
    'logo_url', v_equipe.logo_url,
    'local_cidade', v_equipe.local_cidade,
    'local_estado', v_equipe.local_estado,
    'nivel', v_equipe.nivel,
    'admin_id', v_equipe.admin_id,
    'slug_convite', v_equipe.slug_convite,
    'aceitando_membros', v_equipe.aceitando_membros,
    'admin', json_build_object(
      'id', v_admin.id,
      'nome_completo', v_admin.nome_completo,
      'apelido', v_admin.apelido,
      'foto_url', v_admin.foto_url
    ),
    'total_membros', v_total_membros
  );
END;
$function$

CREATE OR REPLACE FUNCTION public.is_member_of_equipe(p_equipe_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_eh_membro BOOLEAN;
BEGIN
  -- Como é SECURITY DEFINER, essa query não dispara as regras de segurança normais, 
  -- quebrando a recursão infinita (Ciclo)!
  SELECT EXISTS (
    SELECT 1 FROM public.membros_equipe 
    WHERE equipe_id = p_equipe_id 
      AND usuario_id = auth.uid() 
      AND status IN ('ativo', 'pendente')
  ) INTO v_eh_membro;
  
  RETURN v_eh_membro;
END;
$function$

CREATE OR REPLACE FUNCTION public.normalizar_nome_cidade(p_cidade text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
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
$function$

CREATE OR REPLACE FUNCTION public.pode_gerir_equipe(p_equipe_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.membros_equipe 
    WHERE equipe_id = p_equipe_id 
      AND usuario_id = auth.uid() 
      AND status = 'ativo' 
      AND papel IN ('admin', 'sub_admin')
  ) OR EXISTS (
    SELECT 1 FROM public.equipes 
    WHERE id = p_equipe_id 
      AND admin_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() 
      AND eh_super_admin = true
  );
END;
$function$

CREATE OR REPLACE FUNCTION public.registrar_acesso()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE public.usuarios
    SET ultimo_acesso = now(),
        total_acessos = total_acessos + 1
    WHERE id = auth.uid();
END;
$function$

CREATE OR REPLACE FUNCTION public.responder_convite_seguro(p_convite_id uuid, p_aceito boolean, p_usuario_id uuid, p_mensagem text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_equipe_id UUID;
  v_jogador_id UUID;
  v_status_atual TEXT;
BEGIN
  SELECT equipe_id, jogador_id, status 
  INTO v_equipe_id, v_jogador_id, v_status_atual
  FROM public.convites_equipe 
  WHERE id = p_convite_id;

  IF v_equipe_id IS NULL THEN
    RAISE EXCEPTION 'Convite não encontrado.';
  END IF;

  IF v_jogador_id != p_usuario_id THEN
    RAISE EXCEPTION 'Este convite não pertence ao seu usuário.';
  END IF;

  IF v_status_atual != 'pendente' THEN
    RAISE EXCEPTION 'Este convite já foi processado.';
  END IF;

  UPDATE public.convites_equipe
  SET status = CASE WHEN p_aceito THEN 'aceito' ELSE 'recusado' END,
      mensagem_resposta = p_mensagem,
      respondido_em = now()
  WHERE id = p_convite_id;

  IF p_aceito = true THEN
    INSERT INTO public.membros_equipe (equipe_id, usuario_id, papel, status)
    VALUES (v_equipe_id, p_usuario_id, 'jogador', 'ativo')
    ON CONFLICT (equipe_id, usuario_id) 
    DO UPDATE SET status = 'ativo', papel = 'jogador';
  END IF;

  RETURN 'resposta_processada';
END;
$function$

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$

CREATE OR REPLACE FUNCTION public.sair_da_equipe_seguro(p_equipe_id uuid, p_usuario_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_rows_affected INTEGER;
BEGIN
    UPDATE public.membros_equipe 
    SET status = 'saiu' 
    WHERE equipe_id = p_equipe_id 
      AND usuario_id = p_usuario_id 
      AND status = 'ativo';
      
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    
    IF v_rows_affected > 0 THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$function$

CREATE OR REPLACE FUNCTION public.solicitar_transferencia_posse(p_equipe_id uuid, p_novo_admin_id uuid, p_usuario_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_is_super BOOLEAN;
  v_is_owner BOOLEAN;
  v_eh_capitao BOOLEAN;
BEGIN
  SELECT eh_super_admin INTO v_is_super FROM public.usuarios WHERE id = p_usuario_id;
  SELECT EXISTS(SELECT 1 FROM public.equipes WHERE id = p_equipe_id AND admin_id = p_usuario_id) INTO v_is_owner;
  SELECT EXISTS(SELECT 1 FROM public.membros_equipe WHERE equipe_id = p_equipe_id AND usuario_id = p_usuario_id AND papel = 'admin') INTO v_eh_capitao;
  
  IF v_is_super = true OR v_is_owner = true OR v_eh_capitao = true THEN
    UPDATE public.equipes 
    SET admin_id_pendente = p_novo_admin_id, 
        data_solicitacao_posse = now()
    WHERE id = p_equipe_id;
    RETURN 'transferido_com_sucesso';
  ELSE
    RAISE EXCEPTION 'Acesso Negado (Validação Falhou). ID Recebido: %', p_usuario_id;
  END IF;
END;
$function$

CREATE OR REPLACE FUNCTION public.usuario_arquivar_interacoes(p_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Permite que você marque sua notificação como "arquivada"
  UPDATE interacoes SET tipo = 'bola_arquivada' WHERE id = ANY(p_ids);
END;
$function$

CREATE OR REPLACE FUNCTION storage.allow_any_operation(expected_operations text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT CASE
      WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
      ELSE raw_operation
    END AS current_operation
    FROM current_operation
  )
  SELECT EXISTS (
    SELECT 1
    FROM normalized n
    CROSS JOIN LATERAL unnest(expected_operations) AS expected_operation
    WHERE expected_operation IS NOT NULL
      AND expected_operation <> ''
      AND n.current_operation = CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END
  );
$function$

CREATE OR REPLACE FUNCTION storage.allow_only_operation(expected_operation text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT
      CASE
        WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
        ELSE raw_operation
      END AS current_operation,
      CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END AS requested_operation
    FROM current_operation
  )
  SELECT CASE
    WHEN requested_operation IS NULL OR requested_operation = '' THEN FALSE
    ELSE COALESCE(current_operation = requested_operation, FALSE)
  END
  FROM normalized;
$function$

CREATE OR REPLACE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$function$

CREATE OR REPLACE FUNCTION storage.enforce_bucket_name_length()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$function$

CREATE OR REPLACE FUNCTION storage.extension(name text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
_parts text[];
_filename text;
BEGIN
	select string_to_array(name, '/') into _parts;
	select _parts[array_length(_parts,1)] into _filename;
	-- @todo return the last part instead of 2
	return reverse(split_part(reverse(_filename), '.', 1));
END
$function$

CREATE OR REPLACE FUNCTION storage.filename(name text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$function$

CREATE OR REPLACE FUNCTION storage.foldername(name text)
 RETURNS text[]
 LANGUAGE plpgsql
AS $function$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[1:array_length(_parts,1)-1];
END
$function$

CREATE OR REPLACE FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$function$

CREATE OR REPLACE FUNCTION storage.get_size_by_bucket()
 RETURNS TABLE(size bigint, bucket_id text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    return query
        select sum((metadata->>'size')::int) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$function$

CREATE OR REPLACE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text)
 RETURNS TABLE(key text, id text, created_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$function$

CREATE OR REPLACE FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text)
 RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$function$

CREATE OR REPLACE FUNCTION storage.operation()
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$function$

CREATE OR REPLACE FUNCTION storage.protect_delete()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$function$

CREATE OR REPLACE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text)
 RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach (unchanged)
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT path_tokens[$1] AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $2 || '%%'
                  AND bucket_id = $3
                  AND array_length(objects.path_tokens, 1) <> $1
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT path_tokens[$1] AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $2 || '%%'
               AND bucket_id = $3
               AND array_length(objects.path_tokens, 1) = $1
             ORDER BY %I %s)
            LIMIT $4 OFFSET $5
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := split_part(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter), v_delimiter, levels);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := split_part(v_current.name, v_delimiter, levels);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$function$

CREATE OR REPLACE FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text)
 RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    IF p_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        p_sort_column,
        v_cursor_op,
        p_sort_column,
        p_sort_order,
        p_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$function$

CREATE OR REPLACE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text)
 RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$function$

CREATE OR REPLACE FUNCTION storage.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$function$

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION criar_perfil_ao_registrar();
CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();
CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();
CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();
CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();

CREATE POLICY "Admins gerenciam ciclos" ON "public"."ciclos_financeiros" AS PERMISSIVE FOR ALL USING (((EXISTS ( SELECT 1
   FROM equipes
  WHERE ((equipes.id = ciclos_financeiros.equipe_id) AND (equipes.admin_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM membros_equipe
  WHERE ((membros_equipe.equipe_id = ciclos_financeiros.equipe_id) AND (membros_equipe.usuario_id = auth.uid()) AND (membros_equipe.papel = 'sub_admin'::text))))));
CREATE POLICY "Jogadores veem ciclos" ON "public"."ciclos_financeiros" AS PERMISSIVE FOR SELECT USING ((EXISTS ( SELECT 1
   FROM membros_equipe
  WHERE ((membros_equipe.equipe_id = ciclos_financeiros.equipe_id) AND (membros_equipe.usuario_id = auth.uid())))));
CREATE POLICY "Admin cria convites" ON "public"."convites_equipe" AS PERMISSIVE FOR INSERT WITH CHECK ((admin_id = auth.uid()));
CREATE POLICY "Admin vê convites da equipe" ON "public"."convites_equipe" AS PERMISSIVE FOR SELECT USING ((admin_id = auth.uid()));
CREATE POLICY "Envolvidos podem deletar convites" ON "public"."convites_equipe" AS PERMISSIVE FOR DELETE USING (((jogador_id = auth.uid()) OR (equipe_id IN ( SELECT equipes.id
   FROM equipes
  WHERE (equipes.admin_id = auth.uid()))) OR (( SELECT usuarios.eh_super_admin
   FROM usuarios
  WHERE (usuarios.id = auth.uid())
 LIMIT 1) = true)));
CREATE POLICY "Jogador responde convite" ON "public"."convites_equipe" AS PERMISSIVE FOR UPDATE USING ((jogador_id = auth.uid()));
CREATE POLICY "Jogador vê seus convites" ON "public"."convites_equipe" AS PERMISSIVE FOR SELECT USING ((jogador_id = auth.uid()));
CREATE POLICY "Convidados veem equipe" ON "public"."equipes" AS PERMISSIVE FOR SELECT USING ((EXISTS ( SELECT 1
   FROM convites_equipe
  WHERE ((convites_equipe.equipe_id = convites_equipe.id) AND (convites_equipe.jogador_id = auth.uid())))));
CREATE POLICY "Leitura global de equipes" ON "public"."equipes" AS PERMISSIVE FOR SELECT USING (((visibilidade = 'publica'::text) OR (admin_id = auth.uid()) OR (( SELECT usuarios.eh_super_admin
   FROM usuarios
  WHERE (usuarios.id = auth.uid())
 LIMIT 1) = true) OR is_member_of_equipe(id) OR (EXISTS ( SELECT 1
   FROM convites_equipe
  WHERE ((convites_equipe.equipe_id = convites_equipe.id) AND (convites_equipe.jogador_id = auth.uid()))))));
CREATE POLICY "Super Admins can view all teams" ON "public"."equipes" AS PERMISSIVE FOR SELECT USING ((EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.id = auth.uid()) AND (usuarios.eh_super_admin = true)))));
CREATE POLICY "equipes_gerenciamento_total" ON "public"."equipes" AS PERMISSIVE FOR ALL USING (((admin_id = auth.uid()) OR (( SELECT usuarios.eh_super_admin
   FROM usuarios
  WHERE (usuarios.id = auth.uid())
 LIMIT 1) = true))) WITH CHECK (true);
CREATE POLICY "equipes_select_base" ON "public"."equipes" AS PERMISSIVE FOR SELECT USING (((admin_id = auth.uid()) OR (visibilidade = 'publica'::text)));
CREATE POLICY "Admins gerenciam config financeira" ON "public"."financeiro_config" AS PERMISSIVE FOR ALL USING (((EXISTS ( SELECT 1
   FROM equipes
  WHERE ((equipes.id = financeiro_config.equipe_id) AND (equipes.admin_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM membros_equipe
  WHERE ((membros_equipe.equipe_id = financeiro_config.equipe_id) AND (membros_equipe.usuario_id = auth.uid()) AND (membros_equipe.papel = 'sub_admin'::text))))));
CREATE POLICY "Interações podem ser criadas por quem envia" ON "public"."interacoes" AS PERMISSIVE FOR INSERT WITH CHECK ((auth.uid() = remetente_id));
CREATE POLICY "Usuários podem deletar interações recebidas" ON "public"."interacoes" AS PERMISSIVE FOR DELETE USING ((auth.uid() = destinatario_id));
CREATE POLICY "Usuários podem ver interações que enviaram ou receberam" ON "public"."interacoes" AS PERMISSIVE FOR SELECT USING (((auth.uid() = remetente_id) OR (auth.uid() = destinatario_id)));
CREATE POLICY "Qualquer um pode ver as modalidades de perfis públicos" ON "public"."jogador_modalidades" AS PERMISSIVE FOR SELECT USING ((EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.id = jogador_modalidades.usuario_id) AND (usuarios.perfil_publico = true)))));
CREATE POLICY "Usuário gerencia suas próprias modalidades" ON "public"."jogador_modalidades" AS PERMISSIVE FOR ALL USING ((auth.uid() = usuario_id));
CREATE POLICY "Permitir gravação de logs para todos" ON "public"."logs_sistema" AS PERMISSIVE FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir leitura para autenticados" ON "public"."logs_sistema" AS PERMISSIVE FOR SELECT USING (true);
CREATE POLICY "Atualização de Membros" ON "public"."membros_equipe" AS PERMISSIVE FOR UPDATE USING (((usuario_id = auth.uid()) OR pode_gerir_equipe(equipe_id)));
CREATE POLICY "Exclusão de Membros" ON "public"."membros_equipe" AS PERMISSIVE FOR DELETE USING (((usuario_id = auth.uid()) OR pode_gerir_equipe(equipe_id)));
CREATE POLICY "Inserção de Solicitação" ON "public"."membros_equipe" AS PERMISSIVE FOR INSERT WITH CHECK (((auth.uid() = usuario_id) AND (status = 'pendente'::text)));
CREATE POLICY "Leitura de Membros" ON "public"."membros_equipe" AS PERMISSIVE FOR SELECT USING (((usuario_id = auth.uid()) OR is_member_of_equipe(equipe_id) OR pode_gerir_equipe(equipe_id)));
CREATE POLICY "Super Admins can view all members" ON "public"."membros_equipe" AS PERMISSIVE FOR SELECT USING ((EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.id = auth.uid()) AND (usuarios.eh_super_admin = true)))));
CREATE POLICY "membros_admin_management" ON "public"."membros_equipe" AS PERMISSIVE FOR ALL USING ((equipe_id IN ( SELECT equipes.id
   FROM equipes
  WHERE (equipes.admin_id = auth.uid()))));
CREATE POLICY "membros_self_access" ON "public"."membros_equipe" AS PERMISSIVE FOR SELECT USING ((usuario_id = auth.uid()));
CREATE POLICY "membros_self_insert" ON "public"."membros_equipe" AS PERMISSIVE FOR INSERT WITH CHECK ((usuario_id = auth.uid()));
CREATE POLICY "membros_view_colleagues" ON "public"."membros_equipe" AS PERMISSIVE FOR SELECT USING ((equipe_id IN ( SELECT equipes.id
   FROM equipes
  WHERE ((equipes.admin_id = auth.uid()) OR (equipes.visibilidade = 'publica'::text)))));
CREATE POLICY "Admins gerenciam mensalidades" ON "public"."mensalidades" AS PERMISSIVE FOR ALL USING (((EXISTS ( SELECT 1
   FROM equipes
  WHERE ((equipes.id = mensalidades.equipe_id) AND (equipes.admin_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM membros_equipe
  WHERE ((membros_equipe.equipe_id = mensalidades.equipe_id) AND (membros_equipe.usuario_id = auth.uid()) AND (membros_equipe.papel = 'sub_admin'::text))))));
CREATE POLICY "Jogadores veem proprias mensalidades" ON "public"."mensalidades" AS PERMISSIVE FOR SELECT USING ((usuario_id = auth.uid()));
CREATE POLICY "Admins gerenciam pagamentos avulsos" ON "public"."pagamentos_avulsos" AS PERMISSIVE FOR ALL USING (((EXISTS ( SELECT 1
   FROM (partidas p
     JOIN equipes e ON ((p.equipe_id = e.id)))
  WHERE ((p.id = pagamentos_avulsos.partida_id) AND ((e.admin_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM membros_equipe
          WHERE ((membros_equipe.equipe_id = e.id) AND (membros_equipe.usuario_id = auth.uid()) AND (membros_equipe.papel = 'sub_admin'::text)))))))) OR (EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.id = auth.uid()) AND (usuarios.eh_super_admin = true))))));
CREATE POLICY "Gestao_Pagamentos_Admins" ON "public"."pagamentos_avulsos" AS PERMISSIVE FOR ALL USING (((equipe_id IN ( SELECT membros_equipe.equipe_id
   FROM membros_equipe
  WHERE ((membros_equipe.usuario_id = auth.uid()) AND (membros_equipe.papel = ANY (ARRAY['admin'::text, 'sub_admin'::text]))))) OR (equipe_id IN ( SELECT equipes.id
   FROM equipes
  WHERE (equipes.admin_id = auth.uid()))) OR (( SELECT usuarios.eh_super_admin
   FROM usuarios
  WHERE (usuarios.id = auth.uid())
 LIMIT 1) = true)));
CREATE POLICY "Jogadores veem proprios pagamentos avulsos" ON "public"."pagamentos_avulsos" AS PERMISSIVE FOR SELECT USING ((usuario_id = auth.uid()));
CREATE POLICY "Permitir upsert do próprio usuário avulso" ON "public"."pagamentos_avulsos" AS PERMISSIVE FOR ALL USING ((auth.uid() = usuario_id)) WITH CHECK ((auth.uid() = usuario_id));
CREATE POLICY "Permitir acesso total às presenças" ON "public"."partida_presencas" AS PERMISSIVE FOR ALL USING (true);
CREATE POLICY "Gestao de partidas por admins" ON "public"."partidas" AS PERMISSIVE FOR ALL USING (((equipe_id IN ( SELECT membros_equipe.equipe_id
   FROM membros_equipe
  WHERE ((membros_equipe.usuario_id = auth.uid()) AND (membros_equipe.papel = ANY (ARRAY['admin'::text, 'sub_admin'::text]))))) OR (equipe_id IN ( SELECT equipes.id
   FROM equipes
  WHERE (equipes.admin_id = auth.uid()))) OR (( SELECT usuarios.eh_super_admin
   FROM usuarios
  WHERE (usuarios.id = auth.uid())
 LIMIT 1) = true)));
CREATE POLICY "Permitir acesso total às partidas" ON "public"."partidas" AS PERMISSIVE FOR ALL USING (true);
CREATE POLICY "Super Admins can view all matches" ON "public"."partidas" AS PERMISSIVE FOR SELECT USING ((EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.id = auth.uid()) AND (usuarios.eh_super_admin = true)))));
CREATE POLICY "Admins c/u presencas" ON "public"."partidas_presencas" AS PERMISSIVE FOR ALL USING (((partida_id IN ( SELECT partidas.id
   FROM partidas
  WHERE ((partidas.equipe_id IN ( SELECT membros_equipe.equipe_id
           FROM membros_equipe
          WHERE ((membros_equipe.usuario_id = auth.uid()) AND (membros_equipe.papel = ANY (ARRAY['admin'::text, 'sub_admin'::text]))))) OR (partidas.equipe_id IN ( SELECT equipes.id
           FROM equipes
          WHERE (equipes.admin_id = auth.uid())))))) OR (( SELECT usuarios.eh_super_admin
   FROM usuarios
  WHERE (usuarios.id = auth.uid())
 LIMIT 1) = true)));
CREATE POLICY "Permitir leitura de presencas" ON "public"."partidas_presencas" AS PERMISSIVE FOR SELECT USING (true);
CREATE POLICY "Permitir usuario alterar inscricao" ON "public"."partidas_presencas" AS PERMISSIVE FOR UPDATE USING ((auth.uid() = usuario_id));
CREATE POLICY "Permitir usuario excluir inscricao" ON "public"."partidas_presencas" AS PERMISSIVE FOR DELETE USING ((auth.uid() = usuario_id));
CREATE POLICY "Permitir usuario inscrever-se" ON "public"."partidas_presencas" AS PERMISSIVE FOR INSERT WITH CHECK ((auth.uid() = usuario_id));
CREATE POLICY "Admins gerenciam punicoes" ON "public"."punicoes_equipe" AS PERMISSIVE FOR ALL USING (((equipe_id IN ( SELECT equipes.id
   FROM equipes
  WHERE (equipes.admin_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM membros_equipe
  WHERE ((membros_equipe.equipe_id = punicoes_equipe.equipe_id) AND (membros_equipe.usuario_id = auth.uid()) AND (membros_equipe.papel = ANY (ARRAY['admin'::text, 'sub_admin'::text]))))) OR (( SELECT usuarios.eh_super_admin
   FROM usuarios
  WHERE (usuarios.id = auth.uid())
 LIMIT 1) = true)));
CREATE POLICY "Gestao de punicoes por admins" ON "public"."punicoes_equipe" AS PERMISSIVE FOR ALL USING (((equipe_id IN ( SELECT membros_equipe.equipe_id
   FROM membros_equipe
  WHERE ((membros_equipe.usuario_id = auth.uid()) AND (membros_equipe.papel = ANY (ARRAY['admin'::text, 'sub_admin'::text]))))) OR (equipe_id IN ( SELECT equipes.id
   FROM equipes
  WHERE (equipes.admin_id = auth.uid()))) OR (( SELECT usuarios.eh_super_admin
   FROM usuarios
  WHERE (usuarios.id = auth.uid())
 LIMIT 1) = true)));
CREATE POLICY "Jogadores veem proprias punicoes" ON "public"."punicoes_equipe" AS PERMISSIVE FOR SELECT USING ((usuario_id = auth.uid()));
CREATE POLICY "usuarios_select_own" ON "public"."usuarios" AS PERMISSIVE FOR SELECT USING ((auth.uid() = id));
CREATE POLICY "usuarios_select_public" ON "public"."usuarios" AS PERMISSIVE FOR SELECT USING ((perfil_publico = true));
CREATE POLICY "usuarios_update_own" ON "public"."usuarios" AS PERMISSIVE FOR UPDATE USING ((auth.uid() = id));
CREATE POLICY "visualizar_perfil_gestao_v2" ON "public"."usuarios" AS PERMISSIVE FOR SELECT USING (((perfil_publico = true) OR (id = auth.uid()) OR eh_gestor_deste_atleta(id, auth.uid())));
CREATE POLICY "Membros podem ver votos da equipe" ON "public"."votos_mvp" AS PERMISSIVE FOR SELECT USING ((EXISTS ( SELECT 1
   FROM membros_equipe
  WHERE ((membros_equipe.equipe_id = votos_mvp.equipe_id) AND (membros_equipe.usuario_id = auth.uid())))));
CREATE POLICY "Participantes presentes podem votar" ON "public"."votos_mvp" AS PERMISSIVE FOR INSERT WITH CHECK (((auth.uid() = eleitor_id) AND (auth.uid() <> candidato_id) AND (EXISTS ( SELECT 1
   FROM partidas_presencas
  WHERE ((partidas_presencas.partida_id = votos_mvp.partida_id) AND (partidas_presencas.usuario_id = auth.uid()) AND (partidas_presencas.frequencia = 'P'::text))))));
CREATE POLICY "Participantes podem ver os votos do time" ON "public"."votos_time" AS PERMISSIVE FOR SELECT USING (true);
CREATE POLICY "Usuários podem inserir o próprio voto de time" ON "public"."votos_time" AS PERMISSIVE FOR INSERT WITH CHECK ((auth.uid() = eleitor_id));
CREATE POLICY "avatares_delete_self" ON "storage"."objects" AS PERMISSIVE FOR DELETE USING (((bucket_id = 'avatares'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "avatares_insert_self" ON "storage"."objects" AS PERMISSIVE FOR INSERT WITH CHECK (((bucket_id = 'avatares'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "avatares_select_public" ON "storage"."objects" AS PERMISSIVE FOR SELECT USING ((bucket_id = 'avatares'::text));
CREATE POLICY "avatares_update_self" ON "storage"."objects" AS PERMISSIVE FOR UPDATE USING (((bucket_id = 'avatares'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "escudos_all_authenticated" ON "storage"."objects" AS PERMISSIVE FOR ALL USING ((bucket_id = 'escudos'::text)) WITH CHECK ((bucket_id = 'escudos'::text));
CREATE POLICY "escudos_select_public" ON "storage"."objects" AS PERMISSIVE FOR SELECT USING ((bucket_id = 'escudos'::text));