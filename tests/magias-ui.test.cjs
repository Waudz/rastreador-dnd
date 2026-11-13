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
