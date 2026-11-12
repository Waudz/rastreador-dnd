# Pendências e próxima tarefa

Atualizado em 12/11/2026. Decisões permanentes: `docs/DECISOES.md`. Histórico antigo: `docs/HISTORICO.md` (não ler por rotina).

## Estado atual
- Remoto `origin/main` em `32dd13d` (cache v91). Commits locais não publicados: `aca3f57`, `603be7f`, `5889cbc`, `8d670da`, `10829ee`, `daa9f1e`, `0618597` e o da fase 4 parcial (cache `rastreador-v99`). **Nada publicado nem validado no Supabase real ou no Android.**
- Fase 1 (ficha como interface de jogo): concluída localmente. Fase 2 (magias): **base entregue, mas o sistema de magias NÃO está integralmente concluído** (ver pendências obrigatórias). Fase 3 (inventário): base entregue localmente.
- Fase 3 entregou: `js/inventario.js` (itens com `uid`, `ref`, origem, propriedades, `magiaVinculada`; contêiner `{dono, itens, movimentos}`; adicionar, retirar, consumir, transferir, sintonia máx. 3, cargas; histórico em `ficha.movimentos`, máx. 200); `js/itens-efeitos.js` (uso atômico de consumíveis e itens com efeitos: cura com rolagem no app ou resultado manual, PV temporários que não se acumulam, modificador, atributo, condição, resistência, manual, passivos de item equipado/sintonizado, cargas; efeitos ativos com duração e fim em descanso curto/longo; amostras SRD: 4 poções de cura, Heroísmo, Resistência, Invisibilidade, Antitoxina, Anel de Proteção, Varinha de Mísseis Mágicos); pergaminhos reais no inventário, copiados para o grimório consumindo o item; editor de efeitos do item para o mestre; concessão do mestre com forma escolhida (conhecida, grimório, sempre preparada, uso limitado com recarga, outra); troca de magia só entre magias da classe (sem raciais, talentos ou subclasses). Detalhes em `docs/MODELO-PERSONAGEM.md`.
- Testes: suíte completa passando; a interface foi testada com DOM simulado, **não no navegador com Supabase real nem no Android**.

## Pendências obrigatórias do sistema de magias
Resolvidas (com testes em `tests/magias-classes.test.cjs`):
- **Paladino:** `dados/magias.json` agora traz Paladino nas 31 magias SRD da lista (1º a 5º círculo; sem truques). As magias de Paladino que não são SRD (marcas/smites, auras, Duelo Compelido, Manto do Cruzado etc.) não estão no catálogo e não devem ser copiadas para o repositório.
- **Arcanum Místico do Bruxo:** grupos de escolha de 6º, 7º, 8º e 9º círculo nos níveis 11, 13, 15 e 17 (`gruposMagias`, chave `magias|Warlock|arcanumN`); entradas na ficha com `arcanum`, `fonte:"classe"`, sempre ativas, fora dos espaços de Pacto e da troca por nível; registradas na progressão. **Falta a tela da ficha** para "conjurar (gasta o uso)": o motor já tem `JOGO.usarArcanum` e `ficha.arcanumUsado` (recarga no descanso longo).
- **Conjuração multiclasse:** revisada e testada contra a tabela do Livro do Jogador (níveis de conjurador, metade e um terço, classe única usa a própria tabela, Pacto separado, preparação e círculo máximo por classe). Nenhum erro encontrado no cálculo. Limites: Cavaleiro Místico/Trapaceiro Arcano sem as restrições de escola; sem tela para converter/gastar espaços de Pacto em magias de outras classes (o jogador escolhe o espaço manualmente).
Ainda abertas: reduzir nível pela interface (magias/características inativas) e auditoria das listas de classe do catálogo (ex.: Comando aparece também para Bruxo, o que não confere com o Livro do Jogador).

## Fase 4 (mecânicas de jogo): em andamento, motor pronto e SEM interface
Entregue no motor (testado em `tests/jogo.test.cjs`, mas **ainda não carregado por nenhuma página**: `js/jogo.js` e `js/recursos.js` não estão em `personagem.html`, `sw.js` nem no harness `tests/personagem-save.test.cjs`):
- `js/recursos.js` (`RECURSOS`): recursos de classe com máximo por nível e recarga (Fúria, Inspiração de Bardo, Canalizar Divindade, Forma Selvagem, Retomar Fôlego, Surto de Ação, Indomável, Ki, Mãos Consagradas, Sentido Divino, Toque Purificador, Pontos de Feitiçaria, Mestre Arcano, Recuperação Arcana). Estado em `ficha.recursosUsados`. Sem recursos de subclasse nem de raça.
- `js/jogo.js` (`JOGO`): dano (PV temporários, resistência, 0 PV, morte instantânea, falhas a 0 PV, crítico), cura (respeita PV máximo efetivo; desfaz inconsciência), salvaguardas contra a morte, estabilizar, reviver, condições (Apêndice A, com implicações e fim de concentração), exaustão 0 a 6, concentração (CD, teste, substituição), dados de vida, descanso curto e longo (regras de 2014, inclusive 1 PV mínimo), Arcanum Místico, Recuperação Arcana, gastar espaço, diário de jogo (`ficha.diario`).
- Integração já feita: a cura de poções (`ITENS_EFEITOS`) passa por `JOGO.cura`.
A fazer na fase 4 (próxima tarefa do Codex):
1. Carregar `recursos.js` e `jogo.js` em `personagem.html` (depois de `itens-efeitos.js`), em `ESSENCIAIS` do `sw.js` e no harness de testes; aumentar o cache.
2. Trocar na `js/personagem.js` os caminhos antigos pelos do motor: `mudarPV` (usar `JOGO.dano/cura`, com tipo de dano opcional e aviso de CD de concentração), `usarDado` (`JOGO.gastarDadoVida`), `descansoLongo` e botão de descanso curto (`JOGO.descansoLongo/descansoCurto`, com mensagem quando faltar 1 PV), botões de espaço (`JOGO.gastarEspaco`).
3. Telas novas: painel de recursos (usar/restaurar), condições e exaustão (com texto de cada condição), concentração (botão "Concentrar" nas magias com concentração, encerrar, teste com CD), salvaguardas contra a morte quando PV = 0, Arcanum Místico (conjurar), Recuperação Arcana (descanso curto), deslocamento efetivo, histórico de jogo (`ficha.diario`).
4. Testes de interação na interface (poção + 0 PV + concentração; dano com PV temporários + resistência; descanso após exaustão) e suíte completa.
Não automatizado de propósito (documentado em `js/jogo.js`): vantagem/desvantagem por condição, vulnerabilidade e imunidade a dano, Fúria impedindo concentração, vantagem de Combatente Mágico em concentração, duração em rodadas.

## Limites conhecidos da fase 3
- Efeitos em outro alvo só ficam registrados (a ficha do alvo não é alterada: exigiria permissão do servidor).
- Não suportados (use efeito manual): dado a cada rodada (Bênção), conjurar magia por item, dano a terceiros, área, recarga automática de cargas, expiração automática por tempo, conflito entre efeitos iguais.
- Preço, compra e venda, peso de pergaminho e catálogo completo de itens SRD não foram feitos.

## Funcionalidades futuras (registradas; NÃO implementar agora)
- Privacidade dos grimórios (quem pode ver ou copiar o grimório de quem).
- Visibilidade de monstros por permissão (o que o jogador pode ver de cada criatura).
- Encontros preparados pelo mestre.
- Instâncias individuais de criaturas (PV, condições e inventário de cada criatura de um encontro).
- Saques próprios (cada criatura/baú com seu inventário e distribuição). A estrutura de contêiner de `js/inventario.js` já foi pensada para isso.

## Próxima tarefa
Concluir a fase 4 pelos itens 1 a 4 acima, mantendo tudo local.

## Depois
- Fase 4 recursos, descansos, condições, concentração, efeitos; fase 5 auditoria e testes de integração.
- Não implementar lojas, baús, Enciclopédia nem Itens da campanha antes de o William pedir.

## Aguardando o William
- Autorização para publicar (push) os commits locais; nenhuma alteração no Supabase sem pedido.
- Validação real (Supabase e Android) com as 3 contas temporárias (roteiro em `William-privado`); limpeza das contas/campanha temporárias só com confirmação dele.
- Renomear o repositório para `compendio-5e`: plano em `docs/MIGRACAO-ENDERECO.md`, não executado.
