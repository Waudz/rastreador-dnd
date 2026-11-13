const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,executar,ler}=require('./helpers.cjs');
const c=vm.createContext({window:{}});executar('js/ficha-componentes.js',c);executar('js/magias-ui.js',c);const M=c.window.MAGIAS_UI;
test('espaços vazios e esgotados preservam os controles e estados acessíveis',()=>{
 for(const chave of ['0','p']){
 const livre=M.slot({titulo:'1º círculo',total:2,usados:0,chave});
 assert.match(livre,/magia-slot-cabecalho/);assert.match(livre,/magia-slot-indicadores/);assert.match(livre,/magia-slot-acoes/);
 assert.match(livre,/data-d="-1" disabled/);assert.doesNotMatch(livre,/data-d="1" disabled/);
 const cheio=M.slot({titulo:'Pacto',total:2,usados:2,chave});assert.match(cheio,/data-d="1" disabled/);assert.doesNotMatch(cheio,/data-d="-1" disabled/);
 }
});
test('detalhes preservam descrição, materiais e original sem interpretar HTML',()=>{
 const h=M.detalhes({nome:'<img>',original:'Original',meta:[['Fonte','SRD'],['Ritual','Sim']],descricao:'Primeiro parágrafo.\n\nEm círculos superiores: mais dano.',materiais:'Diamante',originalTexto:'Higher levels',concentracao:true});
 for(const texto of ['Primeiro parágrafo.','Em círculos superiores: mais dano.','Diamante','Higher levels','Ritual','Concentração','SRD'])assert.ok(h.includes(texto));
 assert.ok(h.includes('&lt;img&gt;'));assert.ok(!h.includes('<img>'));
});
test('resultados são linhas compactas como os monstros, com botão nativo Ver, e não exibem valores ausentes',()=>{
 const h=M.resultado({chave:'ds:light',nome:'Luz',nivel:0});assert.match(h,/^<div class="res res-magia" data-spopen="ds:light"/);assert.match(h,/<button type="button" class="small" data-spopen="ds:light" aria-label="Ver Luz">Ver<\/button>/);assert.match(h,/Truque/);assert.doesNotMatch(h,/undefined|null/);
 const g=M.resultado({chave:'srd_fireball',nome:'Bola de Fogo',original:'Fireball',nivel:3,escola:'Evocação',tempo:'Ação',alcance:'45 m',concentracao:true,fonte:'5e 2014 Rules'});assert.match(g,/<b>Bola de Fogo<\/b> <span class="muted">\(Fireball\)<\/span>/);assert.match(g,/Magia · 3º círculo · Evocação · Ação · 45 m · Concentração · 5e 2014 Rules/);assert.match(g,/>3º<\/span>/);
});
test('pesquisa de magias: lista de linhas como a de monstros (CSS) e painel da magia com Fechar (Esc)',()=>{
 const m=ler('css/magias.css'),i=ler('css/identidade.css'),f=ler('css/fluxos.css'),h=ler('iniciativa.html');
 assert.match(m,/#spells\.magias-resultados \{ display:block;/);assert.match(i,/#blist \.res, #spells \.res \{ flex-wrap:wrap; min-width:0; \}/);assert.match(f,/#spells \.res \.small \{ min-height:44px;/);assert.match(h,/id="spd-close">Fechar \(Esc\)<\/button>/);
});
test('ficha da magia no padrão das fichas: identidade com emblema do círculo, cartões de dados e seções em cartões com o título padrão; texto escapado',()=>{
 const h=M.detalhes({nome:'Bola de Fogo',original:'Fireball',meta:[['Círculo','3º círculo'],['Escola','Evocação'],['Tempo de conjuração','Ação'],['Alcance','45 m'],['Componentes','V, S, M'],['Duração','Instantânea'],['Ritual',''],['Fonte','5e 2014 Rules']],descricao:'Texto.',materiais:'Guano',concentracao:false});
 assert.match(h,/^<article class="magia-detalhe ficha-criatura magia-ficha"><header class="ficha-identidade">/);assert.match(h,/magia-selo-circulo"[^>]*>3º<\/span>/);assert.match(h,/<h3 class="ficha-nome">Bola de Fogo<\/h3>/);
 assert.equal((h.match(/class="ficha-estatistica"/g)||[]).length,4,'tempo, alcance, componentes e duração em cartões');assert.match(h,/<div class="ficha-destaques magia-destaques">/);
 assert.match(h,/<section class="panel "><h3 class="panel-title">Efeito da magia<\/h3>/);assert.match(h,/<section class="panel magia-materiais"><h3 class="panel-title">Materiais<\/h3>/);assert.match(h,/<footer class="magia-fonte">5e 2014 Rules<\/footer>/);assert.doesNotMatch(h,/undefined|null/);
 const t=M.detalhes({nome:'Luz',meta:[['Círculo','Truque']],descricao:'x'});assert.match(t,/magia-selo-circulo"[^>]*>T<\/span>/);assert.ok(!/ficha-destaques/.test(t),'sem dados, sem cartões vazios');
});
test('filtro da pesquisa de magias na mesma disposição do bestiário: pesquisa, tipo e Filtros numa linha, contagem e filtros avançados recolhidos',()=>{
 const h=ler('iniciativa.html'),m=ler('css/magias.css'),a=ler('js/app.js');
 assert.match(h,/<div class="row magias-busca-controles">\s*<div class="clearable" style="flex:1 1 240px"><input id="sq" type="search"/);assert.match(h,/<select id="sf-type" style="flex:0 1 260px"/);assert.match(h,/id="sf-more"/);
 assert.match(h,/<div class="muted" id="scount" role="status"><\/div>/);assert.match(h,/id="sf-adv"[^>]*hidden/);assert.match(m,/#sf-type \{ flex:0 1 260px!important;/);assert.match(a,/\$\{n\} \$\{n === 1 \? "resultado" : "resultados"\}/);
});
