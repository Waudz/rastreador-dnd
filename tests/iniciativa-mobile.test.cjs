const {test}=require('node:test'),assert=require('node:assert/strict');const {ler}=require('./helpers.cjs');
/* Iniciativa no celular (até 700 px): barra de turno fixa, menu do combate, ataque recolhido, cartões compactos e estados próprios. */
const html=ler('iniciativa.html'),css=ler('css/fluxos.css'),ini=ler('js/iniciativa.js'),atk=ler('js/ataque-ini.js'),ico=ler('js/icones.js');
test('barra de turno: rodada, atual, Anterior/Próximo/Desfazer só com ícone, Desfazer visível e menu do combate separado do Mais opções do cartão',()=>{
  assert.match(html,/id="barra-rodada-n"/);assert.match(html,/id="chip-manual"/);assert.match(html,/<button id="desfazer"[^>]*aria-label="Desfazer"[^>]*><i data-i="undo"><\/i>/);
  assert.match(html,/<details class="compact-menu menu-combate" id="menu-combate" hidden><summary aria-label="Menu do combate"/,'o menu geral reaproveita o componente compact-menu');
  assert.match(css,/#iniciativa-atual \.combat-bar \{ position:sticky; top:var\(--appheader-h,56px\)/);assert.match(css,/#iniciativa-atual\[data-iniciado="1"\] #start \{ display:none; \}/);
  assert.match(ico,/undo: /);assert.match(ico,/chevdown: /);
  assert.match(ini,/data-mais="\$\{c\.id\}"[^>]*aria-label="Mais opções de /,'o menu de cada combatente é outro botão (seta), com nome próprio');
});
test('menu do combate recebe Encerrar, Limpar, rolagem automática e ferramentas da lista sem duplicar IDs; Manual aparece quando a rolagem automática está desligada',()=>{
  assert.match(ini,/for \(const id of \["reset", "limpar-ini", "rolagem-auto-bar", "lista-ferramentas"\]\)/);assert.match(ini,/window\.matchMedia\("\(max-width: 700px\)"\)/);
  assert.match(ini,/chip\.hidden = on;/);assert.equal((html.match(/id="reset"/g)||[]).length,1);assert.equal((html.match(/id="limpar-ini"/g)||[]).length,1);
});
test('Próximo/Anterior só rolam até o atual quando ele está fora da vista; tocar no nome força; formulário de ataque abre visível e fecha voltando ao cartão',()=>{
  assert.match(ini,/if \(forcar \|\| r\.top < topo \|\| r\.top > base - 60\) window\.scrollTo\(0, window\.scrollY \+ r\.top - topo\)/);assert.match(ini,/render\(\); mostrarAtual\(false\);/);
  assert.match(ini,/\$\("current-turn"\)\.addEventListener\("click", \(\) => mostrarAtual\(true\)\)/);
  assert.match(css,/#acoes-da-vez:not\(\.aberta\) \{ display:none; \}/);assert.match(atk,/data-vez-fechar/);assert.match(atk,/faixa\.classList\?\.add\?\.\("aberta"\)/);assert.match(atk,/function fecharCelular\(\)/);assert.match(atk,/window\.__ini\.rolarAte\(card, false\)/);
});
test('cartão compacto: grade de 20 colunas, ícones com nome acessível em Efeitos, Ficha e Atacar, alvos de 44 px e sem estourar a largura',()=>{
  assert.match(css,/grid-template-columns:repeat\(20,minmax\(0,1fr\)\)/);assert.match(css,/\[data-damage\], \.combatant:not\(\.editing\) \[data-heal\][^}]*height:44px; min-height:44px/);
  for(const rx of [/data-fxopen="\$\{c\.id\}" aria-label="Efeitos e condições de/,/data-ficha="\$\{c\.id\}" aria-label="Ficha de/,/data-atacar="\$\{c\.id\}" aria-label="Atacar com/])assert.match(ini,rx);
  assert.match(css,/@media \(max-width:350px\)/,'em 320 px os controles descem para uma segunda linha');
});
test('estados distintos: Morto (linha compacta com Reviver e Ficha), Derrotado, Inconsciente com teste de morte compacto e Estável',()=>{
  assert.match(ini,/estado-chip morto">Morto · 0 PV/);assert.match(ini,/morte-linha derrotado"><span class="estado-chip inconsciente">Derrotado/);assert.match(ini,/morte-linha estavel-linha/);
  assert.match(css,/\.combatant\.estado-morto:not\(\.editing\) \.hp-barra[^{]*\{ display:none; \}/);assert.match(css,/:has\(> \.morte-linha\.derrotado\)/);assert.match(css,/\.morte-ativa \.trilha-rot \{ display:none; \}/);
});
test('desktop acima de 700 px mantém o layout anterior: regras do celular só dentro de @media (max-width:700px)',()=>{
  const i=css.indexOf('celular (até 700 px): barra de turno fixa'),resto=css.slice(i);
  assert.ok(!/^\.combat-bar \{[^}]*sticky/m.test(resto.split('@media')[0]),'nada de sticky fora do media');assert.match(css,/@media \(min-width:701px\) \{ \.aviso-gravacao \.c \{ display:none; \} \}/);
});
test('ficha do jogador no painel lateral com as mesmas medidas da ficha do monstro (estatísticas, atributos, abas, PV, margens) e cabeçalhos paralelos',()=>{
  const css=ler('css/fluxos.css'),html=ler('iniciativa.html');
  for(const rx of [/\.ficha-embutida \.ficha-estatistica \{ min-height:70px; \}/,/\.ficha-embutida \.attr \{ min-height:94px; \}/,/\.ficha-embutida \.ficha-abas button \{ padding:6px 12px; \}/,/\.ficha-embutida \.vida-ficha \{ padding:15px; \}/,/body\.ficha-embutida \.tracker \{ padding:14px; \}/,/\.attr \.atr-valor \{ order:2;/,/\.ficha-embutida \.ficha-abas \{ flex-wrap:wrap;/])assert.match(css,rx);
  assert.match(html,/<span class="muted">Ficha do monstro<\/span><button type="button" class="small" id="sh-close">Fechar \(Esc\)<\/button>/);assert.match(html,/<strong>Ficha do personagem<\/strong><button type="button" id="ci-resumo-fechar">Fechar \(Esc\)<\/button>/);
});
