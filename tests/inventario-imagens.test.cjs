const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ler=p=>fs.readFileSync(p,'utf8');
function carregar(){const store={};const c=vm.createContext({window:{},localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)}},console,URL});vm.runInContext(ler('js/inventario-imagens.js'),c);return {II:c.window.INV_IMG,store};}
const img=n=>'data:image/jpeg;base64,'+'A'.repeat(n);
test('imagem do item: valida data URL e https; recusa http, javascript e tamanho excessivo',()=>{
  const {II}=carregar();
  assert.ok(II.valida(img(100)));assert.ok(II.valida('https://exemplo.com/a.png'));
  assert.ok(!II.valida('http://exemplo.com/a.png'));assert.ok(!II.valida('javascript:alert(1)'));assert.ok(!II.valida('data:text/html;base64,AAAA'));
  assert.ok(!II.valida(img(30000)));assert.ok(!II.valida('https://u:p@exemplo.com/a.png'));assert.ok(!II.valida('https://exemplo.com/a b.png'));
});
test('item do catálogo (ref) divide uma única imagem na ficha; item sem ref usa o uid',()=>{
  const {II}=carregar(),f={};
  const a={uid:'u1',ref:'pocao',nome:'Poção'},b={uid:'u2',ref:'pocao',nome:'Poção'},c={uid:'u3',ref:null,nome:'Corda'};
  assert.ok(II.definir(f,a,img(500)).ok);
  assert.equal(II.obter(f,b).src,img(500));assert.equal(Object.keys(f.imagensItens).length,1);
  assert.equal(II.obter(f,c),null);
  assert.ok(II.definir(f,c,'https://exemplo.com/c.png').ok);assert.equal(II.obter(f,c).src,'https://exemplo.com/c.png');
});
test('orçamento da ficha: passar do limite recusa a imagem enviada, mas aceita URL',()=>{
  const {II}=carregar(),f={};let n=0;
  while(II.definir(f,{uid:'i'+n,ref:null},img(20000)).ok&&n<50)n++;
  assert.ok(n>=5&&n<12,'cabem algumas imagens, não dezenas: '+n);
  const r=II.definir(f,{uid:'x',ref:null},img(20000));assert.equal(r.ok,false);assert.match(r.erro,/limite/);
  assert.ok(II.definir(f,{uid:'x',ref:null},'https://exemplo.com/x.png').ok);
});
test('limpar remove imagens de itens que sumiram; remover apaga a da ficha e a sugestão do aparelho',()=>{
  const {II,store}=carregar(),f={};
  const a={uid:'u1',ref:'pocao'},b={uid:'u2',ref:null};
  II.definir(f,a,img(300));II.definir(f,b,img(300));
  assert.ok(JSON.parse(store.dnd5e_item_img_v1).pocao,'catálogo vira sugestão do aparelho');
  assert.equal(II.limpar(f,[a]),true);assert.deepEqual(Object.keys(f.imagensItens),['pocao']);
  assert.equal(II.obter({},{uid:'z',ref:'pocao'}).origem,'aparelho','outro personagem recebe a sugestão sem copiar para a ficha');
  II.remover(f,a);assert.equal(II.obter(f,a),null);
  II.limpar(f,[]);assert.equal(f.imagensItens,undefined);
});
test('visualizador global e imagens de itens: carregados em todas as páginas e no cache da PWA',()=>{
  for(const h of fs.readdirSync('.').filter(x=>x.endsWith('.html'))){const t=ler(h);if(t.includes('js/icones.js'))assert.match(t,/js\/visualizador-imagem\.js/,h);}
  assert.match(ler('personagem.html'),/js\/inventario-imagens\.js/);
  const sw=ler('sw.js');assert.match(sw,/js\/visualizador-imagem\.js/);assert.match(sw,/js\/inventario-imagens\.js/);
  const v=ler('js/visualizador-imagem.js');assert.match(v,/Escape/);assert.match(v,/wheel/);assert.match(v,/pointerdown/);assert.match(v,/data-sem-ampliar/);
});
