# Fontes do criador guiado

A organização do criador e da evolução de nível foi inspirada no HeroQuill: https://github.com/Mystikal91/heroquill.

Os dados estruturados de progressão, escolhas e equipamentos em dados/criacao-srd2014.json foram adaptados dos arquivos data/srd51 do HeroQuill. São dados do SRD 5.1, de Wizards of the Coast LLC, sob CC BY 4.0: https://creativecommons.org/licenses/by/4.0/legalcode. Foram derivados de 5e-bits/5e-database, sob MIT, Copyright (c) 2018–2020 Adrian Padua, Christopher Ward. As alterações locais incluem integração ao modelo da ficha, nomes e descrições em português quando disponíveis.

MIT License

Copyright (c) 2026 Mystikal91

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Cobertura e idioma

A automação usa as 12 subclasses SRD 5.1 disponíveis no HeroQuill e oito subclasses adicionais com resumos próprios em português: Bravura, Lua, Mestre de Batalha, Cavaleiro Místico, Assassino, Trapaceiro Arcano, Magia Selvagem e Guerreiro Totêmico. São 20 subclasses; isso não corresponde a todas as subclasses do Livro do Jogador. Os títulos e descrições públicos usam o catálogo 2014 traduzido da API. Rótulos de progressão e opções que não tinham tradução foram integrados em português a partir dos mesmos dados SRD, sem usar o livro pessoal sincronizado de qualquer conta.


## Fonte única da ficha

js/regras.js centraliza traços raciais, descrições, perícias, percepção passiva e bônus de ataque. A ficha e o resumo do mestre consomem essas funções. js/origens.js contém as descrições raciais canônicas; valores antigos salvos não substituem essas descrições. O resumo omite seções vazias e mantém detalhes por foco/toque/mouse.

A expansão de subclasses não automatiza toda decisão de mesa, a tabela de Magia Selvagem ou o histórico de substituições de magias em cada nível.


## Catálogo de itens (aba Itens)

`dados/itens-srd2014.json` (578 itens) é gerado por `node tools/gerar-itens.cjs` a partir dos itens de `dados/criacao-srd2014.json` (SRD 5.1, CC BY 4.0, via 5e-database/HeroQuill; ver acima) e dos nomes de `tools/itens-pt.txt`. Preços, pesos, dano, CA, propriedades, raridade, sintonia, espaço e conteúdo dos pacotes vêm do SRD; só mudam as unidades (libras em kg, ×0,5; pés em metros, ×0,3) e o idioma dos rótulos. Os nomes em português que não existiam nos dados são tradução do próprio projeto e podem diferir dos livros oficiais. **Lacuna:** esses dados do SRD não trazem descrição textual dos itens; a ficha mostra a lacuna em vez de inventar texto.
