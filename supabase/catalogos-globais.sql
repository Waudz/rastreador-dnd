-- Extensão do catálogo existente. Não altera fichas, campanhas ou acervos privados.
begin;
-- O catálogo exige conta autenticada; não abrir o JSON inteiro para visitantes.
revoke all on public.catalogo_publicado from public, anon;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('catalogos','catalogos',true,2097152,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
drop policy if exists catalogos_ler on storage.objects;
create policy catalogos_ler on storage.objects for select to anon,authenticated using(bucket_id='catalogos');
drop policy if exists catalogos_enviar on storage.objects;
create policy catalogos_enviar on storage.objects for insert to authenticated
with check(bucket_id='catalogos' and (select private.conta_admin()) and name ~ '^(monstros|itens)/[0-9a-f-]{36}\.(jpg|png|webp)$');
-- Arquivos imutáveis: não conceder DELETE ou UPDATE no bucket catalogos.
-- Uma imagem pode continuar referenciada por fichas pessoais ou caches locais.
-- Remover eventuais políticas antigas com esses nomes, sem criar substitutas.
drop policy if exists catalogos_apagar on storage.objects;
drop policy if exists catalogos_atualizar on storage.objects;

create or replace function public.salvar_catalogo_global(
 p_tipo text,p_chave text,p_dados jsonb default null,p_alterar_imagem boolean default false,
 p_imagem text default null,p_excluido boolean default false,p_versao integer default 0
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare atual jsonb; anterior jsonb; registro jsonb; chave text; versao integer;
begin
 if not coalesce(private.conta_admin(),false) then raise exception 'Somente administradores editam os catálogos globais.' using errcode='42501';end if;
 if p_tipo is null or p_tipo not in ('monstro','item') or p_chave is null or p_chave !~ '^[A-Za-z0-9_:/.-]{1,180}$'
 or p_versao is null or p_versao<0 or p_alterar_imagem is null or p_excluido is null then
  raise exception 'Identificação ou versão inválida.' using errcode='22023';
 end if;
 if p_dados is not null and (jsonb_typeof(p_dados)<>'object' or octet_length(p_dados::text)>150000
  or length(btrim(coalesce(p_dados->>case when p_tipo='item' then 'nome' else 'name' end,''))) not between 1 and 120
  or (p_dados->>case when p_tipo='item' then 'id' else 'key' end) is distinct from p_chave
  or coalesce(p_dados#>>'{document,key}','') ~ '2024') then
  raise exception 'Dados de catálogo inválidos.' using errcode='22023';
 end if;
 if p_alterar_imagem and p_imagem is not null then
  if p_imagem !~ ('^'||case when p_tipo='item' then 'itens' else 'monstros' end||'/[0-9a-f-]{36}\.(jpg|png|webp)$')
   or not exists(select 1 from storage.objects o where o.bucket_id='catalogos' and o.name=p_imagem
    and o.metadata->>'mimetype' in ('image/jpeg','image/png','image/webp')
    and (o.metadata->>'size')::bigint between 1 and 2097152) then
   raise exception 'Imagem não enviada ou caminho inválido.' using errcode='22023';
  end if;
 end if;
 insert into public.catalogo_publicado(id) values('2014') on conflict(id) do nothing;
 select coalesce(dados,'{}'::jsonb) into atual from public.catalogo_publicado where id='2014' for update;
 chave:=p_tipo||':'||p_chave;
 anterior:=coalesce(atual->'globais'->chave,'{}'::jsonb);
 versao:=coalesce((anterior->>'versao')::integer,0);
 if versao<>p_versao then raise exception 'O catálogo mudou em outro dispositivo. Atualize antes de salvar.' using errcode='40001';end if;
 registro:=jsonb_build_object('tipo',p_tipo,'chave',p_chave,'dados',coalesce(p_dados,anterior->'dados'),
  'imagem',case when p_alterar_imagem then to_jsonb(p_imagem) else anterior->'imagem' end,
  'imagemDefinida',p_alterar_imagem or coalesce((anterior->>'imagemDefinida')::boolean,false),
  'excluido',p_excluido,'versao',versao+1,'atualizado_em',clock_timestamp());
 atual:=jsonb_set(coalesce(atual,'{}'::jsonb),'{globais}',coalesce(atual->'globais','{}'::jsonb)||jsonb_build_object(chave,registro));
 update public.catalogo_publicado set dados=atual,atualizado_em=clock_timestamp() where id='2014';
 return registro;
end $$;
revoke all on function public.salvar_catalogo_global(text,text,jsonb,boolean,text,boolean,integer) from public,anon;
grant execute on function public.salvar_catalogo_global(text,text,jsonb,boolean,text,boolean,integer) to authenticated;
commit;
