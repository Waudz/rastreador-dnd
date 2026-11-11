-- Execute após 01-schema.sql no SQL Editor do Supabase.
-- Acervo privado por conta; nenhuma informação é tornada pública.
begin;
create table if not exists public.acervos (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  dados jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now(),
  check (octet_length(dados::text) < 15000000)
);
alter table public.acervos enable row level security;
revoke all on public.acervos from anon, authenticated;
grant select, insert, update on public.acervos to authenticated;
drop policy if exists acervo_ler on public.acervos;
create policy acervo_ler on public.acervos for select to authenticated using (usuario_id=(select auth.uid()));
drop policy if exists acervo_criar on public.acervos;
create policy acervo_criar on public.acervos for insert to authenticated with check (usuario_id=(select auth.uid()));
drop policy if exists acervo_editar on public.acervos;
create policy acervo_editar on public.acervos for update to authenticated using (usuario_id=(select auth.uid())) with check (usuario_id=(select auth.uid()));

-- Serializa a mesclagem para dois aparelhos não sobrescreverem criações.
create or replace function public.mesclar_acervo(p_dados jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare atual jsonb; itens jsonb; mortos jsonb; k text; v jsonb;
begin
  if auth.uid() is null then raise exception 'Faça login.'; end if;
  insert into public.acervos(usuario_id) values(auth.uid()) on conflict do nothing;
  select dados into atual from public.acervos where usuario_id=auth.uid() for update;
  itens=coalesce(atual->'items','{}'::jsonb);
  mortos=coalesce(atual->'deleted','{}'::jsonb);
  for k,v in select * from jsonb_each(coalesce(p_dados->'deleted','{}'::jsonb)) loop
    if coalesce((v#>>'{}')::numeric,0)>coalesce((mortos->>k)::numeric,0) then mortos=jsonb_set(mortos,array[k],v); end if;
  end loop;
  for k,v in select * from jsonb_each(coalesce(p_dados->'items','{}'::jsonb)) loop
    if coalesce((v->>'updatedAt')::numeric,0)>=coalesce((itens->k->>'updatedAt')::numeric,0) then itens=jsonb_set(itens,array[k],v); end if;
  end loop;
  for k,v in select * from jsonb_each(mortos) loop
    if coalesce((v#>>'{}')::numeric,0)>=coalesce((itens->k->>'updatedAt')::numeric,0) then itens=itens-k; end if;
  end loop;
  atual=jsonb_build_object('v',1,'items',itens,'deleted',mortos,
    'tr',coalesce(atual->'tr','{}'::jsonb)||coalesce(p_dados->'tr','{}'::jsonb),
    'ldj',coalesce(atual->'ldj','{}'::jsonb)||coalesce(p_dados->'ldj','{}'::jsonb));
  update public.acervos set dados=atual,atualizado_em=now() where usuario_id=auth.uid();
  return atual;
end $$;
revoke all on function public.mesclar_acervo(jsonb) from public,anon;
grant execute on function public.mesclar_acervo(jsonb) to authenticated;

-- O mestre só pode atribuir um personagem a participantes da mesma campanha.
create or replace function public.personagens_antes_atualizar() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if not public.eh_mestre(old.campanha_id) then
    new.campanha_id:=old.campanha_id; new.dono_id:=old.dono_id;
  end if;
  if new.dono_id is not null and not exists(select 1 from public.membros where campanha_id=new.campanha_id and usuario_id=new.dono_id) then
    raise exception 'O dono precisa participar da campanha.';
  end if;
  new.atualizado_em:=now(); new.atualizado_por:=auth.uid(); new.versao:=old.versao+1;
  return new;
end $$;
commit;
