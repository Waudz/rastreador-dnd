-- PROPOSTA preparada para revisão. NÃO aplicar em produção sem autorização do William.
-- NÃO foi executada em PostgreSQL (nem no descartável): apenas revisão estática (tests/origem-item.test.cjs).
-- Não reescreve personagens, campanhas nem inventários; só impede, no servidor, que quem NÃO é o mestre responsável
-- altere a "Origem" (origem) ou o histórico de transferências (transferencias) de itens que já existem no inventário.
-- Itens novos (uid ainda inexistente) continuam livres: criação de personagem, compra, divisão de pilha e transferência recebida.
-- Depende apenas de public.campanhas(id, mestre_id) e public.personagens(inventario, campanha_id), já existentes.
begin;
create schema if not exists private;

create or replace function private.personagens_proteger_origem_item()
returns trigger language plpgsql security definer set search_path='' as $$
declare ator uuid:=auth.uid();item jsonb;prev jsonb;padrao constant jsonb:='{"tipo":"inicial"}'::jsonb;
begin
 if tg_op<>'UPDATE' then return new;end if;
 -- Só o mestre da campanha do personagem corrige origens (sem confiar em JWT, flags do JSON nem override global).
 if ator is not null and exists(select 1 from public.campanhas c where c.id=old.campanha_id and c.mestre_id=ator) then return new;end if;
 if new.inventario is not distinct from old.inventario then return new;end if;
 -- Inventário inválido/legado: a função private.personagens_proteger_campos_mestre já recusa; aqui nada a comparar.
 if jsonb_typeof(new.inventario)<>'array' or jsonb_typeof(old.inventario)<>'array' then return new;end if;
 for item in select value from jsonb_array_elements(new.inventario) loop
  if jsonb_typeof(item)<>'object' or coalesce(item->>'uid','')='' then continue;end if;
  select value into prev from jsonb_array_elements(old.inventario) where value->>'uid'=item->>'uid' limit 1;
  if prev is null then continue;end if;
  -- Itens antigos sem origem passam a ter {"tipo":"inicial"} na normalização do aplicativo: não conta como alteração.
  if coalesce(nullif(item->'origem','null'::jsonb),padrao) is distinct from coalesce(nullif(prev->'origem','null'::jsonb),padrao) then
   raise exception 'Somente o mestre responsável pode alterar a origem do item.' using errcode='42501';
  end if;
  if coalesce(nullif(item->'transferencias','null'::jsonb),'[]'::jsonb) is distinct from coalesce(nullif(prev->'transferencias','null'::jsonb),'[]'::jsonb) then
   raise exception 'O histórico de transferências do item não pode ser alterado.' using errcode='42501';
  end if;
 end loop;
 return new;
end $$;

revoke all on function private.personagens_proteger_origem_item() from public,anon,authenticated;
drop trigger if exists zz_personagens_origem_item on public.personagens;
create trigger zz_personagens_origem_item before update of inventario on public.personagens
 for each row execute function private.personagens_proteger_origem_item();
commit;
