# Pendências e estado da atualização

Atualizado em 11/11/2026. Este arquivo registra limites conhecidos; não significa que todo o Livro do Jogador já esteja automatizado.

## Entregue neste envio

- Resumo lateral do personagem com espaço reservado no desktop, percepção passiva, perícias com bônus, defesas raciais, ataques, magias e acesso à ficha completa.
- Traços e magias compactos, com descrição por mouse, foco ou toque. Seções vazias são omitidas.
- Fonte única em js/regras.js para traços e descrições raciais, perícias, percepção passiva e bônus de ataques, consumida pela ficha e pelo resumo. Descrições canônicas substituem cópias antigas incompletas.
- Proteção contra abrir ficha vazia por clicar em áreas sem personagem/monstro. O atributo de navegação não usa mais o nome reservado aos botões de abrir ficha.
- Painéis permanecem na navegação da mesma aba, até fechar ou recarregar.
- Iniciativa em branco nos personagens da campanha; seleção do valor ao focar, confirmação ao sair e cancelamento com Esc. Grade da campanha acima de Adicionar Combatente, avatar com inicial e atualização imediata ao remover do combate.
- Criar Ficha acima da consulta de magias e recolhido por padrão. Aba renomeada para Monstros e Magias.
- Administração dentro da conta, botões padronizados, sem campanhas/perfis duplicados nem botão Publicar Catálogo. Dados locais e importação restritos ao administrador.
- Edições de imagens/nomes do catálogo SRD 2014 sincronizadas automaticamente pelo administrador. Criações personalizadas permanecem privadas; exportação manual disponível no bestiário.
- Melhorias de espaçamento e hierarquia no criador, destaque das perícias da Origem, formatação de markdown nas características e descrições mecânicas de Fada.
- Equipamento explicado como uma alternativa por grupo, somando equipamento fixo e da Origem. Bardo possui três grupos; Guerreiro possui quatro.
- Atributos antes de Vida e CA. Ações de editar/excluir separadas das ações de jogo. Dados de vida podem usar rolagem do app, rolagem física ou somente registrar uso; descanso curto tem registro próprio.
- Catálogo ampliado de 12 para 20 subclasses, com resumos próprios, progressão e escolhas adicionais.

## Trabalho funcional ainda pendente

- Completar as demais subclasses do Livro do Jogador 2014. Este envio possui 20, não todas as 40: faltam outros domínios de Clérigo, tradições de Mago, juramentos de Paladino, Arquifada/Corruptor, Mestre das Feras e Caminho dos Quatro Elementos.
- Completar a automação de todas as escolhas/recursos por nível do livro, incluindo talentos, tabelas, contadores específicos de subclasse e efeitos condicionais. Resumos textuais não equivalem à execução automática das regras.
- Magia Selvagem ainda depende da resolução do mestre; a tabela completa não está automatizada.
- Cavaleiro Místico/Trapaceiro Arcano: existem limites de escolas e magias conhecidas, mas falta histórico por nível para validar rigorosamente todas as substituições de magias.
- Expandir defesas do resumo para efeitos temporários e resistências obtidas de itens, magias e escolhas condicionais. Atualmente mostra o campo explícito de resistências e benefícios raciais descritos no catálogo; efeitos não registrados não podem ser inferidos com segurança.
- Centralização adicional: extrair progressivamente as demais regras de CA, PV, recursos e apresentação de magias que ainda tenham cálculo específico na interface. Não declarar que toda duplicação do aplicativo foi removida.
- Duas fichas importadas antigas não tinham foto nos dados de origem. Não há imagem para recuperar automaticamente nesses dois registros; permitir atribuição manual continua sendo necessário.

## Validações ainda necessárias com dados reais

- Conferir a experiência completa de criação e evolução no Android do usuário, incluindo todas as escolhas das oito subclasses adicionais e os descansos com rolagens físicas.
- Conferir o fluxo entre duas contas reais: mestre vincula personagem existente ao jogador; jogador vê apenas seus personagens e acessa Monstros e Magias.
- Conferir em duas contas/dispositivos que uma edição de foto do catálogo 2014 aparece após sincronização e que monstros personalizados não são publicados.
- Conferir painéis simultâneos de monstro, magia e personagem em larguras intermediárias e em aparelho físico. A persistência do resumo entre Iniciativa e Minha Conta e fechamento ao recarregar foram verificados no navegador local.
- Conferir que todos os personagens importados relevantes podem entrar na iniciativa e que não há registros legados classificados incorretamente como personagens de jogador.
- Finalizar conferência do deploy desta atualização no GitHub Actions/Pages depois do envio.

## Fora do aplicativo

- O erro de login do Codex pelo QR code no Android foi relatado, mas não foi solucionado nesta atualização do site.

## Retomada

1. Confirmar SHA e status do Actions/Pages da main.
2. Reproduzir eventual erro na tela e conta exatas, distinguindo aba antiga sem recarga da versão publicada.
3. Consultar js/regras.js antes de adicionar cálculo ou descrição em uma tela. Usar os dados compartilhados em vez de criar outra cópia.
4. Atualizar este arquivo quando uma pendência for resolvida; não marcar tarefas somente por haver botão ou texto implementado.

## Pendências para implementação posterior com Claude

Rodada de usabilidade preparada após `1b19419`, com 91 testes JavaScript aprovados e envio ao GitHub autorizado pelo usuário. A revisão visual local ficou bloqueada pela conexão do navegador ao servidor; conferir a faixa horizontal de navegação e o empilhamento dos painéis em janela dividida na versão atualizada. Não houve mudanças no banco.

### Campanha ativa e contexto

- `js/campanhas-ui.js` reutiliza `ini_campanha`, a preferência local existente da iniciativa. A entrada direta só ocorre após conferir que o ID pertence às campanhas retornadas para a conta. Sem preferência válida, a lista permanece disponível.
- Definir, em etapa estrutural separada, como persistir a última campanha ativa **por usuário e entre dispositivos**. Não interpretar a preferência local atual como contexto sincronizado no servidor.
- Definir o comportamento para campanha excluída, saída do grupo, mudança de papel, troca de conta, múltiplas abas e expiração da sessão. A seleção visual não pode conceder participação ou privilégios.
- Unificar futuramente o contexto entre conta, campanha, criador, ficha e iniciativa. Preservar URLs com IDs explícitos e dar precedência à navegação explícita sobre uma preferência antiga.

### Persistência e sincronização

- Revisar concorrência entre ficha completa, iframe, alterações do combate e outros dispositivos. Os testes atuais cobrem serialização e cenários locais de conciliação de PV; não comprovam todos os casos concorrentes de produção.
- Preservar objetos existentes de fichas, inventário, fotos, documentos e campos legados. Planejar migrações necessárias com validação e recuperação, sem reconstruir personagens.
- A iniciativa atual guarda o combate no navegador. Projetar separadamente qualquer acompanhamento multiusuário/realtime, incluindo ordenação de eventos e conflitos. O refinamento visual não implementa esse compartilhamento.

### Permissões e dados privados

- Validar operações reais com duas contas: mestre e jogador; personagem próprio, personagem de outro jogador, NPC e inimigo. Verificar consultas e gravações diretas, não apenas controles da interface.
- Rever a distinção existente entre administrador e mestre: `campanha.js` pode tratar administrador como mestre para a página; a ficha embutida e `campanha-ini.js` consultam `eh_mestre`. Essa diferença foi preservada nesta rodada, não resolvida por CSS.
- Em qualquer futura visão de combate compartilhada, filtrar PV e outros dados privados **antes de entregar os dados ao jogador**. Ocultar campos no HTML/CSS não atende a esse requisito. Não usar os PV-base públicos do catálogo como se fossem PV atuais de um inimigo.
- Preservar o acesso exclusivo do mestre à área de personagens da campanha na iniciativa, o isolamento de acervos por conta e as políticas RLS existentes até uma revisão explícita.

### Contrato da interface a preservar

- Reutilizar `js/ficha-componentes.js`, `js/ficha-ui.js`, `js/ficha-monstro.js`, `css/fichas.css` e `css/identidade.css`. Manter as seis abas da ficha, as perícias derivadas de `REGRAS.PERICIAS`, as rolagens e o painel real por iframe.
- `js/interface.js` apenas rotula campos e apresenta os estados emitidos pelo salvamento. Não é um novo mecanismo de persistência ou confirmação de gravação.
- `js/paineis-layout.js` decide espaço reservado e o breakpoint comum dos painéis. O conteúdo permanece em renderizadores específicos. Preservar a política sem sobreposição abaixo de 1200 px e a navegação superior em uma única faixa horizontal.
- Os filtros da biblioteca operam somente sobre personagens já carregados e autorizados. Não ampliar a consulta para obter dados que a interface precise esconder depois.
- Não refazer a identidade visual ao trabalhar na lógica. Se algum novo estado funcional exigir apresentação adicional, integrar nos componentes existentes e registrar a dependência.

Antes de iniciar essa etapa, confirmar o commit remoto e os diffs locais, que ainda incluem os envios anteriores feitos por conector. O HEAD local não foi atualizado automaticamente por esses envios. Separar o que já está publicado das alterações locais desta rodada antes de criar commits ou migrations.
