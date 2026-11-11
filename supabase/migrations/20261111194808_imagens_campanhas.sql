-- PROPOSTA PARA APROVAÇÃO. Não aplicada. Requer 01, 02 e 03 já instalados.
-- Não altera funções/políticas existentes; não modifica campanhas ou arquivos atuais.
begin;

create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.visual_responsavel(p_campanha uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists (
    select 1 from public.campanhas c join public.membros m on m.campanha_id=c.id
    where c.id=p_campanha and c.mestre_id=auth.uid()
      and m.usuario_id=auth.uid() and m.papel='mestre'
  );
$$;
revoke all on function private.visual_responsavel(uuid) from public,anon;
grant execute on function private.visual_responsavel(uuid) to authenticated;

create or replace function private.visual_caminho(p_campanha uuid,p_tipo text,p_path text)
returns boolean language sql immutable security invoker set search_path='' as $$
  select p_path is null or (p_campanha is not null and p_tipo in ('simbolo','backdrop')
    and p_path ~ ('^'||p_campanha::text||'/'||p_tipo||'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$'));
$$;
revoke all on function private.visual_caminho(uuid,text,text) from public,anon;
grant execute on function private.visual_caminho(uuid,text,text) to authenticated;

create table if not exists public.campanha_visual (
  campanha_id uuid primary key references public.campanhas(id) on delete cascade,
  simbolo_path text,
  backdrop_path text,
  backdrop_y smallint not null default 50 check(backdrop_y between 0 and 100),
  backdrop_y_mobile smallint not null default 50 check(backdrop_y_mobile between 0 and 100),
  versao bigint not null default 0 check(versao>=0),
  atualizado_em timestamptz not null default now(),
  constraint visual_simbolo_path check(private.visual_caminho(campanha_id,'simbolo',simbolo_path)),
  constraint visual_backdrop_path check(private.visual_caminho(campanha_id,'backdrop',backdrop_path))
);
alter table public.campanha_visual enable row level security;
revoke all on public.campanha_visual from public,anon,authenticated;
grant select on public.campanha_visual to authenticated;
drop policy if exists visual_ler on public.campanha_visual;
create policy visual_ler on public.campanha_visual for select to authenticated
  using (public.eh_membro(campanha_id));
-- Escrita direta não é concedida nem mesmo ao mestre: passa pela RPC com versão.

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('campanhas-visuais','campanhas-visuais',false,2097152,
  array['image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=false,file_size_limit=2097152,
  allowed_mime_types=array['image/png','image/jpeg','image/webp'];

-- O bloqueio da campanha serializa limpeza de arquivos e publicação de referências.
create or replace function private.visual_pode_apagar(p_path text)
returns boolean language plpgsql volatile security definer set search_path='' as $$
declare c uuid:=public.uuid_ou_nulo(split_part(p_path,'/',1));
begin
  if not private.visual_responsavel(c) then return false; end if;
  perform 1 from public.campanhas where id=c for update;
  if not private.visual_responsavel(c) then return false; end if;
  return not exists(select 1 from public.campanha_visual
    where campanha_id=c and (simbolo_path=p_path or backdrop_path=p_path));
end $$;
revoke all on function private.visual_pode_apagar(text) from public,anon;
grant execute on function private.visual_pode_apagar(text) to authenticated;

drop policy if exists campanha_visual_ler on storage.objects;
create policy campanha_visual_ler on storage.objects for select to authenticated
using(bucket_id='campanhas-visuais' and (
  private.visual_responsavel(public.uuid_ou_nulo(split_part(name,'/',1))) or
  exists(select 1 from public.campanha_visual v where public.eh_membro(v.campanha_id)
    and (v.simbolo_path=objects.name or v.backdrop_path=objects.name))
));
drop policy if exists campanha_visual_enviar on storage.objects;
create policy campanha_visual_enviar on storage.objects for insert to authenticated
with check(bucket_id='campanhas-visuais'
  and private.visual_responsavel(public.uuid_ou_nulo(split_part(name,'/',1)))
  and split_part(name,'/',2) in ('simbolo','backdrop')
  and private.visual_caminho(public.uuid_ou_nulo(split_part(name,'/',1)),split_part(name,'/',2),name));
drop policy if exists campanha_visual_apagar on storage.objects;
create policy campanha_visual_apagar on storage.objects for delete to authenticated
using(bucket_id='campanhas-visuais' and private.visual_pode_apagar(name));
-- Sem policy UPDATE: arquivos imutáveis. Substituição = novo UUID, depois nova referência.

create or replace function private.salvar_visual_campanha(
  p_campanha uuid,p_versao bigint,p_simbolo text,p_backdrop text,
  p_y smallint,p_y_mobile smallint)
returns public.campanha_visual language plpgsql security definer set search_path='' as $$
declare v public.campanha_visual; caminho text; objeto storage.objects;
begin
  if not private.visual_responsavel(p_campanha) then
    raise exception using errcode='42501',message='Somente o mestre responsável pode alterar as imagens.';
  end if;
  perform 1 from public.campanhas where id=p_campanha for update;
  if not private.visual_responsavel(p_campanha) then
    raise exception using errcode='42501',message='Você não é mais o responsável pela campanha.';
  end if;
  if p_versao is null or p_versao<0 or p_y is null or p_y_mobile is null
     or p_y not between 0 and 100 or p_y_mobile not between 0 and 100 then
    raise exception using errcode='22023',message='Versão ou enquadramento inválido.';
  end if;
  if not private.visual_caminho(p_campanha,'simbolo',p_simbolo)
     or not private.visual_caminho(p_campanha,'backdrop',p_backdrop) then
    raise exception using errcode='22023',message='Caminho de imagem inválido para esta campanha.';
  end if;
  insert into public.campanha_visual(campanha_id) values(p_campanha) on conflict do nothing;
  select * into v from public.campanha_visual where campanha_id=p_campanha for update;
  if v.versao<>p_versao then
    raise exception using errcode='40001',message='As imagens mudaram em outra aba. Atualize antes de salvar.';
  end if;
  foreach caminho in array array[p_simbolo,p_backdrop] loop
    if caminho is null then continue; end if;
    select * into objeto from storage.objects where bucket_id='campanhas-visuais' and name=caminho for share;
    if not found then raise exception using errcode='22023',message='A imagem ainda não foi enviada.'; end if;
    if (objeto.metadata->>'mimetype') is distinct from
      (case split_part(caminho,'.',2) when 'png' then 'image/png' when 'jpg' then 'image/jpeg' when 'webp' then 'image/webp' end)
      or not (case when objeto.metadata->>'size' ~ '^[0-9]{1,10}$'
        then (objeto.metadata->>'size')::bigint between 1 and 2097152 else false end) then
      raise exception using errcode='22023',message='Formato ou tamanho de imagem inválido.';
    end if;
  end loop;
  update public.campanha_visual set simbolo_path=p_simbolo,backdrop_path=p_backdrop,
    backdrop_y=p_y,backdrop_y_mobile=p_y_mobile,versao=versao+1,atualizado_em=now()
    where campanha_id=p_campanha returning * into v;
  return v;
end $$;
revoke all on function private.salvar_visual_campanha(uuid,bigint,text,text,smallint,smallint) from public,anon;
grant execute on function private.salvar_visual_campanha(uuid,bigint,text,text,smallint,smallint) to authenticated;

-- Wrapper invoker exposto ao cliente; operação privilegiada fica no schema privado.
create or replace function public.salvar_visual_campanha(
  p_campanha uuid,p_versao bigint,p_simbolo text,p_backdrop text,p_y smallint,p_y_mobile smallint)
returns public.campanha_visual language sql security invoker set search_path='' as $$
  select private.salvar_visual_campanha(p_campanha,p_versao,p_simbolo,p_backdrop,p_y,p_y_mobile);
$$;
revoke all on function public.salvar_visual_campanha(uuid,bigint,text,text,smallint,smallint) from public,anon;
grant execute on function public.salvar_visual_campanha(uuid,bigint,text,text,smallint,smallint) to authenticated;

commit;
