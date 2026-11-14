-- PROPOSTA — NÃO aplicada. Fonte única do SQL descrito em docs/PLANO-IMAGENS-PUBLICAS.md.
-- Aplica-se hoje só no PostgreSQL descartável do CI (tests/catalogo-imagens-publicas.test.sql). Ao ser aprovada pelo William,
-- este arquivo vira uma migração em supabase/migrations/ e é aplicado no Supabase pelo painel (SQL Editor).
-- Idempotente (create or replace / revoke+grant): pode ser reaplicada.
begin;
create or replace function public.catalogo_imagens_publicas()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object(
          'tipo',r.value->>'tipo',
          'chave',r.value->>'chave',
          'imagem',case when jsonb_typeof(r.value->'imagem')='string' then r.value->'imagem' else 'null'::jsonb end)),
        '[]'::jsonb)
 from public.catalogo_publicado c
 cross join lateral jsonb_each(case when jsonb_typeof(c.dados->'globais')='object' then c.dados->'globais' else '{}'::jsonb end) r
 where c.id='2014'
   and jsonb_typeof(r.value)='object'
   and r.value->'imagemDefinida'='true'::jsonb                                     -- só registros em que o administrador decidiu sobre a imagem
   and coalesce(r.value->'excluido','false'::jsonb)<>'true'::jsonb                 -- nunca itens/monstros excluídos
   and r.value->>'tipo' in ('item','monstro')
   and r.value->>'chave' ~ '^[A-Za-z0-9_:/.-]{1,180}$'                             -- mesmo formato que salvar_catalogo_global exige
   and (jsonb_typeof(r.value->'imagem') in ('null')                                -- imagem removida de propósito
        or (jsonb_typeof(r.value->'imagem')='string'
            and r.value->>'imagem' ~ ('^'||case r.value->>'tipo' when 'item' then 'itens' else 'monstros' end||'/[0-9a-f-]{36}\.(jpg|png|webp)$')));
$$;
comment on function public.catalogo_imagens_publicas() is 'Somente tipo, chave e caminho de imagem do catálogo global (bucket público). Não devolve dados, nomes nem registros excluídos.';
-- permissões explícitas: zera TUDO (inclusive os grants automáticos do Supabase) e concede só o necessário
revoke all on function public.catalogo_imagens_publicas() from public, anon, authenticated;
grant execute on function public.catalogo_imagens_publicas() to anon, authenticated;
commit;
