const {test}=require('node:test'),assert=require('node:assert/strict');
const {vm,executar}=require('./helpers.cjs');
function fixture(){
 const estado={uid:'m',falhaUpload:false,falhaRpc:false,falhaLimpeza:false},chamadas=[];
 const base={campanha_id:'c',simbolo_path:'c/simbolo/antigo.png',backdrop_path:'c/backdrop/fundo.jpg',backdrop_y:50,backdrop_y_mobile:60,versao:4};
 const nuvem={usuario:()=>estado.uid?{id:estado.uid}:null,get:async()=>[{...base}],urlDoArquivo:async(p,t,b)=>{chamadas.push(['url',p,t,b]);return 'https://exemplo/'+p;},enviarArquivo:async(p,blob,b)=>{chamadas.push(['upload',p,b]);if(estado.falhaUpload)throw Error('upload falhou');},rpc:async(n,p)=>{chamadas.push(['rpc',n,p]);if(estado.falhaRpc)throw Error('gravação incerta');return {...base,simbolo_path:p.p_simbolo,backdrop_path:p.p_backdrop,versao:5};},apagarArquivos:async(p,b)=>{chamadas.push(['apagar',p,b]);if(estado.falhaLimpeza)throw Error('limpeza falhou');}};
 const window={nuvem},c=vm.createContext({window,nuvem,crypto:{randomUUID:()=> 'arquivo-novo'},Date,Map,Error});executar('js/campanha-imagens.js',c);
 return {I:window.CAMPANHA_IMAGENS,base,estado,chamadas,nuvem};
}
test('substituição só limpa a imagem antiga depois da confirmação versionada',async()=>{
 const f=fixture();const r=await f.I.salvar('c',f.base,{simbolo:{type:'image/png',size:100},posicao:40,posicaoMobile:65});
 assert.deepEqual(f.chamadas.map(c=>c[0]),['upload','rpc','url','url','apagar']);assert.equal(f.chamadas[0][2],'campanhas-visuais');assert.equal(f.chamadas[1][2].p_versao,4);assert.equal(r.visual.backdrop_path,f.base.backdrop_path);assert.deepEqual([...f.chamadas[4][1]],[f.base.simbolo_path]);
});
test('falha de upload preserva todos os arquivos e não grava referências',async()=>{
 const f=fixture();f.estado.falhaUpload=true;await assert.rejects(f.I.salvar('c',f.base,{simbolo:{type:'image/png',size:100}}),/upload/);assert.deepEqual(f.chamadas.map(c=>c[0]),['upload']);
});
test('falha ou resposta incerta da RPC nunca apaga imagem anterior nem novo upload',async()=>{
 const f=fixture();f.estado.falhaRpc=true;await assert.rejects(f.I.salvar('c',f.base,{simbolo:{type:'image/png',size:100}}),/incerta/);assert.ok(!f.chamadas.some(c=>c[0]==='apagar'));
});
test('remover símbolo preserva backdrop e falha de limpeza não vira falsa falha de gravação',async()=>{
 const f=fixture();f.estado.falhaLimpeza=true;const r=await f.I.salvar('c',f.base,{simbolo:null,posicao:50,posicaoMobile:50});assert.equal(r.visual.simbolo_path,null);assert.equal(r.visual.backdrop_path,f.base.backdrop_path);assert.match(r.aviso,/limpeza/);
});
test('formato e tamanho inválidos não chegam ao Storage',async()=>{
 for(const blob of [{type:'image/svg+xml',size:100},{type:'image/png',size:2097153}]){const f=fixture();await assert.rejects(f.I.salvar('c',f.base,{simbolo:blob}),/2 MB/);assert.equal(f.chamadas.length,0);}
});
test('URLs assinadas têm prazo curto e cache separado por usuário',async()=>{
 const f=fixture();await f.I.apresentar(f.base);await f.I.apresentar(f.base);assert.equal(f.chamadas.length,2);assert.equal(f.chamadas[0][2],300);assert.equal(f.chamadas[0][3],'campanhas-visuais');f.estado.uid='outra';await f.I.apresentar(f.base);assert.equal(f.chamadas.length,4);
});
test('troca de conta durante gravação rejeita resposta e não limpa os arquivos',async()=>{
 const f=fixture();f.nuvem.rpc=async()=>{f.estado.uid='outra';return {...f.base,versao:5};};await assert.rejects(f.I.salvar('c',f.base,{simbolo:null}),/conta mudou/);assert.ok(!f.chamadas.some(c=>c[0]==='apagar'));
});

test('falha na assinatura das novas imagens preserva os arquivos anteriores após confirmar a referência',async()=>{
 const f=fixture();f.nuvem.urlDoArquivo=async()=>{throw Error('assinatura indisponível');};const r=await f.I.salvar('c',f.base,{simbolo:{type:'image/png',size:100}});assert.equal(r.visual.versao,5);assert.match(r.aviso,/preservados/);assert.ok(!f.chamadas.some(c=>c[0]==='apagar'));
});
