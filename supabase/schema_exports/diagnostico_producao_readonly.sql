-- PlayHub - Diagnostico de producao somente leitura
-- Execute no SQL Editor do Supabase antes de qualquer migration.
-- Este arquivo nao altera dados.

-- 1. Volumetria das tabelas principais
select 'usuarios' as tabela, count(*) as total from public.usuarios
union all select 'equipes', count(*) from public.equipes
union all select 'membros_equipe', count(*) from public.membros_equipe
union all select 'partidas', count(*) from public.partidas
union all select 'partidas_presencas', count(*) from public.partidas_presencas
union all select 'partida_presencas_legado', count(*) from public.partida_presencas
union all select 'votos_mvp', count(*) from public.votos_mvp
union all select 'votos_time', count(*) from public.votos_time
union all select 'logs_sistema', count(*) from public.logs_sistema
union all select 'mensalidades', count(*) from public.mensalidades
union all select 'pagamentos_avulsos', count(*) from public.pagamentos_avulsos
order by tabela;

-- 2. Usuarios com perfil publico e campos sensiveis preenchidos
select
  count(*) as usuarios_publicos,
  count(*) filter (where email is not null and email <> '') as com_email,
  count(*) filter (where telefone is not null and telefone <> '') as com_telefone,
  count(*) filter (where data_nascimento is not null) as com_data_nascimento,
  count(*) filter (where cep is not null and cep <> '') as com_cep,
  count(*) filter (where latitude is not null or longitude is not null) as com_geolocalizacao
from public.usuarios
where perfil_publico = true;

-- 3. Idade e volume dos logs
select
  count(*) as total_logs,
  min(criado_em) as primeiro_log,
  max(criado_em) as ultimo_log,
  count(*) filter (where criado_em < now() - interval '90 days') as logs_mais_90_dias,
  count(*) filter (where criado_em < now() - interval '180 days') as logs_mais_180_dias
from public.logs_sistema;

-- 4. Logs por tipo
select tipo, count(*) as total
from public.logs_sistema
group by tipo
order by total desc, tipo;

-- 5. Verificar se tabela legada de presencas ainda tem dados recentes
select
  count(*) as total,
  min(criado_em) as primeira_presenca,
  max(criado_em) as ultima_presenca
from public.partida_presencas;

-- 6. Possiveis duplicidades defensivas, mesmo com constraints
select partida_id, usuario_id, count(*) as total
from public.partidas_presencas
group by partida_id, usuario_id
having count(*) > 1;

select partida_id, usuario_id, count(*) as total
from public.pagamentos_avulsos
group by partida_id, usuario_id
having count(*) > 1;

select equipe_id, usuario_id, periodo, count(*) as total
from public.mensalidades
group by equipe_id, usuario_id, periodo
having count(*) > 1;

-- 7. Votos MVP inconsistentes
select partida_id, eleitor_id, posicao, count(*) as total
from public.votos_mvp
group by partida_id, eleitor_id, posicao
having count(*) > 1;

select partida_id, eleitor_id, candidato_id, count(*) as total
from public.votos_mvp
group by partida_id, eleitor_id, candidato_id
having count(*) > 1;

-- 8. Votos de time inconsistentes
select partida_id, eleitor_id, posicao, count(*) as total
from public.votos_time
group by partida_id, eleitor_id, posicao
having count(*) > 1;

-- 9. Presencas sem usuario correspondente
select pp.*
from public.partidas_presencas pp
left join public.usuarios u on u.id = pp.usuario_id
where u.id is null
limit 50;

-- 10. Partidas sem equipe correspondente
select p.*
from public.partidas p
left join public.equipes e on e.id = p.equipe_id
where e.id is null
limit 50;

-- 11. Policies abertas para revisao manual
select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and (
    qual = 'true'
    or with_check = 'true'
    or qual ilike '%true%'
    or with_check ilike '%true%'
  )
order by tablename, policyname;

-- 12. Funcoes SECURITY DEFINER para revisao manual
select
  n.nspname as schema,
  p.proname as funcao,
  pg_get_function_identity_arguments(p.oid) as argumentos
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef = true
order by p.proname, argumentos;
