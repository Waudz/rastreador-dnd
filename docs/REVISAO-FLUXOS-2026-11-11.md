# Revisão de campanhas, iniciativa e leitura

Base: `main`, commit `161ea27c9c37e5e87a232bffa7f45f9c984ef9b3`, conferido no remoto e no clone local. A autorização mais recente do usuário permite publicar este envio. Nenhuma migração ou operação no Supabase de produção faz parte dele.

## Causas e correções

| Problema | Causa encontrada | Alteração |
| --- | --- | --- |
| Iniciativa exigia escolher a campanha novamente | A tela exigia o ID na URL, apesar da preferência por usuário já existir | Contexto compartilhado, pertencimento validado com os membros retornados pelo servidor e troca do combate por campanha |
| Começar combate desabilitado depois de marcar fichas | A seleção do grupo e a lista efetiva de combatentes eram estados separados | O início prepara a seleção com as rolagens, verifica a permissão, ordena e salva o turno; iniciativas ainda pendentes continuam bloqueando o início |
| Personagens antigos apareciam depois de trocar campanha | Respostas assíncronas podiam chegar depois da troca | Guardas por campanha e geração da consulta; assinaturas anteriores canceladas |
| Fichas de monstro/magia acompanhavam outras seções | HTML dos painéis era salvo e restaurado do sessionStorage | Removida a restauração de HTML; apenas filtros e posição da seção são guardados |
| Ficha de personagem variava conforme a origem | Campanha navegava para outra página e Iniciativa tinha seu próprio controlador de leitura | Host compartilhado para o mesmo `personagem.html`; mensagem de iframe validada por origem, janela e personagem |
| Magia da ficha usava outro fluxo | A ficha expandia sua própria descrição | Mesmo leitor e `MAGIAS_UI.detalhes` da consulta; iframe permanece vivo ao consultar e voltar; preparar/remover continuam disponíveis na lista |
| Menus tinham fechamento inconsistente | Vários scripts registravam controles semelhantes | Controlador único para clique externo, Esc, ação, outro menu e saída da página |

## Interface

- Botão Campanhas compartilhado: lista, seleção atual, miniaturas quando disponíveis, criar e entrar com código. Na Iniciativa fica antes do título, à esquerda, sem o seletor antigo.
- Três pontos da campanha contêm apenas Editar aparência. Convite, código/cópia e Renovar código ficam em Grupo, mantendo as RPCs existentes.
- Aparência tem cabeçalho simples, Voltar à direita, confirmação de descarte, campos de imagem com nome do arquivo e distinção entre salvar e recarregar. Somente o responsável pelo visual recebe esse controle.
- Cartões usam retrato de 76 px no desktop e 72 px no mobile, checkbox com alvo de 44 px, PV no bloco de informações e barra fina. Grade preenche colunas sem esticar um cartão solitário pela página.
- Cabeçalho B preservado: somente o fundo ocupa a largura da janela; conteúdo limitado a 1120 px e capa com recuo desktop de 28 px. Não houve gravação de enquadramentos existentes.
- Feedback de sucesso temporário compartilhado; erros de gravação continuam visíveis.

## Validação

`node --test tests/*.cjs`: **274 testes aprovados**. Casos novos incluem início pela seleção, ordenação/persistência do turno, mudança de campanha durante preparo, recusa de preparo, preferência revogada, descarte de aparência, fechamento dos menus e ciclo de vida da leitura móvel. A validação dos recursos HTML também verifica existência, unicidade e ordem das dependências.

Navegador local com backend **sintético** e dados fictícios, sem contas ou gravações de produção:

- Troca de campanha sem recarregar; campanha restaurada ao ir à Iniciativa sem ID na URL; criação e entrada pelo seletor.
- Combate iniciado com personagem selecionado e inimigo manual; Próximo e Anterior alternaram os turnos. Troca entre duas campanhas e recarga preservaram os combates separados.
- Ficha aberta pela campanha e pela Iniciativa; magia abriu no leitor compartilhado; Voltar preservou a aba Magias e os controles da ficha. Leitura em tela completa a 375 px, sem navegação inferior ou rodapé duplicado.
- Consulta de Luz e Goblin; painéis fecharam ao trocar seção, enquanto as pesquisas foram restauradas.
- Código de convite copiado e conteúdo conferido na área de transferência. Renovação chegou à confirmação, mas o diálogo bloqueou a automação nessa aba: a conclusão dessa ação pelo navegador **não foi validada**.
- Menu fechado por Esc e clique externo; aparência abriu e voltou ao conteúdo. Remoção de capa e salvamento versionado foram exercitados somente no backend sintético, com mensagem de sucesso.
- Campanha e Iniciativa medidas em 320, 375, 430, 900, 1280 e 1920 px: largura do documento nunca excedeu a largura da janela. Capa com 28 px de recuo em desktop e 16 px no mobile. Capturas desktop/mobile foram inspecionadas durante a sessão.

Sintaxe dos scripts e `git diff --check` também conferidos antes do envio.

## Arquivos principais

- Contexto e combate: `js/campanhas-ui.js`, `js/campanha.js`, `js/campanha-ini.js`, `js/iniciativa.js`.
- Leitura: `js/leitor-fichas.js`, `js/painel-detalhes.js`, `js/leitura-mobile.js`, `js/paineis.js`, `js/personagem.js`, `js/app.js`.
- Interface: `js/menus.js`, `js/menu-ficha.js`, `js/grupo-personagens.js`, `js/campanha-visual.js`, `js/feedback.js`, `css/fluxos.css`.
- Estado da seção: `js/estado-secao.js`, `js/conta.js`, `js/pre-pagina.js`.
- Páginas HTML: dependências compartilhadas e permissão de iframe da própria origem. Service worker atualizado para `rastreador-v87`.
- Testes: `tests/fluxos.test.cjs`, `tests/iniciativa.test.cjs`, `tests/campanha-ini.test.cjs`, `tests/campanhas-ui.test.cjs`, `tests/leitura-mobile.test.cjs` e expectativas anteriores de navegação/convite.

## Limites

Upload/corte de arquivo real, renovação de convite concluída no navegador, duas contas reais, concorrência entre dispositivos, aparelho físico e PWA instalada/offline não foram certificados nesta rodada. O mock não substitui RLS, JWT ou Storage reais. Não houve alteração do esquema, políticas, funções ou arquivos de imagem de produção. A preferência e o combate permanecem locais ao navegador, por campanha/conta conforme o mecanismo existente; acompanhamento de iniciativa pelos jogadores em tempo real continua pendente. Ver `PENDENCIAS.md`.
