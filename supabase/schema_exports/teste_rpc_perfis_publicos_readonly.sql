-- PlayHub - testes read-only para a camada segura de perfis publicos
-- Rode no SQL Editor depois de aplicar a migration 20260504_public_profiles_safe_layer.sql.
-- Nao altera dados.

-- 1. Confirma se as funcoes existem com as assinaturas esperadas.
select
  n.nspname as schema,
  p.proname as funcao,
  pg_get_function_identity_arguments(p.oid) as argumentos
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'buscar_atletas_publicos_seguro',
    'buscar_perfil_publico_atleta_seguro',
    'obter_whatsapp_match_seguro'
  )
order by p.proname;

-- 2. Lista atletas publicos sem expor email, telefone, data de nascimento, CEP ou endereco.
select *
from public.buscar_atletas_publicos_seguro(
  p_termo := null,
  p_cidade := null,
  p_modalidade := null,
  p_cidade_referencia := null,
  p_estado_referencia := null,
  p_limite := 10,
  p_offset := 0
);

-- 3. Testa ordenacao por cidade/estado de referencia.
select id, nome_completo, apelido, cidade, estado, idade, esportes_interesse, compartilhar_whatsapp_match
from public.buscar_atletas_publicos_seguro(
  p_termo := null,
  p_cidade := null,
  p_modalidade := null,
  p_cidade_referencia := 'Itaquaquecetuba',
  p_estado_referencia := 'SP',
  p_limite := 10,
  p_offset := 0
);

-- 4. Testa perfil publico seguro usando um id retornado pela busca acima.
-- Substitua o UUID abaixo por um id real da consulta 2 ou 3.
-- select *
-- from public.buscar_perfil_publico_atleta_seguro('00000000-0000-0000-0000-000000000000'::uuid);

-- 5. Testa liberacao de WhatsApp por match.
-- Precisa estar logado como usuario autenticado no SQL Editor para auth.uid() funcionar.
-- Substitua o UUID abaixo por um atleta real.
-- select *
-- from public.obter_whatsapp_match_seguro('00000000-0000-0000-0000-000000000000'::uuid);

-- 6. Confere que as funcoes nao devolvem colunas sensiveis.
-- Resultado esperado: nenhuma coluna email, telefone, data_nascimento, cep, rua, numero,
-- complemento ou bairro nas duas funcoes de perfil/listagem.
select
  r.routine_name,
  string_agg(p.parameter_name, ', ' order by p.ordinal_position) as colunas_retorno
from information_schema.parameters
  p
join information_schema.routines r
  on r.specific_schema = p.specific_schema
 and r.specific_name = p.specific_name
where p.specific_schema = 'public'
  and r.routine_name in (
    'buscar_atletas_publicos_seguro',
    'buscar_perfil_publico_atleta_seguro',
    'obter_whatsapp_match_seguro'
  )
  and p.parameter_mode = 'OUT'
group by r.routine_name
order by r.routine_name;
