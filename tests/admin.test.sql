-- Executar após supabase.test.sql, com seus usuários fictícios.
reset role;
insert into private.administradores(usuario_id) values ('00000000-0000-0000-0000-000000000001') on conflict do nothing;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
do $$ begin
 if public.sou_admin() then raise exception 'Jogador recebeu administração'; end if;
 begin
  insert into private.administradores(usuario_id) values(auth.uid());
  raise exception 'Jogador conseguiu promover a si mesmo';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.catalogo_publicado(id,dados) values('2014','{}');
  raise exception 'Jogador publicou catálogo';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ begin if not public.sou_admin() then raise exception 'Administrador sem acesso'; end if; end $$;
insert into public.catalogo_publicado(id,dados) values('2014','{"mon":[]}');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
do $$ begin if not exists(select 1 from public.catalogo_publicado) then raise exception 'Jogador não leu catálogo'; end if; end $$;
reset role;
