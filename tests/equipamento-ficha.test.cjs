/* Ficha x inventário: equipar, desequipar, remover, trocar, persistir e diagnosticar fichas antigas sem alterá-las. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,ler}=require('./helpers.cjs');

function ambiente(){
  const ctx=vm.createContext({window:{},console});
  for(const n of ['origens','regras','magias-jogo','subclasses-2014','inventario','catalogo-itens','equipamento-ficha','criador-regras'])vm.runInContext(ler('js/'+n+'.js'),ctx);
  const W=ctx.window;W.CAT_ITENS.indexar(JSON.parse(ler('dados/itens-srd2014.json')).itens);
  W.CRIADOR.configurar(JSON.parse(ler('dados/criacao-srd2014.json')),JSON.parse(ler('dados/magias.json')));
  return {ctx,W,E:W.EQUIP_FICHA,R:W.REGRAS,C:W.CAT_ITENS,I:W.INVENTARIO,CR:W.CRIADOR};
}
const J=o=>JSON.parse(JSON.stringify(o));
const dentro=(W,id,qtd=1,extra={})=>W.CAT_ITENS.paraInventario(W.CAT_ITENS.obter(id),qtd,{tipo:'mestre'});
function pers(W,classe='Monk',ids=[]){
  const P={nome:'Teste',inventario:[],ficha:{classes:[{c:classe,n:1}],equip:{armadura:'',escudo:false,bonus:0},ataques:[]}};
  for(const id of ids)P.inventario.push(dentro(W,id));
  return P;
}
const Q='srd51:item/quarterstaff';

test('equipar uma arma do inventário cria a linha de ataque vinculada ao uid, sem criar item',()=>{
  const {W,E}=ambiente(),P=pers(W,'Monk',[Q]),n=P.inventario.length,it=P.inventario[0];
  E.equipar(P,it.uid);
  assert.equal(P.inventario.length,n);assert.equal(it.equipado,true);
  const a=P.ficha.ataques;assert.equal(a.length,1);
  assert.equal(a[0].itemUid,it.uid);assert.equal(a[0].armaId,Q);assert.equal(a[0].dado,'1d6');assert.equal(a[0].tipo,'contundente');assert.equal(a[0].atr,'for');assert.equal(a[0].prof,true);
  E.equipar(P,it.uid);assert.equal(P.ficha.ataques.length,1,'equipar de novo não duplica');
});

test('proficiência vem da classe: Mago com espada grande não é proficiente; Guerreiro é; Mago com bordão é',()=>{
  const {W,E}=ambiente();
  const mago=pers(W,'Wizard',['srd51:item/greatsword',Q]),g=pers(W,'Fighter',['srd51:item/greatsword']);
  E.equipar(mago,mago.inventario[0].uid);E.equipar(mago,mago.inventario[1].uid);E.equipar(g,g.inventario[0].uid);
  assert.equal(mago.ficha.ataques[0].prof,false);assert.equal(mago.ficha.ataques[1].prof,true);assert.equal(g.ficha.ataques[0].prof,true);
  assert.equal(mago.ficha.ataques[0].dado,'2d6');
});

test('acuidade e arma à distância definem o atributo; Monge só usa espada curta entre as marciais',()=>{
  const {W,E}=ambiente(),P=pers(W,'Monk',['srd51:item/dagger','srd51:item/shortbow','srd51:item/shortsword','srd51:item/longsword']);
  P.inventario.forEach(i=>E.equipar(P,i.uid));
  const por=id=>P.ficha.ataques.find(a=>a.armaId===id);
  assert.equal(por('srd51:item/dagger').atr,'acuidade');assert.equal(por('srd51:item/shortbow').atr,'des');assert.equal(por('srd51:item/shortbow').distancia,true);
  assert.equal(por('srd51:item/shortsword').prof,true);assert.equal(por('srd51:item/longsword').prof,false);
});

test('desequipar tira a linha da ficha mas mantém o item, a quantidade e os dados',()=>{
  const {W,E}=ambiente(),P=pers(W,'Monk',[Q]),it=P.inventario[0];E.equipar(P,it.uid);
  const antes=J({...it,equipado:false});E.desequipar(P,it.uid);
  assert.equal(P.ficha.ataques.length,0);assert.equal(P.inventario.length,1);assert.deepEqual(J(it),antes);
});

test('remover do inventário um item equipado atualiza a ficha (arma, armadura e escudo)',()=>{
  const {W,E,R}=ambiente(),P=pers(W,'Fighter',[Q,'srd51:item/chain-mail','srd51:item/shield']);
  P.inventario.forEach(i=>E.equipar(P,i.uid));
  assert.equal(P.ficha.equip.armadura,'malha');assert.equal(P.ficha.equip.escudo,true);assert.equal(P.ficha.ataques.length,1);
  P.inventario.splice(0,3);                       // exclusão
  const r=E.reconciliar(P);
  assert.equal(r.mudou,true);assert.equal(P.ficha.ataques.length,0);assert.equal(P.ficha.equip.armadura,'');assert.equal(P.ficha.equip.escudo,false);
  assert.ok(!('armaduraUid' in P.ficha.equip)&&!('escudoUid' in P.ficha.equip));
  /* quantidade zerada (descarte) também desfaz */
  const Q2=pers(W,'Monk',[Q]);E.equipar(Q2,Q2.inventario[0].uid);Q2.inventario[0].qtd=0;E.reconciliar(Q2);assert.equal(Q2.ficha.ataques.length,0);
});

test('trocar de armadura e de escudo desequipa o anterior sem criar itens',()=>{
  const {W,E}=ambiente(),P=pers(W,'Fighter',['srd51:item/leather-armor','srd51:item/chain-mail','srd51:item/shield']),[couro,malha,esc]=P.inventario,n=P.inventario.length;
  E.equipar(P,couro.uid);assert.equal(P.ficha.equip.armadura,'couro');
  E.equipar(P,malha.uid);assert.equal(P.ficha.equip.armadura,'malha');assert.equal(couro.equipado,false);assert.equal(malha.equipado,true);assert.equal(P.ficha.equip.armaduraUid,malha.uid);
  E.equipar(P,esc.uid);assert.equal(P.ficha.equip.escudo,true);E.desequipar(P,esc.uid);assert.equal(P.ficha.equip.escudo,false);
  assert.equal(P.inventario.length,n);
  E.desequipar(P,malha.uid);assert.equal(P.ficha.equip.armadura,'');
});

test('itens iguais têm uid próprio e equipam/desequipam de forma independente',()=>{
  const {W,E}=ambiente(),P=pers(W,'Rogue',['srd51:item/dagger','srd51:item/dagger']);
  assert.notEqual(P.inventario[0].uid,P.inventario[1].uid);
  E.equipar(P,P.inventario[0].uid);E.equipar(P,P.inventario[1].uid);assert.equal(P.ficha.ataques.length,2);
  E.desequipar(P,P.inventario[0].uid);assert.equal(P.ficha.ataques.length,1);assert.equal(P.ficha.ataques[0].itemUid,P.inventario[1].uid);assert.equal(P.inventario[1].equipado,true);
});

test('renomear o item não quebra o vínculo: a linha acompanha o nome',()=>{
  const {W,E}=ambiente(),P=pers(W,'Monk',[Q]),it=P.inventario[0];E.equipar(P,it.uid);
  it.nome='Cajado do Pedro';const r=E.reconciliar(P);
  assert.equal(P.ficha.ataques.length,1);assert.equal(P.ficha.ataques[0].nome,'Cajado do Pedro');assert.equal(P.ficha.ataques[0].itemUid,it.uid);assert.equal(r.removidos.length,0);
});

test('persistência: salvar e reabrir (JSON) mantém os vínculos e o diagnóstico fica limpo',()=>{
  const {W,E}=ambiente(),P=pers(W,'Fighter',[Q,'srd51:item/chain-mail','srd51:item/shield']);P.inventario.forEach(i=>E.equipar(P,i.uid));
  const R2=J(P);assert.equal(E.reconciliar(R2).mudou,false);
  const d=E.diagnosticar(R2);
  assert.equal(JSON.stringify(d.ataques.map(a=>a.estado)),'["vinculado"]');assert.equal(d.armadura.estado,'vinculado');assert.equal(d.escudo.estado,'vinculado');assert.equal(d.equipadosSemVinculo.length,0);
});

test('item sem vínculo com o catálogo não equipa e explica o motivo',()=>{
  const {W,E,I}=ambiente(),P=pers(W,'Monk');const it=I.novoItem({nome:'Bastão',qtd:1,peso:2});P.inventario.push(it);
  assert.throws(()=>E.equipar(P,it.uid),/ligado ao catálogo/);
  const po=pers(W,'Monk',['srd51:item/backpack']);assert.throws(()=>E.equipar(po,po.inventario[0].uid),/não é arma/);
  assert.throws(()=>E.equipar(po,'nao-existe'),/não está no inventário/);
});

test('criação: armas, a primeira armadura e o primeiro escudo já nascem equipados e vinculados',()=>{
  const {CR,W}=ambiente();
  const p=CR.iniciar({nome:'Tank',versao:1,pv_max:10,pv_atual:10,inventario:[],dinheiro:{po:0},ficha:{}},'criacao');
  p.ficha.classes=[{c:'Fighter',n:1,sub:''}];p.ficha.raca='Humano';p.ficha.backgroundId='soldado';
  const d=CR.classe('Fighter').data;
  d.startingChoices.forEach((g,i)=>{p.ficha.criacao.equipamento['op:'+i]=0;g.options[0].items.forEach((x,j)=>{if(x.category)for(let k=0;k<(x.count||1);k++)p.ficha.criacao.equipamento[`item:${i}:${j}:${k}`]=CR.itemCategoria(x.category)[0].id;});});
  const s=CR.salvamento(CR.derivar(p),{modo:'criacao',original:p}),inv=s.dados.inventario,f=s.dados.ficha;
  assert.equal(f.equip.armadura,'malha');
  const malha=inv.find(i=>i.catId==='srd51:item/chain-mail');assert.equal(f.equip.armaduraUid,malha.uid);assert.equal(malha.equipado,true);
  assert.ok(f.ataques.length>=1);
  for(const a of f.ataques){const it=inv.find(i=>i.uid===a.itemUid);assert.ok(it,'ataque aponta para item existente: '+a.nome);assert.equal(it.equipado,true);assert.equal(it.catId,a.armaId);}
  const d2=W.EQUIP_FICHA.diagnosticar({inventario:inv,ficha:f});
  assert.ok(d2.ataques.every(a=>a.estado==='vinculado'));assert.equal(d2.armadura.estado,'vinculado');assert.equal(d2.equipadosSemVinculo.length,0);
  /* editar não mexe em equipamento nem em vínculos */
  const salvo={nome:'Tank',versao:2,pv_max:s.pv.max,pv_atual:s.pv.atual,inventario:inv,dinheiro:s.dados.dinheiro,ficha:f};
  const e=CR.salvamento(CR.derivar(CR.iniciar(salvo,'editar')),{modo:'editar',original:salvo});
  assert.deepEqual(J(e.dados.inventario),J(inv));assert.deepEqual(J(e.dados.ficha.ataques),J(f.ataques));assert.equal(e.dados.ficha.equip.armaduraUid,malha.uid);
});

/* ---------- fichas antigas: diagnóstico sem alterar ---------- */
function pedro(W){
  /* ficha manual como a do Pedro: itens sem vínculo, linha de ataque só com nome, peso personalizado */
  return {nome:'Pedro',inventario:[
    {uid:'a1',nome:'Bastão',qtd:1,peso:2.5,tipo:'equipamento',origem:{tipo:'mestre'},propriedades:{},ref:null},
    {uid:'a2',nome:'Dardo',qtd:10,peso:0.25,tipo:'equipamento',origem:{tipo:'inicial'},propriedades:{},ref:null},
    {uid:'a3',id:'srd51:item/backpack',catId:'srd51:item/backpack',nome:'Mochila',qtd:1,peso:2.5,tipo:'equipamento',origem:{tipo:'criacao'},propriedades:{}},
    {uid:'a4',nome:'Amuleto estranho',qtd:1,peso:0,tipo:'outro',origem:{tipo:'mestre'},propriedades:{}},
    {uid:'a5',nome:'Corda',qtd:1,peso:5,ref:'srd51:item/rope-hempen-50-feet',tipo:'equipamento',origem:{tipo:'jogo'},propriedades:{}},
  ],ficha:{classes:[{c:'Monk',n:1}],equip:{armadura:'',escudo:false,bonus:0},ataques:[{nome:'Bastão',dado:'1d6',tipo:'contundente',atr:'for',prof:true,magico:0,extra:0},{nome:'Personalizado',dado:'1d4',tipo:'cortante',atr:'for',prof:true,magico:0,extra:0},{nome:'Clava',dado:'1d4',tipo:'contundente',atr:'for',prof:true,magico:0,extra:0}],imagensItens:{a1:'data:image/png;base64,AAAA'}}};
}
test('diagnóstico lê a ficha antiga sem alterar nada e propõe vínculos seguros',()=>{
  const {W,E}=ambiente(),P=pedro(W),antes=JSON.stringify(P),d=E.diagnosticar(P);
  assert.equal(JSON.stringify(P),antes,'somente leitura');
  const est=uid=>d.itens.find(i=>i.uid===uid);
  assert.equal(est('a1').estado,'contexto');assert.equal(est('a1').proposta.catId,Q,'Bastão com linha de ataque = arma, não o bastão mágico');assert.ok(est('a1').candidatos.length>=2);
  assert.equal(est('a2').estado,'nome-unico');assert.equal(est('a2').proposta.catId,'srd51:item/dart');
  assert.equal(est('a4').estado,'personalizado');
  assert.equal(est('a5').estado,'vinculo-incompleto');assert.equal(est('a5').proposta.catId,'srd51:item/rope-hempen-50-feet');
  assert.ok(!est('a3'),'item com catId já está certo');
  const atq=n=>d.ataques.find(a=>a.nome===n);
  assert.equal(atq('Bastão').estado,'vinculavel');assert.equal(atq('Bastão').proposta.itemUid,'a1');
  assert.equal(atq('Personalizado').estado,'manual');assert.equal(atq('Clava').estado,'sem-item','arma na ficha sem item no inventário é só relatada');
});

test('correção explícita só preenche vínculos: nome, quantidade, peso, origem e imagens ficam iguais',()=>{
  const {W,E}=ambiente(),P=pedro(W),antes=J(P);
  E.aplicarVinculos(P,{contexto:true});
  P.inventario.forEach((it,i)=>{const o=antes.inventario[i];for(const k of ['uid','nome','qtd','peso','tipo','origem','propriedades'])assert.deepEqual(J(it[k]),J(o[k]),k+' de '+o.nome);});
  assert.equal(P.inventario[0].catId,Q);assert.equal(P.inventario[0].ref,Q);assert.equal(P.inventario[0].peso,2.5,'peso personalizado do Pedro preservado');
  assert.equal(P.inventario[1].catId,'srd51:item/dart');assert.equal(P.inventario[3].catId,undefined);
  assert.equal(P.ficha.ataques[0].itemUid,'a1');assert.equal(P.ficha.ataques[0].dado,'1d6');
  assert.equal(P.ficha.ataques.length,3);assert.deepEqual(J(P.ficha.imagensItens),antes.ficha.imagensItens);
  assert.equal(P.ficha.ataques[2].itemUid,undefined,'linha sem item não é tocada');
  /* sem a opção de contexto, o Bastão ambíguo não é ligado */
  const Q2=pedro(W);E.aplicarVinculos(Q2);assert.equal(Q2.inventario[0].catId,undefined);
});

test('reconciliar não mexe em fichas antigas sem vínculo',()=>{
  const {W,E}=ambiente(),P=pedro(W),antes=JSON.stringify(P);
  assert.equal(E.reconciliar(P).mudou,false);assert.equal(JSON.stringify(P),antes);
});

/* ---------- catálogo e imagens ---------- */
test('item digitado à mão: nome único recebe o ID; nome ambíguo não é adivinhado',()=>{
  const {C}=ambiente();
  assert.equal(C.idPorNomeUnico('Dardo'),'srd51:item/dart');assert.equal(C.idPorNomeUnico('  dardo '),'srd51:item/dart');
  assert.equal(C.idPorNomeUnico('Bastão'),null);assert.equal(C.idPorNomeUnico('Item inventado'),null);assert.equal(C.idPorNomeUnico('Pacote de Explorador'),null,'pacotes ficam de fora');
});

test('imagens: item vinculado depois continua achando a imagem enviada pelo uid e a imagem do catálogo; limpeza não apaga',()=>{
  const {ctx,W}=ambiente();vm.runInContext(ler('js/inventario-imagens.js'),ctx);
  const IMG=W.INV_IMG,url='https://exemplo.test/b.png',dat='data:image/png;base64,iVBORw0KGgo=';
  const f={imagensItens:{a1:dat}},semVinculo={uid:'a1',nome:'Bastão'},vinculado={uid:'a1',nome:'Bastão',catId:Q,ref:Q};
  assert.equal(IMG.obter(f,semVinculo).src,dat);
  assert.equal(IMG.obter(f,vinculado).src,dat,'a imagem do uid continua valendo depois de vincular');
  assert.equal(IMG.limpar(f,[vinculado]),false);assert.ok(f.imagensItens.a1,'limpar não apaga a imagem do uid de um item vivo');
  /* imagem do catálogo (admin) aparece para o item vinculado, e só para ele */
  W.CATALOGO={registros:()=>[],imagem:(t,k)=>t==='item'&&k===Q?url:undefined};
  assert.equal(IMG.obter({},vinculado).src,url);assert.equal(IMG.obter({},semVinculo),null);
  /* imagens do catálogo guardadas por ref continuam valendo */
  const g={imagensItens:{[Q]:dat}};assert.equal(IMG.obter(g,vinculado).src,dat);
  assert.equal(IMG.limpar(g,[{uid:'z',ref:Q}]),false);
  /* item que saiu do inventário perde a imagem própria (comportamento existente) */
  assert.equal(IMG.limpar({imagensItens:{x:dat}},[vinculado]),true);
});
