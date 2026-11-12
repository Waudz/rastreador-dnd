-- PROPOSTA PARA APROVAÇÃO. Não aplicada. Requer a migração 20261111194808_imagens_campanhas.sql já instalada.
-- Habilita o enquadramento (x, y, zoom) do fundo da campanha para computador e celular.
-- Aditiva: não altera funções, políticas nem dados existentes; a RPC antiga salvar_visual_campanha continua igual.
-- Reversão (somente se necessário, depois de conferir que ninguém depende dela):
--   drop function if exists public.salvar_visual_campanha_enquadrada(uuid,bigint,text,text,smallint,smallint,jsonb);
--   drop function if exists private.salvar_visual_campanha_enquadrada(uuid,bigint,text,text,smallint,smallint,jsonb);
--   alter table public.campanha_visual drop constraint if exists visual_enquadramento;
--   alter table public.campanha_visual drop column if exists enquadramento;
--   drop function if exists private.visual_enquadramento_valido(jsonb);
--   drop function if exists private.visual_quadro_valido(jsonb);
begin;

create or replace function private.visual_quadro_valido(q jsonb)
returns boolean language sql immutable security invoker set search_path='' as $$
  select jsonb_typeof(q)='object'
    and (select count(*) from jsonb_object_keys(q))=3
    and q ?& array['x','y','zoom']
    and jsonb_typeof(q->'x')='number' and jsonb_typeof(q->'y')='number' and jsonb_typeof(q->'zoom')='number'
    and (q->>'x')::numeric between 0 and 100
    and (q->>'y')::numeric between 0 and 100
    and (q->>'zoom')::numeric between 1 and 4;
$$;

create or replace function private.visual_enquadramento_valido(f jsonb)
returns boolean language sql immutable security invoker set search_path='' as $$
  select f is null or (
    jsonb_typeof(f)='object'
    and (select count(*) from jsonb_object_keys(f))=2
    and f ?& array['desktop','mobile']
    and private.visual_quadro_valido(f->'desktop')
    and private.visual_quadro_valido(f->'mobile'));
$$;
revoke all on function private.visual_quadro_valido(jsonb) from public,anon;
revoke all on function private.visual_enquadramento_valido(jsonb) from public,anon;
grant execute on function private.visual_quadro_valido(jsonb) to authenticated;
grant execute on function private.visual_enquadramento_valido(jsonb) to authenticated;

alter table public.campanha_visual add column if not exists enquadramento jsonb;
alter table public.campanha_visual drop constraint if exists visual_enquadramento;
alter table public.campanha_visual add constraint visual_enquadramento
  check (private.visual_enquadramento_valido(enquadramento));
-- Leitura: o select já concedido à tabela cobre a coluna nova; a escrita continua só pela RPC.

create or replace function private.salvar_visual_campanha_enquadrada(
  p_campanha uuid,p_versao bigint,p_simbolo text,p_backdrop text,
  p_y smallint,p_y_mobile smallint,p_enquadramento jsonb)
returns public.campanha_visual language plpgsql security definer set search_path='' as $$
declare v public.campanha_visual;
begin
  if not private.visual_responsavel(p_campanha) then
    raise exception using errcode='42501',message='Somente o mestre responsável pode alterar as imagens.';
  end if;
  if not private.visual_enquadramento_valido(p_enquadramento) then
    raise exception using errcode='22023',message='Enquadramento inválido.';
  end if;
  -- mesma transação: validações, versão e referências ficam na função original; o enquadramento só é gravado se ela concluir
  v:=private.salvar_visual_campanha(p_campanha,p_versao,p_simbolo,p_backdrop,p_y,p_y_mobile);
  update public.campanha_visual
     set enquadramento=case when v.backdrop_path is null then null else p_enquadramento end
   where campanha_id=p_campanha returning * into v;
  return v;
end $$;
revoke all on function private.salvar_visual_campanha_enquadrada(uuid,bigint,text,text,smallint,smallint,jsonb) from public,anon;
grant execute on function private.salvar_visual_campanha_enquadrada(uuid,bigint,text,text,smallint,smallint,jsonb) to authenticated;

create or replace function public.salvar_visual_campanha_enquadrada(
  p_campanha uuid,p_versao bigint,p_simbolo text,p_backdrop text,
  p_y smallint,p_y_mobile smallint,p_enquadramento jsonb)
returns public.campanha_visual language sql security invoker set search_path='' as $$
  select private.salvar_visual_campanha_enquadrada(p_campanha,p_versao,p_simbolo,p_backdrop,p_y,p_y_mobile,p_enquadramento);
$$;
revoke all on function public.salvar_visual_campanha_enquadrada(uuid,bigint,text,text,smallint,smallint,jsonb) from public,anon;
grant execute on function public.salvar_visual_campanha_enquadrada(uuid,bigint,text,text,smallint,smallint,jsonb) to authenticated;

commit;
