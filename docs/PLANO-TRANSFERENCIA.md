# Plano técnico — transferência de equipamentos entre fichas (PARA APROVAÇÃO)

Status: **proposta**. Nada aqui foi aplicado ao Supabase nem executado em PostgreSQL. O SQL abaixo é rascunho para revisão e **não** está em `supabase/migrations/` de propósito (evita aplicação acidental). Só o William aplica.

## 1. O que já existe (aplicativo)
- `INVENTARIO.transferir` e `EQUIP_FICHA.transferir` (dados já carregados dos dois personagens): preservam a Origem (`origem.texto` e ids técnicos), preservam nome personalizado, propriedades, efeitos e imagem do jogador, gravam `transferencias` no registro (quem enviou, quem recebeu, quantidade, data, tipo), entregam desequipado e desfazem os vínculos do remetente.
- Falta só: a operação **atômica e verificada no servidor** e a interface.

## 2. Por que precisa de uma função no banco
Pelo RLS atual o jogador só lê e grava a PRÓPRIA linha de `personagens`. Gravar duas fichas pelo navegador não é atômico (falha no meio = item perdido ou duplicado) e o destinatário nem é legível pelo remetente. Solução: uma função `security definer` que, numa transação, trava as duas linhas, valida tudo e grava as duas.

## 3. Desenho da função `public.transferir_item`
Entrada: `p_origem uuid`, `p_destino uuid`, `p_uid text` (registro do item), `p_qtd integer`, `p_versao_origem integer`.
Saída: `jsonb { versao_origem, versao_destino, item }`.

Validações no servidor (nenhuma depende da interface):
1. `auth.uid()` não nulo; origem ≠ destino; `p_qtd >= 1`.
2. Trava as duas linhas na mesma ordem (`order by id for update`) → sem deadlock e sem transferências simultâneas conflitantes.
3. Mesma campanha. Quem chama é dono da origem **ou** mestre da campanha (nunca recebe permissão geral sobre o inventário alheio); o destino precisa ser personagem da mesma campanha (a lista de destinos vem de `grupo_basico`, que já existe).
4. `versao` da origem igual à que o cliente viu (`40001` se mudou → o app pede para reabrir a ficha). O destino é lido já travado, então não precisa de versão.
5. O registro `p_uid` existe na origem e tem `qtd >= p_qtd` (inteiros).
6. A passagem é montada **no servidor** (`de`, `para`, `qtd`, `quando = now()`, `tipo = transferencia`), nunca vinda do cliente.

Efeito: parcial → origem fica com `qtd - p_qtd`; total → registro removido. O destinatário recebe um **registro novo** (uid novo se parcial; o mesmo uid se total e livre no destino) com `equipado=false`, `origem` intacta, nome/propriedades/efeitos/desc preservados e `transferencias = anteriores || nova`. Na ficha do remetente, quando o registro sai por inteiro, remove-se `ataques[].itemUid`, `equip.armaduraUid/escudoUid` (zerando `armadura`/`escudo`) e `armasGuardadas[uid]`. Imagem enviada pelo jogador (por uid) não vai pelo servidor: o catálogo cobre itens do catálogo; para itens personalizados o app copia a imagem na próxima abertura (limitação documentada, ver riscos).

## 4. Histórico só pelo sistema
Gatilho `BEFORE UPDATE OF inventario` (novo): fora da função de transferência (`current_setting('compendio.transferindo', true) = 'sim'`), `transferencias` de itens existentes não pode mudar, e itens novos só podem ter histórico se for cópia do de um item anterior (separar uma unidade para equipar copia o registro e aponta `origemUid`). **A Origem e o nome continuam livres** para o jogador e o mestre (decisão do William): o gatilho não os toca.

## 5. SQL proposto (rascunho)
```sql
begin;
create schema if not exists private;

-- 5.1 histórico de transferências só muda dentro de transferir_item
create or replace function private.proteger_historico_transferencias()
returns trigger language plpgsql security definer set search_path='' as $$
declare item jsonb;prev jsonb;
begin
 if tg_op<>'UPDATE' or new.inventario is not distinct from old.inventario then return new;end if;
 if current_setting('compendio.transferindo',true)='sim' then return new;end if;
 if jsonb_typeof(new.inventario)<>'array' or jsonb_typeof(old.inventario)<>'array' then return new;end if;
 for item in select value from jsonb_array_elements(new.inventario) loop
  if jsonb_typeof(item)<>'object' or coalesce(item->>'uid','')='' then continue;end if;
  select value into prev from jsonb_array_elements(old.inventario) where value->>'uid'=item->>'uid' limit 1;
  if prev is not null then
   if coalesce(item->'transferencias','[]'::jsonb) is distinct from coalesce(prev->'transferencias','[]'::jsonb) then
    raise exception 'O histórico de transferências só é alterado pelo sistema.' using errcode='42501';
   end if;
  elsif coalesce(item->'transferencias','[]'::jsonb)<>'[]'::jsonb then
   -- item novo com histórico: só se for cópia do histórico do registro de origem (separar unidade)
   select value into prev from jsonb_array_elements(old.inventario) where value->>'uid'=item->>'origemUid' limit 1;
   if prev is null or coalesce(prev->'transferencias','[]'::jsonb) is distinct from item->'transferencias' then
    raise exception 'O histórico de transferências só é alterado pelo sistema.' using errcode='42501';
   end if;
  end if;
 end loop;
 return new;
end $$;
revoke all on function private.proteger_historico_transferencias() from public,anon,authenticated;
drop trigger if exists zz_personagens_historico_transferencias on public.personagens;
create trigger zz_personagens_historico_transferencias before update of inventario on public.personagens
 for each row execute function private.proteger_historico_transferencias();

-- 5.2 transferência atômica
create or replace function public.transferir_item(p_origem uuid,p_destino uuid,p_uid text,p_qtd integer,p_versao_origem integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare ator uuid:=auth.uid();o public.personagens;d public.personagens;it jsonb;pos integer;atual numeric;
 total boolean;novo jsonb;novo_uid text;passagem jsonb;inv_o jsonb;inv_d jsonb;f jsonb;
begin
 if ator is null then raise exception 'Não autenticado.' using errcode='28000';end if;
 if p_origem is null or p_destino is null or p_origem=p_destino then raise exception 'Personagens inválidos.' using errcode='22023';end if;
 if p_qtd is null or p_qtd<1 then raise exception 'Quantidade inválida.' using errcode='22023';end if;
 perform 1 from public.personagens where id in (p_origem,p_destino) order by id for update;
 select * into o from public.personagens where id=p_origem;
 select * into d from public.personagens where id=p_destino;
 if o.id is null or d.id is null then raise exception 'Personagem não encontrado.' using errcode='P0002';end if;
 if o.campanha_id<>d.campanha_id then raise exception 'Os personagens precisam ser da mesma campanha.' using errcode='42501';end if;
 if not (o.dono_id=ator or public.eh_mestre(o.campanha_id)) then raise exception 'Você não controla o personagem que envia.' using errcode='42501';end if;
 if not public.eh_membro(o.campanha_id) then raise exception 'Sem acesso a esta campanha.' using errcode='42501';end if;
 if o.versao<>p_versao_origem then raise exception 'A ficha mudou em outro aparelho. Reabra a ficha e tente de novo.' using errcode='40001';end if;
 if jsonb_typeof(o.inventario)<>'array' or jsonb_typeof(d.inventario)<>'array' then raise exception 'Inventário inválido.' using errcode='23514';end if;
 select value,ordinality::integer into it,pos from jsonb_array_elements(o.inventario) with ordinality where value->>'uid'=p_uid;
 if it is null then raise exception 'Item não encontrado no inventário.' using errcode='P0002';end if;
 if coalesce((it->'conjunto')::text,'null')<>'null' then raise exception 'Conjuntos antigos não são transferíveis; retire os componentes antes.' using errcode='22023';end if;
 atual:=case when jsonb_typeof(it->'qtd')='number' then (it->>'qtd')::numeric else 0 end;
 if atual<>floor(atual) or p_qtd>atual then raise exception 'Quantidade inválida: há %.',atual using errcode='22023';end if;
 total:=(p_qtd=atual);
 novo_uid:=case when total and not exists(select 1 from jsonb_array_elements(d.inventario) e where e->>'uid'=p_uid) then p_uid
                else 'it_'||replace(gen_random_uuid()::text,'-','') end;
 passagem:=jsonb_build_object('quando',to_char(now() at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'tipo','transferencia',
   'de',jsonb_build_object('tipo','personagem','id',o.id,'nome',o.nome),'para',jsonb_build_object('tipo','personagem','id',d.id,'nome',d.nome),'qtd',p_qtd);
 novo:=(it-'origemUid')||jsonb_build_object('uid',novo_uid,'qtd',p_qtd,'equipado',false,
   'transferencias',coalesce(it->'transferencias','[]'::jsonb)||passagem);
 if not total then novo:=novo||jsonb_build_object('origemUid',p_uid);end if;
 inv_o:=case when total then (select coalesce(jsonb_agg(v order by ord),'[]'::jsonb) from jsonb_array_elements(o.inventario) with ordinality t(v,ord) where ord<>pos)
             else jsonb_set(o.inventario,array[(pos-1)::text,'qtd'],to_jsonb(atual-p_qtd)) end;
 inv_d:=d.inventario||jsonb_build_array(novo);
 f:=coalesce(o.ficha,'{}'::jsonb);
 if total then   -- o remetente deixa de tratar o item como equipado
  f:=jsonb_set(f,'{ataques}',coalesce((select jsonb_agg(a) from jsonb_array_elements(coalesce(f->'ataques','[]'::jsonb)) a where a->>'itemUid' is distinct from p_uid),'[]'::jsonb));
  if f#>>'{equip,armaduraUid}'=p_uid then f:=jsonb_set(f,'{equip}',((f->'equip')-'armaduraUid')||'{"armadura":""}'::jsonb);end if;
  if f#>>'{equip,escudoUid}'=p_uid then f:=jsonb_set(f,'{equip}',((f->'equip')-'escudoUid')||'{"escudo":false}'::jsonb);end if;
  if f ? 'armasGuardadas' then f:=f#-array['armasGuardadas',p_uid];end if;
 end if;
 perform set_config('compendio.transferindo','sim',true);
 update public.personagens set inventario=inv_o,ficha=f where id=o.id;
 update public.personagens set inventario=inv_d where id=d.id;
 perform set_config('compendio.transferindo','',true);
 select versao into o.versao from public.personagens where id=o.id;
 select versao into d.versao from public.personagens where id=d.id;
 return jsonb_build_object('versao_origem',o.versao,'versao_destino',d.versao,'item',novo);
end $$;
revoke all on function public.transferir_item(uuid,uuid,text,integer,integer) from public,anon;
grant execute on function public.transferir_item(uuid,uuid,text,integer,integer) to authenticated;
commit;
```

## 6. Dependência que precisa de ajuste: gatilho `zz_personagens_campos_mestre`
Ele recusa, para quem não é mestre, item **com efeitos** que não esteja no catálogo aprovado do servidor. Um item mágico personalizado criado pelo mestre seria recusado ao chegar ao destinatário. Proposta: na ramificação "item novo com efeitos", aceitar quando `compendio.transferindo='sim'` **e** o item tiver a mesma definição (`definicao_item_mestre`) de um item do inventário anterior do remetente (mesmo `origemUid`/uid). Sem essa alteração, a função funciona para itens comuns e do catálogo aprovado, e falha com mensagem clara para efeitos personalizados. Precisa de revisão cuidadosa (é o gatilho de segurança existente).

## 7. Interface (só depois da aprovação do SQL)
Nos detalhes do equipamento e no menu "…": **Transferir…** (jogador na própria ficha; mestre nas que administra).
- Modal no padrão atual (`modalInv`): item (readonly), **Quantidade** (1 a `qtd`, mesmo valor da linha agrupada vira escolha por lote), **Destinatário** (select com `grupo_basico`, sem o próprio personagem), botão **Transferir** e **Cancelar**; foco e `Esc` como nos outros modais; funciona em 375 px (coluna única, botões 40 px).
- Chama `nuvem.rpc("transferir_item", …)`; sucesso → atualiza `P.inventario`/`versao` locais (relê a ficha), aviso "N × Item enviado(s) para X"; erro → mensagem do servidor traduzida (`40001`, `42501`, `P0002`, `22023`) sem alterar nada local.
- Linha agrupada: o seletor de lote mostra a origem de cada lote; equipado: o remetente já perde o vínculo (cliente também chama `reconciliar` ao reabrir).

## 8. Riscos
1. Gatilho de campos do mestre (item 6): é a parte mais sensível; testar com fixtures de mestre/jogador antes.
2. `set_config` é por transação (`true`); não pode ser definido por clientes via PostgREST (função de `pg_catalog` não é exposta), mas convém revisar a exposição do schema.
3. Imagem de itens personalizados (guardada por uid dentro da ficha do remetente) não acompanha pelo servidor; itens do catálogo não são afetados. Aceitar ou copiar no app.
4. Conjuntos antigos (`conjunto`) ficam fora (mensagem pede retirar componentes).
5. A ficha do remetente é alterada pela função (limpeza de vínculos): se uma versão futura da ficha mudar essas chaves, ajustar aqui também.
6. Campanhas: só mesma campanha; transferência entre campanhas fica de fora de propósito.

## 9. Passos de implantação
1. Aprovação deste plano (William).
2. Escrever testes SQL no PostgreSQL descartável (fixtures de mestre, jogador A, jogador B, outsider): transferência total/parcial; dono × não dono; campanha diferente; versão velha; quantidade inválida/fracionária; uid inexistente; duas chamadas simultâneas (uma falha com 40001); tentativa de editar `transferencias` por UPDATE direto (42501); item mágico personalizado; item equipado; rollback atômico (erro forçado no segundo UPDATE não deixa o primeiro).
3. Colocar o SQL aprovado em `supabase/migrations/<data>_transferir_item.sql` + rollback (`drop function`/`drop trigger`), sem mexer em dados.
4. William aplica no Supabase (primeiro o gatilho do histórico, depois a função, depois o ajuste do gatilho de campos do mestre, se aprovado).
5. Implementar a interface do item 7 com testes (modal, erros, 375 px) e publicar com cache novo.
6. Validar com duas contas reais (jogador → jogador, mestre → jogador).
