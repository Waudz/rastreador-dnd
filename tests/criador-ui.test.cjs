const {test}=require('node:test'),assert=require('node:assert/strict');const {vm,ler,executar,documentoFalso,armazenamento,tick}=require('./helpers.cjs');
async function tela(search,{preservado=false,nivel=3,extras=[]}={}){const document=documentoFalso(),eventos={},localStorage=armazenamento(),dados=JSON.parse(ler('dados/criacao-srd2014.json')),magias=JSON.parse(ler('dados/magias.json'));document.addEventListener=(nome,fn)=>(eventos[nome]??=[]).push(fn);
 const c=vm.createContext({window:{addEventListener(){}},document,localStorage,location:{search},URLSearchParams,console,EDICOES:{permitida:()=>true},setTimeout:()=>0,clearTimeout(){},confirm:()=>true,fetch:async url=>({ok:true,json:async()=>url.includes('criacao-srd')?dados:magias})});for(const n of ['origens','regras','texto-regras','magias-jogo','subclasses-2014','criador-regras'])executar('js/'+n+'.js',c);Object.assign(c,c.window);
 const C=c.CRIADOR;C.configurar(dados,magias);let p=C.iniciar({id:'sintetico-ui',nome:'Teste UI',versao:1,pv_max:28,pv_atual:23,inventario:[],dinheiro:{},ficha:{classes:[{c:'Fighter',n:3,sub:'Cavaleiro Místico'}],raca:'Humano',backgroundId:'soldado'}},'criacao');p.ficha.criacao.base={for:15,des:14,con:13,int:12,sab:10,car:8};C.reconciliarNiveis(p.ficha);p=C.derivar(p);p.ficha.classes[0].n=nivel;if(preservado)p.ficha.criacao.metodo='preservado';c.nuvem={esc:s=>String(s??''),usuario:()=>({id:'u'}),get:async()=>[p]};for(const n of extras)executar('js/'+n+'.js',c);Object.assign(c,c.window);executar('js/criador.js',c);await tick();await tick();return {document,eventos,localStorage};}
test('escolher a nova magia não redesenha e perde os valores escolhidos para a troca',async()=>{const f=await tela('?id=sintetico-ui&modo=nivel'),box=f.document.el('criador-conteudo'),alvo=f.document.el('troca-para');let html=box.innerHTML;Object.defineProperty(box,'innerHTML',{get:()=>html,set:v=>{html=v;alvo.value='RESETADO';}});alvo.value='srd51:spell/sleep';for(const fn of f.eventos.change)fn({target:{id:'troca-para',dataset:{},value:alvo.value,hasAttribute:()=>false}});assert.equal(alvo.value,'srd51:spell/sleep','a escolha do usuário não volta à primeira opção');});
test('evento de atributo base no modo nível não altera o rascunho preservado',async()=>{const f=await tela('?id=sintetico-ui&modo=nivel');for(const fn of f.eventos.change)fn({target:{id:'base',dataset:{base:'for'},value:'8',hasAttribute:()=>false}});const estado=[...f.localStorage.dados.values()].map(v=>JSON.parse(v)).find(v=>v.p);assert.equal(estado.p.ficha.criacao.base.for,15);});

const mudar=async(f,dataset,value)=>{for(const fn of f.eventos.change)await fn({target:{id:'teste',dataset,value,hasAttribute:()=>false}});};
const atributos=async f=>{for(const fn of f.eventos.click)await fn({target:{closest:()=>({dataset:{etapa:'3'}})}});};
const rascunho=f=>[...f.localStorage.dados.values()].map(v=>JSON.parse(v)).find(v=>v.p).p;
test('edição expõe e salva atributos base preservados; evolução continua bloqueada',async()=>{
 const f=await tela('?id=sintetico-ui&modo=editar',{preservado:true});await atributos(f);assert.match(f.document.el('criador-conteudo').innerHTML,/data-base="for"/);await mudar(f,{base:'for'},'13');assert.equal(rascunho(f).ficha.criacao.base.for,13);assert.equal(rascunho(f).ficha.criacao.baseEditada,true);
});
test('trocar entre talento e atributos elimina a escolha incompatível e oferece seletor',async()=>{
 const f=await tela('?id=sintetico-ui&modo=editar',{nivel:4});await mudar(f,{asi:'Fighter:4',i:'0'},'for');await mudar(f,{asi:'Fighter:4',i:'1'},'for');await mudar(f,{melhoriaModo:'Fighter:4'},'talento');assert.equal(rascunho(f).ficha.melhorias['Fighter:4'],undefined);await atributos(f);assert.match(f.document.el('criador-conteudo').innerHTML,/data-talento-escolha/);await mudar(f,{talentoEscolha:'Fighter:4'},'srd51:feat/grappler');assert.equal(rascunho(f).ficha.criacao.talentos['Fighter:4'].id,'srd51:feat/grappler');await mudar(f,{melhoriaModo:'Fighter:4'},'atributos');assert.equal(rascunho(f).ficha.criacao.talentos['Fighter:4'],undefined);
});

test('edição mostra orçamento e rejeita aumentar atributo sem pontos disponíveis',async()=>{
 const f=await tela('?id=sintetico-ui&modo=editar',{preservado:true});await atributos(f);assert.match(f.document.el('criador-conteudo').innerHTML,/0 pontos restantes/);await mudar(f,{base:'car'},'15');assert.match(f.document.el('aviso').textContent,/Não há pontos suficientes/);await mudar(f,{base:'for'},'14');assert.equal(rascunho(f).ficha.criacao.base.car,8);assert.match(f.document.el('criador-conteudo').innerHTML,/2 pontos restantes/);
});

test('resumo de atributos inclui bônus racial e somente a melhoria do nível permitido',async()=>{
 const f=await tela('?id=sintetico-ui&modo=editar',{nivel:4});await mudar(f,{asi:'Fighter:4',i:'0'},'for');await mudar(f,{asi:'Fighter:4',i:'1'},'for');await atributos(f);const html=f.document.el('criador-conteudo').innerHTML;assert.ok(html.includes('Base 15 · Raça +1 · Nível +2'));assert.ok(html.includes('Soma dos valores finais: <strong>80</strong>'));assert.match(html,/0 pontos restantes/);
});
const clicarBotao=async(f,dataset)=>{for(const fn of f.eventos.click)await fn({target:{closest:s=>s==='button'?{dataset,id:''}:null}});};
test('criação/edição com mais de 1 nível: PV por nível com média, rolagem no app ou resultado físico, e o total muda',async()=>{
 const f=await tela('?id=sintetico-ui&modo=editar',{nivel:3});await atributos(f);
 let html=f.document.el('criador-conteudo').innerHTML;assert.match(html,/Pontos de vida por nível/);assert.match(html,/data-pv-rolar="1"/);assert.match(html,/Rolar d10 no app/);assert.match(html,/d10 no máximo/);
 const total=h=>+h.match(/Total de PV:<\/b> (\d+)/)[1],antes=total(html);
 await mudar(f,{pvValor:'1'},'10');await mudar(f,{pvValor:'2'},'10');html=f.document.el('criador-conteudo').innerHTML;
 assert.ok(total(html)>=antes,'dois dados no máximo não reduzem o total');assert.equal(rascunho(f).ficha.criacao.niveis[1].pv.valor,10);assert.equal(rascunho(f).ficha.criacao.niveis[1].pv.modo,'rolagem');
 await mudar(f,{pvValor:'1'},'11');assert.match(f.document.el('aviso').textContent,/entre 1 e 10/);assert.equal(rascunho(f).ficha.criacao.niveis[1].pv.valor,10,'valor inválido não altera');
 await clicarBotao(f,{pvRolar:'2'});const n=rascunho(f).ficha.criacao.niveis[2].pv;assert.equal(n.modo,'rolagem');assert.ok(n.valor>=1&&n.valor<=10);
 await mudar(f,{pvModo:'1'},'fixo');assert.equal(rascunho(f).ficha.criacao.niveis[1].pv.modo,'fixo');
});
test('equipamento inicial: armas mostram dano e tipo entre parênteses (e duas mãos nas versáteis)',async()=>{
 const f=await tela('?id=sintetico-ui',{extras:['ajuda-regras']});
 for(const fn of f.eventos.click)await fn({target:{closest:()=>({dataset:{etapa:'6'}})}});
 for(const i of [0,1,2,3])for(const o of [0,1])await mudar(f,{equip:'op:'+i},String(o));
 const h=f.document.el('criador-conteudo').innerHTML;
 assert.match(h,/\(1d8 cortante; duas mãos 1d10\)/,'Espada longa é versátil: 1d8 e 1d10 com as duas mãos');
 assert.match(h,/\(\d+d\d+ (cortante|perfurante|contundente)/);
});
test('marcar uma opção redesenha a etapa mas preserva o texto do filtro e o foco da opção marcada',()=>{
  const j=ler('js/criador.js');
  assert.match(j,/function filtrarEscolhas\(campo\)/);assert.match(j,/if\(e\.target\.hasAttribute\('data-busca-escolhas'\)\)filtrarEscolhas\(e\.target\);/);
  assert.match(j,/filtros=campos\.map\(c=>c\.value\)/);assert.match(j,/if\(filtros\[n\]\)\{c\.value=filtros\[n\];filtrarEscolhas\(c\);\}/,'o filtro digitado volta e é reaplicado depois do redesenho');
  assert.match(j,/alvo\.focus\(\{preventScroll:true\}\)/,'o foco volta para a opção marcada');
});
test('compra de pontos: a lista mostra o custo total e a variação no saldo; a explicação da regra aparece',()=>{
  const j=ler('js/criador.js');
  assert.match(j,/function rotulosCompra\(k\)/);assert.match(j,/seletor\(`data-base="\$\{k\}"`,rotulosCompra\(k\),st\(\)\.base\[k\]\)/);
  assert.match(j,/do 13 para o 14 e do 14 para o 15, cada ponto custa 2 \(o 14 custa 7 no total e o 15 custa 9\)/);assert.match(j,/', faltam '\+\(d-rest\)/);
});
