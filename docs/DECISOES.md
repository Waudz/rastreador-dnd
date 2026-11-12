# Decisões e requisitos permanentes

Fonte única das decisões do William. Não repetir em outros arquivos: apontar para cá. Alterar só quando o William mudar a decisão.

## Produto
- Totalmente gratuito. Modo visitante: consulta de monstros e magias e iniciativa completa sem conta; login só para campanhas, personagens da conta e sincronização.
- Nome: **Compêndio 5e** (ver `docs/IDENTIDADE-VISUAL.md`). Mudança de endereço do site: `docs/MIGRACAO-ENDERECO.md` (não executada).

## Regras de jogo: D&D 5e de 2014
- Só regras de 2014 (SRD 5.1 e suplementos de 2014 já presentes). **Nada da revisão de 2024.**
- Consultar as regras oficiais antes de codificar qualquer mecânica. Descrição no catálogo não significa regra implementada.
- Texto do Livro do Jogador em PDF não entra no repositório; só SRD (CC-BY-4.0) e resumos próprios.

## Personagem (modelo em `docs/MODELO-PERSONAGEM.md`)
- Não existem personagens completos: **sem compatibilidade com fichas antigas de teste**. Pode adaptar a estrutura de dados.
- Três fluxos distintos com um só motor de regras (`js/criador-regras.js`): **Criar** (todas as escolhas, nível a nível), **Subir de nível** (um ou vários níveis, em ordem; só o novo; escolhas anteriores bloqueadas; nada gravado antes da confirmação), **Editar personagem** (criador completo com dados carregados; reconstruir tudo; PV atuais preservados; impacto mostrado e confirmado).
- Histórico estruturado por nível (classe, PV, características automáticas, escolhas, melhoria). Decisões do jogador ficam em campos próprios; `progressao` é só resultado.
- Reduzir nível: características, benefícios e magias de níveis removidos ficam inativos; escolhas antigas ficam como histórico inativo e só voltam se continuarem válidas.
- PV: 1º nível do personagem com dado máximo; demais, valor fixo ou rolagem informada; mínimo 1 por nível; subir de nível aumenta máximo e atuais; editar preserva os atuais.
- Raças e subclasses: respeitar a versão de regras de cada uma; raças com progressão por nível (Fada, Drow, Tiefling, Draconato, Anão da Colina) já tratadas.

## Ficha = interface de jogo
- Não tem decisões de construção (escolher atributo, perícia, subclasse, talento, melhoria): isso é do criador, da evolução e do Editar.
- Mantém tudo do jogo: PV, dano, cura e PV temporários, espaços de magia, dados de vida, descansos, recursos usados, condições e efeitos, concentração, preparar magias quando a classe permite, inventário, moedas, modificadores temporários, notas, foto.
- Atributos permanentes em leitura. **Modificadores temporários** são de categorias distintas: valor do atributo; bônus em testes; bônus em ataques e salvaguardas; CA, CD e ataque de magia; só o valor do atributo altera a capacidade de preparar magias.
- Não remover funcionalidade antes de ela existir no fluxo correto. Não duplicar opções de construção.

## Magias (2014)
- Diferenciar: aprendidas ao subir de nível, copiadas, no grimório, preparadas, sempre preparadas, concedidas por raça, talento ou característica, por item.
- **Não aprender magia livremente pelo catálogo.** Concessão do mestre existe, explícita e separada, com origem "mestre"; o mestre escolhe a forma: conhecida, adicionada ao grimório, sempre preparada, de uso limitado ou outra.
- Grimório do Mago: cópia de **pergaminho** exige teste de Inteligência (Arcanismo) com **CD 10 + círculo**; o pergaminho é **destruído em qualquer resultado**. Cópia normal (outro grimório): **50 PO e 2 horas por círculo**, com as exceções de características (ex.: escola do Mago paga metade). Copiar não é preparar nem conjurar. Mostrar requisitos, custo, tempo e resultado antes de confirmar.
- Bardo, Feiticeiro, Bruxo e Patrulheiro trocam uma magia conhecida ao subir de nível (escolha do nível). Clérigo, Druida e Paladino preparam da lista da classe. Pacto do Bruxo e multiclasse (espaços compartilhados) tratados à parte.
- Troca de magia ao subir de nível respeita a classe e nunca troca magia racial, de talento ou de subclasse. Cavaleiro Místico e Trapaceiro Arcano guardam a origem da vaga de escolha: a exceção de escola acompanha a vaga livre de 3/8/14/20, mesmo que originalmente tenha sido preenchida com uma magia das escolas permitidas.
- Origem e vínculo de cada magia sempre registrados.
- **O sistema de magias só está concluído com: lista do Paladino, Arcanum Místico do Bruxo e revisão da conjuração multiclasse** (`docs/PENDENCIAS.md`).

## Inventário (fase 3; arquitetura já decidida)
- Item com `uid` (instância), `ref` (catálogo ou nulo), origem, `magiaVinculada`, quantidade, peso, propriedades. Pergaminhos são itens reais ligados a uma magia; usar (conjurar) é diferente de copiar para o grimório.
- Consumo, custos, testes e resultados atualizam todos os registros sem duplicar itens. Usar item é uma operação atômica (item, PV e efeitos juntos); poção de cura rola no app ou aceita resultado manual e nunca passa do máximo; itens do mestre têm efeitos configuráveis, inclusive manuais. Não automatizar todos os itens: suportar uma base e documentar o que falta.
- Futuro (não implementar agora): a mesma estrutura servirá personagens, NPCs, monstros, lojas, baús e saques; o mestre verá inventários e moedas, transferirá, venderá, comprará e acompanhará histórico. Operações em mais de uma linha serão função SQL transacional.

## Dados, Supabase e publicação
- **Nunca** push/deploy sem o William pedir. Commits locais podem. Sem alterar o Supabase (migração, exclusão, dados) sem autorização; antes, listar exatamente o que será afetado. Não mexer em campanhas, usuários ou o que não for de personagens.
- Permissões vêm do servidor (RLS). Nunca pedir nem gravar senhas, tokens ou chaves secretas.
- Testes de interface com dados simulados não equivalem a validar no Supabase real nem no Android.

## Fases (ordem do William)
1. Organização da ficha. 2. Magias. 3. Inventário. 4. Recursos de classe, descansos, condições, concentração e efeitos. 5. Auditoria e testes de integração. Testes em todas as fases; suíte completa ao fim de cada fase.
