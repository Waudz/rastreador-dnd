# Acompanhamento dos ajustes

As correções da interface usam o banco atual. A migração do acervo por conta permanece separada e desativada até o SQL 02 ser aplicado. Este documento separa implementação, testes e tarefas de produção.

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

## Ainda depende de produção

1. Aplicar a migração 02 no projeto Supabase real.
2. Habilitar NUVEM_CONFIG.acervoPorConta e publicar a ativação após a migração.
3. Entrar na conta de destino e importar o backup privado.
4. Recuperar as fotos das fichas já importadas e atribuir os responsáveis quando os jogadores entrarem na campanha.
5. Conferir login, sessões, fotos e edição em aparelhos reais após a publicação.

## Cobertura das regras

A edição ativa é 2014. A automação usa as habilidades disponíveis no catálogo SRD 2014 do repositório. Isso não significa cobertura de todas as subclasses, talentos ou raças de todos os suplementos. Atributos iniciais, talentos, perícias escolhidas e melhorias são decisões do jogador, com os bônus derivados calculados pela ficha.

O relatório cobertura-2014.json identifica quais subclasses e classes estão representadas no catálogo. Completar as ausências exige dados revisados ou importação privada de material do usuário, sem publicar esses textos no repositório público.

Fontes das regras: https://www.dndbeyond.com/sources/dnd/basic-rules-2014/classes e https://www.dndbeyond.com/sources/dnd/basic-rules-2014/races.
