# Imagens do catálogo para visitantes sem conta — causa, SQL revisado e plano (PARA APROVAÇÃO)

Status: **nada aplicado ao Supabase.** O código do aplicativo já está ajustado (§6). Falta só a função SQL abaixo, que o William aprova e aplica. O SQL está em `docs/` de propósito, fora de `supabase/migrations/`. Revisão do SQL: **estática** (não há PostgreSQL local; os testes de comportamento devem rodar no PostgreSQL descartável do projeto, §8).

## 1. Causa exata (verificada)
As imagens são arquivos no bucket **público** `catalogos`. O mapa "qual arquivo é de qual item" está no JSON `public.catalogo_publicado` (`dados->'globais'`, chaves `tipo:chave`), bloqueado para visitantes:
1. **Banco:** `revoke all on public.catalogo_publicado from public, anon` (`supabase/catalogos-globais.sql`). Verificado ao vivo, sem login: `GET /rest/v1/catalogo_publicado` → **401 / 42501 "permission denied for table catalogo_publicado"**.
2. **Código:** `CATALOGO.carregar()` retornava sem tentar quando não há sessão.

Não são a causa: o bucket existe e é público (objeto inexistente → "Object not found"; bucket inexistente → "Bucket not found"); a CSP permite `img-src https:`; o service worker ignora outras origens; o problema é igual para imagens padrão e personalizadas do catálogo (mesma tabela). Imagens enviadas por jogadores ficam em `ficha.imagensItens` (exigem sessão e permissão) e não são afetadas.

Forma real dos registros (de `salvar_catalogo_global`): `{tipo, chave, dados, imagem, imagemDefinida, excluido, versao, atualizado_em}`; `imagem` é string `itens/<uuid>.<ext>` / `monstros/<uuid>.<ext>` ou JSON `null` (administrador removeu a imagem); `chave` é o `id` do item (ex.: `srd51:item/dagger`) ou a `key` do monstro — a mesma chave que o aplicativo usa para procurar a imagem (`CATALOGO.imagem('item', it.id)`).

## 2. SQL completo proposto
```sql
begin;
create or replace function public.catalogo_imagens_publicas()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object(
          'tipo',r.value->>'tipo',
          'chave',r.value->>'chave',
          'imagem',case when jsonb_typeof(r.value->'imagem')='string' then r.value->'imagem' else 'null'::jsonb end)),
        '[]'::jsonb)
 from public.catalogo_publicado c
 cross join lateral jsonb_each(case when jsonb_typeof(c.dados->'globais')='object' then c.dados->'globais' else '{}'::jsonb end) r
 where c.id='2014'
   and jsonb_typeof(r.value)='object'
   and r.value->'imagemDefinida'='true'::jsonb                                     -- só registros em que o administrador decidiu sobre a imagem
   and coalesce(r.value->'excluido','false'::jsonb)<>'true'::jsonb                 -- nunca itens/monstros excluídos
   and r.value->>'tipo' in ('item','monstro')
   and r.value->>'chave' ~ '^[A-Za-z0-9_:/.-]{1,180}$'                             -- mesmo formato que salvar_catalogo_global exige
   and (jsonb_typeof(r.value->'imagem') in ('null')                                -- imagem removida de propósito
        or (jsonb_typeof(r.value->'imagem')='string'
            and r.value->>'imagem' ~ ('^'||case r.value->>'tipo' when 'item' then 'itens' else 'monstros' end||'/[0-9a-f-]{36}\.(jpg|png|webp)$')));
$$;
comment on function public.catalogo_imagens_publicas() is 'Somente tipo, chave e caminho de imagem do catálogo global (bucket público). Não devolve dados, nomes nem registros excluídos.';
-- permissões explícitas: zera TUDO (inclusive os grants automáticos do Supabase) e concede só o necessário
revoke all on function public.catalogo_imagens_publicas() from public, anon, authenticated;
grant execute on function public.catalogo_imagens_publicas() to anon, authenticated;
commit;
```
Rollback (sem tocar em dados): `drop function if exists public.catalogo_imagens_publicas();`

## 3. Resposta às oito verificações
| # | Pergunta | Conclusão |
|---|---|---|
| 1 | Só imagens de registros públicos e não excluídos? | Sim. Filtros no `where`: `imagemDefinida = true`, `excluido` diferente de `true`, tipo `item`/`monstro`, `chave` e caminho no formato do bucket **do mesmo tipo** (item só `itens/…`, monstro só `monstros/…`). Registro com imagem removida volta como `imagem: null` para o visitante respeitar a remoção. |
| 2 | Itens privados, rascunhos ou dados de personagens podem aparecer? | Não. A função lê **uma única tabela** (`catalogo_publicado`, linha `2014`), sem joins com `personagens`, `campanhas`, `membros`, `acervos` ou Storage. Itens personalizados dos usuários vivem no navegador (localStorage) ou em tabelas de acervo, nunca nessa linha. O catálogo não tem conceito de rascunho: o que está em `globais` já é o publicado para todos os usuários logados. |
| 3 | O identificador associa a imagem ao item certo? | Sim: `chave` é a mesma do mapa (`tipo:chave`) e a que o aplicativo usa para procurar (`it.id` do item; `key` do monstro). O cliente reconstrói `tipo:chave` e a URL pública do bucket; a mesma validação é refeita no navegador. |
| 4 | `SECURITY DEFINER` seguro? | `set search_path=''` e todas as referências com esquema (`public.catalogo_publicado`); as funções/operadores usados (`jsonb_*`, `coalesce`, `->`, `->>`, `~`) estão em `pg_catalog`, sempre resolvido. Função `stable`, SQL puro (sem SQL dinâmico, sem parâmetros: não há o que injetar). Permissões explícitas: `revoke all … from public, anon, authenticated` (zera inclusive os grants automáticos do Supabase, que dão execução a `anon/authenticated/service_role` em funções novas do esquema `public`) seguido de `grant execute … to anon, authenticated`; nada depende do padrão do PostgreSQL. `service_role` (chave secreta, nunca no navegador) mantém o acesso padrão do Supabase. O `definer` é necessário porque `anon` não tem `select` na tabela. |
| 5 | O visitante consegue consultar além do necessário? | Não pela função: não tem argumentos, devolve apenas `{tipo, chave, imagem}`. Não concede `select`, não altera policies nem o RLS e não mexe no Storage (o bucket já era público para leitura; continua sem escrita para anônimos). Quem já sabe um caminho de imagem sempre pôde abri-lo; a função só revela os caminhos que o catálogo já tornou públicos. |
| 6 | A chave pública basta, sem autenticação? | Sim. Verificado ao vivo: com só o cabeçalho `apikey: sb_publishable_…` a requisição chega ao Postgres como papel `anon` (a resposta foi a negação de permissão da tabela, não erro de chave). O `catalogoImagensPublicas()` envia `apikey` e `Content-Type`; o Supabase já permite essa chamada de outra origem (GitHub Pages) como o restante do aplicativo. |
| 7 | Funciona sem mudar permissões gerais da tabela? | Sim: `catalogo_publicado` continua com `revoke … from public, anon` (o teste `tests/catalogo-publico.test.cjs` confere o arquivo SQL) e a leitura completa continua só para `authenticated`. |
| 8 | Devolve só o necessário, sem o JSON completo? | Sim: monta um array novo com 3 campos por registro; `dados` (nomes, traduções, descrições, edições) nunca é devolvido. |

Robustez do SQL (revisada): sem `cast` que possa falhar com JSON inesperado (a comparação com `'true'::jsonb` substitui `::boolean`); `jsonb_each` só é aplicado quando `globais` é objeto; sem `globais` ou sem a linha `2014` o resultado é `[]`. Custo: leitura de uma linha por chave primária.

Riscos e limites: (a) endpoint anônimo → sujeito aos limites de taxa do Supabase; resposta pequena (um item por imagem cadastrada). (b) Itens "globais criados pelo administrador" têm imagem mapeada, mas o aplicativo só os mostra a quem tem conta (o JSON de `dados` segue fechado); não é regressão. (c) Itens excluídos continuam aparecendo ao visitante a partir do catálogo base local, como antes (a exclusão só é conhecida por quem lê a tabela). (d) Execução real ainda por validar (§8).

## 3.1 Imagens públicas × itens públicos × dados de personagens
- **O que é público para o visitante hoje:** os itens do catálogo SRD (arquivo estático `dados/itens-srd2014.json`, servido pelo site) e o bestiário. A função **não** muda isso e não entrega nenhum item: devolve só `tipo`, `chave` e o caminho do arquivo de imagem, e o aplicativo só usa a imagem de itens que ele já mostra.
- **Diferença que ainda existe:** o banco não conhece o catálogo estático, então a função também devolve caminhos de imagens de registros globais criados pelo administrador que o visitante não vê na tela. É só um caminho com UUID (não adivinhável, sem nome nem descrição) de um arquivo que já está em bucket público; o visitante não ganha nenhum dado do item. Se preferir zero diferença, a alternativa é a lista estática (§4), com o custo de manutenção.
- **Dados de personagens não entram:** a função não lê `personagens`, `campanhas`, `membros` nem acervos; imagens de itens dos jogadores ficam em `ficha.imagensItens` (RLS por dono/mestre) e **não podem estar no bucket `catalogos`**, porque o envio para esse bucket só é permitido a administradores (`catalogos_enviar … private.conta_admin()`, caminho `itens|monstros/<uuid>`) e o bucket não aceita UPDATE/DELETE. Tokens, e-mails e chaves nunca passam pela função.

## 4. Alternativas descartadas
- Reabrir `select` da tabela para `anon`: expõe o JSON inteiro.
- Arquivo estático no repositório: sem SQL, mas ficaria desatualizado a cada upload do administrador.
- `security invoker` com policy de `anon`: exigiria policy por coluna/linha na tabela (mais permissões, não menos).

## 4.1 Testes SQL em ambiente descartável — situação
**Não foi possível executar.** Procurei: não há `psql`/`postgres`/`initdb`, nem Docker, nem PGlite instalados neste computador; o WSL não tem distribuição instalada. Não instalei nada por conta própria. O que foi feito no lugar: revisão estática linha a linha, teste automatizado do texto do SQL (`tests/catalogo-publico.test.cjs`: sem casts, filtros de excluído/tipo/caminho, `security definer`, `search_path` vazio, revoke explícito, sem grant em tabela, sem policy) e o teste do cliente com respostas simuladas. Os cenários do §8 continuam sendo a validação de comportamento e devem rodar no PostgreSQL descartável do projeto (ou em um projeto Supabase de teste) antes da aplicação.

## 5. Passos de implantação
1. William aprova (e, se quiser, ajusta) o SQL do §2.
2. Rodar os testes do §8 no PostgreSQL descartável.
3. William aplica no painel do Supabase.
4. Verificar **sem login** (aba anônima/`curl`): `POST /rest/v1/rpc/catalogo_imagens_publicas` com `apikey` devolve a lista; `GET /rest/v1/catalogo_publicado` continua 401; abrir `itens.html` e ver as imagens.
5. Publicar o código (cache novo).
Rollback: `drop function`; o aplicativo continua funcionando (volta aos ícones).

## 6. O que o aplicativo já faz (local)
- `nuvem.catalogoImagensPublicas()` e `CATALOGO.carregar()` (sem sessão) usam a função; só aceitam `tipo` item/monstro, `chave` no formato `[A-Za-z0-9_:/.-]{1,180}` e caminho `(itens|monstros)/<uuid>.(jpg|png|webp)` (ou `null`); nada vai para o `localStorage`; falha → ícones padrão.
- Aba Itens: arquivo indisponível → ícone da categoria (lista, grade e detalhes).
- Logado: caminho antigo inalterado.

## 7. Testes já feitos
Automatizados (`tests/catalogo-publico.test.cjs`): visitante com a função, caminhos inválidos ignorados, `imagem: null` preservada, função ausente/erro/resposta inválida, logado não usa a função, SQL sem grants em tabelas e sem policies. Navegador: site publicado sem login (0 imagens, tabela 401, o problema atual) e localhost sem login com a resposta da função simulada (URL pública montada; ícone de fallback quando o arquivo falha; 375 px sem rolagem horizontal).

## 8. Testes a executar no PostgreSQL descartável (antes de aplicar)
Com fixtures de `catalogo_publicado` contendo: item com imagem; monstro com imagem; registro excluído com imagem; registro com `imagemDefinida=false`; registro com `imagem` null definida; caminho inválido (`../x`, `.svg`, tipo trocado `itens/` em monstro); `globais` ausente / não objeto; `dados` com texto sigiloso.
1. Como `anon`: `select public.catalogo_imagens_publicas()` devolve só os registros válidos, com apenas `tipo`, `chave`, `imagem`; nenhum texto de `dados`.
2. Como `anon`: `select * from public.catalogo_publicado` → erro `42501` (continua fechada).
3. Como `authenticated` não administrador: mesma saída; `salvar_catalogo_global` continua negada.
4. `globais` ausente/não objeto → `[]` sem erro.
5. `has_function_privilege('anon','public.catalogo_imagens_publicas()','execute')` e `('authenticated', …)` verdadeiros; `has_table_privilege('anon','public.catalogo_publicado','select')` falso; `select grantee, privilege_type from information_schema.routine_privileges where routine_name='catalogo_imagens_publicas'` lista só `anon`, `authenticated` (e donos/`service_role` do Supabase), sem `PUBLIC`.

## 9. Onde e como validar e aplicar (situação em 14/11)

### 9.1 Ambiente de teste disponível?
- **Projeto Supabase de desenvolvimento: não encontrado.** Em todo o repositório (código, docs, workflow, configs) só aparece UM projeto, o de produção (`pdjzahpxjrlbqqtzkfdr`). Não há `.env`, `supabase/config.toml`, nem outra URL. Eu não tenho acesso ao seu painel do Supabase, então não sei se você tem outro projeto fora do repositório; se tiver, use-o como "Opção B".
- **PostgreSQL descartável: existe, no CI.** `.github/workflows/validar.yml` (job `postgres`) sobe `postgres:16` num contêiner do GitHub Actions, cria papéis `anon`/`authenticated` e os esquemas `auth`/`storage` (`tests/supabase-fixture.sql`), aplica `01`, `02`, `03` (esta cria `public.catalogo_publicado` e revoga o `anon`) e roda os testes `tests/*.test.sql`. Nunca toca no projeto real.
- **Neste computador: não** (sem `psql`, Postgres, Docker, PGlite; WSL sem distribuição). Nada foi instalado.

### 9.2 Opção A (recomendada): o CI, sem custo e sem risco para produção
Já preparado localmente, **ainda não enviado ao GitHub**:
- `supabase/propostas/catalogo-imagens-publicas.sql` (fonte única da função; idêntica ao bloco do §2) e `…rollback.sql`.
- `tests/catalogo-imagens-publicas.test.sql` com os cenários do §8: lista só dos 3 registros válidos (item, monstro e imagem removida = `null`), apenas `tipo/chave/imagem`, nada de `dados`, sem excluídos/sem `imagemDefinida`/caminho inválido/tipo trocado/chave inválida/outro tipo/lixo; resultado igual para `anon` e `authenticated`; `anon` continua sem ler a tabela (42501); `globais` ausente/array/texto e linha `2014` ausente → `[]`; `security definer`, `stable`, `search_path` vazio; `execute` só para `anon` e `authenticated` (nenhum `PUBLIC`); reaplicação idempotente; rollback remove a função e a tabela continua fechada.
- Um passo novo no job `postgres` do workflow aplica a proposta duas vezes e roda esse teste.
**Para executar:** com a sua autorização, publico (ou abro um pull request só com esses arquivos; o CI roda no PR) e o resultado aparece na aba *Actions*. **Atenção:** o teste foi escrito sem poder executá-lo aqui; a primeira execução é a do CI e pode precisar de ajuste de sintaxe. Um push na `main` também publica o site, então prefiro um branch/PR para validar antes.

### 9.3 Opção B: projeto Supabase novo só para teste (se quiser testar a API real)
1. No painel, criar um projeto novo (plano gratuito), com outro nome (ex.: `compendio-teste`). Não reutilizar chaves nem dados do de produção.
2. SQL Editor: aplicar `supabase/01-schema.sql`, `02-…`, `03-…` e `supabase/catalogos-globais.sql` (cria o bucket público e `salvar_catalogo_global`), depois `supabase/propostas/catalogo-imagens-publicas.sql`.
3. Inserir um registro de teste em `public.catalogo_publicado` (id `2014`) com o JSON do fixture do teste SQL e subir uma imagem qualquer em `catalogos/itens/<uuid>.png`.
4. De fora do navegador logado (aba anônima ou `curl`), com a chave publicável **do projeto de teste**: `POST …/rest/v1/rpc/catalogo_imagens_publicas` → lista; `GET …/rest/v1/catalogo_publicado` → 401; abrir `itens.html` apontando para o projeto de teste (editar `js/config-nuvem.js` localmente, sem commitar).
5. Apagar o projeto de teste ao terminar.

### 9.4 Opção C: aplicar direto em produção (só se A/B não forem possíveis)
**Antes:** (a) conferir no SQL Editor que a função não existe: `select to_regprocedure('public.catalogo_imagens_publicas()');` → `null`; (b) conferir o estado atual: `select has_table_privilege('anon','public.catalogo_publicado','select');` → `false`; (c) ter o rollback à mão.
**Aplicar:** colar o conteúdo de `supabase/propostas/catalogo-imagens-publicas.sql` (transação única `begin … commit`; só cria uma função, não altera tabelas, dados, policies nem Storage) e executar.
**Verificar (sem login, `curl` ou aba anônima, chave publicável):** `POST https://pdjzahpxjrlbqqtzkfdr.supabase.co/rest/v1/rpc/catalogo_imagens_publicas` com `apikey` e corpo `{}` → HTTP 200 e um array só com `tipo/chave/imagem`; `GET …/rest/v1/catalogo_publicado?select=atualizado_em&id=eq.2014` → **continua 401**; `select grantee, privilege_type from information_schema.routine_privileges where routine_name='catalogo_imagens_publicas';` → só `anon`, `authenticated` (e donos/`service_role` do Supabase), nada de `PUBLIC`. Depois publicar o código (já pronto, com cache novo) e abrir `itens.html` em aba anônima.
**Rollback (imediato, sem perda):** executar `supabase/propostas/catalogo-imagens-publicas.rollback.sql` (`drop function if exists public.catalogo_imagens_publicas();`). O aplicativo volta aos ícones; nada mais depende da função.
**Riscos:** (1) erro de sintaxe na colagem → a transação não é confirmada e nada muda; (2) endpoint anônimo novo, sujeito aos limites de taxa do Supabase (resposta pequena); (3) a função só revela caminhos de imagem de arquivos que já estão em bucket público; (4) sem validação prévia em PostgreSQL, a primeira execução real seria a de produção — por isso A ou B antes.

### 9.5 Ordem sugerida
1. Autorizar o envio dos arquivos de teste para um **branch/PR** (não `main`) → CI valida (Opção A).
2. Se o CI passar, aprovar a aplicação em produção (Opção C, com o rollback pronto) e só depois publicar o código das imagens na `main`.
