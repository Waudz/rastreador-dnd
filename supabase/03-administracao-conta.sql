-- Administração vinculada ao login; atribuição do papel só pelo servidor.
create schema if not exists private;
create table if not exists private.administradores (
 usuario_id uuid primary key references auth.users(id) on delete cascade
);
alter table private.administradores enable row level security;
revoke all on private.administradores from public,anon,authenticated;
create or replace function private.conta_admin() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from private.administradores where usuario_id=auth.uid());
$$;
revoke all on function private.conta_admin() from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.conta_admin() to authenticated;
create or replace function public.sou_admin() returns boolean
language sql stable security invoker set search_path='' as $$ select private.conta_admin(); $$;
revoke all on function public.sou_admin() from public,anon;
grant execute on function public.sou_admin() to authenticated;
create or replace function public.eh_mestre(c uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select private.conta_admin() or exists(select 1 from public.membros where campanha_id=c and usuario_id=auth.uid() and papel='mestre');
$$;
do $$ declare t text; begin
 foreach t in array array['perfis','campanhas','membros','personagens','documentos'] loop
  execute format('drop policy if exists administrador_conta on public.%I',t);
  execute format('create policy administrador_conta on public.%I for all to authenticated using ((select private.conta_admin())) with check ((select private.conta_admin()))',t);
 end loop;
end $$;
create table if not exists public.catalogo_publicado (
 id text primary key check(id='2014'),
 dados jsonb not null default '{}'::jsonb check(octet_length(dados::text)<20000000),
 atualizado_em timestamptz not null default now()
);
alter table public.catalogo_publicado enable row level security;
grant select,insert,update on public.catalogo_publicado to authenticated;
drop policy if exists catalogo_ler on public.catalogo_publicado;
create policy catalogo_ler on public.catalogo_publicado for select to authenticated using (true);
drop policy if exists catalogo_admin on public.catalogo_publicado;
create policy catalogo_admin on public.catalogo_publicado for all to authenticated using ((select private.conta_admin())) with check ((select private.conta_admin()));
revoke all on public.catalogo_publicado from anon;
