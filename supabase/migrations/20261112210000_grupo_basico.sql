-- PROPOSTA PARA APROVAÇÃO. Não aplicada.
-- Aba "Grupo" para jogadores: foto, nome do personagem, PV e CA dos personagens dos OUTROS jogadores da mesma campanha.
-- O nome do jogador vem da tabela perfis, que o site já lê. A ficha completa continua restrita ao dono e ao mestre
-- (a política personagens_ver NÃO muda). A função devolve só estes campos: id, nome, dono_id, pv_atual, pv_max, pv_temp, ca, foto.
-- Só membros da campanha podem chamar. Ficam de fora: NPCs, criaturas importadas do bestiário e personagens sem jogador vinculado.
-- Aditiva: não altera tabelas, políticas nem dados.
-- Reversão (somente se necessário):
--   drop function if exists public.grupo_basico(uuid);
--   drop function if exists private.grupo_basico(uuid);
begin;

create or replace function private.grupo_basico(p_campanha uuid)
returns table(id uuid,nome text,dono_id uuid,pv_atual integer,pv_max integer,pv_temp integer,ca integer,foto text)
language plpgsql stable security definer set search_path='' as $$
begin
  if not public.eh_membro(p_campanha) then
    raise exception using errcode='42501',message='Somente membros da campanha veem o grupo.';
  end if;
  return query
    select p.id,p.nome,p.dono_id,p.pv_atual,p.pv_max,p.pv_temp,p.ca,
           case when left(p.ficha->>'foto',11)='data:image/' then p.ficha->>'foto' end
      from public.personagens p
     where p.campanha_id=p_campanha
       and p.dono_id is not null
       and coalesce(p.ficha->>'npc','')<>'true'
       and (p.ficha->>'origem') is null
     order by p.nome;
end $$;
revoke all on function private.grupo_basico(uuid) from public,anon;
grant execute on function private.grupo_basico(uuid) to authenticated;

create or replace function public.grupo_basico(p_campanha uuid)
returns table(id uuid,nome text,dono_id uuid,pv_atual integer,pv_max integer,pv_temp integer,ca integer,foto text)
language sql stable security invoker set search_path='' as $$
  select * from private.grupo_basico(p_campanha);
$$;
revoke all on function public.grupo_basico(uuid) from public,anon;
grant execute on function public.grupo_basico(uuid) to authenticated;

commit;
