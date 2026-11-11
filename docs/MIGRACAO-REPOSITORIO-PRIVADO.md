# Confirmar que os dados antigos foram preservados

O repositório privado de sincronização (`dnd-dados`, com `criacoes.json` e `traducoes.json`) não é mais usado pelo aplicativo: não existe código que o leia, e a política de segurança do site só permite o Supabase. **Não exclua nada antes de seguir este roteiro.** Nada aqui apaga dados.

## Riscos conhecidos

- O site não lê mais o repositório privado, mas o `criacoes.json` dele tem o mesmo formato do backup (`{v, items, deleted}`): dá para restaurá-lo em **Minha conta → Backup e restauração → Restaurar de um arquivo**. A restauração só adiciona o que a conta ainda não tem e ignora as exclusões do arquivo.
- Quando a conta passou a guardar o acervo, o app deixou de ler o IndexedDB antigo `bestiario` e as chaves de `localStorage` sem o id da conta (`ini_tomb`, `ini_tr`). No navegador onde você criava fichas antes, esses dados podem estar esquecidos ali. A tela **Minha conta → Backup e restauração → Procurar dados antigos neste navegador** lê esse banco (sem apagar nada) e restaura só o que a conta ainda não tem.
- O texto do Livro do Jogador (`traducoes.json`, campo `ldj`) **não deve ser migrado**: é material com direitos autorais. O site não o usa mais.

## Passo a passo

1. **Cópia offline.** No GitHub, baixe um ZIP do repositório privado (Code, Download ZIP). Guarde fora do computador de trabalho.
2. **Lista do que existia.** Abra `criacoes.json` e anote as chaves de `items` (ex.: `custom_xxxxx`) e quantas são.
2b. **Restaurar o que faltar.** Baixe o `criacoes.json` do repositório privado e use "Restaurar de um arquivo" na tela de backup. Ela mostra quantas criações são novas, quantas já existem e quantas diferem, e só grava depois de você confirmar.
3. **Lista do que está na conta.** Entre no site com a conta usada, abra Monstros e use "Exportar Minhas Criações". Compare as chaves do arquivo exportado com as do passo 2. Também dá para consultar no SQL Editor do Supabase, sem alterar nada:
   `select jsonb_object_keys(dados->'items') from public.acervos;` (como administrador do projeto).
4. **Perfil limpo.** Abra o site em uma janela anônima ou outro navegador, entre e confira se as criações e as fotos aparecem.
5. **Navegador antigo.** No navegador onde você criava fichas antes, abra as ferramentas do desenvolvedor, Application, IndexedDB, `bestiario`, e veja se há fichas (`mon`) que não estão na conta. Se houver, exporte-as antes de limpar qualquer dado do navegador.
6. **Tradução de monstros.** Confira em `traducoes.json` o campo `tr`. Os nomes traduzidos do SRD já estão em `dados/srd-pt.json`; só traduções suas fora do SRD precisam ser conferidas.
7. **Arquivar, não excluir.** Se tudo bateu, em Settings do repositório use "Archive this repository" (somente leitura). Mantenha por um tempo (por exemplo 30 dias).
8. **Revogar o token** de sincronização depois do arquivamento, em Settings, Developer settings, Personal access tokens.
9. **Excluir** só depois desse período, com a cópia offline do passo 1 guardada.

## O que pode ser perdido se algo for pulado

Criações que nunca chegaram à conta, fotos delas, traduções suas fora do SRD e o histórico de exclusões. As fichas de personagem e as campanhas não dependem do repositório: estão no Supabase.
