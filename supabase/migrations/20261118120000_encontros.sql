-- PROPOSTA PARA APROVAÇÃO. Não aplicada.
-- Aba "Encontros" das campanhas (só o mestre): pastas, encontros e salas em UMA tabela de nós.
--   pasta -> pasta | encontro (raiz ou dentro de qualquer pasta, sem limite de profundidade)
--   encontro -> sala (opcional)
-- O conteúdo de cada nó (descrição, estados, monstros, elementos, loot, histórico) fica em `dados` (jsonb): sem tabelas redundantes nesta etapa.
-- Segurança: RLS só para o mestre da campanha (public.eh_mestre). Jogadores NÃO leem nada daqui (nenhuma política de select para eles).
-- Aditiva: não altera tabelas, políticas nem dados existentes.
-- Reversão (somente se necessário; apaga os encontros cadastrados):
--   drop table if exists public.encontros_nos;
--   drop function if exists private.encontros_nos_validar();
begin;

create table if not exists public.encontros_nos (
  id             uuid primary key default gen_random_uuid(),
  campanha_id    uuid not null references public.campanhas(id) on delete cascade,
  pai_id         uuid references public.encontros_nos(id) on delete cascade,
  tipo           text not null check (tipo in ('pasta','encontro','sala')),
  nome           text not null check (char_length(btrim(nome)) between 1 and 120),
  ordem          integer not null default 0,
  dados          jsonb not null default '{}'::jsonb check (jsonb_typeof(dados) = 'object' and octet_length(dados::text) < 400000),
  excluido_em    timestamptz,                        -- lixeira: restaurar limpa o campo; exclusão definitiva apaga a linha
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid,
  versao         integer not null default 1,
  check (pai_id is distinct from id)
);
create index if not exists encontros_nos_campanha_idx on public.encontros_nos (campanha_id, pai_id, ordem);

create or replace function private.encontros_nos_validar() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  p public.encontros_nos; atual uuid; passos integer := 0;
begin
  if tg_op = 'UPDATE' then
    if new.tipo <> old.tipo then raise exception using errcode = '23514', message = 'O tipo do item não pode mudar.'; end if;
    if new.campanha_id <> old.campanha_id then raise exception using errcode = '23514', message = 'O item não pode trocar de campanha.'; end if;
  end if;
  if new.pai_id is null then
    if new.tipo = 'sala' then raise exception using errcode = '23514', message = 'Uma sala precisa estar dentro de um encontro.'; end if;
  else
    select * into p from public.encontros_nos where id = new.pai_id;
    if not found or p.campanha_id <> new.campanha_id then raise exception using errcode = '23514', message = 'Destino inválido.'; end if;
    if new.tipo = 'sala' and p.tipo <> 'encontro' then raise exception using errcode = '23514', message = 'Salas só entram em encontros.'; end if;
    if new.tipo in ('pasta','encontro') and p.tipo <> 'pasta' then raise exception using errcode = '23514', message = 'Pastas e encontros só entram em pastas ou na raiz.'; end if;
    if tg_op = 'UPDATE' then                       -- uma pasta não pode ir para dentro de si mesma nem de uma descendente
      atual := new.pai_id;
      while atual is not null loop
        if atual = new.id then raise exception using errcode = '23514', message = 'Movimento inválido: o destino está dentro do próprio item.'; end if;
        select pai_id into atual from public.encontros_nos where id = atual;
        passos := passos + 1; if passos > 100000 then exit; end if;
      end loop;
    end if;
  end if;
  new.atualizado_em := now(); new.atualizado_por := auth.uid();
  if tg_op = 'UPDATE' then new.versao := old.versao + 1; end if;
  return new;
end $$;
revoke all on function private.encontros_nos_validar() from public, anon, authenticated;
drop trigger if exists encontros_nos_validar on public.encontros_nos;
create trigger encontros_nos_validar before insert or update on public.encontros_nos
  for each row execute function private.encontros_nos_validar();

alter table public.encontros_nos enable row level security;
revoke all on public.encontros_nos from anon;
grant select, insert, update, delete on public.encontros_nos to authenticated;
drop policy if exists encontros_nos_mestre on public.encontros_nos;
create policy encontros_nos_mestre on public.encontros_nos for all to authenticated
  using (public.eh_mestre(campanha_id)) with check (public.eh_mestre(campanha_id));

commit;
