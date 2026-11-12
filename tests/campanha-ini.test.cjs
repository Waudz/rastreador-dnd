const {test}=require("node:test"),assert=require("node:assert/strict");
const {vm,executar,documentoFalso,armazenamento,tick}=require("./helpers.cjs");
async function fixture({search="?campanha=antiga",erro=false,user={id:"mestre"},ficha={},papel='mestre',autorizado=true}={}){
  const document=documentoFalso(),localStorage=armazenamento(),lista=[],consultas=[],eventos={};let atualizar;
  localStorage.setItem("ini_campanha","antiga");
  const nuvem={usuario:()=>user,esc:s=>String(s??""),rpc:async()=>autorizado,observar(fn){atualizar=fn;},get:async q=>{
    consultas.push(q);if(erro)throw Error("Permissão recusada");
    return q.startsWith("membros")?[{papel,campanha:{id:"antiga",nome:"Antiga"}},{papel,campanha:{id:"atual",nome:"Atual"}}]:[{id:"p",nome:"Herói",pv_atual:12,pv_max:15,ca:13,ficha:{foto:"data:image/png;base64,FOTO",classes:[{c:"Bard",n:2}],atributos:{des:14},...ficha}}];
  }};
  const window={nuvem,addEventListener:(n,fn)=>eventos[n]=fn,__ini:{list:()=>lista,add:c=>lista.push(c),render(){}}};
  const c=vm.createContext({window,nuvem,document,location:{search,origin:'http://localhost'},localStorage,URLSearchParams,setInterval(){}});
  executar("js/origens.js",c);executar("js/regras.js",c);c.REGRAS=window.REGRAS;executar('js/ficha-componentes.js',c);executar('js/rolagens.js',c);executar('js/grupo-personagens.js',c);executar("js/campanha-ini.js",c);await tick();
  return {document,lista,consultas,atualizar,nuvem,eventos,window};
}
test("link da campanha escolhe a campanha atual em vez da preferência antiga",async()=>{
  const f=await fixture({search:"?campanha=atual&personagem=p"});
  assert.equal(f.document.el("ci-camp").value,"atual");assert(f.consultas.some(q=>q.includes("campanha_id=eq.atual")));
  assert.equal(f.lista.length,1);assert.equal(f.lista[0].pid,"p");assert.equal(f.lista[0].foto,"data:image/png;base64,FOTO");
});

test('sem campanha na URL mostra seleção antes de carregar personagens',async()=>{const f=await fixture({search:''});assert.equal(f.document.el('ini-selecao').hidden,false);assert.equal(f.document.el('iniciativa-atual').hidden,true);assert.match(f.document.el('ini-campanhas').innerHTML,/campanha=atual/);assert(!f.consultas.some(q=>q.startsWith('personagens')));});
test("adicionar manualmente preserva foto e evita duplicação",async()=>{
  const f=await fixture({search:"?campanha=atual"});
  const e={target:{closest:s=>s==="[data-ci]"?{dataset:{ci:"p"}}:null}};
  f.document.el("camp-ini").events.click(e);f.document.el("camp-ini").events.click(e);
  assert.equal(f.lista.length,1);assert.equal(f.lista[0].initiative,null);assert.equal(f.lista[0].maxHp,15);assert.equal(f.lista[0].campanhaId,"atual");
});
test("erro de acesso é exibido em vez de esconder o painel",async()=>{
  const f=await fixture({erro:true});assert.equal(f.document.el("camp-ini").hidden,false);assert.match(f.document.el("ci-msg").innerHTML,/Permissão recusada/);
});
test("visitante: o painel de campanhas fica oculto e nada é consultado",async()=>{
  const f=await fixture({user:null});assert.equal(f.consultas.length,0);assert.equal(f.document.el("camp-ini").hidden,true);
});

test("clique no personagem abre o resumo lateral",async()=>{
 const f=await fixture();f.document.el("camp-ini").events.click({target:{closest:s=>s==="[data-ci-resumo]"?{dataset:{ciResumo:"p"}}:null}});
 assert.equal(f.document.el("ci-resumo").hidden,false);assert.match(f.document.el("ci-resumo-corpo").innerHTML,/Herói/);assert.match(f.document.el("ci-resumo-corpo").innerHTML,/personagem.html\?id=p&modo=painel/);
 f.document.el("ci-resumo-fechar").events.click();assert.equal(f.document.el("ci-resumo").hidden,true);
});
test("consulta automática sem alterações não refaz a grade nem exibe carregamento",async()=>{
 const f=await fixture();let escritas=0,html=f.document.el("ci-lista").innerHTML;
 Object.defineProperty(f.document.el("ci-lista"),"innerHTML",{get:()=>html,set:v=>{html=v;escritas++;}});
 await f.atualizar();assert.equal(escritas,0);assert.equal(f.document.el("ci-msg").innerHTML,"");
});
test("normalização de HTML pelo navegador não provoca redesenho em cada consulta",async()=>{const f=await fixture();let escritas=0;Object.defineProperty(f.document.el('ci-lista'),'innerHTML',{get:()=>'<article>HTML normalizado pelo navegador</article>',set(){escritas++;}});await f.atualizar();assert.equal(escritas,0);});

test('jogador não consulta personagens nem abre painel com cliques forjados',async()=>{
 const f=await fixture({papel:'jogador'});
 f.document.el('camp-ini').events.click({target:{closest:s=>s==='[data-ci-resumo]'?{dataset:{ciResumo:'p'}}:null}});
 assert.equal(f.document.el('camp-ini').hidden,true);
 assert.equal(f.document.el('ci-resumo').hidden,true);
 assert(!f.consultas.some(q=>q.startsWith('personagens')));
});
test('revogação do papel no servidor impede consulta mesmo com campanha na interface',async()=>{
 const f=await fixture({autorizado:false});
 assert.equal(f.document.el('camp-ini').hidden,true);
 assert(!f.consultas.some(q=>q.startsWith('personagens')));
});
test('abrir e fechar a mesma ficha preserva a iniciativa e o estado do combate',async()=>{
 const f=await fixture({search:'?campanha=atual&personagem=p'});
 f.lista[0].initiative=-2;f.lista[0].order=4;
 const antes=JSON.stringify(f.lista);
 f.document.el('camp-ini').events.click({target:{closest:s=>s==='[data-ci-resumo]'?{dataset:{ciResumo:'p'}}:null}});
 f.document.el('ci-resumo-fechar').events.click();
 assert.equal(JSON.stringify(f.lista),antes);
 assert.match(f.document.el('ci-resumo-corpo').innerHTML,/<iframe[^>]+personagem.html/);
});
test('mensagem de outra origem não altera PV nem consulta o banco',async()=>{
 const f=await fixture();const antes=f.consultas.length;
 await f.eventos.message({origin:'https://externo.invalid',data:{tipo:'ficha-salva',id:'p'},source:{}});
 assert.equal(f.consultas.length,antes);
});
test('salvamento da ficha é relido do banco e atualiza combate sem mudar iniciativa',async()=>{
 const f=await fixture({search:'?campanha=atual&personagem=p'});
 f.lista[0].initiative=17;f.lista[0].order=2;f.lista[0].hp=3;
 const frame=f.document.el('ci-ficha-frame');frame.contentWindow={};frame.dataset={personagem:'p'};
 await f.eventos.message({origin:'http://localhost',source:frame.contentWindow,data:{tipo:'ficha-salva',id:'p'}});
 assert.equal(f.lista[0].hp,12);assert.equal(f.lista[0].initiative,17);assert.equal(f.lista[0].order,2);
});
test('dano no combate durante gravação da ficha é conciliado sem perder alterações',async()=>{
 const f=await fixture({search:'?campanha=atual&personagem=p'}),frame=f.document.el('ci-ficha-frame');
 frame.contentWindow={};frame.dataset={personagem:'p'};
 const mensagem=tipo=>({origin:'http://localhost',source:frame.contentWindow,data:{tipo,id:'p'}});
 await f.eventos.message(mensagem('ficha-salvando'));
 f.lista[0].hp=10;
 const get=f.nuvem.get;f.nuvem.get=async q=>{const r=await get(q);if(q.startsWith('personagens'))r[0].pv_atual=9;return r;};
 let gravado;f.nuvem.patch=async(_q,d)=>{gravado=d.pv_atual;return[{versao:2}];};
 await f.eventos.message(mensagem('ficha-salva'));
 assert.equal(f.lista[0].hp,7);assert.equal(gravado,7);
});

test('seleção em lote rola só os escolhidos e preserva quem já está em combate',async()=>{
 const f=await fixture();f.lista.push({pid:'existente',name:'Existente',initiative:19,hp:8});
 f.window.ROLAGENS.rolar=(expressao,bonus)=>{assert.equal(expressao,'1d20');assert.equal(bonus,3);return {total:13};};
 f.document.el('camp-ini').events.change({target:{dataset:{ciSel:'p'},checked:true}});
 assert.match(f.document.el('ci-selecao').innerHTML,/Rolar iniciativa \(1\)/);
 f.document.el('camp-ini').events.click({target:{closest:s=>s==='#ci-rolar'?{}:null}});await tick();
 assert.equal(f.lista.length,2);assert.equal(f.lista[0].initiative,19);assert.equal(f.lista[1].initiative,13);
 assert.equal(f.lista[1].pid,'p');assert.equal(f.lista[1].hp,12);assert.equal(f.lista[1].ac,13);
 f.document.el('camp-ini').events.click({target:{closest:s=>s==='#ci-rolar'?{}:null}});await tick();assert.equal(f.lista.length,2);
});
test('selecionar e desmarcar todos não adiciona participantes por conta própria',async()=>{
 const f=await fixture();const click=id=>f.document.el('camp-ini').events.click({target:{closest:s=>s===id?{}:null}});
 click('#ci-todos');assert.match(f.document.el('ci-selecao').innerHTML,/Rolar iniciativa \(1\)/);assert.equal(f.lista.length,0);
 click('#ci-nenhum');assert.equal(f.document.el('ci-selecao').innerHTML,'');
});
test('permissão revogada após selecionar impede a adição em lote',async()=>{
 const f=await fixture();f.document.el('camp-ini').events.change({target:{dataset:{ciSel:'p'},checked:true}});
 f.nuvem.rpc=async()=>false;f.document.el('camp-ini').events.click({target:{closest:s=>s==='#ci-rolar'?{}:null}});await tick();
 assert.equal(f.lista.length,0);assert.equal(f.document.el('camp-ini').hidden,true);
});
test('pedido por URL valida os IDs na campanha e não duplica personagens',async()=>{
 const f=await fixture({search:'?campanha=atual&personagens=p,p,inacessivel&rolar=1'});
 assert.equal(f.lista.length,1);assert.equal(f.lista[0].pid,'p');assert.ok(Number.isFinite(f.lista[0].initiative));
 assert.equal(f.lista[0].campanhaId,'atual');
});
