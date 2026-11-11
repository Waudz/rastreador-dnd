# Integração de imagens e ajustes mobile — 11/11/2026

Estado: implementação local completa, sem push/deploy e sem aplicação da migração de produção. O backend remoto continua inalterado; o novo upload só ficará ativo após autorização e aplicação do SQL.

## Implementação

- js/campanha-imagens.js: serviço único de upload e persistência. Arquivos privados, UUID novo por substituição, salvamento versionado por RPC e assinatura de URLs por conta. Não apaga imagem anterior em falha de upload/RPC ou resultado incerto; limpeza só após confirmação e preparação das novas URLs. Falha de limpeza é informada, preservando a gravação confirmada.
- js/campanha-visual.js: Salvar/Cancelar, upload otimizado, remoção independente, enquadramento computador/celular, atualização periódica sem perder edição local e descarte do estado ao detectar troca de conta.
- js/nuvem.js: opção de bucket nos métodos existentes, padrão documentos preservado.
- campanha.html, conta.html e index.html carregam o serviço; js/campanha.js usa o responsável real (mestre_id + membro mestre), sem herdar exceção de administrador; js/campanhas-ui.js e js/conta.js carregam o símbolo nas listas.
- css/identidade.css: somente no mobile, mais 16 px entre marca e navegação; perfil de 38 px com alvo ampliado para toque. Desktop preservado.
- personagem.html, js/menu-ficha.js e css/fichas.css: exclusão em menu de três pontos ao lado de Editar; fechamento fora/Escape. Confirmação e permissões da exclusão preservadas em js/personagem.js.
- sw.js: cache v83 preparado, novos scripts no precache; imagens privadas seguem fora do cache do service worker.

## Validação executada

SQL em PostgreSQL descartável PGlite (WebAssembly), sem conectar nem gravar no projeto remoto. Aplicados fixture, schema 01, 02, 03 e migração nova duas vezes. Pgcrypto não é distribuído nessa execução; foi omitido somente CREATE EXTENSION pgcrypto, usando gen_random_uuid nativo. RLS, roles, PL/pgSQL, auth.uid simulado e grants executaram no PostgreSQL, não em mocks JavaScript.

Aprovados: tests/imagens-campanhas-permissoes.test.sql e regressões tests/supabase.test.sql, tests/supabase-permissoes.test.sql e tests/admin.test.sql. Cobertura: responsável, jogador, outro mestre, visitante, administrador não responsável, versão antiga, caminhos cruzados, arquivo em uso e remoção após desreferenciar. A fixture ganhou metadata jsonb para corresponder ao Storage remoto. O CI foi preparado para repetir migração/testes num PostgreSQL descartável convencional.

JavaScript: executar node --test tests/*.cjs. Inclui testes novos de falha de upload, RPC incerta, preservação de backdrop ao remover símbolo, falha de limpeza, formato/tamanho, cache por conta e troca de conta durante gravação. Resultado final registrado na resposta desta entrega.

## Limites e autorização pendente

Os testes SQL validam roles e políticas, mas não substituem upload HTTP real, limites do serviço Storage nem sessões reais de mestre/jogador em dois dispositivos. Esses testes finais dependem de ativar a migração num ambiente Supabase autorizado. Nenhum usuário real foi criado ou alterado.

A verificação visual em 320/375/430 px e desktop depende do navegador local disponível. Não confundir CSS/testes de fonte com aprovação visual. Não foi feito push, deploy ou migração remota nesta etapa.

Próximo passo: obter autorização final do William para aplicar supabase/migrations/20261111194808_imagens_campanhas.sql no projeto pdjzahpxjrlbqqtzkfdr e então conferir mestre/jogador pela API real. Publicação do aplicativo continuará exigindo autorização separada.
