/* Itens mágicos (classificação) e raridade (indicador): duas informações separadas, sem tocar em miniaturas nem no fundo do cartão. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,ler}=require('./helpers.cjs');
function amb(){
  const ctx=vm.createContext({window:{},console});
  for(const n of ['inventario','itens-efeitos','catalogo-itens'])vm.runInContext(ler('js/'+n+'.js'),ctx);
  const W=ctx.window,dados=JSON.parse(ler('dados/itens-srd2014.json')).itens;W.CAT_ITENS.indexar(dados);
  return {W,C:W.CAT_ITENS,I:W.INVENTARIO,IE:W.ITENS_EFEITOS,dados};
}
const inv=(A,id,tipo)=>{const x=A.C.paraInventario(A.C.obter(id),1,{tipo:'jogo'});return tipo?{...x,tipo}:x;};

test('classificação do catálogo: mágico é por categoria (magico, pocao, pergaminho) e coincide com ter raridade em todos os 578 itens',()=>{
  const A=amb();let magicos=0,mundanos=0;
  for(const i of A.dados){
    const m=A.C.ehMagicoCatalogo(i);
    assert.equal(m,A.C.CATEGORIAS_MAGICAS.includes(i.categoria),i.id);
    assert.equal(m,!!i.raridade,'categoria e raridade concordam: '+i.id);   // o dado não tem exceções; se tiver no futuro, este teste avisa
    m?magicos++:mundanos++;
  }
  assert.equal(magicos,294+37+10);assert.equal(mundanos,578-341);
  assert.equal(A.C.ehMagicoCatalogo(null),false);assert.equal(A.C.ehMagicoCatalogo({categoria:'magico',custom:true}),false,'item personalizado não é classificação do catálogo');
});

test('as quatro poções de cura são mágicas, com a raridade certa, mesmo como consumíveis',()=>{
  const A=amb();
  const esperado={'srd51:item/potion-of-healing-common':['comum','Comum'],'srd51:item/potion-of-healing-greater':['incomum','Incomum'],'srd51:item/potion-of-healing-superior':['rara','Rara'],'srd51:item/potion-of-healing-supreme':['muito-rara','Muito rara']};
  for(const [id,[chave,rotulo]] of Object.entries(esperado)){
    const cat=A.C.obter(id);assert.equal(cat.categoria,'pocao');assert.ok(A.C.ehMagicoCatalogo(cat));
    const it=A.C.paraInventario(cat,1,{tipo:'jogo'});
    assert.equal(it.tipo,'consumivel',id+': aparece como consumível no inventário');
    const m=A.C.infoMagica(it);assert.equal(m.magico,true,id);assert.equal(m.raridade.chave,chave,id);assert.equal(m.raridade.rotulo,rotulo,id);
  }
  /* o mesmo vale para a poção com efeito configurado (propriedades.raridade escrita) e para a gravada sem raridade */
  const comEfeito=A.IE.itemDoCatalogo('pocao-cura',{tipo:'jogo'});const m2=A.C.infoMagica({...comEfeito,catId:'srd51:item/potion-of-healing-common'});assert.equal(m2.magico,true);
  const antiga={nome:'Poção de cura',qtd:1,tipo:'consumivel',catId:'srd51:item/potion-of-healing-greater',propriedades:{}};
  const m3=A.C.infoMagica(antiga);assert.equal(m3.magico,true);assert.equal(m3.raridade.chave,'incomum','a raridade vem do catálogo quando o item não a guarda');
  const sem=A.C.infoMagica({nome:'Poção de cura',qtd:1,tipo:'consumivel',propriedades:{}});assert.equal(sem.magico,false,'sem vínculo, sem tipo mágico e sem raridade: não é classificado como mágico');
});

test('itens mundanos nunca são mágicos nem recebem raridade',()=>{
  const A=amb();let n=0;
  for(const i of A.dados.filter(x=>!A.C.CATEGORIAS_MAGICAS.includes(x.categoria))){
    const m=A.C.infoMagica(A.C.paraInventario(i.pacote?A.C.obter('srd51:item/backpack'):i,1,{tipo:'jogo'}));
    assert.equal(m.magico,false,i.id);assert.equal(m.raridade,null,i.id);n++;
  }
  assert.equal(n,237);
  assert.equal(A.C.infoMagica({nome:'Corda',qtd:1,tipo:'equipamento',propriedades:{}}).magico,false);assert.equal(A.C.infoMagica(null).magico,false);
  assert.equal(A.C.seloRaridade(null),'');
});

test('itens sem catálogo: tipo mágico, pergaminho com magia ou raridade escrita pelo mestre; raridade desconhecida não ganha cor',()=>{
  const A=amb();
  const m=A.C.infoMagica({nome:'Anel estranho',tipo:'magico',propriedades:{}});assert.equal(m.magico,true);assert.equal(m.raridade,null,'mágico sem raridade informada: sem indicador, sem inventar');
  for(const [txt,chave,rot] of [['Comum','comum','Comum'],['incomum','incomum','incomum'],['Raro','rara','Raro'],['Rara','rara','Rara'],['Muito raro','muito-rara','Muito raro'],['Lendário','lendaria','Lendário'],['LENDÁRIA','lendaria','LENDÁRIA'],['Artefato','artefato','Artefato']]){
    const x=A.C.infoMagica({nome:'x',tipo:'equipamento',propriedades:{raridade:txt}});
    assert.equal(x.magico,true,txt);assert.equal(x.raridade.chave,chave,txt);assert.equal(x.raridade.rotulo,rot,'o texto do mestre é mantido: '+txt);
  }
  const estranha=A.C.infoMagica({nome:'x',tipo:'magico',propriedades:{raridade:'Épico'}});assert.equal(estranha.magico,true);assert.equal(estranha.raridade.chave,null);assert.equal(estranha.raridade.rotulo,'Épico');
  assert.ok(!/rar-/.test(A.C.seloRaridade(estranha.raridade)),'sem cor para raridade desconhecida');assert.match(A.C.seloRaridade(estranha.raridade),/>Épico</);
  assert.equal(A.C.infoMagica({nome:'Pergaminho de Magia: Luz',tipo:'pergaminho',magiaVinculada:{en:'Light',n:'Luz',l:0},propriedades:{circulo:0}}).magico,true);
  assert.equal(A.C.infoMagica({nome:'Pergaminho em branco',tipo:'pergaminho',propriedades:{}}).magico,false,'pergaminho sem magia não é mágico');
  assert.equal(A.C.infoMagica({nome:'Faca',tipo:'equipamento',propriedades:{}}).magico,false);
});

test('indicador de raridade: texto sempre presente, escapado, e uma chave de cor por raridade',()=>{
  const A=amb();
  for(const [k,r] of [['common','comum'],['uncommon','incomum'],['rare','rara'],['very-rare','muito-rara'],['legendary','lendaria'],['artifact','artefato']]){
    assert.equal(A.C.chaveRaridade(k),r);const h=A.C.seloRaridade({chave:r,rotulo:A.C.RARIDADES[k]});
    assert.ok(h.includes('class="inv-raridade rar-'+r+'"')&&h.includes('>'+A.C.RARIDADES[k]+'<'),h);
  }
  assert.ok(A.C.seloRaridade({chave:null,rotulo:'<b>x</b>'}).includes('&lt;b&gt;'),'escapa HTML');
  assert.equal(A.C.chaveRaridade('invalida'),null);assert.equal(A.C.chaveRaridade(''),null);
});

test('CSS: seis raridades com cores distintas só no indicador; mágico = nome dourado + tag; sem mexer em miniatura, moldura ou fundo do cartão',()=>{
  const css=ler('css/fichas.css'),bloco=css.slice(css.indexOf('Item mágico (classificação)'));
  const cores=Object.fromEntries([...bloco.matchAll(/\.rar-([a-z-]+)\{--rar:(#[0-9A-Fa-f]{6})\}/g)].map(m=>[m[1],m[2].toLowerCase()]));
  assert.equal(JSON.stringify(Object.keys(cores).sort()),JSON.stringify(['artefato','comum','incomum','lendaria','muito-rara','rara']));
  assert.equal(new Set(Object.values(cores)).size,6,'seis cores diferentes');
  const matiz=h=>{const r=parseInt(h.slice(1,3),16)/255,g=parseInt(h.slice(3,5),16)/255,b=parseInt(h.slice(5,7),16)/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;if(!d)return -1;let h6=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;return Math.round(((h6*60)+360)%360);};
  assert.equal(matiz(cores.comum)<0||Math.abs(matiz(cores.comum)-210)<40,true,'comum: cinza (matiz fraco)');
  const m=Object.fromEntries(Object.entries(cores).map(([k,v])=>[k,matiz(v)]));
  assert.ok(m.incomum>=120&&m.incomum<=160,'incomum verde '+m.incomum);assert.ok(m.rara>=200&&m.rara<=225,'rara azul '+m.rara);assert.ok(m['muito-rara']>=250&&m['muito-rara']<=275,'muito rara roxo '+m['muito-rara']);
  assert.ok(m.lendaria>=30&&m.lendaria<=45,'lendária dourado '+m.lendaria);assert.ok(m.artefato<20||m.artefato>340,'artefato coral/vermelho, distinto '+m.artefato);
  assert.match(bloco,/\.item-magico \.inv-nome-txt\{color:color-mix\(in srgb,var\(--gold,#D4AE72\) 82%,var\(--text,#F3E9D5\)\)\}/);
  assert.match(bloco,/\.inv-magico-tag::before\{content:"✦"/);
  assert.ok(!/\.item-magico\s*\{|\.item-magico[^{]*(background|border)|\.inv-thumb|\.itens-card\s*\{/.test(bloco),'miniatura, moldura e fundo do cartão não foram alterados');
  assert.ok(!/(?:^|[;{\s])height\s*:|max-height/.test(bloco.replace(/\.inv-raridade::before\{[^}]*\}/,'')),'sem alturas fixas (o ponto do indicador tem 8 px; os cartões não)');
});

test('interface: lista, grade e barra lateral do inventário e o catálogo usam a mesma classificação',()=>{
  const p=ler('js/personagem.js'),t=ler('js/itens.js');
  assert.ok(p.includes('CAT().infoMagica(it)')&&p.includes('<span class="inv-selos">')&&p.includes('<span class="inv-magico-tag">Mágico</span>')&&p.includes('</span></span>${selos}${resumo ?')&&p.includes('CAT().seloRaridade(mg.raridade)'));
  assert.ok(p.includes('${mg.magico ? " item-magico" : ""}'),'o cartão do inventário (lista, grade e barra lateral usam o mesmo cartão)');
  assert.ok(t.includes('C.ehMagicoCatalogo(it) ? " item-magico" : ""')&&t.includes('<span class="inv-magico-tag">Mágico</span>')&&t.includes('C.seloRaridade('),'cartão do catálogo');
  assert.ok(!/class="inv-thumb[^"]*(magico|item-magico)/.test(p+t),'a miniatura não recebe classe nem símbolo extra');
  assert.ok(ler('personagem.html').includes('catalogo-itens.js')&&ler('itens.html').includes('catalogo-itens.js'));
});
