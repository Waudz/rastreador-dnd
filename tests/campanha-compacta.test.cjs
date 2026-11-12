const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,executar,documentoFalso,tick}=require('./helpers.cjs');
async function fixture(papel='mestre'){
 const document=documentoFalso(),eventos={},gravacoes=[],destino={search:'?id=c',href:''};
 document.addEventListener=(n,fn)=>(eventos[n]??=[]).push(fn);
 for(const id of ['abas','conteudo','campanha-contexto']){document.el(id).removeAttribute=()=>{};document.el(id).hasAttribute=()=>true;}
 const p={id:'p',nome:'Herói',dono_id:'u',pv_atual:12,pv_max:20,pv_temp:3,ca:15,ficha:{classes:[{c:'Fighter',n:3}]}};
 const nuvem={usuario:()=>({id:'u'}),esc:s=>String(s??''),retornoDoLink:async()=>{},observar(){},get:async q=>q.startsWith('campanhas')?[{id:'c',nome:'Campanha'}]:q.startsWith('membros')?[{usuario_id:'u',papel}]:q.startsWith('perfis')?[{id:'u',nome:'Pessoa'}]:q.startsWith('personagens')?[p]:[],patch:async(q,d)=>{gravacoes.push({q,d});return [p];}};
 const window={CAMPANHAS_UI:{montarSeletor:async()=>{}},ico:()=>'',addEventListener(){}};
 const c=vm.createContext({window,nuvem,document,location:destino,URLSearchParams,localStorage:{getItem(){return null;}},ico:()=>'',confirm:()=>true,setTimeout,clearTimeout});
 for(const file of ['js/regras.js','js/ficha-componentes.js','js/grupo-personagens.js','js/campanha.js'])executar(file,c);await tick();await tick();
 const click=async seletor=>{for(const fn of eventos.click)await fn({target:{closest:s=>s===seletor?{}:null}});};
 return {document,eventos,gravacoes,p,destino,click};
}
test('cards da campanha exibem seleção e espada sem botão grande de iniciativa',async()=>{
 const f=await fixture(),h=f.document.el('conteudo').innerHTML;
 assert.match(h,/data-grupo-sel="p"/);assert.match(h,/Adicionar à iniciativa/);assert.match(h,/grupo-pv/);assert.match(h,/PV 12\/20/);assert.doesNotMatch(h,/Aplicar dano|Aplicar cura|Quantidade de dano/);assert.doesNotMatch(h,/Usar na iniciativa/);
});
test('seleção da campanha abre o fluxo de iniciativa com os IDs escolhidos',async()=>{
 const f=await fixture();await f.click('#grupo-todos');await f.click('#grupo-rolar');
 const q=new URLSearchParams(f.destino.href.split('?')[1]);assert.equal(q.get('campanha'),'c');assert.equal(q.get('personagens'),'p');assert.equal(q.get('rolar'),'1');
});
test('jogador não recebe seleção de combate nem executa lote forjado',async()=>{
 const f=await fixture('jogador');assert.doesNotMatch(f.document.el('conteudo').innerHTML,/data-grupo-sel|Adicionar à iniciativa/);await f.click('#grupo-todos');await f.click('#grupo-rolar');assert.equal(f.destino.href,'');
});
test('dano compacto mantém absorção de PV temporários e limite de cura',async()=>{
 const f=await fixture(),card={dataset:{id:'p'},querySelector:()=>({value:'5'})};
 for(const fn of f.eventos.click)await fn({target:{closest:s=>s==='[data-dano]'?{}:s==='.card'?card:null}});
 assert.equal(f.p.pv_atual,10);assert.equal(f.p.pv_temp,0);assert.equal(f.gravacoes[0].d.pv_atual,10);
 card.querySelector=()=>({value:'100'});
 for(const fn of f.eventos.click)await fn({target:{closest:s=>s==='[data-cura]'?{}:s==='.card'?card:null}});
 assert.equal(f.p.pv_atual,20);assert.equal(f.gravacoes[1].d.pv_atual,20);
});

test('controles de seleção só aparecem após marcar uma ficha e somem quando a seleção fica vazia',async()=>{
 const f=await fixture();assert.doesNotMatch(f.document.el('conteudo').innerHTML,/id="grupo-todos"/);
 const mudar=async checked=>{for(const fn of f.eventos.change)await fn({target:{dataset:{grupoSel:'p'},checked}});};
 await mudar(true);assert.match(f.document.el('conteudo').innerHTML,/id="grupo-todos"/);assert.match(f.document.el('conteudo').innerHTML,/Rolar iniciativa \(1\)/);
 await mudar(false);assert.doesNotMatch(f.document.el('conteudo').innerHTML,/id="grupo-todos"|id="grupo-nenhum"|id="grupo-rolar"/);
});
