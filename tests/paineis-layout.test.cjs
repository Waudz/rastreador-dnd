const{test}=require('node:test'),assert=require('node:assert/strict');
const{vm,executar}=require('./helpers.cjs');
function fixture(width,quem){const vars={},classes={},sheet={hidden:quem!=='monstro'},spell={hidden:true},personagem={hidden:quem!=='personagem'},left={children:[],hidden:true},right={children:[sheet,spell],hidden:true};const window={},document={querySelector:s=>({'#dock-l':left,'#dock-r':right,'#ci-resumo':personagem}[s]),documentElement:{style:{setProperty:(k,v)=>vars[k]=v}},body:{classList:{toggle:(k,v)=>classes[k]=v}}};const c=vm.createContext({window,document,innerWidth:width});executar('js/paineis-layout.js',c);window.PAINEIS_LAYOUT.aplicar();return {L:window.PAINEIS_LAYOUT,vars,classes,c};}
test('personagem e monstro recebem a mesma reserva em desktop e nenhuma em janela dividida',()=>{
 for(const width of [320,375,390,430,768,960,1199,1200,1366,1920]){
   const p=fixture(width,'personagem'),m=fixture(width,'monstro');
   assert.equal(p.vars['--painel-reserva-direita'],m.vars['--painel-reserva-direita']);
   assert.equal(p.vars['--painel-reserva-direita'],width>=1200?'440px':'0px');
   assert.equal(p.L.medir(width).modo,width>=1200?'lateral':'empilhado');
 }
});
test('redimensionamento e fechamento recalculam a reserva dos painéis',()=>{
 const f=fixture(1920,'monstro');f.c.innerWidth=960;f.L.aplicar();assert.equal(f.vars['--painel-reserva-direita'],'0px');
 f.c.innerWidth=1440;f.L.aplicar();assert.equal(f.vars['--painel-reserva-direita'],'440px');
 const vazio=fixture(1440,'nenhum');assert.equal(vazio.vars['--painel-reserva-direita'],'0px');
});
