# Acompanhamento dos ajustes

As correções da interface estão publicadas na main. A migração 02 foi aplicada no Supabase real e o acervo foi importado para a conta de destino; a sincronização por conta foi ativada. Este documento separa implementação, testes e tarefas de produção.

| Pedido | Preparado no código | Verificação |
|---|---|---|
| Centralizar e recortar foto no app | Controle compartilhado com toque, zoom e Centralizar | Prévia móvel: arrastar, centralizar e salvar JPEG |
| Atributos e habilidades por raça/classe/nível | Bônus raciais, melhorias de nível e habilidades do catálogo SRD 2014 | Testes de todas as classes do catálogo nos níveis 1–20; escolhas do jogador permanecem explícitas |
| Perícias sem somar proficiências repetidas | Fontes de raça, classe e multiclasse separadas; especialização com limite | Testes de duplicação, nível e bardo |
| Ataque em branco para Personalizado | Rótulo e valor inicial alterados | Prévia e análise do código |
| Limpar arma selecionada | Retorna à opção vazia após adicionar; opção vazia disponível antes disso | Prévia |
| Listas de magia/habilidade sem digitar | Lista ao focar, ordenada por nível e nome | Prévia com catálogo vazio de consulta |
| Multiclasse só ao clicar | Primeira classe isolada; linha vazia não dá nível nem proficiência | Teste automático e prévia; classes duplicadas e total acima de 20 bloqueados na edição |
| Perícias raciais e descrição dos ganhos | Proficiências fixas e escolhas raciais; características na seção Habilidades | Testes de raça e prévia do meio-elfo |
| Transferir personagens existentes aos jogadores | Seletor de responsável pelo mestre | PostgreSQL: transferência e preservação da foto; jogador não troca dono |
| Remover Classe anterior | Texto retirado | Análise do HTML gerado |
| Moedas uniformes e botões de ajuste | Inteiros não negativos, total com duas casas; campo vazio soma/subtrai 1 | Prévia |
| CA automática, maior e com descrição curta | CA automática por padrão para personagens, fórmula de defesa sem armadura | Prévia; revisão de fórmulas |
| Não conjuradores sem espaços de magia | Texto padrão; fonte adicional por raça/talento/item pode ser ativada e desativada | Testes dos níveis mínimos de conjuração |
| Login como entrada | Página inicial mostra login ou campanhas da sessão | Testes sem sessão, sessão existente e saída |
| Pesquisas acessíveis a jogadores | Links de consulta na conta e na campanha; botão Usar na iniciativa para o mestre | Testes da navegação e revisão dos links |
| Fotos de personagens importados | Lê campo photo e armazenamento de fotos; recuperação automática de fotos ausentes preserva edições recentes | Testes de conversão, conflitos e transferência no banco |
| Mestre não vê fichas preparadas como Meus personagens | Lista principal inclui apenas personagens de campanhas onde atua como jogador | Teste de papéis e NPCs |
| D&D 2024 desabilitado | Não carrega o pacote; filtra monstros, magias, habilidades e fontes já baixados | Testes da edição; dados pessoais mantidos |
| Trocar token GitHub por acervo da conta | Acervo privado, importação validada, sincronização e separação por usuário | PostgreSQL: RLS, exclusões e duas gravações concorrentes; testes de troca de conta e falha remota |

## Migração de produção

A estrutura privada de acervos foi criada no projeto real. Foram importadas 8 criações, 6 fotos e 361 magias pessoais, preservando os 8 personagens existentes. Antes da migração foi salva uma cópia das fichas.

A leitura foi verificada com a identidade da conta de destino, com uma identidade diferente e com as permissões anônimas. A configuração do site ativa a sincronização por conta. O token legado só é removido do navegador depois de uma sincronização bem-sucedida.

Os personagens existentes estão sem jogador atribuído. Quando os jogadores criarem suas contas e entrarem na campanha, o mestre escolhe o responsável pelo personagem existente. Não é necessário recriar as fichas.

Ainda falta conferir o funcionamento nas sessões e aparelhos reais após recarregar a atualização; duas criações não tinham foto no backup original.

## Cobertura das regras

A edição ativa é 2014. A automação usa as habilidades disponíveis no catálogo SRD 2014 do repositório. Isso não significa cobertura de todas as subclasses, talentos ou raças de todos os suplementos. Atributos iniciais, talentos, perícias escolhidas e melhorias são decisões do jogador, com os bônus derivados calculados pela ficha.

O relatório cobertura-2014.json identifica quais subclasses e classes estão representadas no catálogo. Completar as ausências exige dados revisados ou importação privada de material do usuário, sem publicar esses textos no repositório público.

Fontes das regras: https://www.dndbeyond.com/sources/dnd/basic-rules-2014/classes e https://www.dndbeyond.com/sources/dnd/basic-rules-2014/races.

## Refinamento das fichas — 11/11/2026

Esta seção registra a rodada posterior ao commit `c6c7f1d`, preservando as pendências anteriores. Os arquivos locais também contêm a reformulação anterior, enviada ao GitHub por conector; o HEAD local ainda aponta para sua base anterior. Conferir o estado remoto antes de qualquer publicação futura.

| Ajuste | Implementação | Verificação desta rodada |
|---|---|---|
| Componentes comuns | `js/ficha-componentes.js`: estatísticas com ícones, atributos, cabeçalho, vida-base e indicadores de espaços | Testes de renderização, escape de texto e imutabilidade dos dados |
| Design compacto | `css/fichas.css`: cabeçalho menor, três indicadores, vida em faixa, ações e abas compactas, atributos clicáveis | Revisão do CSS; conferência visual pendente |
| CSS conflitante | Estilos de ficha retirados de `identidade.css` e centralizados em `fichas.css`; estilos gerais preservados | Revisão de dependências e carregamento em todas as páginas principais |
| Grade pela largura do componente | Container queries em `#ficha` e `.ficha-criatura`, com seis/três colunas | Implementação revisada; checagem em navegador pendente |
| Visão geral | Salvaguardas roláveis, perícias em linhas, escolhas recolhíveis, inspiração, proficiências expansíveis | Testes existentes de regras preservados; nova gravação usa o mesmo JSON da ficha |
| Combate | Evolução movida para Personagem; defesa e ataques priorizados; configurações de armas expansíveis; consulta aos recursos cadastrados | Teste do HTML das seções e persistência |
| Magias | Espaços com indicadores; agrupamento por círculo; filtros de círculo/escola/concentração/ritual; estado vazio orientado à busca | Testes de consumo/recuperação de espaço e preservação de preparação e diário |
| Inventário e notas | Moedas em cartões, espaçamentos comuns, diário com leitura e escrita mais confortáveis | Modelo, quantidades, pesos e notas existentes preservados |
| Monstros e NPCs do acervo | `openSheet()` passa os dados reais e descrições existentes ao adaptador `ficha-monstro.js`; tabela substituída por cartões, abas e seções expansíveis | Testes do adaptador e análise sintática do aplicativo; integração visual pendente |
| Painéis laterais | Largura de 440 px, cabeçalho consistente, rolagem interna e posicionamento comum; abrir personagem fecha monstro e vice-versa | Código revisado; testes de preservação da iniciativa continuam passando |
| Vida do catálogo | O renderizador de monstro mostra PV-base identificados e não lê instâncias privadas do combate | Teste de ausência de acesso a estado de combate e preservação do objeto original |
| Offline | Cache v57 inclui componentes, adaptador de monstro e CSS compartilhado | Referências revisadas |

### Validação e limites

- Suíte JavaScript local: **81 testes aprovados**, incluindo os testes de regras existentes. O workflow inclui os novos testes. O envio desta rodada foi autorizado pelo usuário; consultar o resultado do workflow para a validação remota.
- Sem mudança de schema, migração, credenciais ou dados de produção. Os controles de mestre e as consultas autorizadas da ficha embutida foram preservados; os testes locais usam objetos simulados.
- O navegador integrado não alcançou `http://127.0.0.1:8766`, mesmo após tentativa de iniciar o servidor local fora do isolamento. A alternativa `file://` foi rejeitada pela política de URL. Não foi possível obter capturas das alterações locais.
- Permanecem pendentes: comparação visual em desktop/celular, todas as abas, painéis reais de personagem/monstro/NPC, múltiplos combatentes, formulários, persistência após recarregar e sessão real de mestre/jogador. Os testes automáticos não substituem essas verificações.
- A iniciativa existente mantém o combate neste navegador. Esta rodada não cria uma transmissão de combate entre contas. Validar qualquer futura visão compartilhada e ocultação de PV no servidor antes de disponibilizá-la a jogadores.
- Recursos de classe são consultados a partir das características já cadastradas; condições e durações permanecem no controle de cada combatente. Não foi acrescentado um novo motor de recursos ou regras.
- Magias antigas mantêm seus dados. Metadados ausentes de concentração/ritual não são inferidos como se estivessem cadastrados; novas adições preservam esses indicadores quando presentes no catálogo. Inventário mantém o modelo atual, sem classificar itens mágicos/consumíveis automaticamente.

Próxima etapa: executar a revisão visual acima em um navegador com acesso ao site atualizado e registrar o resultado. A autorização de envio ao GitHub não substitui essa verificação visual.

## Rodada incremental de usabilidade — 11/11/2026 (local)

Base funcional: refinamento enviado no commit `1b19419`. Esta rodada foi organizada em etapas; o envio ao GitHub foi autorizado pelo usuário após a implementação.

| Etapa | Alterações implementadas | Verificação |
|---|---|---|
| 1. Perícias e painel | Sigla do atributo lida do terceiro elemento de `REGRAS.PERICIAS`; linhas alinhadas, indicadores acessíveis de proficiência/especialização; edição por Editar Personagem; densidade menor no iframe | Testes de renderização, abas, salvamento e integração com iniciativa passaram antes da etapa seguinte |
| 2. Campanhas | Cabeçalho com nome e seletor; links funcionais de criar/entrar/listar; gerenciamento do grupo usa a aba já existente; preferência local `ini_campanha` é validada contra campanhas carregadas da conta antes da abertura direta | Testes de preferência inválida, campanhas autorizadas e exceções de navegação; testes de conta/navegação passaram |
| 3. Biblioteca | Retratos e metadados de raça/classe/nível/campanha, cartões com acesso à ficha, busca por nome sem acentos e filtros de classe/nível sobre os dados carregados, contagem e ação de primeiro personagem | Testes garantem ausência de novas consultas ao filtrar e manutenção da separação jogador/mestre/NPC |
| 4. Iniciativa | Turno atual identificado por texto e `aria-current`, borda discreta, números mais legíveis e controles com melhores alvos de toque | Testes de iniciativa em branco/zero/negativa, edição, persistência e atualização sem roubar foco passaram |
| 5. Acabamento comum | Navegação responsiva com seção atual, formulários e botões, rótulos para campos com placeholder sem nome acessível, indicadores derivados dos estados reais de salvamento, mensagens de carregamento/erro | Testes de rótulos, preservação de valores e estados Salvando/Erro/Salvo |
| 6. Responsividade | Navegação em faixa única com rolagem horizontal em todas as larguras; filtros e cabeçalho de campanha adaptativos; controles de toque; painéis de personagem/monstro com política compartilhada de espaço | Contratos CSS e política de layout testados; revisão visual em aparelhos permanece pendente |

Validação final: **91 testes JavaScript aprovados** com `node --test tests/*.test.cjs`; análise sintática incluída nos testes existentes. Os novos testes foram adicionados ao workflow. Não houve alteração de regras de D&D, Supabase, autenticação, RLS, migrations ou contratos de salvamento/sincronização.

### Limite da revisão visual desta rodada

O navegador integrado não alcançou a prévia HTTP local, inclusive com o servidor mantido na sessão Node. Não foram produzidas capturas “depois” desta rodada, e os testes automatizados não equivalem à revisão visual. Conferir antes da aprovação da interface: desktop/celular, biblioteca, estados sem campanhas, seletor com múltiplas campanhas, formulários e modais, seis abas, painel de 440 px, convivência com a iniciativa e navegação por teclado. Nenhuma conclusão sobre sessões de produção foi inferida dos objetos simulados dos testes.

### Pendências para implementação posterior com Claude

As pendências estruturais estão detalhadas em `docs/PENDENCIAS.md`, na seção de mesmo nome. A abertura direta implementada depende de uma preferência **neste aparelho**, já usada pelo rastreador; não existe nesta rodada persistência de campanha ativa entre dispositivos. Sem preferência válida, a interface lista as campanhas para escolha. As alterações visuais devem ser preservadas na próxima etapa.

### Correções obrigatórias incorporadas à rodada

**Navegação superior:** removidas a grade móvel, a quebra de linha e as bases flexíveis antigas. `.appnav` usa `flex-flow: row nowrap`, largura limitada ao pai, `overflow-x: auto`, scrollbar oculta e rolagem suave, respeitando movimento reduzido. Links não encolhem, não quebram texto e mantêm fonte de 13 px e altura mínima de 44 px. Não houve alteração nos links ou na indicação da página atual. O CSS é comum ao navegador e à PWA; nenhuma regra de `display-mode` muda esse comportamento.

**Painéis:** há um único painel de detalhes, `#dock-r`, com três vistas exclusivas: `#ci-resumo` (ficha do personagem da campanha, em iframe), `#sheet` (ficha de bestiário) e `#spd` (magia ou habilidade). `js/painel-detalhes.js` (`window.PAINEL`) controla qual vista aparece: abrir uma magia por cima de uma ficha esconde a ficha sem destruí-la (iframe, campos não salvos e rolagem continuam), mostra "Voltar" e restaura a rolagem; "Fechar" fecha o painel inteiro e Esc volta ou fecha. A ficha embutida pede a magia ao rastreador por `postMessage` (`ficha-magia`). `js/paineis-layout.js` mede e reserva espaço: em 1200 px ou mais reserva 440 px à direita; abaixo disso o painel fica empilhado abaixo do conteúdo e a tela rola até ele ao abrir.

| Verificação solicitada | Evidência disponível | Ainda necessário |
|---|---|---|
| Nav em 320, 375, 390, 430 px e desktop | Teste estático garante uma única regra comum, sem grid móvel/quebra; links não encolhem; folhas comuns nas páginas principais | Renderização real em cada largura, deslizar até o último item, tabulação, largura do documento e modo PWA instalado |
| Painel em desktop, metade da tela, tablet e celular | Testes da política em 320, 375, 390, 430, 768, 960, 1199, 1200, 1366 e 1920 px; personagem e monstro recebem reservas iguais | Comparação visual real dos painéis, controles de NPCs e rolagens internas |
| Redimensionar gradualmente | Teste da transição de reserva lateral para empilhada e retorno; reserva removida ao fechar | Arrastar a janela continuamente em navegador e conferir foco/scroll |

Esses testes não utilizam um motor de renderização. Não equivalem à confirmação visual dos tamanhos acima, que não foi possível realizar na prévia local. Após o envio autorizado, conferir o resultado de Actions/Pages e executar a revisão visual na versão atualizada.

### Verificação após envio autorizado

O envio `b3f1b51` passou em Actions/Pages. Foi possível acessar a versão publicada pelo navegador integrado. Na entrada do aplicativo, medições DOM em viewports de 320, 375, 390, 430 e 1366 px confirmaram uma linha de navegação, fonte de 13 px, botões de 44 px e ausência de overflow horizontal do documento. A rolagem horizontal em 320 px tornou o último link acessível.

No painel real de Goblin, medições durante redimensionamento entre 1920 e 320 px confirmaram posição fixa com espaço reservado nas larguras a partir de 1200 px e posição relativa abaixo disso, com rolagem interna `auto`. Em 320 px foi identificado um pequeno overflow na faixa de ações do resultado do bestiário, independente da navegação. A correção permite que esses botões quebrem dentro do cartão (a navegação superior continua em uma única linha). O cache seguinte foi incrementado para v59.

Esta verificação não equivale a teste em PWA instalado ou sessão autenticada de mestre/jogador. Permanecem pendentes os fluxos reais de campanha/biblioteca, o painel de personagem com permissões e comparação em dispositivo físico.

## Campanha ativa e navegação

- **Ordem do menu:** Campanhas → Iniciativa → Personagens → Monstros → Magias → Minha conta. `?aba=consulta` (endereço antigo de "Monstros e Magias") abre Monstros.
- **Campanha ativa:** fica no `localStorage` deste aparelho em `ini_campanha:<id do usuário>` (a chave antiga `ini_campanha` continua sendo escrita e lida como reserva). A preferência só vale se o usuário ainda for membro da campanha; nunca concede acesso.
- **Ao abrir o aplicativo:** `conta.html`/`index.html` abrem direto a campanha ativa (`campanhas-ui.js › entrada`). Sem preferência nenhuma e com uma única campanha, ela abre direto. Com várias campanhas e sem preferência, ou com preferência inacessível, aparece a lista (criar/entrar continuam disponíveis). `?gerenciar=1`, `?aba=conta` e `?aba=personagens` nunca redirecionam.
- **Campanha inacessível:** `campanha.html` esquece a preferência e mostra "Escolher outra campanha".
- **Combate por campanha:** cada campanha guarda o seu combate em `dnd5e_initiative_tracker_v1:<id da campanha>`. Trocar a campanha na iniciativa salva o combate atual e carrega o da nova (`__ini.trocarContexto`). Sem campanha ou sem login, o rastreador avulso usa a chave antiga. Na primeira vez em uma campanha, entram os combatentes do estado antigo que são dela ou não têm campanha; os de outras campanhas ficam na chave antiga.
- **Personagens:** a biblioteca começa filtrada pela campanha ativa; "Todas as campanhas" mostra tudo.

### Não implementado (precisa de decisão ou de mudança no banco)

- A "última campanha" é por aparelho. Para lembrá-la entre aparelhos seria preciso uma coluna no perfil (por exemplo `perfis.ultima_campanha`) com política de acesso própria, e rodar um SQL no Supabase. Não foi feito.
- O menu não mostra o nome da campanha ativa; o seletor está na página da campanha.
- Combates e encontros só existem no navegador (como antes); não há tabela de encontros no banco.

## Cabeçalho, ficha lateral e retratos

- **Cabeçalho (`js/navegacao.js`, `css/identidade.css`):** fixo (sticky). Primeira linha: marca, espaço reservado para o futuro sino e avatar circular da conta (`conta.html?aba=conta`, ícone padrão). Segunda linha: Campanhas, Iniciativa, Personagens, Monstros, Magias, em grade de 5 colunas com ícone sobre a legenda no celular e nomes completos em linha a partir de 760 px. Sem rolagem horizontal. A altura fica em `--cab-h` para rolagens e painéis; o espaçamento acompanha `--pad-corpo`.
- **Ficha:** "Ficha completa" (só na ficha embutida na iniciativa) e "Editar Personagem" ficam no topo, ao lado do indicador "Salvo", acima da foto. O botão do painel da iniciativa foi removido para não duplicar.
- **Retratos:** todos usam `.av` (quadrado, cantos de 10 px, `object-fit: cover`); sem foto aparece a inicial. O avatar da conta (`.appavatar`) é a única exceção circular.
- **Iniciativa:** iniciativa pendente aparece como campo tracejado com "d20" e "iniciativa pendente" no cartão; nenhum valor é sorteado automaticamente. Efeitos ficam numa área própria (`.fxbar`) abaixo do nome, sem selo sobre a foto. Em telas estreitas as estatísticas descem para uma linha abaixo do nome.
