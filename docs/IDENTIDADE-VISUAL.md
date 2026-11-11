# Identidade visual

O tema usa fundo `#101820`, cartões `#202D3A`, texto `#F3E9D5`, texto secundário `#AAB7C5`, dourado `#D4AE72`, verde `#409B79` e vermelho `#C74B4B`. Os tokens ficam em `css/estilo.css`; a base geral fica em `css/identidade.css` e os componentes de ficha em `css/fichas.css`, carregado por último nas páginas principais.

`js/ficha-componentes.js` fornece cartões de estatística, atributos, cabeçalho e indicadores de vida/espaços. A ficha de personagem e o adaptador de monstros/NPCs do acervo usam esses componentes, mantendo seus próprios modelos de dados. Container queries adaptam a grade à largura da ficha, inclusive no iframe. `ficha-monstro.js` apresenta dados e descrições preparados por `openSheet()` e não consulta PV de instâncias em combate.

A ficha tem cabeçalho com retrato, nível e proficiência, indicadores de CA, iniciativa e deslocamento, painel de vida permanente e seis abas. Modificadores são destacados nos atributos. Testes de atributo e perícia, ataques e danos usam `js/rolagens.js`. Rolagens informam o resultado, sem aplicar dano automaticamente a um alvo.

## Painel da iniciativa

O painel incorpora **a própria `personagem.html?modo=painel&id=…`**. Não há outro renderizador de ficha, modelo de dados ou rotina de salvamento. O CSS responde à largura do quadro e oculta a navegação global e ações que sairiam do contexto de combate. A ficha completa continua disponível em outra aba.

`campanha-ini.js` obtém as campanhas em que a conta é mestre e confirma o papel com a RPC existente `eh_mestre` antes de consultar personagens ou sincronizar PV. A ficha embutida confirma a mesma permissão ao abrir, salvar e atualizar. As regras RLS existentes continuam protegendo as chamadas de dados. Não houve migração ou mudança no banco remoto.

Mensagens entre ficha e iniciativa verificam origem, janela e ID do personagem. O pai relê os dados autorizados do banco após salvar; não aceita valores de vida enviados em mensagens. A sincronização da iniciativa aguarda gravações pendentes da ficha para não sobrescrevê-las. Fechar mantém a ficha carregada para concluir gravações. Abrir e fechar não recriam o estado do combate.

No computador largo, o combate reserva espaço para o painel. Em larguras menores, ele abre sobre o conteúdo; no celular ocupa a tela e a ficha tem rolagem interna. Escape fecha o painel e o foco volta ao elemento de abertura. As abas também aceitam setas, Home e End.

## Prévia e validação

Na raiz do repositório:

```powershell
node ferramentas/servidor-local.cjs
```

Abra `http://127.0.0.1:8766/ferramentas/preview-ficha.html?id=demonstracao`. A prévia usa o renderizador real com um personagem demonstrativo e salvamento apenas em memória, sem autenticação ou conexão com Supabase. Recarregar descarta as alterações. Ela serve para conferir a ficha; a integração do painel requer uma sessão de mestre no aplicativo real.

```powershell
node --test tests/*.test.cjs
```

Os testes cobrem regras existentes, navegação de abas, rolagens, restrição do painel a mestres, rejeição de mensagens externas, atualização de PV a partir do banco e preservação da iniciativa. A validação de RLS em PostgreSQL continua no workflow existente; os testes locais com objetos simulados não substituem essa execução.
