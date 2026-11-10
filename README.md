# Rastreador D&D 5e

Rastreador de iniciativa e bestiário para D&D 5e, em português. Roda inteiramente no navegador, sem servidor próprio: o site é um conjunto de arquivos estáticos publicados no GitHub Pages, e o GitHub também serve como armazenamento opcional (sincronização entre aparelhos).

Projeto de fãs, para uso pessoal. Sem vínculo com a Wizards of the Coast.

## Stack

| Camada | Tecnologia |
|---|---|
| Interface | HTML5 e CSS3 (um único `estilo.css`, tema escuro, variáveis CSS) |
| Lógica | JavaScript puro (ES2022), scripts clássicos, sem framework, sem bundler, sem etapa de build |
| Dados locais | IndexedDB (fichas, magias, fotos) e `localStorage` (estado e configurações) |
| Offline / instalação | PWA: `manifest.json` + service worker |
| Rede | `fetch` para a API REST do GitHub (sincronização e publicação) e para a API da Open5e v2 (bestiário) |
| Dependência de terceiros | `pdf.js` 4.4.168, incluído em `vendor/pdfjs/`, usado só pelo importador do Livro do Jogador |

Nenhum código é baixado de CDN. A CSP (`<meta>`) permite apenas `script-src 'self'` e conexões para `api.github.com` e `api.open5e.com`.

## Funcionalidades

**Combate**
- Lista de combatentes ordenada por iniciativa, com desempate pela ordem de entrada; controle de turno e de rodada.
- Iniciativa em dois campos: d20 e modificador. Ao escolher um monstro do bestiário, os dois vêm preenchidos (o modificador sai da Destreza).
- Pontos de vida com dano e cura, edição e remoção. O quadro da rodada só aparece com combate ativo.
- Efeitos de status (20 predefinidos e personalizado): ícone, anel colorido na foto, duração em rodadas que desconta no fim do turno da criatura, dica com a regra ao passar o mouse.
- Relatório ao encerrar: dano causado, sofrido, cura e abates por combatente. O dano é atribuído a quem está na vez ou a quem for escolhido em "Dano causado por".

**Bestiário e fichas**
- Pacotes SRD 2014 e 2024 embutidos (monstros e magias), carregados em IndexedDB na primeira visita. A Open5e é usada só para outras fontes.
- Busca e filtros por nome, tipo, tamanho e coleção.
- Fichas próprias (monstro, personagem, NPC) com características, ações (com rolagem de ataque e dano) e magias; edição, exportação e importação em JSON.
- Fotos com recorte (zoom, arrastar, prévia do ícone) e redução para 192 px. Fotos públicas dos monstros da API ficam em `fotos/`; a foto local tem prioridade.

**Consulta de magias e habilidades**
- Busca única em magias, habilidades de monstro e habilidades de classe, com filtros recolhíveis por tipo, fonte (2014 ou 2024), círculo, escola e ritual ou concentração.
- Habilidades de classe do SRD (426 entradas), com texto em português para as de 2014. Podem ser adicionadas a uma ficha própria.

**Tradução**
- Descrições de monstros: camadas automáticas (modelos com troca de números, regex para ataques e salvaguardas, conjuração com links para as magias).
- Magias do SRD 5.1 em português e nomes de monstros traduzidos, em `dados/srd-pt.json`.
- Importador opcional (`ferramentas/importar-ldj.html`) que lê magias e habilidades de classe de um PDF do próprio usuário. O resultado fica só no navegador dele e na sincronização privada.

## Estrutura

```
index.html               aplicação
admin.html               publicação de fotos e pacotes (não linkada)
sw.js, manifest.json     PWA
css/estilo.css
js/
  icones.js              ícones SVG (ico("nome") e <i data-i="nome">)
  iniciativa.js          combate: estado, render, efeitos, relatório
  app.js                 bestiário, fichas, tradução, magias, sincronização
  admin.js               página de publicação
dados/
  srd-pt.json            dicionários de tradução (M: monstros, S: magias, F: habilidades)
  habilidades.json       habilidades de classe (SRD, via Open5e)
  habilidades-pt.json    tradução própria das habilidades (SRD 2014)
  bestiario/             pacotes srd-2014.json, srd-2024.json e index.json
fotos/                   fotos públicas dos monstros da API e index.json
ferramentas/             importador do Livro do Jogador
vendor/pdfjs/            pdf.js
icones/, favicon.ico
```

Os dois scripts compartilham o estado pelo objeto global `window.__ini` (lista de combatentes, chave do monstro escolhido, avatar). Os dados pesados são carregados com `fetch` e não ficam no código.

## Armazenamento

| Onde | Chave / nome | Conteúdo |
|---|---|---|
| IndexedDB `bestiario` v3 | `mon`, `spl`, `img` | fichas, magias, fotos (data URL) |
| `localStorage` | `dnd5e_initiative_tracker_v1` | estado do combate |
| | `ini_sync` | repositório, caminho e token da sincronização |
| | `ini_tomb` | exclusões de criações (para propagar na sincronização) |
| | `ini_tr`, `ini_ldj`, `ini_packs`, `ini_admin` | nomes traduzidos, tradução do PDF, pacotes carregados, modo administrador |

## Sincronização

Opcional. Usa a API de conteúdo do GitHub em um repositório privado do usuário, com token fine-grained limitado a esse repositório (Contents: leitura e escrita).

- `criacoes.json`: fichas próprias, fotos delas e lista de exclusões.
- `traducoes.json`: nomes traduzidos e a tradução importada do PDF.
- Resolução de conflito por `updatedAt` (vence o mais recente); exclusões vencem edições mais antigas. Nova tentativa em 409 e 422, leituras com `cache: "no-store"` e alterações feitas durante uma sincronização geram uma nova rodada.
- Trava de segurança: a sincronização recusa repositórios públicos.
- O token fica em `localStorage`, sem criptografia. Use um token de curta validade e só para esse repositório.

## Modo administrador

Os painéis de sincronização e de dados locais ficam ocultos. Aparecem com `/?admin` na URL ou com 5 toques seguidos no título (a escolha fica salva no aparelho). Depois de configurada, a sincronização continua acessível pelo botão **Sincronizar** do topo.

`admin.html` publica fotos e pacotes SRD direto no repositório do site, em um único commit, pela API Git Data (blobs, tree, commit, ref). Exige um token separado com escrita no repositório do site. As criações próprias nunca são enviadas. Isso não é um controle de acesso: a proteção é o token e a permissão de escrita no GitHub.

## Executar localmente

```bash
python -m http.server 8000
```

Abra `http://localhost:8000`. Módulos, `fetch` e service worker não funcionam em `file://`.

## Publicar

1. Envie o conteúdo para um repositório público e ative o GitHub Pages (branch `main`, pasta `/`). O arquivo `.nojekyll` desliga o processamento do Jekyll.
2. A cada mudança em arquivos já publicados, aumente `CACHE` em `sw.js`. O service worker busca sempre a versão nova quando há rede e usa o cache só offline.
3. Cada push cancela o deploy anterior do Pages; espere o último terminar antes de testar.

## Dados e licenças

- Monstros, magias e habilidades de classe vêm do **System Reference Document 5.1** e do **5.2**, da Wizards of the Coast LLC, sob **Creative Commons Attribution 4.0** (obtidos pela API Open5e). A atribuição também aparece no rodapé do site.
- As traduções em `dados/` são próprias, feitas a partir dos textos do SRD.
- Textos de livros publicados não fazem parte do repositório. A tradução importada de um PDF fica apenas no navegador de quem a importou.

## Limitações

- Sem servidor: cada pessoa só vê os próprios dados. Para compartilhar, use um repositório de sincronização comum ou o arquivo de exportação.
- A tradução das habilidades de classe cobre o SRD 2014; as de 2024 ficam em inglês.
- A extração do PDF depende do formato do livro usado no desenvolvimento e pode precisar de ajuste para outras edições.

## Atualização: contas, fichas e migração

A entrada agora é `index.html` (login ou campanhas da conta conectada). O combate e as consultas públicas estão em `iniciativa.html`; jogadores acessam monstros, magias e habilidades pelo link de consultas na conta ou campanha.

Aplique `supabase/02-acervos-e-transferencia.sql` após o schema inicial **antes de publicar**. O acervo sincroniza pela conta Supabase, com controle de acesso por usuário e mesclagem de criações/exclusões por data. O IndexedDB e as traduções são separados por conta. O token GitHub legado é removido do navegador após uma importação ou sincronização bem-sucedida.

Para migrar do repositório privado:
1. Faça login na conta de destino.
2. Em **Importar dados antigos**, importe o backup combinado ou os arquivos originais `criacoes.json` e `traducoes.json`, um de cada vez.
3. Na campanha, use **Importar do bestiário** para os personagens ainda não importados e **Recuperar fotos importadas** para os existentes.
4. Depois que o jogador entrar na campanha com o código, o mestre escolhe o **Jogador responsável** no cartão. Não é necessário recriar a ficha.

As automações seguem os dados de classe SRD 2014 do projeto. Atributos iniciais e escolhas de talento, estilo de luta, perícias e melhorias continuam sendo escolhas do jogador; os bônus e recursos derivados são calculados. As melhorias permitem escolher +1 duas vezes, inclusive no mesmo atributo, até 20. As descrições das raças expandidas continuam sendo resumos do catálogo existente, sem reprodução de livros.

Validação local: `node tests/regras.test.cjs`. A validação de permissões e concorrência do banco está em `supabase/VALIDACAO.md`.
