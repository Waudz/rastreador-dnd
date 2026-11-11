-- Executado somente em PostgreSQL descartável. Nunca usar identidades sintéticas no projeto real.
-- Requer fixture + 01/02/03 + migração imagens_campanhas; storage.objects deve ter metadata jsonb.
-- Não usar no projeto remoto: cria identidades/objetos sintéticos para testar RLS, não arquivos reais.
begin;
insert into auth.users(id,email) values
 ('91000000-0000-0000-0000-000000000001','mestre-imagens@example.invalid'),
 ('91000000-0000-0000-0000-000000000002','jogador-imagens@example.invalid'),
 ('91000000-0000-0000-0000-000000000003','outro-mestre-imagens@example.invalid');
insert into public.campanhas(id,nome,mestre_id) values
 ('92000000-0000-0000-0000-000000000001','Imagens A','91000000-0000-0000-0000-000000000001'),
 ('92000000-0000-0000-0000-000000000002','Imagens B','91000000-0000-0000-0000-000000000003');
insert into public.membros(campanha_id,usuario_id,papel) values
 ('92000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000001','mestre'),
 ('92000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000002','jogador'),
 ('92000000-0000-0000-0000-000000000002','91000000-0000-0000-0000-000000000003','mestre');
grant select,insert,update,delete on storage.objects to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-0000-0000-000000000001',true);
insert into storage.objects(bucket_id,name,metadata) values
 ('campanhas-visuais','92000000-0000-0000-0000-000000000001/simbolo/93000000-0000-0000-0000-000000000001.png','{"mimetype":"image/png","size":1024}');
select public.salvar_visual_campanha('92000000-0000-0000-0000-000000000001',0,
 '92000000-0000-0000-0000-000000000001/simbolo/93000000-0000-0000-0000-000000000001.png',null,50::smallint,60::smallint);
do $$ begin
 begin
  perform public.salvar_visual_campanha('92000000-0000-0000-0000-000000000001',0,null,null,50::smallint,50::smallint);
  raise exception 'Versão antiga foi aceita';
 exception when serialization_failure then null; end;
 delete from storage.objects where bucket_id='campanhas-visuais';
 if found then raise exception 'Arquivo em uso foi apagado'; end if;
 begin
  perform public.salvar_visual_campanha('92000000-0000-0000-0000-000000000001',1,
   '92000000-0000-0000-0000-000000000002/simbolo/93000000-0000-0000-0000-000000000001.png',null,50::smallint,50::smallint);
  raise exception 'Caminho cruzado aceito';
 exception when invalid_parameter_value then null; end;
end $$;

-- Bypass proposital do serviço Storage no banco descartável: RPC também deve rejeitar metadados inválidos.
insert into storage.objects(bucket_id,name,metadata) values
 ('campanhas-visuais','92000000-0000-0000-0000-000000000001/simbolo/93000000-0000-0000-0000-000000000003.png','{"mimetype":"image/png","size":2097153}'),
 ('campanhas-visuais','92000000-0000-0000-0000-000000000001/simbolo/93000000-0000-0000-0000-000000000004.png','{"mimetype":"image/svg+xml","size":1024}');
do $$ declare caminho text; begin
 foreach caminho in array array[
  '92000000-0000-0000-0000-000000000001/simbolo/93000000-0000-0000-0000-000000000003.png',
  '92000000-0000-0000-0000-000000000001/simbolo/93000000-0000-0000-0000-000000000004.png',
  '92000000-0000-0000-0000-000000000001/simbolo/93000000-0000-0000-0000-000000000005.png'] loop
  begin
   perform public.salvar_visual_campanha('92000000-0000-0000-0000-000000000001',1,caminho,null,50::smallint,50::smallint);
   raise exception 'RPC aceitou objeto inválido ou inexistente';
  exception when invalid_parameter_value then null; end;
 end loop;
 if (select versao from public.campanha_visual where campanha_id='92000000-0000-0000-0000-000000000001')<>1 then raise exception 'Falha alterou versão anterior'; end if;
end $$;

select set_config('request.jwt.claim.sub','91000000-0000-0000-0000-000000000002',true);
do $$ begin
 if not exists(select 1 from public.campanha_visual where campanha_id='92000000-0000-0000-0000-000000000001') then raise exception 'Jogador não leu aparência'; end if;
 if not exists(select 1 from storage.objects where bucket_id='campanhas-visuais') then raise exception 'Jogador não leu símbolo'; end if;
 begin
  perform public.salvar_visual_campanha('92000000-0000-0000-0000-000000000001',1,null,null,50::smallint,50::smallint);
  raise exception 'Jogador gravou pela RPC';
 exception when insufficient_privilege then null; end;
 begin
  update public.campanha_visual set simbolo_path=null;
  raise exception 'Jogador alterou tabela diretamente';
 exception when insufficient_privilege then null; end;
 begin
  insert into storage.objects(bucket_id,name,metadata) values('campanhas-visuais',
   '92000000-0000-0000-0000-000000000001/backdrop/93000000-0000-0000-0000-000000000002.jpg','{"mimetype":"image/jpeg","size":1024}');
  raise exception 'Jogador enviou arquivo';
 exception when insufficient_privilege then null; end;
 delete from storage.objects where bucket_id='campanhas-visuais';
 if found then raise exception 'Jogador apagou arquivo'; end if;
end $$;

select set_config('request.jwt.claim.sub','91000000-0000-0000-0000-000000000003',true);
do $$ begin
 if exists(select 1 from public.campanha_visual where campanha_id='92000000-0000-0000-0000-000000000001') then raise exception 'Outro mestre leu aparência'; end if;
 if exists(select 1 from storage.objects where bucket_id='campanhas-visuais') then raise exception 'Outro mestre leu arquivo'; end if;
 begin
  perform public.salvar_visual_campanha('92000000-0000-0000-0000-000000000001',1,null,null,50::smallint,50::smallint);
  raise exception 'Outro mestre alterou campanha A';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
insert into private.administradores(usuario_id) values('91000000-0000-0000-0000-000000000003');
set local role authenticated;
do $$ begin
 if not public.eh_mestre('92000000-0000-0000-0000-000000000001') then raise exception 'Fixture não reproduziu a exceção administrativa atual'; end if;
 if private.visual_responsavel('92000000-0000-0000-0000-000000000001') then raise exception 'Admin herdou responsabilidade de imagens'; end if;
 begin
  perform public.salvar_visual_campanha('92000000-0000-0000-0000-000000000001',1,null,null,50::smallint,50::smallint);
  raise exception 'Admin não responsável alterou imagens';
 exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub','91000000-0000-0000-0000-000000000001',true);
select public.salvar_visual_campanha('92000000-0000-0000-0000-000000000001',1,null,null,50::smallint,50::smallint);
do $$ begin
 delete from storage.objects where bucket_id='campanhas-visuais';
 if not found then raise exception 'Mestre não limpou arquivo após remover referência'; end if;
end $$;
reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 begin
  perform 1 from public.campanha_visual;
  raise exception 'Visitante leu tabela';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
