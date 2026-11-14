-- Emergência apenas, com aprovação: remove só a proteção da origem dos itens (não toca em dados).
begin;
do $$ begin
 if current_setting('compendio.autorizar_rollback_origem_item',true) is distinct from 'sim' then
  raise exception 'Rollback bloqueado: exige aprovação explícita.';
 end if;
end $$;
drop trigger if exists zz_personagens_origem_item on public.personagens;
commit;
