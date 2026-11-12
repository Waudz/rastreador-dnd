-- Executado somente em PostgreSQL descartável, depois de fixture + 01/02/03 + migrações de imagens e de enquadramento.
begin;
insert into auth.users(id,email) values
 ('a1000000-0000-0000-0000-000000000001','mestre-enq@example.invalid'),
 ('a1000000-0000-0000-0000-000000000002','jogador-enq@example.invalid'),
 ('a1000000-0000-0000-0000-000000000003','outro-enq@example.invalid');
insert into public.campanhas(id,nome,mestre_id) values
 ('a2000000-0000-0000-0000-000000000001','Enq A','a1000000-0000-0000-0000-000000000001');
insert into public.membros(campanha_id,usuario_id,papel) values
 ('a2000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','mestre'),
 ('a2000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000002','jogador');
grant select,insert,update,delete on storage.objects to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-0000-0000-000000000001',true);
insert into storage.objects(bucket_id,name,metadata) values
 ('campanhas-visuais','a2000000-0000-0000-0000-000000000001/backdrop/a3000000-0000-0000-0000-000000000001.jpg','{"mimetype":"image/jpeg","size":2048}');
do $$ declare v public.campanha_visual; begin
 v:=public.salvar_visual_campanha_enquadrada('a2000000-0000-0000-0000-000000000001',0,null,
   'a2000000-0000-0000-0000-000000000001/backdrop/a3000000-0000-0000-0000-000000000001.jpg',42::smallint,80::smallint,
   '{"desktop":{"x":25,"y":41.7,"zoom":1.5},"mobile":{"x":80,"y":80,"zoom":2}}'::jsonb);
 if v.versao<>1 or v.enquadramento->'mobile'->>'zoom'<>'2' then raise exception 'Mestre não gravou o enquadramento'; end if;
 begin perform public.salvar_visual_campanha_enquadrada('a2000000-0000-0000-0000-000000000001',1,null,v.backdrop_path,50::smallint,50::smallint,
   '{"desktop":{"x":25,"y":41,"zoom":9},"mobile":{"x":1,"y":1,"zoom":1}}'::jsonb); raise exception 'Zoom fora do limite aceito';
 exception when invalid_parameter_value then null; end;
 begin perform public.salvar_visual_campanha_enquadrada('a2000000-0000-0000-0000-000000000001',1,null,v.backdrop_path,50::smallint,50::smallint,
   '{"desktop":{"x":-1,"y":41,"zoom":1},"mobile":{"x":1,"y":1,"zoom":1}}'::jsonb); raise exception 'Posição negativa aceita';
 exception when invalid_parameter_value then null; end;
 begin perform public.salvar_visual_campanha_enquadrada('a2000000-0000-0000-0000-000000000001',1,null,v.backdrop_path,50::smallint,50::smallint,
   '{"desktop":{"x":1,"y":1,"zoom":1},"extra":1}'::jsonb); raise exception 'Formato extra aceito';
 exception when invalid_parameter_value then null; end;
 begin perform public.salvar_visual_campanha_enquadrada('a2000000-0000-0000-0000-000000000001',1,null,v.backdrop_path,50::smallint,50::smallint,
   '{"desktop":{"x":"a","y":1,"zoom":1},"mobile":{"x":1,"y":1,"zoom":1}}'::jsonb); raise exception 'Texto no lugar de número aceito';
 exception when invalid_parameter_value then null; end;
 begin perform public.salvar_visual_campanha_enquadrada('a2000000-0000-0000-0000-000000000001',0,null,v.backdrop_path,50::smallint,50::smallint,
   '{"desktop":{"x":1,"y":1,"zoom":1},"mobile":{"x":1,"y":1,"zoom":1}}'::jsonb); raise exception 'Versão antiga aceita';
 exception when serialization_failure then null; end;
 if (select versao from public.campanha_visual where campanha_id='a2000000-0000-0000-0000-000000000001')<>1 then raise exception 'Falha alterou a versão'; end if;
end $$;

select set_config('request.jwt.claim.sub','a1000000-0000-0000-0000-000000000002',true);
do $$ begin
 if (select enquadramento->'desktop'->>'x' from public.campanha_visual where campanha_id='a2000000-0000-0000-0000-000000000001')<>'25' then raise exception 'Jogador não leu o enquadramento'; end if;
 begin perform public.salvar_visual_campanha_enquadrada('a2000000-0000-0000-0000-000000000001',1,null,null,50::smallint,50::smallint,null);
  raise exception 'Jogador gravou o enquadramento';
 exception when insufficient_privilege then null; end;
 begin update public.campanha_visual set enquadramento=null; raise exception 'Jogador alterou a coluna direto';
 exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub','a1000000-0000-0000-0000-000000000003',true);
do $$ begin
 if exists(select 1 from public.campanha_visual where campanha_id='a2000000-0000-0000-0000-000000000001') then raise exception 'Estranho leu a campanha'; end if;
 begin perform public.salvar_visual_campanha_enquadrada('a2000000-0000-0000-0000-000000000001',1,null,null,50::smallint,50::smallint,null);
  raise exception 'Estranho gravou';
 exception when insufficient_privilege then null; end;
end $$;

-- remover o fundo apaga o enquadramento guardado
select set_config('request.jwt.claim.sub','a1000000-0000-0000-0000-000000000001',true);
do $$ declare v public.campanha_visual; begin
 v:=public.salvar_visual_campanha_enquadrada('a2000000-0000-0000-0000-000000000001',1,null,null,50::smallint,50::smallint,
   '{"desktop":{"x":1,"y":1,"zoom":1},"mobile":{"x":1,"y":1,"zoom":1}}'::jsonb);
 if v.enquadramento is not null or v.backdrop_path is not null then raise exception 'Enquadramento sobrou sem fundo'; end if;
end $$;
reset role;
rollback;
