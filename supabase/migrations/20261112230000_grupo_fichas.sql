-- PROPOSTA PARA APROVAÇÃO. Não aplicada. Requer (ou substitui) a 20261112210000_grupo_basico.sql, que continua válida.
-- Aba Grupo: os jogadores de uma campanha veem a ficha dos OUTROS personagens do grupo em modo leitura:
-- foto, nome, raça, classe, nível, PV, CA, atributos, perícias, magias, características e demais campos da ficha.
-- NÃO são devolvidos: inventário, dinheiro (colunas próprias, nunca lidas aqui), as notas/observações (ficha.notas),
-- o histórico de movimentações de itens (ficha.movimentos) e o diário de jogo (ficha.diario).
-- A política personagens_ver NÃO muda: quem edita ou lê a linha completa continua sendo só o dono e o mestre.
-- Só membros da campanha podem chamar. Ficam de fora: NPCs, criaturas importadas do bestiário e personagens sem jogador vinculado.
-- Aditiva: não altera tabelas, políticas nem dados.
-- Reversão (somente se necessário):
--   drop function if exists public.grupo_fichas(uuid);
--   drop function if exists private.grupo_fichas(uuid);
begin;

create or replace function private.grupo_fichas(p_campanha uuid)
returns table(id uuid,nome text,dono_id uuid,pv_atual integer,pv_max integer,pv_temp integer,ca integer,ficha jsonb)
language plpgsql stable security definer set search_path='' as $$
begin
  if not public.eh_membro(p_campanha) then
    raise exception using errcode='42501',message='Somente membros da campanha veem o grupo.';
  end if;
  return query
    select p.id,p.nome,p.dono_id,p.pv_atual,p.pv_max,p.pv_temp,p.ca,
           (p.ficha - 'notas' - 'movimentos' - 'diario')
      from public.personagens p
     where p.campanha_id=p_campanha
       and p.dono_id is not null
       and coalesce(p.ficha->>'npc','')<>'true'
       and (p.ficha->>'origem') is null
     order by p.nome;
end $$;
revoke all on function private.grupo_fichas(uuid) from public,anon;
grant execute on function private.grupo_fichas(uuid) to authenticated;

create or replace function public.grupo_fichas(p_campanha uuid)
returns table(id uuid,nome text,dono_id uuid,pv_atual integer,pv_max integer,pv_temp integer,ca integer,ficha jsonb)
language sql stable security invoker set search_path='' as $$
  select * from private.grupo_fichas(p_campanha);
$$;
revoke all on function public.grupo_fichas(uuid) from public,anon;
grant execute on function public.grupo_fichas(uuid) to authenticated;

commit;
