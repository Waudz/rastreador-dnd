const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,executar}=require('./helpers.cjs');
function api(){const window={};executar('js/enquadramento.js',vm.createContext({window}));return window.ENQUADRAMENTO;}
test('enquadramento cobre a moldura sem deixar espaços vazios nos extremos do arraste',()=>{
 const E=api();for(const [iw,ih]of [[400,1200],[1200,400],[680,340]])for(const[w,h]of[[680,340],[340,220]])for(const z of[1,2,4])for(const x of[0,50,100]){const m=E.medir(iw,ih,w,h,{x,y:x,zoom:z});assert(m.x<=0&&m.y<=0);assert(m.x+m.largura>=w-1e-6);assert(m.y+m.altura>=h-1e-6);}
});
test('zoom altera a geometria mesmo quando a proporção original coincide com a moldura',()=>{const E=api(),a=E.medir(680,340,680,340,{zoom:1}),b=E.medir(680,340,680,340,{zoom:2});assert.equal(a.excessoY,0);assert.equal(b.excessoY,340);assert.notEqual(E.medir(680,340,680,340,{zoom:2,y:0}).y,E.medir(680,340,680,340,{zoom:2,y:100}).y);});
test('valores de zoom e arraste são limitados',()=>{const f=api().normalizar({x:-20,y:150,zoom:10});assert.equal(f.x,0);assert.equal(f.y,100);assert.equal(f.zoom,4);});

test('fundo desktop alcança somente a largura útil, com e sem barra de rolagem',()=>{const E=api();for(const janela of [840,900,1280,1440,1920,2560])for(const barra of [0,15,17]){const util=janela-barra,conteudo=Math.min(1120,util-48),x=(util-conteudo)/2,f=E.fundoDesktop(util,x);assert.equal(x+f.esquerda,0);assert.equal(x+f.esquerda+f.largura,util);assert.equal(conteudo,Math.min(1120,util-48));}});

test('resize do fundo não altera x/y/zoom configurados nem a proporção da imagem',()=>{const E=api(),frame={x:23,y:71,zoom:1.6},antes=JSON.stringify(frame);for(const w of [320,375,430,900,1280,1920]){const m=E.medir(1920,1080,w,340,frame);assert(Math.abs(m.largura/m.altura-1920/1080)<1e-12);assert.equal(JSON.stringify(frame),antes);}});
