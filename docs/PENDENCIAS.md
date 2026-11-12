# Pendências e próxima tarefa

Atualizado em 12/11/2026. Decisões permanentes: `docs/DECISOES.md`. Histórico antigo: `docs/HISTORICO.md` (não ler por rotina).

## Estado atual
- Remoto `origin/main` em `32dd13d` (cache v91). Commits locais não publicados: `aca3f57`, `603be7f`, `5889cbc`, `8d670da`, `10829ee`, `daa9f1e` e o da fase 3 (cache `rastreador-v98`). **Nada publicado nem validado no Supabase real ou no Android.**
- Fase 1 (ficha como interface de jogo): concluída localmente. Fase 2 (magias): **base entregue, mas o sistema de magias NÃO está integralmente concluído** (ver pendências obrigatórias). Fase 3 (inventário): base entregue localmente.
- Fase 3 entregou: `js/inventario.js` (itens com `uid`, `ref`, origem, propriedades, `magiaVinculada`; contêiner `{dono, itens, movimentos}`; adicionar, retirar, consumir, transferir, sintonia máx. 3, cargas; histórico em `ficha.movimentos`, máx. 200); `js/itens-efeitos.js` (uso atômico de consumíveis e itens com efeitos: cura com rolagem no app ou resultado manual, PV temporários que não se acumulam, modificador, atributo, condição, resistência, manual, passivos de item equipado/sintonizado, cargas; efeitos ativos com duração e fim em descanso curto/longo; amostras SRD: 4 poções de cura, Heroísmo, Resistência, Invisibilidade, Antitoxina, Anel de Proteção, Varinha de Mísseis Mágicos); pergaminhos reais no inventário, copiados para o grimório consumindo o item; editor de efeitos do item para o mestre; concessão do mestre com forma escolhida (conhecida, grimório, sempre preparada, uso limitado com recarga, outra); troca de magia só entre magias da classe (sem raciais, talentos ou subclasses). Detalhes em `docs/MODELO-PERSONAGEM.md`.
- Testes: suíte completa passando; a interface foi testada com DOM simulado, **não no navegador com Supabase real nem no Android**.

## Pendências obrigatórias do sistema de magias (a fase 2 só termina quando todas estiverem resolvidas)
1. **Lista de magias do Paladino:** `dados/magias.json` não traz Paladino; Paladino não consegue preparar magias da classe.
2. **Arcanum Místico do Bruxo:** magias de 6º a 9º círculo (1 por círculo, 1 uso por descanso longo), fora dos espaços de Pacto e da troca por nível.
3. **Revisão da conjuração multiclasse:** espaços compartilhados, magias de Pacto separadas, preparação por classe, círculos disponíveis por classe e Cavaleiro Místico/Trapaceiro Arcano (terços de conjurador).
4. Reduzir nível pela interface (magias e características inativas) e troca de magia de Cavaleiro Místico/Trapaceiro Arcano (restrições de escola).

## Limites conhecidos da fase 3
- Efeitos em outro alvo só ficam registrados (a ficha do alvo não é alterada: exigiria permissão do servidor).
- Não suportados (use efeito manual): dado a cada rodada (Bênção), conjurar magia por item, dano a terceiros, área, recarga automática de cargas, expiração automática por tempo, acúmulo/ conflito entre efeitos iguais.
- Preço, compra e venda, peso de pergaminho e catálogo completo de itens SRD não foram feitos.

## Próxima tarefa
Resolver as pendências obrigatórias de magias (começando por Paladino e multiclasse) ou seguir para a fase 4 (recursos de classe, descansos, condições, concentração), conforme o William decidir.

## Depois
- Fase 4 recursos, descansos, condições, concentração, efeitos; fase 5 auditoria e testes de integração.
- Não implementar lojas, baús, Enciclopédia nem Itens da campanha antes de o William pedir.

## Aguardando o William
- Autorização para publicar (push) os commits locais; nenhuma alteração no Supabase sem pedido.
- Validação real (Supabase e Android) com as 3 contas temporárias (roteiro em `William-privado`); limpeza das contas/campanha temporárias só com confirmação dele.
- Renomear o repositório para `compendio-5e`: plano em `docs/MIGRACAO-ENDERECO.md`, não executado.
