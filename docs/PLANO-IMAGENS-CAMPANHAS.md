# Símbolo e backdrop — plano de integração para aprovação

Estado desta entrega: somente layout e prévia temporária. Nenhuma imagem é enviada, nenhuma configuração do Supabase foi alterada e nenhuma migração foi executada. A prévia se perde ao sair/recarregar a página; não é sincronização.

## Implementado na etapa visual

- Símbolo circular de 68 px no computador e 52 px no celular; livro como alternativa.
- Backdrop independente, com altura moderada, gradiente até `--bg` e enquadramento separado para computador e celular.
- Sem backdrop, não há faixa de imagem nem altura reservada.
- Menu Mais opções → Prévia da aparência, somente no papel de mestre da campanha.
- PNG/JPEG/WebP até 8 MB; preparação local em canvas com limite de 256 px para o símbolo e 1600 px para o fundo. SVG não é aceito. Nenhuma imagem é gravada no localStorage, na ficha ou no banco.

## Estrutura atual confirmada

`campanha.js` consulta campanhas/membros e usa as políticas existentes. Convites são obtidos por `codigo_da_campanha`, exclusiva do mestre. `js/nuvem.js` já oferece envio, URL assinada e exclusão no bucket privado `documentos`; as políticas desse bucket dependem dos registros de documentos. Ele não deve ser reaproveitado por meio de documentos fictícios de aparência.

## Proposta de dados

Preparar uma migração aditiva, após aprovação, com tabela `public.campanha_visual`:

| Campo | Regra proposta |
| --- | --- |
| campanha_id | UUID, chave primária, referência a campanhas, exclusão em cascata |
| simbolo_path | Texto opcional; somente caminho da própria campanha |
| backdrop_path | Texto opcional; somente caminho da própria campanha |
| backdrop_y / backdrop_y_mobile | Inteiros 0–100, padrão 50 |
| versao / atualizado_em | Controle de concorrência e atualização |

Campanhas antigas sem registro continuam com o tema atual. Nenhuma imagem/base64 entra no banco; somente caminhos e enquadramento. Não alterar a tabela de personagens, chaves de iniciativa, códigos de convite ou autenticação.

## Storage e permissões propostas

- Novo bucket privado `campanhas-visuais`, limite de arquivo de 2 MB após otimização, MIME PNG/JPEG/WebP.
- Caminhos únicos: `<campanha_id>/simbolo/<uuid>.png` e `<campanha_id>/backdrop/<uuid>.jpg`.
- RLS na tabela: leitura para `eh_membro(campanha_id)`; inserção/edição/exclusão para `eh_mestre(campanha_id)`; nenhum acesso anônimo.
- Políticas do Storage: envio/exclusão somente pelo mestre da campanha identificada pelo primeiro segmento validado como UUID; leitura para participantes, limitada aos objetos referenciados pela aparência da campanha. Sem bucket público ou service_role no navegador.
- Validar no servidor que caminhos e campos pertencem à campanha; não aceitar caminhos de outra campanha nem usar papel enviado pelo navegador como autorização.
- A gravação da referência deve ser atômica e validar versão: uma segunda aba não pode sobrescrever silenciosamente alterações recentes.

## Fluxo proposto

1. Mestre escolhe arquivos e enquadramento; continua vendo uma prévia antes de salvar.
2. Preparar as imagens e validar tamanho/tipo; enviar para nomes únicos no bucket.
3. Salvar os caminhos e posições com conferência de versão e permissão no servidor.
4. Se a atualização falhar, preservar a referência anterior e remover apenas o novo upload órfão quando possível.
5. Depois de confirmar a nova referência, limpar imagens antigas que não estejam mais referenciadas. Remoção limpa a referência primeiro; falha de limpeza não remove a imagem vigente.
6. Participantes carregam URLs assinadas de curta duração pelo cliente autenticado; renovação antes de expirar. A lista de campanhas usa o mesmo símbolo com cache em memória por conta, sem persistir URLs assinadas no service worker.
7. Atualizações periódicas/realtime da aparência trocam somente as imagens, sem redesenhar cards, fechar menus ou perder a seleção de personagens.
8. Encerrar a sessão/trocar de conta descarta imagens e cache em memória. Offline: manter a página utilizável e informar falha de envio; não alegar que salvou.

## Migração e validação antes da ativação

A próxima etapa deve entregar o SQL revisável e testes de banco/Storage em ambiente de teste: mestre da campanha A, jogador A, usuário da campanha B e visitante. Cobrir leitura, envio, substituição, remoção, caminhos cruzados, falta de sessão, conflito entre abas e falhas parciais. Rodar verificações de segurança e reaplicação da migração antes de pedir autorização para o ambiente remoto.

A interface atual não depende dessa migração: continuará mostrando fundo escuro e símbolo padrão até ativarmos o salvamento.

Não houve push, deploy, escrita no Supabase ou envio de imagens nesta entrega.

Referência técnica: [Controle de acesso do Storage](https://supabase.com/docs/guides/storage/security/access-control).


## Arquivos desta entrega e validação

- Campanhas: campanha.html, js/campanha.js, js/campanhas-ui.js.
- Seleção na Iniciativa: iniciativa.html e js/campanha-ini.js.
- Componentes compactos compartilhados: js/grupo-personagens.js e css/grupo-personagens.css.
- Prévia das imagens: js/campanha-visual.js e css/campanha-visual.css.
- Apoio: js/conta.js (reutiliza ingresso por código), js/icones.js e sw.js (cache v82).
- Testes: tests/campanha-compacta.test.cjs, tests/grupo-personagens.test.cjs, tests/campanha-ini.test.cjs, tests/campanhas-ui.test.cjs e tests/pwa.test.cjs.

Validação: 242 testes aprovados com `node --test tests/*.cjs`; diff sem erros de whitespace. Os testes novos cobrem seleção, IDs indisponíveis, duplicação, preservação dos combatentes anteriores, revogação de permissão, PV temporários/limite de cura, mestre/jogador, imagens opcionais e formatos/tamanhos.

Pendente: conferir visualmente 320/375/390/430 px, tablet, desktop e PWA instalada; menus por toque/teclado, enquadramento com fotos reais e captura de telas. O navegador automatizado local não pôde ser capturado (janela minimizada); não houve aprovação visual nem capturas nesta rodada. Os fluxos remotos de convite/ingresso devem ser conferidos com as contas de teste; testes locais usam doubles, sem escrita no servidor real.
