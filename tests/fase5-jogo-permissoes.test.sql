-- Apenas no PostgreSQL descartável de testes, após o schema local. Nenhuma conexão de produção.
begin;
reset role;
insert into auth.users(id,email) values
('f5000000-0000-0000-0000-000000000001','fase5-mestre@example.invalid'),
('f5000000-0000-0000-0000-000000000002','fase5-jogador@example.invalid'),
('f5000000-0000-0000-0000-000000000003','fase5-externo@example.invalid');
insert into public.campanhas(id,nome,mestre_id) values
('f5100000-0000-0000-0000-000000000001','Teste isolado fase 5 A','f5000000-0000-0000-0000-000000000001'),
('f5100000-0000-0000-0000-000000000002','Teste isolado fase 5 B','f5000000-0000-0000-0000-000000000003');
insert into public.membros(campanha_id,usuario_id,papel) values
('f5100000-0000-0000-0000-000000000001','f5000000-0000-0000-0000-000000000001','mestre'),
('f5100000-0000-0000-0000-000000000001','f5000000-0000-0000-0000-000000000002','jogador'),
('f5100000-0000-0000-0000-000000000002','f5000000-0000-0000-0000-000000000003','mestre');
select set_config('request.jwt.claim.sub','f5000000-0000-0000-0000-000000000001',true);
insert into public.personagens(id,campanha_id,dono_id,nome,pv_atual,pv_max,pv_temp,ficha,inventario) values
('f5200000-0000-0000-0000-000000000001','f5100000-0000-0000-0000-000000000001','f5000000-0000-0000-0000-000000000002','Ficha sintética',12,20,5,
'{"classes":[{"c":"Fighter","n":4}],"recursosUsados":{"surto-acao":1},"dvUsados":{"10":1},"slotsUsados":[1],"exaustao":2,"concentracao":{"magia":"Teia"},"efeitosAtivos":[{"id":"cego","tipo":"condicao","condicao":"Cego"}],"diario":[{"tipo":"teste","texto":"Preservar"}]}',
'[{"uid":"pocao","nome":"Poção sintética","qtd":1}]');
set role authenticated;
select set_config('request.jwt.claim.sub','f5000000-0000-0000-0000-000000000002',true);
update public.personagens set pv_atual=9,ficha=jsonb_set(ficha,'{recursosUsados,surto-acao}','0') where id='f5200000-0000-0000-0000-000000000001';
do $$ declare p public.personagens; begin
 select * into strict p from public.personagens where id='f5200000-0000-0000-0000-000000000001';
 if p.pv_atual<>9 or p.ficha->>'exaustao'<>'2' or p.ficha#>>'{efeitosAtivos,0,condicao}'<>'Cego' or p.ficha#>>'{diario,0,texto}'<>'Preservar' or p.inventario#>>'{0,uid}'<>'pocao' then raise exception 'Jogo perdeu dados ao salvar'; end if;
 update public.personagens set campanha_id='f5100000-0000-0000-0000-000000000002' where id=p.id;
 if (select campanha_id from public.personagens where id=p.id)<>'f5100000-0000-0000-0000-000000000001'::uuid then raise exception 'Jogador transferiu ficha a campanha sem acesso';end if;
end $$;
select set_config('request.jwt.claim.sub','f5000000-0000-0000-0000-000000000003',true);
do $$ declare n integer; begin
 if exists(select 1 from public.personagens where id='f5200000-0000-0000-0000-000000000001') then raise exception 'Mestre externo viu a ficha'; end if;
 update public.personagens set pv_atual=0 where id='f5200000-0000-0000-0000-000000000001';get diagnostics n=row_count;if n<>0 then raise exception 'Mestre externo alterou jogo';end if;
end $$;
select set_config('request.jwt.claim.sub','f5000000-0000-0000-0000-000000000001',true);
do $$ declare n integer;v bigint; begin
 select versao into strict v from public.personagens where id='f5200000-0000-0000-0000-000000000001';
 update public.personagens set pv_atual=10 where id='f5200000-0000-0000-0000-000000000001' and versao=v;get diagnostics n=row_count;if n<>1 then raise exception 'Mestre responsável não atualizou';end if;
 update public.personagens set pv_atual=0 where id='f5200000-0000-0000-0000-000000000001' and versao=v;get diagnostics n=row_count;if n<>0 then raise exception 'Versão obsoleta sobrescreveu o jogo';end if;
end $$;
reset role;
set role anon;
do $$ begin begin perform 1 from public.personagens;raise exception 'Anônimo leu fichas';exception when insufficient_privilege then null;end;end $$;
reset role;
rollback;
