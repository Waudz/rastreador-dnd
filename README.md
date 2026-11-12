# Compêndio 5e

Aplicativo web em português para campanhas e sessões de Dungeons & Dragons 5ª edição, com regras de 2014. Reúne fichas de personagem, iniciativa, bestiário e magias em uma interface responsiva, instalável como PWA.

[Abrir o aplicativo](https://waudz.github.io/rastreador-dnd/) · [Licenças e créditos](licencas.html)

Projeto de fãs, sem vínculo com a Wizards of the Coast. Não utiliza regras da revisão de 2024.

## Funcionalidades disponíveis

- **Visitante:** consulta de monstros e magias e rastreador de iniciativa sem conta.
- **Personagens:** criação guiada, evolução e edição com histórico por nível, multiclasse, atributos, proficiências, CA, PV, ataques e recursos de classe contemplados pelo motor.
- **Jogo:** dano, cura, PV temporários, condições, concentração, salvaguardas contra morte, dados de vida e descansos.
- **Magias:** listas SRD, preparação, grimório, espaços comuns e de Pacto, Arcanum Místico e concessões do mestre. Escolhas e trocas respeitam as regras implementadas de cada classe/subclasse.
- **Inventário:** equipamentos, moedas, peso, consumíveis, pergaminhos, cargas, sintonia e um catálogo limitado de itens com efeitos. O mestre pode configurar efeitos admitidos pelo sistema.
- **Campanhas:** convites por código, participantes, personagens, diário/documentos e símbolo/backdrop opcionais com armazenamento compartilhado.
- **Iniciativa:** turnos, rodadas, condições, dano/cura, fichas laterais e relatório. O combate é guardado por campanha **neste navegador**, sem sincronização em tempo real.
- **Acervo:** criações próprias de monstros/NPCs, imagens, backup/restauração e sincronização por conta.
- **PWA:** cache dos recursos do aplicativo e consulta offline do conteúdo disponível no aparelho. Login, campanhas, uploads e gravações na nuvem exigem conexão; não há promessa de sincronização de edições offline.

## Arquitetura e dados

Site estático em HTML5, CSS3 e JavaScript, sem framework, empacotador ou etapa de build. O SDK Supabase é distribuído em `vendor/supabase/`, com licença e versão documentadas nessa pasta. Node.js é usado apenas nas ferramentas e nos testes.

| Área | Implementação |
| --- | --- |
| Construção e progressão | `js/criador-regras.js`, `js/criador.js`, `js/subclasses-2014.js` |
| Regras e estado de jogo | `js/regras.js`, `js/jogo.js`, `js/recursos.js`, `js/magias-jogo.js` |
| Inventário e efeitos | `js/inventario.js`, `js/itens-efeitos.js` |
| Fichas, campanha e combate | `js/personagem.js`, `js/campanha.js`, `js/iniciativa.js` e componentes compartilhados |
| Persistência remota | `js/nuvem.js`, Supabase Auth, PostgreSQL/RLS e Storage privado |
| Persistência local | IndexedDB para acervo; localStorage para combate, preferências e sessão do SDK |
| Catálogos e apresentação | `dados/`, `css/`, HTML na raiz |
| PWA | `manifest.json`, `sw.js`, `js/navegacao.js` |
| Banco e validação | `supabase/`, `tests/`, `.github/workflows/validar.yml` |

Documentos usam o bucket privado `documentos`; símbolo e backdrop usam `campanhas-visuais`. Imagens de campanha são independentes e só o mestre responsável pode modificá-las. RLS isola os registros; um gatilho valida campos exclusivos do mestre dentro do JSON da ficha. A interface não é a única barreira de autorização. Isso não torna todas as regras de D&D autoritativas no servidor.

O aplicativo não acessa o antigo repositório privado de sincronização nem exige tokens do GitHub. Dados antigos que nunca foram importados precisam ser preservados separadamente: veja [migração do acervo legado](docs/MIGRACAO-REPOSITORIO-PRIVADO.md). Nenhum repositório antigo é excluído por este projeto.

## Executar localmente

Recomendado: Git e Node.js 22, a mesma versão usada no CI. Não é necessário `npm install`.

```sh
git clone https://github.com/Waudz/rastreador-dnd.git
cd rastreador-dnd
node ferramentas/servidor-local.cjs
```

Abra **http://127.0.0.1:8766**. Alternativa: `python -m http.server 8000` e **http://localhost:8000**. Não abra os HTML por `file://`: carregamento de dados e service worker precisam de HTTP/HTTPS. Para revisão visual, o modo visitante não exige conta.

**Atenção:** a configuração distribuída aponta para o Supabase de produção. Para testar gravações, configure um projeto isolado; não use contas ou campanhas reais de terceiros. O servidor local é uma ferramenta de desenvolvimento, não um serviço de hospedagem.

## Configurar um Supabase independente

Consulte [supabase/LEIA-ME.md](supabase/LEIA-ME.md) para a ordem dos scripts e [segurança do Supabase](docs/SEGURANCA-SUPABASE.md) para Auth, URLs de retorno e SMTP. Banco vazio e atualização de produção são procedimentos diferentes: nunca execute todos os SQL indiscriminadamente em um projeto existente.

No projeto de desenvolvimento, configure a URL e a chave **publicável** em `js/config-nuvem.js`; ajuste também o destino `connect-src` das políticas CSP nos HTML e os testes que verificam essa configuração. A chave publicável é própria para clientes públicos. Senha do banco, `service_role`, chaves secretas, tokens e credenciais SMTP nunca entram no repositório ou no navegador.

Não há variáveis secretas de GitHub Actions necessárias para os testes: o PostgreSQL do CI é descartável. A senha definida no workflow serve exclusivamente a esse serviço de teste.

## Testar e contribuir

```sh
# Teste direcionado durante o desenvolvimento
node --test tests/fase5-integracao.test.cjs
# Verificação independente das regras
node tests/regras.test.cjs
# Suíte JavaScript completa
node --test tests/*.cjs
```

Os testes opcionais de fotografias reais dependem de `FICHAS_REAIS_JSON`, apontando para um arquivo privado fora do repositório; sem ele, são pulados. Não são necessários para executar a suíte pública e não devem ser preenchidos com dados pessoais versionados.

O workflow `validar.yml` reproduz a instalação do esquema em PostgreSQL 16 descartável, aplica/reaplica as migrações e executa as suítes SQL de permissões e concorrência. Para reproduzir localmente, use um banco PostgreSQL descartável e siga a mesma ordem do workflow com `psql -v ON_ERROR_STOP=1`. **Nunca execute as fixtures de `tests/` em produção.** Testes SQL não substituem login real, navegador e dispositivos físicos.

Para revisar: comece pelo fluxo alterado e seus testes, confira a fronteira cliente/servidor e preserve isolamento por conta/campanha, conflitos de versão e compatibilidade dos dados. Leia [AGENTS.md](AGENTS.md), [decisões](docs/DECISOES.md) e [pendências](docs/PENDENCIAS.md) antes de contribuir. Faça mudanças pequenas, sem incluir backups, sessões, fichas reais ou segredos. Alterações no Supabase exigem revisão e autorização próprias.

## Publicação e PWA

O destino é **Waudz/rastreador-dnd**, branch `main`, GitHub Pages a partir da raiz (`/`). Configure essa origem em Settings → Pages; o workflow de validação não é um deploy. Após os testes e a autorização do responsável, publique os commits e confira a versão no endereço público.

Ao publicar mudanças em recursos do aplicativo, incremente `CACHE` em `sw.js`. Preserve caminhos relativos, `id`, `scope` e `start_url` da PWA para hospedagem em `/rastreador-dnd/`. Confirme atualização do cache, aviso de nova versão, login/retorno e navegação. No Android, confira instalação, nome, atualização e consulta offline. Não mude o endereço/origem sem planejar a migração do armazenamento local.

A [revisão técnica de publicação](docs/REVISAO-TECNICA-PUBLICACAO.md) registra a correção recente, os pontos estruturais a melhorar e os limites da validação.

## Limitações e planejamento

A cobertura de classes, subclasses, talentos e itens é parcial. Descrição no catálogo não significa automação mecânica completa; efeitos dependentes de alvo/distância/cobertura, resistências condicionais e diversas exceções continuam exigindo decisão à mesa. Não há motor completo de encontros nem combate multiusuário em tempo real.

Estão **planejados**, não disponíveis: encontros preparados, lojas/saques, iniciativa em tempo real e concessões extras genéricas de características com sentidos/efeitos por alvo. O caso de cegueira permanente com Luta às Cegas está documentado como requisito futuro; a condição não deve ser simplesmente removida. Veja a lista atual em [PENDENCIAS.md](docs/PENDENCIAS.md).

## Licenças e conteúdo

- SRD 5.1 da Wizards of the Coast LLC: **CC BY 4.0**. Dados derivados da Open5e e traduções/adaptações do projeto têm atribuição em [licencas.html](licencas.html).
- O criador inclui adaptação de HeroQuill (MIT): [fontes e avisos](docs/FONTES-CRIADOR.md).
- Resumos próprios de opções de suplementos não são cobertos pela licença do SRD; sua presença não implica licença geral dos livros. O texto integral dos livros não integra o projeto.
- Licenças dos componentes de terceiros permanecem nos respectivos diretórios. Não presuma que a licença do SRD se aplica automaticamente a todo o código e a todos os recursos do repositório.
