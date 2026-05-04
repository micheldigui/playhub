-- PlayHub - camada segura para perfis publicos e contato por match
-- Tipo: aditiva / baixo risco
-- Esta migration NAO remove policies existentes e NAO bloqueia fluxos atuais.

create or replace function public.buscar_atletas_publicos_seguro(
  p_termo text default null,
  p_cidade text default null,
  p_modalidade text default null,
  p_cidade_referencia text default null,
  p_estado_referencia text default null,
  p_limite integer default 24,
  p_offset integer default 0
)
returns table (
  id uuid,
  nome_completo text,
  apelido text,
  foto_url text,
  cidade text,
  estado text,
  idade integer,
  esportes_interesse text[],
  compartilhar_whatsapp_match boolean
)
language sql
stable
security definer
set search_path = public
as $buscar_atletas$
  select
    u.id,
    u.nome_completo,
    u.apelido,
    u.foto_url,
    u.cidade,
    u.estado,
    date_part('year', age(current_date, u.data_nascimento))::integer as idade,
    u.esportes_interesse,
    coalesce(u.compartilhar_whatsapp_match, false) as compartilhar_whatsapp_match
  from public.usuarios u
  where u.perfil_publico = true
    and u.data_nascimento is not null
    and u.data_nascimento <= (current_date - interval '18 years')::date
    and (
      nullif(trim(p_termo), '') is null
      or u.nome_completo ilike '%' || trim(p_termo) || '%'
      or u.apelido ilike '%' || trim(p_termo) || '%'
    )
    and (
      nullif(trim(p_cidade), '') is null
      or u.cidade ilike '%' || trim(p_cidade) || '%'
    )
    and (
      nullif(trim(p_modalidade), '') is null
      or trim(p_modalidade) = any(u.esportes_interesse)
    )
  order by
    case
      when nullif(trim(p_cidade_referencia), '') is not null
        and lower(trim(u.cidade)) = lower(trim(p_cidade_referencia)) then 0
      when nullif(trim(p_estado_referencia), '') is not null
        and lower(trim(u.estado)) = lower(trim(p_estado_referencia)) then 1
      else 2
    end,
    u.nome_completo asc
  limit least(greatest(coalesce(p_limite, 24), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$buscar_atletas$;

revoke all on function public.buscar_atletas_publicos_seguro(text, text, text, text, text, integer, integer) from public;
revoke all on function public.buscar_atletas_publicos_seguro(text, text, text, text, text, integer, integer) from anon;
grant execute on function public.buscar_atletas_publicos_seguro(text, text, text, text, text, integer, integer) to authenticated;

create or replace function public.buscar_perfil_publico_atleta_seguro(p_atleta_id uuid)
returns table (
  id uuid,
  nome_completo text,
  apelido text,
  foto_url text,
  cidade text,
  estado text,
  idade integer,
  esportes_interesse text[],
  perfil_publico boolean,
  compartilhar_whatsapp_match boolean
)
language sql
stable
security definer
set search_path = public
as $perfil_publico$
  select
    u.id,
    u.nome_completo,
    u.apelido,
    u.foto_url,
    u.cidade,
    u.estado,
    case
      when u.data_nascimento is null then null
      else date_part('year', age(current_date, u.data_nascimento))::integer
    end as idade,
    u.esportes_interesse,
    u.perfil_publico,
    coalesce(u.compartilhar_whatsapp_match, false) as compartilhar_whatsapp_match
  from public.usuarios u
  where u.id = p_atleta_id
    and u.perfil_publico = true;
$perfil_publico$;

revoke all on function public.buscar_perfil_publico_atleta_seguro(uuid) from public;
revoke all on function public.buscar_perfil_publico_atleta_seguro(uuid) from anon;
grant execute on function public.buscar_perfil_publico_atleta_seguro(uuid) to authenticated;

create or replace function public.obter_whatsapp_match_seguro(p_atleta_id uuid)
returns table (
  liberado boolean,
  telefone text,
  motivo text
)
language plpgsql
stable
security definer
set search_path = public
as $whatsapp_match$
declare
  v_usuario_id uuid := auth.uid();
  v_eu public.usuarios%rowtype;
  v_alvo public.usuarios%rowtype;
  v_tem_ida boolean := false;
  v_tem_volta boolean := false;
begin
  if v_usuario_id is null then
    return query select false, null::text, 'usuario_nao_autenticado';
    return;
  end if;

  if p_atleta_id is null or p_atleta_id = v_usuario_id then
    return query select false, null::text, 'atleta_invalido';
    return;
  end if;

  select * into v_eu
  from public.usuarios
  where id = v_usuario_id;

  select * into v_alvo
  from public.usuarios
  where id = p_atleta_id;

  if v_eu.id is null or v_alvo.id is null then
    return query select false, null::text, 'usuario_nao_encontrado';
    return;
  end if;

  if coalesce(v_eu.compartilhar_whatsapp_match, false) = false then
    return query select false, null::text, 'seu_whatsapp_privado';
    return;
  end if;

  if coalesce(v_alvo.compartilhar_whatsapp_match, false) = false then
    return query select false, null::text, 'whatsapp_do_atleta_privado';
    return;
  end if;

  if v_eu.data_nascimento is null
    or v_alvo.data_nascimento is null
    or v_eu.data_nascimento > (current_date - interval '18 years')::date
    or v_alvo.data_nascimento > (current_date - interval '18 years')::date then
    return query select false, null::text, 'maioridade_nao_confirmada';
    return;
  end if;

  select exists (
    select 1
    from public.interacoes i
    where i.tipo = 'bola'
      and i.remetente_id = v_usuario_id
      and i.destinatario_id = p_atleta_id
  ) into v_tem_ida;

  select exists (
    select 1
    from public.interacoes i
    where i.tipo = 'bola'
      and i.remetente_id = p_atleta_id
      and i.destinatario_id = v_usuario_id
  ) into v_tem_volta;

  if not (v_tem_ida and v_tem_volta) then
    return query select false, null::text, 'match_nao_confirmado';
    return;
  end if;

  return query select true, v_alvo.telefone, 'match_confirmado';
end;
$whatsapp_match$;

revoke all on function public.obter_whatsapp_match_seguro(uuid) from public;
revoke all on function public.obter_whatsapp_match_seguro(uuid) from anon;
grant execute on function public.obter_whatsapp_match_seguro(uuid) to authenticated;
