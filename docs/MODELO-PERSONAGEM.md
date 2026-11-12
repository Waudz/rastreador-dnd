# Modelo de dados do personagem (v2)

Decisão de 12/11/2026: ainda não existe personagem completo no Compêndio, então não há compatibilidade com fichas antigas. Os registros atuais são de teste e podem ser recriados pelo criador. **Nada foi apagado no Supabase.** Qualquer exclusão ou migração exige autorização do William, com a lista exata do que será afetado.

## Um único motor de regras
`js/criador-regras.js` (`window.CRIADOR`) serve criação, subir de nível e editar. A interface (`js/criador.js`) só coleta decisões e mostra resultados.

## Decisões do jogador (fonte) e valores derivados
Fonte, em `ficha.criacao` (e campos de construção em `ficha`):
- `criacao.niveis`: lista **cronológica** `[{c: 'Fighter', pv: {modo: 'maximo'|'fixo'|'rolagem', valor?}}]`. É daqui que saem a ordem dos níveis (multiclasse) e os PV de cada nível.
- `criacao.selecoes`: escolhas por grupo (perícias, estilo de luta, magias conhecidas, equipamento...).
- `ficha.melhorias` e `criacao.talentos`: melhoria de atributo ou talento por nível de classe.
- `ficha.classes`, `raca`, `backgroundId`, `criacao.base` (pontos de atributo).

Derivado (recalculado por `derivar`, nunca editado à mão):
- `ficha.progressao[i] = {total, classe, nivelClasse, pv: {modo, dado, valor, ganho}, automaticas: [ids], escolhas: {grupo: [ids]}, melhoria}`: histórico por nível, com as características automáticas, as escolhas feitas naquele nível e os PV recebidos.
- Atributos finais, perícias, proficiências, idiomas, `caracteristicas`, `magias` automáticas.

## PV: um só cálculo
`pvTotal(f)` soma o ganho de cada nível da progressão: o 1º nível do personagem usa o dado no máximo; os demais, valor fixo ou rolagem informada; modificador de Constituição; +1 por nível do Anão da Colina; mínimo 1 por nível. Criação, evolução e edição usam as mesmas funções (`ganhoPV`, `pvTotal`).
- **Criar:** `pv_max = pvTotal`, `pv_atual = pv_max`.
- **Subir de nível:** acrescenta um item em `criacao.niveis`; `pv_max` e `pv_atual` ganham o valor do nível.
- **Editar:** `pv_max = pv_max salvo + (pvTotal novo - pvTotal antigo)`; `pv_atual` é preservado (limitado ao novo máximo); mudança exige confirmação.

## Salvamento
`CRIADOR.salvamento(q, {modo, original})` é o único ponto que monta o que vai para o banco (equipamento inicial só na criação, PV, marcações). Cancelar nunca grava nada.

## Jogo (fora da construção)
PV atuais e temporários, espaços usados, dados de vida, inventário, moedas, notas e `modTemp` (modificadores temporários de atributo, que **nunca** alteram o atributo permanente: `REGRAS.atributoEf`).

## Persistência das decisões
A `progressao` é só resultado. As decisões moram em `criacao.niveis`, `criacao.selecoes` (perícias, características, magias, equipamento), `criacao.talentos`, `ficha.melhorias`, `ficha.classes[].sub` (subclasse), `criacao.base` e escolhas raciais. Testado: salvar, reabrir e recalcular preserva exatamente essas decisões; apagar a `progressao` e recalcular dá o mesmo resultado; ao reduzir o nível, as seleções gravadas não são apagadas em silêncio.

## PV (2014)
- **Subir de nível:** PV máximos e atuais aumentam pelo ganho do nível.
- **Editar:** PV atuais são preservados (só mudam se passarem do novo máximo); um nível adicionado na edição aumenta o máximo mas não cura. A revisão mostra máximos e atuais antes e depois, com confirmação.

## Salvamento seguro
Toda alteração de um personagem é **uma única linha** (`personagens`) gravada por **um único PATCH** com controle de versão (`versao=eq.N`): ou grava tudo ou nada. Se a rede falha ou a ficha mudou em outro aparelho, o assistente avisa, mantém o rascunho local e não altera a ficha. Operações que envolvam mais de uma linha ou tabela (por exemplo compra em loja: moedas do personagem + estoque da coleção + histórico) **devem ser uma função SQL (RPC) transacional**, nunca duas gravações separadas do navegador. Isso exigirá migração e só será feito com autorização do William.

## Preparação para Itens, coleções e Enciclopédia (futuro, não implementado)
Ao fazer o inventário (fase 3), adotar um formato de item que permita transferência, estoque e histórico:
`{uid, ref, nome, qtd, peso, preco, tipo, equipado, propriedades, cargas, magiaVinculada, origem}`:
- `uid`: identificador único da instância (não usar posição na lista); `ref`: item do catálogo ou nulo (item personalizado);
- `origem`: inicial, compra, saque, jogo, com a coleção de origem quando houver;
- `magiaVinculada`: para pergaminhos e itens mágicos, ligando ao sistema de magias e à cópia para o grimório;
- coleções do mestre (lojas, baús, saques) usarão o mesmo formato de item, com estoque (número ou ilimitado) e permissões, e um histórico de movimentações (compra, venda, saque, descarte, transferência, consumo).
Nada disso tem interface agora.

## Ainda a fazer neste modelo
Magias (grimório, preparadas, origem, substituição), inventário com itens mágicos e pergaminhos, recursos com usos e descansos, condições e efeitos. Ver `docs/PENDENCIAS.md`.
