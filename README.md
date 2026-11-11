# Rastreador D&D 5e

Rastreador de iniciativa, fichas, campanhas, monstros e magias de D&D 5ª edição (2014), em português. Site estático (HTML, CSS e JavaScript puro, sem build e sem framework) publicado no GitHub Pages, com contas e campanhas no Supabase e instalável como PWA.

Projeto de fãs, sem vínculo com a Wizards of the Coast. Conteúdo oferecido para escolha: apenas o System Reference Document 5.1 (veja "Licenças").

## O que faz

- **Campanhas:** o mestre cria a campanha e convida jogadores com um código. Diário (anotações e documentos), personagens e grupo.
- **Fichas:** criador guiado e ficha automática (classes, multiclasse, CA, PV, perícias, ataques, magias e espaços, inventário com peso, idiomas).
- **Iniciativa:** combate com turnos, rodadas, efeitos e condições, dano e cura, relatório final. Cada campanha guarda o seu combate neste aparelho.
- **Monstros e Magias:** catálogo SRD 5.1 com tradução para o português, fichas próprias (monstro, personagem, NPC) e fotos.
- **PWA:** funciona offline com o que já foi aberto.

## Onde cada dado fica

| Dado | Onde |
|---|---|
| Contas e sessões | Supabase Auth; o navegador guarda só a sessão (`nuvem_sessao`) |
| Personagens, campanhas, participantes, diário | Supabase (`personagens`, `campanhas`, `membros`, `documentos`) |
| Documentos e imagens da campanha | Supabase Storage (bucket privado `documentos`) |
| Criações próprias (monstros, NPCs, fotos) | IndexedDB `bestiario_<id da conta>` e cópia na conta (`acervos`) |
| SRD em português e catálogo | arquivos deste repositório (`dados/`) |
| Estado do combate, campanha ativa, preferências | `localStorage` deste aparelho |

Não há mais sincronização por repositório do GitHub: o site não se conecta ao GitHub nem guarda tokens dele.

## Estrutura

```
index.html, conta.html           entrada, campanhas, personagens e conta
campanha.html, personagem.html   campanha e ficha
criar-personagem.html            criador guiado
iniciativa.html                  iniciativa, Monstros e Magias (?aba=)
licencas.html                    licenças e créditos
admin.html                       ferramentas do administrador
sw.js, manifest.json             PWA
css/                             estilo.css, identidade.css, fichas.css, magias.css
js/                              um arquivo por área (veja AGENTS.md)
dados/                           SRD 5.1 em português e catálogo
supabase/                        SQL do banco e instruções
tests/                           testes (node --test tests/*.cjs)
```

## Executar localmente

```bash
node ferramentas/servidor-local.cjs
```

Ou `python -m http.server 8000` e abra `http://localhost:8000`. O service worker e o `fetch` não funcionam em `file://`.

## Testes

```bash
node --test tests/*.cjs
```

O fluxo do GitHub também aplica `supabase/*.sql` num Postgres temporário e roda `tests/supabase.test.sql`. Isso não substitui validar as regras no projeto real (veja `supabase/VALIDACAO.md`).

## Publicar

1. Push na branch `main`; o GitHub Pages publica a pasta raiz.
2. Ao mudar arquivos já publicados, aumente `CACHE` em `sw.js`.
3. Quem tem a PWA aberta recebe o aviso "Nova versão disponível".

## Licenças

- Monstros, magias, classes e raças do **System Reference Document 5.1**, de Wizards of the Coast LLC, sob **Creative Commons Attribution 4.0** (dados obtidos pela API Open5e). A atribuição completa e as alterações feitas estão em [`licencas.html`](licencas.html) e no rodapé de todas as páginas.
- As traduções de `dados/` devem ser do próprio projeto, feitas a partir do texto do SRD. A procedência de cada arquivo precisa estar confirmada antes de uma distribuição ampla.
- A estrutura do criador foi adaptada do HeroQuill (MIT); aviso em [`docs/FONTES-CRIADOR.md`](docs/FONTES-CRIADOR.md).
- Livros publicados, outras edições e conteúdo de outros livros não fazem parte do repositório nem são oferecidos para escolha. Fichas antigas que já usam raças ou subclasses de outros livros continuam abrindo.

## Documentos do projeto

- `AGENTS.md` e `CLAUDE.md`: contexto e regras de trabalho.
- `docs/CHECKLIST.md`, `docs/PENDENCIAS.md`: decisões e pendências.
- `docs/MIGRACAO-REPOSITORIO-PRIVADO.md`: como confirmar que os dados antigos foram preservados antes de arquivar o repositório privado.
- `supabase/LEIA-ME.md`, `supabase/VALIDACAO.md`: banco de dados.
