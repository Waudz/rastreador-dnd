-- Emergência apenas, com aprovação e gravações suspensas: reabre a vulnerabilidade.
-- Não remove funções/catálogo nem modifica personagens, campanhas ou inventários.
begin;
do $$ begin
 if current_setting('compendio.autorizar_rollback_campos_mestre',true) is distinct from 'sim' then
  raise exception 'Rollback bloqueado: exige aprovação explícita e suspensão das gravações.';
 end if;
end $$;
drop trigger if exists zz_personagens_campos_mestre on public.personagens;
commit;
