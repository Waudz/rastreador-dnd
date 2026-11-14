-- Somente no PostgreSQL descartável do CI (nunca no projeto real).
-- Pré-requisitos, nesta ordem: tests/supabase-fixture.sql, 01, 02 e 03 (cria public.catalogo_publicado) e
-- supabase/propostas/catalogo-imagens-publicas.sql. Cenários do §8 de docs/PLANO-IMAGENS-PUBLICAS.md.
-- ATENÇÃO: escrito sem poder executar localmente; a primeira execução real é a do CI.
reset role;

-- fixture: registros válidos e inválidos, com texto sigiloso em "dados"
insert into public.catalogo_publicado(id,dados) values('2014','{}'::jsonb) on conflict(id) do nothing;
update public.catalogo_publicado set dados=$json$
{"globais":{
 "item:srd51:item/dagger":{"tipo":"item","chave":"srd51:item/dagger","imagem":"itens/0b3c5a52-1c2d-4e7a-9a11-0123456789ab.png","imagemDefinida":true,"excluido":false,"versao":2,"dados":{"nome":"SEGREDO-NOME-ADAGA","desc":"SEGREDO-DESCRICAO"}},
 "monstro:goblin":{"tipo":"monstro","chave":"goblin","imagem":"monstros/1b3c5a52-1c2d-4e7a-9a11-0123456789ab.jpg","imagemDefinida":true,"versao":1},
 "item:removida":{"tipo":"item","chave":"removida","imagem":null,"imagemDefinida":true,"versao":3},
 "item:excluido":{"tipo":"item","chave":"excluido","imagem":"itens/2b3c5a52-1c2d-4e7a-9a11-0123456789ab.png","imagemDefinida":true,"excluido":true},
 "item:semdef":{"tipo":"item","chave":"semdef","imagem":"itens/3b3c5a52-1c2d-4e7a-9a11-0123456789ab.png","imagemDefinida":false},
 "item:ruim1":{"tipo":"item","chave":"ruim1","imagem":"../x/4b3c5a52-1c2d-4e7a-9a11-0123456789ab.png","imagemDefinida":true},
 "item:ruim2":{"tipo":"item","chave":"ruim2","imagem":"itens/5b3c5a52-1c2d-4e7a-9a11-0123456789ab.svg","imagemDefinida":true},
 "monstro:trocado":{"tipo":"monstro","chave":"trocado","imagem":"itens/6b3c5a52-1c2d-4e7a-9a11-0123456789ab.png","imagemDefinida":true},
 "item:espaco":{"tipo":"item","chave":"tem espaço","imagem":"itens/7b3c5a52-1c2d-4e7a-9a11-0123456789ab.png","imagemDefinida":true},
 "personagem:x":{"tipo":"personagem","chave":"x","imagem":"itens/8b3c5a52-1c2d-4e7a-9a11-0123456789ab.png","imagemDefinida":true},
 "item:lixo":"texto solto"
}}$json$::jsonb where id='2014';

create schema tst_ci;
grant usage on schema tst_ci to anon,authenticated;

-- 1) visitante (anon) e usuário comum (authenticated): só os 3 registros válidos, só tipo/chave/imagem, nada de "dados"
create function tst_ci.verificar_lista() returns void language plpgsql as $$
declare r jsonb;e jsonb;chaves text[];
begin
 r:=public.catalogo_imagens_publicas();
 if jsonb_typeof(r)<>'array' or jsonb_array_length(r)<>3 then raise exception 'esperava 3 registros, veio: %',r;end if;
 for e in select value from jsonb_array_elements(r) loop
  select array_agg(k order by k) into chaves from jsonb_object_keys(e) k;
  if chaves is distinct from array['chave','imagem','tipo'] then raise exception 'campos além de tipo/chave/imagem: %',chaves;end if;
 end loop;
 if r::text ~ 'SEGREDO' then raise exception 'vazou texto de dados: %',r;end if;
 if not exists(select 1 from jsonb_array_elements(r) x where x->>'tipo'='item' and x->>'chave'='srd51:item/dagger' and x->>'imagem'='itens/0b3c5a52-1c2d-4e7a-9a11-0123456789ab.png') then raise exception 'item válido ausente';end if;
 if not exists(select 1 from jsonb_array_elements(r) x where x->>'tipo'='monstro' and x->>'chave'='goblin' and x->>'imagem'='monstros/1b3c5a52-1c2d-4e7a-9a11-0123456789ab.jpg') then raise exception 'monstro válido ausente';end if;
 if not exists(select 1 from jsonb_array_elements(r) x where x->>'chave'='removida' and jsonb_typeof(x->'imagem')='null') then raise exception 'imagem removida deveria voltar com imagem null';end if;
 if exists(select 1 from jsonb_array_elements(r) x where x->>'chave' in ('excluido','semdef','ruim1','ruim2','trocado','tem espaço','x','lixo')) then raise exception 'registro inválido/excluído apareceu: %',r;end if;
end $$;
grant execute on function tst_ci.verificar_lista() to anon,authenticated;

set role anon;
select tst_ci.verificar_lista();
do $$ begin
 begin perform 1 from public.catalogo_publicado;raise exception 'anon leu a tabela do catálogo';exception when insufficient_privilege then null;end;
end $$;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select tst_ci.verificar_lista();
reset role;

-- 2) formatos inesperados de "globais" ou ausência do registro: sempre [] e sem erro
create function tst_ci.vazio(rotulo text) returns void language plpgsql as $$
begin if public.catalogo_imagens_publicas()<>'[]'::jsonb then raise exception 'esperava [] (%): %',rotulo,public.catalogo_imagens_publicas();end if;end $$;
grant execute on function tst_ci.vazio(text) to anon;
update public.catalogo_publicado set dados='{}'::jsonb where id='2014';
set role anon;select tst_ci.vazio('sem globais');reset role;
update public.catalogo_publicado set dados='{"globais":[1,2]}'::jsonb where id='2014';
set role anon;select tst_ci.vazio('globais array');reset role;
update public.catalogo_publicado set dados='{"globais":"x"}'::jsonb where id='2014';
set role anon;select tst_ci.vazio('globais texto');reset role;
delete from public.catalogo_publicado where id='2014';
set role anon;select tst_ci.vazio('sem a linha 2014');reset role;

-- 3) permissões e atributos da função (sem depender do padrão)
do $$
declare p pg_proc;extras text;
begin
 select * into p from pg_proc where oid='public.catalogo_imagens_publicas()'::regprocedure;
 if not p.prosecdef then raise exception 'função deveria ser security definer';end if;
 if p.provolatile<>'s' then raise exception 'função deveria ser stable';end if;
 if p.proconfig is null or not (p.proconfig @> array['search_path=""']) then raise exception 'search_path deveria ser vazio: %',p.proconfig;end if;
 if not has_function_privilege('anon','public.catalogo_imagens_publicas()','execute') then raise exception 'anon sem execute';end if;
 if not has_function_privilege('authenticated','public.catalogo_imagens_publicas()','execute') then raise exception 'authenticated sem execute';end if;
 if has_table_privilege('anon','public.catalogo_publicado','select') then raise exception 'anon não pode ter select na tabela';end if;
 select string_agg(distinct grantee,',') into extras from information_schema.routine_privileges
  where routine_schema='public' and routine_name='catalogo_imagens_publicas' and grantee not in ('anon','authenticated',current_user);
 if extras is not null then raise exception 'grantee inesperado (PUBLIC?): %',extras;end if;
end $$;

-- 4) reaplicação (idempotência) mantém tudo igual
\i supabase/propostas/catalogo-imagens-publicas.sql
do $$ begin
 if not has_function_privilege('anon','public.catalogo_imagens_publicas()','execute') then raise exception 'após reaplicar: anon sem execute';end if;
 if exists(select 1 from information_schema.routine_privileges where routine_schema='public' and routine_name='catalogo_imagens_publicas' and grantee not in ('anon','authenticated',current_user)) then raise exception 'após reaplicar: grantee inesperado';end if;
end $$;

-- 5) rollback: a função some e a tabela continua fechada
\i supabase/propostas/catalogo-imagens-publicas.rollback.sql
do $$ begin
 if to_regprocedure('public.catalogo_imagens_publicas()') is not null then raise exception 'rollback não removeu a função';end if;
 if has_table_privilege('anon','public.catalogo_publicado','select') then raise exception 'tabela aberta para anon';end if;
end $$;

drop schema tst_ci cascade;
-- limpeza: devolve o catálogo ao estado do admin.test.sql
insert into public.catalogo_publicado(id,dados) values('2014','{"mon":[]}'::jsonb) on conflict(id) do update set dados=excluded.dados;
