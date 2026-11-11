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
