# Pendências e próxima tarefa

Atualizado em 12/11/2026. Decisões permanentes: `docs/DECISOES.md`. Histórico antigo: `docs/HISTORICO.md` (não ler por rotina).

## Estado atual
- Remoto `origin/main` em `32dd13d` (cache v91). Commits locais não publicados: `aca3f57`, `603be7f`, `5889cbc`, `8d670da`, `10829ee` e o da fase 2 (cache `rastreador-v97`). **Nada publicado nem validado no Supabase real ou no Android.**
- Fases 1 (ficha como interface de jogo) e 2 (magias): **concluídas localmente**. Suíte completa passando.
- Fase 2 entregou: aba Magias por seções (conhecidas, grimório, lista da classe, raciais, mestre) com origem e inativas; sem aprender pelo catálogo; cópia para o grimório com pré-visualização (custo, horas, CD, Evocation Savant, pergaminho); concessão do mestre; troca de magia ao subir de nível (Bardo, Feiticeiro, Bruxo, Patrulheiro) com desfazer; bônus temporários por categoria. Detalhes em `docs/MODELO-PERSONAGEM.md`.
- Limites conhecidos: não há como criar um pergaminho de magia no inventário até a fase 3 (a cópia por pergaminho já funciona nos testes e na tela, mas a lista só mostra itens com `tipo:'pergaminho'`); Paladino sem lista no catálogo; Arcanum místico do Bruxo, espaços de multiclasse e "reduzir nível" pela interface não têm tela própria; a interface nova foi testada com DOM simulado, não no navegador com Supabase.

## Próxima tarefa: fase 3 (inventário)
Item com `uid`, `ref`, origem, `magiaVinculada`, quantidade; pergaminhos reais ligados a uma magia (usar ≠ copiar); itens mágicos e consumo; integrar com a cópia do grimório. Sem lojas, baús nem Enciclopédia.

## Depois
- Fase 4 recursos, descansos, condições, concentração, efeitos; fase 5 auditoria e testes de integração.
- Não implementar lojas, baús, Enciclopédia nem Itens da campanha antes de o William pedir.

## Aguardando o William
- Autorização para publicar (push) os commits locais; nenhuma alteração no Supabase sem pedido.
- Validação real (Supabase e Android) com as 3 contas temporárias (roteiro em `William-privado`); limpeza das contas/campanha temporárias só com confirmação dele.
- Renomear o repositório para `compendio-5e`: plano em `docs/MIGRACAO-ENDERECO.md`, não executado.
