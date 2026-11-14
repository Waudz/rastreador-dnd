# Imagens do catálogo para visitantes sem conta — causa e plano (PARA APROVAÇÃO)

Status: o código do aplicativo já foi ajustado (ver §4). **Falta uma função SQL mínima, que só o William aplica.** Nada foi aplicado ao Supabase. O SQL abaixo está em `docs/` de propósito, fora de `supabase/migrations/`.

## 1. Causa exata (verificada)
As imagens do catálogo são arquivos no bucket **público** `catalogos` (Supabase Storage). Quem diz *qual arquivo pertence a qual item* é o JSON `public.catalogo_publicado` (registros `item:<id>` / `monstro:<chave>` com o campo `imagem`). Dois bloqueios impedem o visitante de ver as imagens:
1. **Banco:** `supabase/catalogos-globais.sql` faz `revoke all on public.catalogo_publicado from public, anon` ("o catálogo exige conta autenticada; não abrir o JSON inteiro para visitantes"). Verificado ao vivo, sem login, com a chave publicável: `GET /rest/v1/catalogo_publicado` → **HTTP 401, código 42501, "permission denied for table catalogo_publicado"**.
2. **Código:** `CATALOGO.carregar()` (js/catalogo.js) retornava logo no começo quando não há sessão (`if(!nuvem.usuario()) { dados={globais:{}}; return }`): nem tentava buscar. Resultado: `CATALOGO.imagem('item', id)` devolve `undefined` e a tela mostra só o ícone da categoria.

O que **não** é a causa (verificado): o bucket existe e é público (a URL pública de um arquivo inexistente responde "Object not found", enquanto um bucket inexistente responde "Bucket not found"); a CSP dos HTML permite `img-src https:`; o service worker ignora requisições de outra origem (`u.origin !== location.origin`), então não interfere; imagens padrão e personalizadas do catálogo falham igualmente (mesma tabela); as imagens enviadas pelos jogadores ficam dentro da ficha (`ficha.imagensItens`), que exige sessão e permissão, e não são afetadas.

## 2. Solução proposta (mínima e segura)
Não abrir a tabela. Criar uma função que devolve **somente os caminhos de imagem** já públicos (qualquer pessoa com o caminho já consegue abrir o arquivo no bucket público): nada de nomes editados, descrições, traduções, itens excluídos ou dados de personagem.

```sql
begin;
create or replace function public.catalogo_imagens_publicas()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('tipo',r.value->>'tipo','chave',r.value->>'chave','imagem',r.value->>'imagem')),'[]'::jsonb)
 from public.catalogo_publicado c, jsonb_each(coalesce(c.dados->'globais','{}'::jsonb)) r
 where c.id='2014'
   and coalesce((r.value->>'imagemDefinida')::boolean,false)
   and coalesce((r.value->>'excluido')::boolean,false)=false
   and r.value->>'tipo' in ('item','monstro')
   and r.value->>'imagem' ~ '^(itens|monstros)/[0-9a-f-]{36}\.(jpg|png|webp)$';
$$;
revoke all on function public.catalogo_imagens_publicas() from public;
grant execute on function public.catalogo_imagens_publicas() to anon, authenticated;
commit;
```
Rollback: `drop function public.catalogo_imagens_publicas();`.

Por que é seguro: só lê (`stable`); a saída é filtrada por formato de caminho do bucket público; não concede `select` em nenhuma tabela ao `anon`; não altera policies do Storage (o bucket já é público para leitura e continua sem `insert/update/delete` para anônimos); mantém `catalogo_publicado` fechada.

## 3. Alternativas descartadas
- Reabrir `select` da tabela para `anon`: expõe o JSON inteiro (nomes, traduções, edições) — o que o projeto decidiu não fazer.
- Arquivo estático `dados/imagens-catalogo.json` no repositório: funcionaria sem SQL, mas ficaria desatualizado a cada upload do administrador (exigiria commit manual).

## 4. O que o aplicativo já faz (local, sem depender do SQL)
- `nuvem.catalogoImagensPublicas()` chama a função com a chave pública; `CATALOGO.carregar()` usa isso quando não há sessão, só aceita caminhos no formato `(itens|monstros)/<uuid>.(jpg|png|webp)`, não grava nada no `localStorage` e dispara `catalogo:atualizado`.
- Se a função ainda não existir (404) ou não houver rede, nada quebra: continuam os ícones padrão.
- Aba Itens: se um arquivo de imagem ficar indisponível, o cartão e os detalhes voltam ao ícone da categoria (antes ficava a imagem quebrada). Logado, o fluxo antigo não mudou.

## 5. Passos
1. William aprova e aplica o SQL do §2 no painel.
2. Conferir sem login (aba anônima): `https://…/rest/v1/rpc/catalogo_imagens_publicas` com a chave publicável devolve a lista; abrir `itens.html` e ver as imagens.
3. Publicar o código (cache novo).
