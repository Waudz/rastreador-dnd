const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,executar,ler}=require('./helpers.cjs');
function render(cat){const window={},c=vm.createContext({window});executar('js/ficha-componentes.js',c);executar('js/ficha-monstro.js',c);
 const m={key:'criatura',name:'Guardião',cat,hit_points:27,armor_class:15,modifiers:{dexterity:2}};
 const antes=JSON.stringify(m);
 const html=window.FICHA_MONSTRO.renderizar({monstro:m,nome:'Guardião <script>',retrato:'<span class="av">G</span>',subtitulo:'Humanoide',meta:'',velocidade:'9 m',atributos:[{sigla:'FOR',valor:14,modificador:'+2'}],informacoes:'<div>Sentidos</div>',acoes:'<div>Ataque especial</div>',tracos:'Traço verdadeiro',magias:'Magia original',gerenciar:'Gerenciar'});
 return{html,m,antes};}
test('monstro e NPC compartilham cartões e mantêm informações próprias',()=>{
 for(const tipo of ['monster','npc']){const{html,m,antes}=render(tipo);assert.match(html,/ficha-estatistica/);assert.match(html,/class="attrs"/);assert.match(html,/data-criatura-aba="acoes"/);assert.match(html,/Ataque especial/);assert.match(html,/Magia original/);assert.match(html,/PV-base do bestiário/);assert.doesNotMatch(html,/<table/);assert.equal(JSON.stringify(m),antes);assert.doesNotMatch(html,/<script>/);}
});
test('a ficha do bestiário não incorpora PV privados de instâncias de combate',()=>{
 const s=ler('js/ficha-monstro.js');assert.doesNotMatch(s,/__ini|localStorage|pv_atual|nuvem/);
 const{html}=render('monster');assert.match(html,/27/);assert.match(html,/cada combatente/);
});
