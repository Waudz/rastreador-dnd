#!/usr/bin/env bash
set -euo pipefail
psql -v ON_ERROR_STOP=1 <<'SQL' &
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select public.mesclar_acervo('{"items":{"aparelho-a":{"key":"aparelho-a","custom":true,"name":"A","updatedAt":100}}}');
select pg_sleep(1);
commit;
SQL
pid_a=$!
psql -v ON_ERROR_STOP=1 <<'SQL' &
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select public.mesclar_acervo('{"items":{"aparelho-b":{"key":"aparelho-b","custom":true,"name":"B","updatedAt":100}}}');
commit;
SQL
pid_b=$!
wait "$pid_a"
wait "$pid_b"
psql -v ON_ERROR_STOP=1 <<'SQL'
do $$ begin
  if not exists(select 1 from public.acervos where usuario_id='00000000-0000-0000-0000-000000000001' and dados->'items' ?& array['aparelho-a','aparelho-b']) then
    raise exception 'A mesclagem concorrente perdeu uma criação';
  end if;
end $$;
SQL
