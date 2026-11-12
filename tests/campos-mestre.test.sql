-- Exclusivamente no PostgreSQL descartável, após fixtures/campos-mestre.cjs. Nenhum dado real.
begin;
reset role;
insert into auth.users(id,email) values
('f6000000-0000-0000-0000-000000000001','mestre-seguranca@example.invalid'),
('f6000000-0000-0000-0000-000000000002','jogador-seguranca@example.invalid'),
('f6000000-0000-0000-0000-000000000003','outro-mestre@example.invalid'),
('f6000000-0000-0000-0000-000000000004','admin-nao-responsavel@example.invalid');
insert into private.administradores(usuario_id) values('f6000000-0000-0000-0000-000000000004');
insert into public.campanhas(id,nome,mestre_id) values
('f6100000-0000-0000-0000-000000000001','Campanha sintética A','f6000000-0000-0000-0000-000000000001'),
('f6100000-0000-0000-0000-000000000002','Campanha sintética B','f6000000-0000-0000-0000-000000000003');
insert into public.membros(campanha_id,usuario_id,papel) values
('f6100000-0000-0000-0000-000000000001','f6000000-0000-0000-0000-000000000001','mestre'),
('f6100000-0000-0000-0000-000000000001','f6000000-0000-0000-0000-000000000002','jogador'),
('f6100000-0000-0000-0000-000000000002','f6000000-0000-0000-0000-000000000003','mestre');
select set_config('request.jwt.claim.sub','f6000000-0000-0000-0000-000000000001',true);
set role authenticated;
insert into public.personagens(id,campanha_id,dono_id,nome,pv_atual,pv_max,pv_temp,ficha,inventario)
select 'f6200000-0000-0000-0000-000000000001','f6100000-0000-0000-0000-000000000001','f6000000-0000-0000-0000-000000000002',p->>'nome',12,20,0,p->'ficha',p->'inventario' from qa_estados where nome='original';
reset role;
create function pg_temp.bloquear_ficha(nome text,nova_ficha jsonb) returns void language plpgsql as $$
declare antes jsonb;depois jsonb;begin
 select to_jsonb(p) into antes from public.personagens p where id='f6200000-0000-0000-0000-000000000001';
 begin update public.personagens set ficha=nova_ficha where id='f6200000-0000-0000-0000-000000000001';raise exception 'ATAQUE ACEITO: %',nome;
 exception when insufficient_privilege or check_violation then null;end;
 select to_jsonb(p) into depois from public.personagens p where id='f6200000-0000-0000-0000-000000000001';if antes is distinct from depois then raise exception 'Falha não foi atômica: %',nome;end if;
end $$;
create function pg_temp.bloquear_item(nome text,novos_itens jsonb) returns void language plpgsql as $$
declare antes jsonb;depois jsonb;begin
 select to_jsonb(p) into antes from public.personagens p where id='f6200000-0000-0000-0000-000000000001';
 begin update public.personagens set inventario=novos_itens where id='f6200000-0000-0000-0000-000000000001';raise exception 'ATAQUE ACEITO: %',nome;
 exception when insufficient_privilege or check_violation then null;end;
 select to_jsonb(p) into depois from public.personagens p where id='f6200000-0000-0000-0000-000000000001';if antes is distinct from depois then raise exception 'Falha não foi atômica: %',nome;end if;
end $$;
set role authenticated;
select set_config('request.jwt.claim.sub','f6000000-0000-0000-0000-000000000002',true);

-- Edição/derivação, uso de magia, cargas/sintonia, poção, descanso e adição do catálogo REAIS dos motores.
do $$ declare n text;d jsonb;atual public.personagens;begin
 foreach n in array array['derivado','uso','carga','consumo','descanso','catalogo'] loop
  select p into d from qa_estados where nome=n;
  update public.personagens set ficha=d->'ficha',inventario=d->'inventario',pv_atual=(d->>'pv_atual')::integer where id='f6200000-0000-0000-0000-000000000001';
  select * into strict atual from public.personagens where id='f6200000-0000-0000-0000-000000000001';
  if atual.ficha<>d->'ficha' or atual.inventario<>d->'inventario' or atual.pv_atual<>(d->>'pv_atual')::integer then raise exception 'Fluxo legítimo falhou: %',n;end if;
 end loop;
end $$;
-- Jogador pode criar ficha comum, pergaminho e item padrão, mas não concessão do mestre no INSERT.
insert into public.personagens(id,campanha_id,dono_id,nome,ficha,inventario)
select 'f6200000-0000-0000-0000-000000000002','f6100000-0000-0000-0000-000000000001','f6000000-0000-0000-0000-000000000002','Criada pelo jogador',p->'ficha',p->'inventario' from qa_estados where nome='insert_jogador';
do $$ begin begin
 insert into public.personagens(campanha_id,dono_id,nome,ficha) select 'f6100000-0000-0000-0000-000000000001','f6000000-0000-0000-0000-000000000002','Forjada',p->'ficha' from qa_estados where nome='original';raise exception 'INSERT concedeu magia sem mestre';
 exception when insufficient_privilege then null;end;end $$;

-- Ataques diretos, sem depender de botões ou do código do navegador.
do $$ declare f jsonb;i jsonb;u text;begin
 select ficha,inventario into f,i from public.personagens where id='f6200000-0000-0000-0000-000000000001';
 perform pg_temp.bloquear_ficha('remover registros',f-'magiasMestre');
 perform pg_temp.bloquear_ficha('aumentar usos máximos',jsonb_set(f,'{magiasMestre,0,concessao,usos,max}','999'));
 perform pg_temp.bloquear_ficha('alterar recarga',jsonb_set(f,'{magiasMestre,0,concessao,usos,recarga}','"curto"'));
 perform pg_temp.bloquear_ficha('flag de mestre forjada',jsonb_set(jsonb_set(f,'{mestre}','true'),'{magiasMestre,0,d}','"Forjada"'));
 perform pg_temp.bloquear_ficha('editar texto aprovado',jsonb_set(f,'{magiasMestre,0,d}','"Forjada"'));
 perform pg_temp.bloquear_ficha('trocar modo',jsonb_set(f,'{magiasMestre,0,concessao,modo}','"sempre"'));
 perform pg_temp.bloquear_ficha('concessão disfarçada de classe',jsonb_set(f,'{magias}',(f->'magias')||'[{"n":"Forjada","en":"Forged Class Spell","l":1,"fonte":"classe","concessao":{"modo":"uso-limitado","usos":{"max":99,"usados":0,"recarga":"curto"}}}]'));
 perform pg_temp.bloquear_ficha('injetar registro',jsonb_set(f,'{magiasMestre}',(f->'magiasMestre')||jsonb_build_array(f#>'{magiasMestre,0}')));
 perform pg_temp.bloquear_ficha('usos negativos',jsonb_set(f,'{magiasMestre,0,concessao,usos,usados}','-1'));
 perform pg_temp.bloquear_ficha('usos acima do máximo',jsonb_set(f,'{magiasMestre,0,concessao,usos,usados}','3'));
 perform pg_temp.bloquear_ficha('usos com string',jsonb_set(f,'{magiasMestre,0,concessao,usos,usados}','"0"'));
 perform pg_temp.bloquear_ficha('usos divergentes',jsonb_set(f,'{magiasMestre,0,concessao,usos,usados}','1'));
 -- O índice da cópia é obtido por identidade, porque o criador também adiciona magias normais.
 for u in select (ordinality-1)::text from jsonb_array_elements(f->'magias') with ordinality where value->>'en'='QA Master Spell' loop
  perform pg_temp.bloquear_ficha('editar cópia',jsonb_set(f,array['magias',u,'d'],'"Forjada"'));
  perform pg_temp.bloquear_ficha('retag da cópia',jsonb_set(f,array['magias',u,'fonte'],'"classe"'));
  perform pg_temp.bloquear_ficha('usos máximos na cópia',jsonb_set(f,array['magias',u,'concessao','usos','max'],'999'));
 end loop;
 perform pg_temp.bloquear_item('alterar efeito',jsonb_set(i,'{0,propriedades,efeitos,0,texto}','"Forjado"'));
 perform pg_temp.bloquear_item('apagar propriedades',jsonb_set(i,'{0,propriedades}','{}'));
 perform pg_temp.bloquear_item('máximo de cargas',jsonb_set(i,'{0,propriedades,cargas,max}','999'));
 perform pg_temp.bloquear_item('custo por carga',jsonb_set(i,'{0,propriedades,custoCarga}','0'));
 perform pg_temp.bloquear_item('retirar exigência de sintonia',jsonb_set(i,'{0,propriedades,sintonia,requer}','false'));
 perform pg_temp.bloquear_item('carga negativa',jsonb_set(i,'{0,propriedades,cargas,atual}','-1'));
 perform pg_temp.bloquear_item('carga com string',jsonb_set(i,'{0,propriedades,cargas,atual}','"1"'));
 perform pg_temp.bloquear_item('carga fora do limite',jsonb_set(i,'{0,propriedades,cargas,atual}','99'));
 perform pg_temp.bloquear_item('UID novo customizado',jsonb_set(i,'{0,uid}','"novo-custom"'));
 perform pg_temp.bloquear_item('duplicar UID',i||jsonb_build_array(i->0));
 perform pg_temp.bloquear_item('injetar item alegando origem mestre',i||jsonb_build_array(jsonb_set(i->0,'{uid}','"falso-mestre"')||'{"origem":{"tipo":"mestre"}}'));
 -- ref de catálogo verdadeiro não autentica propriedades adulteradas.
 perform pg_temp.bloquear_item('catálogo falsificado',i||'[{"uid":"catalogo-falso","ref":"srd51:item/potion-of-healing","tipo":"consumivel","propriedades":{"raridade":"Comum","efeitos":[{"tipo":"cura","dados":{"n":200,"d":4,"b":2}}]}}]');
end $$;
-- Descartar/consumir um item continua permitido.
update public.personagens set inventario=inventario-0 where id='f6200000-0000-0000-0000-000000000001';

select set_config('request.jwt.claim.sub','f6000000-0000-0000-0000-000000000004',true);
do $$ declare f jsonb;begin select ficha into strict f from public.personagens where id='f6200000-0000-0000-0000-000000000001';perform pg_temp.bloquear_ficha('administrador não responsável',jsonb_set(f,'{magiasMestre,0,d}','"Forjada"'));end $$;
select set_config('request.jwt.claim.sub','f6000000-0000-0000-0000-000000000003',true);
do $$ declare n integer;begin update public.personagens set ficha='{"magiasMestre":[{"n":"Invasão"}]}' where id='f6200000-0000-0000-0000-000000000001';get diagnostics n=row_count;if n<>0 then raise exception 'Mestre externo alterou ficha';end if;end $$;
select set_config('request.jwt.claim.sub','f6000000-0000-0000-0000-000000000001',true);
update public.personagens set ficha=jsonb_set(ficha,'{magiasMestre,0,d}','"Mudança do mestre responsável"') where id='f6200000-0000-0000-0000-000000000001';
do $$ begin if not exists(select 1 from public.personagens where id='f6200000-0000-0000-0000-000000000001' and ficha#>>'{magiasMestre,0,d}'='Mudança do mestre responsável') then raise exception 'Mestre responsável bloqueado';end if;end $$;
reset role;
do $$ begin
 if has_table_privilege('authenticated','private.catalogo_itens_mestre','INSERT,UPDATE,DELETE') then raise exception 'Catálogo privado gravável pelo jogador';end if;
 if has_function_privilege('authenticated','private.personagens_proteger_campos_mestre()','EXECUTE') then raise exception 'Função de gatilho exposta';end if;
 if not (select relrowsecurity from pg_class where oid='private.catalogo_itens_mestre'::regclass) then raise exception 'Catálogo sem RLS';end if;
end $$;
rollback;
