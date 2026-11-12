-- Preparada para revisão. NÃO aplicar em produção sem autorização.
-- Não reescreve personagens/campanhas. RLS existente continua controlando linhas.
begin;
create schema if not exists private;
create table if not exists private.catalogo_itens_mestre (
  ref text primary key, tipo text not null, propriedades jsonb not null
);
alter table private.catalogo_itens_mestre enable row level security;
revoke all on private.catalogo_itens_mestre from public,anon,authenticated;

-- Os registros são gerados do catálogo versionado de ITENS_EFEITOS; nunca do pedido do cliente.
insert into private.catalogo_itens_mestre(ref,tipo,propriedades)
select ref,tipo,propriedades from jsonb_to_recordset($catalogo$[{"ref":"srd51:item/potion-of-healing","tipo":"consumivel","propriedades":{"raridade":"Comum","efeitos":[{"tipo":"cura","dados":{"n":2,"d":4,"b":2}}]}},{"ref":"srd51:item/potion-of-healing-greater","tipo":"consumivel","propriedades":{"raridade":"Incomum","efeitos":[{"tipo":"cura","dados":{"n":4,"d":4,"b":4}}]}},{"ref":"srd51:item/potion-of-healing-superior","tipo":"consumivel","propriedades":{"raridade":"Rara","efeitos":[{"tipo":"cura","dados":{"n":8,"d":4,"b":8}}]}},{"ref":"srd51:item/potion-of-healing-supreme","tipo":"consumivel","propriedades":{"raridade":"Muito rara","efeitos":[{"tipo":"cura","dados":{"n":10,"d":4,"b":20}}]}},{"ref":"srd51:item/potion-of-heroism","tipo":"consumivel","propriedades":{"raridade":"Rara","efeitos":[{"tipo":"pv-temp","dados":{"n":0,"d":0,"b":10}},{"tipo":"manual","texto":"Imune a amedrontado e sob o efeito de Bênção (+1d4 em ataques e salvaguardas, rolado à mão)","duracao":{"texto":"1 hora","ate":"manual"}}]}},{"ref":"srd51:item/potion-of-resistance","tipo":"consumivel","propriedades":{"raridade":"Incomum","efeitos":[{"tipo":"resistencia","dano":"escolher","duracao":{"texto":"1 hora","ate":"manual"}}]}},{"ref":"srd51:item/potion-of-invisibility","tipo":"consumivel","propriedades":{"raridade":"Muito rara","efeitos":[{"tipo":"condicao","condicao":"Invisível","duracao":{"texto":"1 hora (termina se atacar ou conjurar)","ate":"manual"}}]}},{"ref":"srd51:item/antitoxin","tipo":"consumivel","propriedades":{"efeitos":[{"tipo":"manual","texto":"Vantagem em salvaguardas contra veneno","duracao":{"texto":"1 hora","ate":"manual"}}]}},{"ref":"srd51:item/ring-of-protection","tipo":"magico","propriedades":{"raridade":"Rara","consumo":"nenhum","sintonia":{"requer":true,"sintonizado":false},"efeitos":[{"tipo":"modificador","categoria":"ca","valor":1,"passivo":true},{"tipo":"modificador","categoria":"salvaguardas","valor":1,"passivo":true}]}},{"ref":"srd51:item/wand-of-magic-missiles","tipo":"magico","propriedades":{"raridade":"Incomum","consumo":"carga","custoCarga":1,"cargas":{"atual":7,"max":7,"recarga":"1d6+1 ao amanhecer (à mão)"},"efeitos":[{"tipo":"manual","texto":"Conjura Mísseis Mágicos (1º círculo; +1 círculo por carga extra gasta, à mão). Dano é rolado à mão."}]}}]$catalogo$::jsonb) as x(ref text,tipo text,propriedades jsonb)
on conflict(ref) do update set tipo=excluded.tipo,propriedades=excluded.propriedades;

create or replace function private.contador_jogo_valido(valor jsonb,maximo jsonb)
returns boolean language sql immutable set search_path='' as $$
 select case when jsonb_typeof(valor)='number' and valor::text ~ '^[0-9]{1,9}$'
   and jsonb_typeof(maximo)='number' and maximo::text ~ '^[0-9]{1,9}$'
   then valor::text::numeric between 0 and maximo::text::numeric else false end;
$$;

create or replace function private.magias_mestre_protegidas(f jsonb,chave text)
returns jsonb language plpgsql immutable set search_path='' as $$
declare a jsonb:=coalesce(nullif(f->chave,'null'::jsonb),'[]'::jsonb);m jsonb;r jsonb:='[]';
begin
 if jsonb_typeof(a)<>'array' then raise exception 'A lista de magias precisa ser um array.' using errcode='23514';end if;
 for m in select value from jsonb_array_elements(a) loop
  if jsonb_typeof(m)<>'object' then raise exception 'Magia inválida.' using errcode='23514';end if;
  if chave='magias' and not (m ? 'concessao' or coalesce(m->>'fonte','')='mestre' or coalesce(m#>>'{registroOrigem,tipo}','')='mestre' or coalesce(m->>'origem','')='Concedida pelo mestre') then continue;end if;
  m:=m#-'{concessao,usos,usados}';
  if chave='magias' then
   -- Campos derivados/de jogo variam legitimamente entre concessão, edição e preparação.
   m:=m-array['prep','ativa','autoCriador','quando','nota'];
   m:=m||jsonb_build_object('noGrimorio',coalesce(nullif(m->'noGrimorio','null'::jsonb),'false'::jsonb),
      'semprePreparada',coalesce(nullif(m->'semprePreparada','null'::jsonb),'false'::jsonb),
      'classes',coalesce(nullif(m->'classes','null'::jsonb),'[]'::jsonb));
   if m->'classeConj'='null'::jsonb then m:=m-'classeConj';end if;
  end if;
  r:=r||jsonb_build_array(m);
 end loop;
 return (select coalesce(jsonb_agg(v order by v::text),'[]'::jsonb) from jsonb_array_elements(r) as e(v));
end $$;

create or replace function private.validar_usos_mestre(f jsonb,chave text)
returns void language plpgsql immutable set search_path='' as $$
declare m jsonb;u jsonb;registro jsonb;
begin
 for m in select value from jsonb_array_elements(coalesce(nullif(f->chave,'null'::jsonb),'[]'::jsonb)) loop
  if chave='magias' and not (m ? 'concessao' or coalesce(m->>'fonte','')='mestre') then continue;end if;
  u:=m#>'{concessao,usos}';
  if u is not null then
   if jsonb_typeof(u)<>'object' or not private.contador_jogo_valido(u->'usados',u->'max') then
    raise exception 'Contador de usos da concessão inválido.' using errcode='23514';
   end if;
   if chave='magias' then
    select value into registro from jsonb_array_elements(coalesce(nullif(f->'magiasMestre','null'::jsonb),'[]'::jsonb)) where value->>'en'=m->>'en' limit 1;
    if registro is not null and registro#>'{concessao,usos,usados}' is distinct from u->'usados' then
     raise exception 'Os usos da magia e da concessão precisam coincidir.' using errcode='23514';
    end if;
   end if;
  end if;
 end loop;
end $$;

create or replace function private.definicao_item_mestre(item jsonb)
returns jsonb language sql immutable set search_path='' as $$
 with p as (
  select coalesce(jsonb_object_agg(key,value),'{}'::jsonb)#-'{cargas,atual}'#-'{sintonia,sintonizado}' as d
  from jsonb_each(case when jsonb_typeof(item->'propriedades')='object' then item->'propriedades' else '{}'::jsonb end)
  where key in ('efeitos','consumo','cargas','custoCarga','sintonia','raridade')
 ) select case when d='{}'::jsonb then '{}'::jsonb else jsonb_build_object('ref',item->'ref','tipo',item->'tipo','propriedades',d) end from p;
$$;

create or replace function private.personagens_proteger_campos_mestre()
returns trigger language plpgsql security definer set search_path='' as $$
declare anterior_f jsonb:='{}';anterior_i jsonb:='[]';camp uuid;ator uuid:=auth.uid();chave text;
 item jsonb;prev jsonb;def jsonb;uid text;pos bigint;cargas jsonb;
begin
 if tg_op='UPDATE' then anterior_f:=old.ficha;anterior_i:=old.inventario;camp:=old.campanha_id;else camp:=new.campanha_id;end if;
 -- Não confiar em metadados JWT, flags do JSON nem no override global de administrador.
 if ator is not null and exists(select 1 from public.campanhas c where c.id=camp and c.mestre_id=ator) then return new;end if;

 if new.ficha is distinct from anterior_f then
  if jsonb_typeof(new.ficha)<>'object' then raise exception 'Ficha inválida.' using errcode='23514';end if;
  foreach chave in array array['magiasMestre','magias'] loop
   if new.ficha->chave is distinct from anterior_f->chave then
    if private.magias_mestre_protegidas(new.ficha,chave) is distinct from private.magias_mestre_protegidas(anterior_f,chave) then
     raise exception 'Somente o mestre responsável pode alterar concessões de magias.' using errcode='42501';
    end if;
   end if;
  end loop;
  perform private.validar_usos_mestre(new.ficha,'magiasMestre');
  perform private.validar_usos_mestre(new.ficha,'magias');
 end if;

 if new.inventario is distinct from anterior_i then
  if jsonb_typeof(new.inventario)<>'array' then raise exception 'Inventário inválido.' using errcode='23514';end if;
  if jsonb_typeof(anterior_i)<>'array' then raise exception 'Inventário legado: solicite revisão ao mestre.' using errcode='23514';end if;
  for item,pos in select value,ordinality from jsonb_array_elements(new.inventario) with ordinality loop
   if jsonb_typeof(item)<>'object' then raise exception 'Item inválido.' using errcode='23514';end if;
   if item ? 'propriedades' and jsonb_typeof(item->'propriedades')<>'object' then raise exception 'Propriedades inválidas.' using errcode='23514';end if;
   def:=private.definicao_item_mestre(item);uid:=item->>'uid';
   select value into prev from jsonb_array_elements(anterior_i) where value->>'uid'=uid limit 1;
   if def='{}'::jsonb then
    if prev is not null and private.definicao_item_mestre(prev)<>'{}'::jsonb then
     raise exception 'Somente o mestre responsável pode remover propriedades do item.' using errcode='42501';
    end if;
    continue;
   end if;
   if jsonb_typeof(item->'uid')<>'string' or coalesce(length(uid),0) not between 1 and 128 or
      (select count(*) from jsonb_array_elements(new.inventario) e where e->>'uid'=uid)<>1 then
    raise exception 'Item com efeitos precisa de identificador único.' using errcode='23514';
   end if;
   select value into prev from jsonb_array_elements(anterior_i) where value->>'uid'=uid limit 1;
   -- Migração gradual de identificador legado: somente mesma posição e mesma definição.
   if prev is null and nullif(anterior_i->(pos::int-1)->>'uid','') is null and
      private.definicao_item_mestre(anterior_i->(pos::int-1))=def then prev:=anterior_i->(pos::int-1);end if;
   if prev is not null then
    if private.definicao_item_mestre(prev) is distinct from def then
     raise exception 'Somente o mestre responsável pode alterar as propriedades do item.' using errcode='42501';
    end if;
   elsif not exists(select 1 from private.catalogo_itens_mestre c where c.ref=item->>'ref'
       and private.definicao_item_mestre(jsonb_build_object('ref',c.ref,'tipo',c.tipo,'propriedades',c.propriedades))=def) then
    raise exception 'Item com efeitos não aprovado pelo mestre ou pelo catálogo do servidor.' using errcode='42501';
   end if;
   cargas:=item#>'{propriedades,cargas}';
   if cargas is not null and (jsonb_typeof(cargas)<>'object' or not private.contador_jogo_valido(cargas->'atual',cargas->'max')) then
    raise exception 'Cargas atuais inválidas.' using errcode='23514';
   end if;
   if item#>'{propriedades,sintonia,sintonizado}' is not null and jsonb_typeof(item#>'{propriedades,sintonia,sintonizado}')<>'boolean' then
    raise exception 'Estado de sintonia inválido.' using errcode='23514';
   end if;
  end loop;
  if (select count(*) from jsonb_array_elements(new.inventario) e where e#>'{propriedades,sintonia,sintonizado}'='true'::jsonb)>3 then
   raise exception 'Limite de três itens sintonizados.' using errcode='23514';
  end if;
 end if;
 return new;
end $$;

revoke all on function private.contador_jogo_valido(jsonb,jsonb),private.magias_mestre_protegidas(jsonb,text),
 private.validar_usos_mestre(jsonb,text),private.definicao_item_mestre(jsonb),private.personagens_proteger_campos_mestre()
 from public,anon,authenticated;
drop trigger if exists zz_personagens_campos_mestre on public.personagens;
create trigger zz_personagens_campos_mestre before insert or update on public.personagens
 for each row execute function private.personagens_proteger_campos_mestre();
commit;
