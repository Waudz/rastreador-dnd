-- Compêndio 5e — banco de dados (Supabase / Postgres)
-- Cole este arquivo inteiro no SQL Editor do projeto e clique em Run. Pode ser executado de novo sem problemas.
--
-- Modelo:
--   perfis       um por usuário (nome de exibição)
--   campanhas    quem cria é o mestre dela; qualquer usuário pode criar campanhas e participar de várias
--   membros      quem participa de cada campanha, como 'mestre' ou 'jogador'
--   personagens  fichas; cada uma pertence a um usuário e a uma campanha
--   documentos   resumos de sessão, notas e arquivos (PDF, imagens) da campanha; guardados no Storage
--
-- Segurança: todas as regras ficam no banco (Row Level Security). A chave pública do site não dá acesso
-- a nada que as regras abaixo não permitam.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- tabelas

create table if not exists public.perfis (
  id        uuid primary key references auth.users(id) on delete cascade,
  nome      text not null default '' check (char_length(nome) <= 60),
  criado_em timestamptz not null default now()
);

create table if not exists public.campanhas (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null check (char_length(nome) between 1 and 80),
  codigo     text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  mestre_id  uuid not null references auth.users(id) on delete cascade,
  criado_em  timestamptz not null default now()
);

create table if not exists public.membros (
  campanha_id uuid not null references public.campanhas(id) on delete cascade,
  usuario_id  uuid not null references auth.users(id) on delete cascade,
  papel       text not null check (papel in ('mestre', 'jogador')),
  entrou_em   timestamptz not null default now(),
  primary key (campanha_id, usuario_id)
);
create index if not exists membros_usuario_idx on public.membros (usuario_id);

create table if not exists public.personagens (
  id            uuid primary key default gen_random_uuid(),
  campanha_id   uuid not null references public.campanhas(id) on delete cascade,
  dono_id       uuid references auth.users(id) on delete set null,
  nome          text not null check (char_length(nome) between 1 and 80),
  ficha         jsonb not null default '{}'::jsonb,        -- classe, raça, nível, atributos, perícias, magias, características, notas
  pv_atual      integer not null default 0  check (pv_atual between -999 and 9999),
  pv_max        integer not null default 1  check (pv_max between 0 and 9999),
  pv_temp       integer not null default 0  check (pv_temp between 0 and 9999),
  ca            integer not null default 10 check (ca between 0 and 99),
  inventario    jsonb not null default '[]'::jsonb,        -- [{nome, qtd, peso, desc}]
  dinheiro      jsonb not null default '{"pc":0,"pp":0,"pe":0,"po":0,"pl":0}'::jsonb,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid,
  versao        integer not null default 1,
  criado_em     timestamptz not null default now(),
  check (octet_length(ficha::text) < 300000),
  check (octet_length(inventario::text) < 200000)
);
create index if not exists personagens_campanha_idx on public.personagens (campanha_id);
create index if not exists personagens_dono_idx on public.personagens (dono_id);

create table if not exists public.documentos (
  id              uuid primary key default gen_random_uuid(),
  campanha_id     uuid not null references public.campanhas(id) on delete cascade,
  tipo            text not null check (tipo in ('resumo', 'nota', 'arquivo')),
  titulo          text not null check (char_length(titulo) between 1 and 160),
  conteudo        text not null default '' check (char_length(conteudo) <= 100000),   -- markdown (resumos e notas)
  sessao          integer check (sessao is null or sessao between 0 and 9999),
  arquivo_path    text,
  arquivo_nome    text,
  arquivo_tipo    text,
  arquivo_tamanho bigint,
  visivel         boolean not null default true,       -- o mestre pode esconder do grupo (spoilers)
  criado_por      uuid references auth.users(id) on delete set null default auth.uid(),
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);
create index if not exists documentos_campanha_idx on public.documentos (campanha_id, criado_em desc);

-- ---------------------------------------------------------------- funções auxiliares
-- (security definer: consultam 'membros' sem passar pelas regras dela, o que evita recursão)

create or replace function public.eh_membro(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.membros where campanha_id = c and usuario_id = auth.uid());
$$;

create or replace function public.eh_mestre(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.membros where campanha_id = c and usuario_id = auth.uid() and papel = 'mestre');
$$;

create or replace function public.eh_colega(u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.membros a join public.membros b on a.campanha_id = b.campanha_id
    where a.usuario_id = auth.uid() and b.usuario_id = u);
$$;

create or replace function public.uuid_ou_nulo(t text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin
  return t::uuid;
exception when others then
  return null;
end $$;

-- ---------------------------------------------------------------- usuário novo => perfil

create or replace function public.novo_usuario() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfis (id, nome)
  values (new.id, left(coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), split_part(coalesce(new.email, ''), '@', 1)), 60))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users for each row execute function public.novo_usuario();

-- usuários que já existiam antes deste script
insert into public.perfis (id, nome)
select id, left(split_part(coalesce(email, ''), '@', 1), 60) from auth.users
on conflict (id) do nothing;

-- ---------------------------------------------------------------- gatilhos de personagens e documentos

create or replace function public.personagens_antes_atualizar() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.eh_mestre(old.campanha_id) then       -- jogador não troca de campanha nem de dono
    new.campanha_id := old.campanha_id;
    new.dono_id := old.dono_id;
  end if;
  new.atualizado_em := now();
  new.atualizado_por := auth.uid();
  new.versao := old.versao + 1;
  return new;
end $$;
drop trigger if exists personagens_atualizar on public.personagens;
create trigger personagens_atualizar before update on public.personagens for each row execute function public.personagens_antes_atualizar();

create or replace function public.personagens_antes_inserir() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.eh_mestre(new.campanha_id) then
    new.dono_id := auth.uid();                          -- jogador só cria personagem para si
    if (select count(*) from public.personagens where campanha_id = new.campanha_id and dono_id = auth.uid()) >= 10 then
      raise exception 'Limite de 10 personagens por campanha.';
    end if;
  end if;
  if new.dono_id is not null and new.dono_id <> auth.uid()
     and not exists (select 1 from public.membros where campanha_id = new.campanha_id and usuario_id = new.dono_id) then
    raise exception 'O dono precisa participar da campanha.';
  end if;
  return new;
end $$;
drop trigger if exists personagens_inserir on public.personagens;
create trigger personagens_inserir before insert on public.personagens for each row execute function public.personagens_antes_inserir();

create or replace function public.documentos_antes_atualizar() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.campanha_id := old.campanha_id;
  new.atualizado_em := now();
  return new;
end $$;
drop trigger if exists documentos_atualizar on public.documentos;
create trigger documentos_atualizar before update on public.documentos for each row execute function public.documentos_antes_atualizar();

-- ---------------------------------------------------------------- funções chamadas pelo site

create or replace function public.criar_campanha(p_nome text) returns public.campanhas
language plpgsql security definer set search_path = '' as $$
declare c public.campanhas;
begin
  if auth.uid() is null then raise exception 'Faça login primeiro.'; end if;
  if char_length(trim(coalesce(p_nome, ''))) = 0 then raise exception 'Informe o nome da campanha.'; end if;
  if (select count(*) from public.campanhas where mestre_id = auth.uid()) >= 10 then
    raise exception 'Limite de 10 campanhas por mestre.';
  end if;
  insert into public.campanhas (nome, mestre_id) values (left(trim(p_nome), 80), auth.uid()) returning * into c;
  insert into public.membros (campanha_id, usuario_id, papel) values (c.id, auth.uid(), 'mestre');
  return c;
end $$;

create or replace function public.entrar_na_campanha(p_codigo text) returns table (id uuid, nome text)
language plpgsql security definer set search_path = '' as $$
declare c public.campanhas;
begin
  if auth.uid() is null then raise exception 'Faça login primeiro.'; end if;
  select * into c from public.campanhas where lower(codigo) = lower(trim(coalesce(p_codigo, '')));
  if not found then raise exception 'Código de convite inválido.'; end if;
  insert into public.membros (campanha_id, usuario_id, papel) values (c.id, auth.uid(), 'jogador') on conflict do nothing;
  return query select c.id, c.nome;
end $$;

create or replace function public.codigo_da_campanha(p_campanha uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare t text;
begin
  if not public.eh_mestre(p_campanha) then raise exception 'Só o mestre vê o código.'; end if;
  select codigo into t from public.campanhas where id = p_campanha;
  return t;
end $$;

create or replace function public.novo_codigo_da_campanha(p_campanha uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare t text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  if not public.eh_mestre(p_campanha) then raise exception 'Só o mestre troca o código.'; end if;
  update public.campanhas set codigo = t where id = p_campanha;
  return t;
end $$;

-- ---------------------------------------------------------------- regras de acesso (RLS)

alter table public.perfis      enable row level security;
alter table public.campanhas   enable row level security;
alter table public.membros     enable row level security;
alter table public.personagens enable row level security;
alter table public.documentos  enable row level security;

-- permissões de tabela: o anônimo não acessa nada; o usuário logado só passa pelas regras
revoke all on public.perfis, public.campanhas, public.membros, public.personagens, public.documentos from anon;
revoke all on public.perfis, public.campanhas, public.membros, public.personagens, public.documentos from authenticated;
grant select, update            on public.perfis      to authenticated;
grant select (id, nome, mestre_id, criado_em) on public.campanhas to authenticated;   -- o código de convite não é legível
grant update (nome)             on public.campanhas   to authenticated;
grant delete                    on public.campanhas   to authenticated;
grant select, delete            on public.membros     to authenticated;
grant select, insert, update, delete on public.personagens to authenticated;
grant select, insert, update, delete on public.documentos  to authenticated;

-- perfis
drop policy if exists perfis_ver on public.perfis;
create policy perfis_ver on public.perfis for select to authenticated
  using (id = (select auth.uid()) or public.eh_colega(id));
drop policy if exists perfis_editar on public.perfis;
create policy perfis_editar on public.perfis for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- campanhas
drop policy if exists campanhas_ver on public.campanhas;
create policy campanhas_ver on public.campanhas for select to authenticated using (public.eh_membro(id));
drop policy if exists campanhas_editar on public.campanhas;
create policy campanhas_editar on public.campanhas for update to authenticated
  using (public.eh_mestre(id)) with check (public.eh_mestre(id));
drop policy if exists campanhas_apagar on public.campanhas;
create policy campanhas_apagar on public.campanhas for delete to authenticated using (public.eh_mestre(id));

-- membros (entrar é feito por entrar_na_campanha; sair ou ser removido pelo mestre)
drop policy if exists membros_ver on public.membros;
create policy membros_ver on public.membros for select to authenticated using (public.eh_membro(campanha_id));
drop policy if exists membros_sair on public.membros;
create policy membros_sair on public.membros for delete to authenticated
  using (papel <> 'mestre' and (usuario_id = (select auth.uid()) or public.eh_mestre(campanha_id)));

-- personagens: o jogador vê e edita os seus; o mestre vê e edita todos da campanha
drop policy if exists personagens_ver on public.personagens;
create policy personagens_ver on public.personagens for select to authenticated
  using (dono_id = (select auth.uid()) or public.eh_mestre(campanha_id));
drop policy if exists personagens_criar on public.personagens;
create policy personagens_criar on public.personagens for insert to authenticated
  with check ((dono_id = (select auth.uid()) and public.eh_membro(campanha_id)) or public.eh_mestre(campanha_id));
drop policy if exists personagens_editar on public.personagens;
create policy personagens_editar on public.personagens for update to authenticated
  using (dono_id = (select auth.uid()) or public.eh_mestre(campanha_id))
  with check ((dono_id = (select auth.uid()) and public.eh_membro(campanha_id)) or public.eh_mestre(campanha_id));
drop policy if exists personagens_apagar on public.personagens;
create policy personagens_apagar on public.personagens for delete to authenticated
  using (dono_id = (select auth.uid()) or public.eh_mestre(campanha_id));

-- documentos: o grupo lê o que for visível; só o mestre cria, edita e apaga
drop policy if exists documentos_ver on public.documentos;
create policy documentos_ver on public.documentos for select to authenticated
  using (public.eh_mestre(campanha_id) or (public.eh_membro(campanha_id) and visivel));
drop policy if exists documentos_criar on public.documentos;
create policy documentos_criar on public.documentos for insert to authenticated with check (public.eh_mestre(campanha_id));
drop policy if exists documentos_editar on public.documentos;
create policy documentos_editar on public.documentos for update to authenticated
  using (public.eh_mestre(campanha_id)) with check (public.eh_mestre(campanha_id));
drop policy if exists documentos_apagar on public.documentos;
create policy documentos_apagar on public.documentos for delete to authenticated using (public.eh_mestre(campanha_id));

-- as funções chamadas pelo site
revoke all on function public.criar_campanha(text), public.entrar_na_campanha(text),
  public.codigo_da_campanha(uuid), public.novo_codigo_da_campanha(uuid) from public, anon;
grant execute on function public.criar_campanha(text), public.entrar_na_campanha(text),
  public.codigo_da_campanha(uuid), public.novo_codigo_da_campanha(uuid) to authenticated;
revoke all on function public.eh_membro(uuid), public.eh_mestre(uuid), public.eh_colega(uuid) from public, anon;
grant execute on function public.eh_membro(uuid), public.eh_mestre(uuid), public.eh_colega(uuid) to authenticated;

-- ---------------------------------------------------------------- arquivos (Storage)
-- Bucket privado 'documentos'; cada arquivo fica em <id-da-campanha>/<nome>. Limite de 10 MB por arquivo.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos', 'documentos', false, 10485760,
        array['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'text/plain', 'text/markdown'])
on conflict (id) do update set public = false, file_size_limit = 10485760,
  allowed_mime_types = array['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'text/plain', 'text/markdown'];

drop policy if exists docs_ler on storage.objects;
create policy docs_ler on storage.objects for select to authenticated
  using (bucket_id = 'documentos' and exists (
    select 1 from public.documentos d
    where d.arquivo_path = storage.objects.name
      and (public.eh_mestre(d.campanha_id) or (public.eh_membro(d.campanha_id) and d.visivel))));

drop policy if exists docs_enviar on storage.objects;
create policy docs_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos' and public.eh_mestre(public.uuid_ou_nulo((storage.foldername(name))[1])));

drop policy if exists docs_trocar on storage.objects;
create policy docs_trocar on storage.objects for update to authenticated
  using (bucket_id = 'documentos' and public.eh_mestre(public.uuid_ou_nulo((storage.foldername(name))[1])));

drop policy if exists docs_apagar on storage.objects;
create policy docs_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'documentos' and public.eh_mestre(public.uuid_ou_nulo((storage.foldername(name))[1])));

-- ---------------------------------------------------------------- tempo real
-- As mudanças em personagens e documentos chegam aos outros aparelhos sem recarregar (as regras acima valem também aqui).

do $$
begin
  begin alter publication supabase_realtime add table public.personagens; exception when others then null; end;
  begin alter publication supabase_realtime add table public.documentos;  exception when others then null; end;
  begin alter publication supabase_realtime add table public.membros;     exception when others then null; end;
end $$;
