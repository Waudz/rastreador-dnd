-- Permissões ampliadas: campanhas, documentos, Storage, convites e administradores.
-- Somente no PostgreSQL descartável do CI, DEPOIS de supabase.test.sql (usa as mesmas três contas, a mesma campanha e o mesmo esquema).
-- Nunca executar no projeto real.
reset role;
grant select, insert, update, delete on storage.objects to authenticated;   -- no Supabase real essas permissões já existem

-- Preparação (como superusuário, com o mestre como "auth.uid()" para os gatilhos).
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
insert into public.documentos(id,campanha_id,tipo,titulo,conteudo,visivel) values
('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','resumo','Diário visível','texto',true),
('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','resumo','Segredo do mestre','texto',false);
insert into public.documentos(id,campanha_id,tipo,titulo,arquivo_path,arquivo_nome,visivel) values
('30000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','arquivo','Mapa','10000000-0000-0000-0000-000000000001/mapa.pdf','mapa.pdf',true),
('30000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001','arquivo','Plano oculto','10000000-0000-0000-0000-000000000001/plano.pdf','plano.pdf',false);
insert into storage.objects(bucket_id,name) values
('documentos','10000000-0000-0000-0000-000000000001/mapa.pdf'),
('documentos','10000000-0000-0000-0000-000000000001/plano.pdf');
insert into public.personagens(id,campanha_id,dono_id,nome,ficha) values
('20000000-0000-0000-0000-000000000009','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','NPC do mestre','{"npc":true}');

-- ---------------------------------------------------------------- jogador
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
do $$ begin
  if exists(select 1 from public.documentos where visivel = false) then raise exception 'Jogador viu documento oculto'; end if;
  if (select count(*) from public.documentos) <> 2 then raise exception 'Jogador deveria ver só os dois documentos visíveis'; end if;
  begin
    insert into public.documentos(campanha_id,tipo,titulo) values ('10000000-0000-0000-0000-000000000001','resumo','Intruso');
    raise exception 'Jogador criou documento';
  exception when insufficient_privilege then null; end;
  update public.documentos set titulo = 'Alterado' where id = '30000000-0000-0000-0000-000000000001';
  if found then raise exception 'Jogador alterou documento'; end if;
  delete from public.documentos where id = '30000000-0000-0000-0000-000000000001';
  if found then raise exception 'Jogador apagou documento'; end if;
  if exists(select 1 from public.personagens where nome = 'NPC do mestre') then raise exception 'Jogador viu o NPC do mestre'; end if;
  if (select count(*) from public.campanhas) <> 1 then raise exception 'Jogador deveria ver a própria campanha'; end if;
  begin
    perform codigo from public.campanhas;
    raise exception 'Jogador leu o código de convite';
  exception when insufficient_privilege then null; end;
  begin
    perform public.codigo_da_campanha('10000000-0000-0000-0000-000000000001');
    raise exception 'Jogador obteve o código por função';
  exception when raise_exception then if sqlerrm <> 'Só o mestre vê o código.' then raise; end if; end;
  begin
    perform public.novo_codigo_da_campanha('10000000-0000-0000-0000-000000000001');
    raise exception 'Jogador trocou o código';
  exception when raise_exception then if sqlerrm <> 'Só o mestre troca o código.' then raise; end if; end;
  begin
    update public.membros set papel = 'mestre' where usuario_id = '00000000-0000-0000-0000-000000000002';
    raise exception 'Jogador se promoveu a mestre';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.membros(campanha_id,usuario_id,papel) values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','jogador');
    raise exception 'Jogador adicionou membro';
  exception when insufficient_privilege then null; end;
  -- Storage: só o arquivo visível; nada de enviar, trocar ou apagar
  if (select count(*) from storage.objects) <> 1 then raise exception 'Jogador deveria ver só o arquivo visível'; end if;
  begin
    insert into storage.objects(bucket_id,name) values ('documentos','10000000-0000-0000-0000-000000000001/intruso.pdf');
    raise exception 'Jogador enviou arquivo';
  exception when insufficient_privilege then null; end;
  update storage.objects set name = name || 'x' where bucket_id = 'documentos';
  if found then raise exception 'Jogador trocou arquivo'; end if;
  delete from storage.objects where bucket_id = 'documentos';
  if found then raise exception 'Jogador apagou arquivo'; end if;
end $$;

-- ---------------------------------------------------------------- conta sem relação com a campanha
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
do $$ begin
  if exists(select 1 from public.campanhas) then raise exception 'Estranho viu campanha'; end if;
  if exists(select 1 from public.membros) then raise exception 'Estranho viu participantes'; end if;
  if exists(select 1 from public.documentos) then raise exception 'Estranho viu documentos'; end if;
  if exists(select 1 from storage.objects) then raise exception 'Estranho viu arquivos'; end if;
  if exists(select 1 from public.perfis where id <> '00000000-0000-0000-0000-000000000003') then raise exception 'Estranho viu perfis de outras contas'; end if;
  if public.sou_admin() then raise exception 'Conta comum aparece como administradora'; end if;
  begin
    insert into private.administradores(usuario_id) values ('00000000-0000-0000-0000-000000000003');
    raise exception 'Conta comum se promoveu a administradora';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from private.administradores;
    raise exception 'Conta comum leu a lista de administradores';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.catalogo_publicado(id,dados) values ('2014','{}');
    raise exception 'Conta comum publicou catálogo';
  exception when insufficient_privilege then null; end;
  begin
    perform public.entrar_na_campanha('codigo-que-nao-existe');
    raise exception 'Código inválido aceito';
  exception when raise_exception then if sqlerrm <> 'Código de convite inválido.' then raise; end if; end;
end $$;

-- ---------------------------------------------------------------- convite: entra só como jogador, e o código antigo morre ao trocar
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select set_config('teste.codigo', public.codigo_da_campanha('10000000-0000-0000-0000-000000000001'), false);
do $$ begin
  if char_length(current_setting('teste.codigo')) <> 8 then raise exception 'Código de convite com tamanho inesperado'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
do $$ declare r record; begin
  select * into r from public.entrar_na_campanha(current_setting('teste.codigo'));
  if r.id <> '10000000-0000-0000-0000-000000000001'::uuid then raise exception 'Código entrou na campanha errada'; end if;
  if (select papel from public.membros where usuario_id = '00000000-0000-0000-0000-000000000003' and campanha_id = '10000000-0000-0000-0000-000000000001') <> 'jogador' then
    raise exception 'Convite deu papel indevido';
  end if;
  begin
    update public.membros set papel = 'mestre' where usuario_id = '00000000-0000-0000-0000-000000000003';
    raise exception 'Convidado se promoveu a mestre';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select public.novo_codigo_da_campanha('10000000-0000-0000-0000-000000000001');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
do $$ begin
  begin
    perform public.entrar_na_campanha(current_setting('teste.codigo'));
    raise exception 'Código antigo ainda vale';
  exception when raise_exception then if sqlerrm <> 'Código de convite inválido.' then raise; end if; end;
end $$;
delete from public.membros where usuario_id = '00000000-0000-0000-0000-000000000003' and campanha_id = '10000000-0000-0000-0000-000000000001';
do $$ begin
  if exists(select 1 from public.campanhas) then raise exception 'Quem saiu da campanha ainda a vê'; end if;
end $$;

-- ---------------------------------------------------------------- administrador (papel dado só pelo servidor) vê e gerencia tudo
reset role;
insert into private.administradores(usuario_id) values ('00000000-0000-0000-0000-000000000003') on conflict do nothing;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
do $$ begin
  if not public.sou_admin() then raise exception 'Administrador não reconhecido'; end if;
  if (select count(*) from public.documentos) <> 4 then raise exception 'Administrador deveria ver todos os documentos'; end if;
end $$;
reset role;
delete from private.administradores where usuario_id = '00000000-0000-0000-0000-000000000003';

-- ---------------------------------------------------------------- visitante anônimo
set role anon;
do $$ begin
  begin perform 1 from public.campanhas;        raise exception 'Anônimo leu campanhas';   exception when insufficient_privilege then null; end;
  begin perform 1 from public.membros;          raise exception 'Anônimo leu membros';     exception when insufficient_privilege then null; end;
  begin perform 1 from public.personagens;      raise exception 'Anônimo leu personagens'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.documentos;       raise exception 'Anônimo leu documentos';  exception when insufficient_privilege then null; end;
  begin perform 1 from public.perfis;           raise exception 'Anônimo leu perfis';      exception when insufficient_privilege then null; end;
  begin perform 1 from public.catalogo_publicado; raise exception 'Anônimo leu catálogo';  exception when insufficient_privilege then null; end;
  begin perform 1 from storage.objects;         raise exception 'Anônimo leu arquivos';    exception when insufficient_privilege then null; end;
  begin perform public.criar_campanha('Invasão'); raise exception 'Anônimo criou campanha'; exception when insufficient_privilege then null; end;
  begin perform public.entrar_na_campanha('x'); raise exception 'Anônimo entrou por código'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'Campanhas, documentos, Storage, convites e administradores verificados' as resultado;
