-- Banco isolado com o schema real e as mesmas roles usadas pelo Supabase.
insert into auth.users(id,email) values
('00000000-0000-0000-0000-000000000001','mestre@example.invalid'),
('00000000-0000-0000-0000-000000000002','jogador@example.invalid'),
('00000000-0000-0000-0000-000000000003','outro@example.invalid');
insert into public.campanhas(id,nome,mestre_id) values
('10000000-0000-0000-0000-000000000001','Campanha de teste','00000000-0000-0000-0000-000000000001');
insert into public.membros(campanha_id,usuario_id,papel) values
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','mestre'),
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','jogador');

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
insert into public.personagens(id,campanha_id,dono_id,nome,ficha) values
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Personagem preparado','{"foto":"data:image/png;base64,TESTE"}');
select public.mesclar_acervo('{"items":{"teste":{"key":"teste","custom":true,"name":"Teste","updatedAt":10,"photo":"data:image/png;base64,TESTE"}},"tr":{"dragon":"dragão"},"ldj":{"meta":{"magia":"texto"}}}');
do $$ begin
  if (select dados->'items'->'teste'->>'photo' from public.acervos) <> 'data:image/png;base64,TESTE' then raise exception 'Foto não preservada'; end if;
end $$;
-- Outra conta não pode ler, sobrescrever ou atribuir a si o acervo do mestre.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
do $$ begin
  if exists(select 1 from public.acervos) then raise exception 'Vazamento entre contas'; end if;
  begin
    insert into public.acervos(usuario_id,dados) values('00000000-0000-0000-0000-000000000001','{}');
    raise exception 'RLS aceitou dono diferente';
  exception when insufficient_privilege then null; end;
  update public.acervos set dados='{}' where usuario_id='00000000-0000-0000-0000-000000000001';
  if found then raise exception 'RLS permitiu sobrescrever outra conta'; end if;
  if exists(select 1 from public.personagens) then raise exception 'Terceiro viu personagem'; end if;
end $$;
-- Mesclagem preserva traduções e exclusões vencem cópias antigas.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select public.mesclar_acervo('{"deleted":{"teste":20}}');
select public.mesclar_acervo('{"items":{"teste":{"key":"teste","custom":true,"name":"Cópia antiga","updatedAt":15}}}');
do $$ begin
  if exists(select 1 from public.acervos where dados->'items' ? 'teste') then raise exception 'Item excluído ressuscitou'; end if;
  if (select dados->'tr'->>'dragon' from public.acervos) <> 'dragão' then raise exception 'Tradução perdida'; end if;
end $$;
select public.mesclar_acervo('{"items":{"teste":{"key":"teste","custom":true,"name":"Recriado","updatedAt":30}}}');
do $$ begin
  if not exists(select 1 from public.acervos where dados->'items' ? 'teste') then raise exception 'Edição nova bloqueada'; end if;
  begin
    update public.personagens set dono_id='00000000-0000-0000-0000-000000000003' where id='20000000-0000-0000-0000-000000000001';
    raise exception 'Aceitou dono fora da campanha';
  exception when raise_exception then
    if sqlerrm <> 'O dono precisa participar da campanha.' then raise; end if;
  end;
end $$;
-- Mestre transfere a ficha existente; foto, identidade e conteúdo permanecem.
update public.personagens set dono_id='00000000-0000-0000-0000-000000000002' where id='20000000-0000-0000-0000-000000000001';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
do $$ begin
  if (select count(*) from public.personagens) <> 1 then raise exception 'Jogador não recebeu personagem'; end if;
  if (select ficha->>'foto' from public.personagens) <> 'data:image/png;base64,TESTE' then raise exception 'Transferência perdeu foto'; end if;
end $$;
update public.personagens set dono_id='00000000-0000-0000-0000-000000000003' where id='20000000-0000-0000-0000-000000000001';
do $$ begin
  if (select dono_id from public.personagens) <> '00000000-0000-0000-0000-000000000002'::uuid then raise exception 'Jogador trocou responsável'; end if;
end $$;
reset role;
set role anon;
do $$ begin
  begin
    perform * from public.acervos;
    raise exception 'Anônimo leu acervo';
  exception when insufficient_privilege then null; end;
  begin
    perform public.mesclar_acervo('{}');
    raise exception 'Anônimo chamou mesclagem';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'Permissões, transferência, fotos, mesclagem e exclusões verificadas' as resultado;
