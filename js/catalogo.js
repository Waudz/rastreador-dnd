/* Serviço único do catálogo global; mesma tabela, Storage para as imagens e RPC versionada. */
window.CATALOGO=(()=>{
 "use strict";
 const BUCKET='catalogos',CACHE='dnd5e_catalogo_global_v1',clonar=o=>JSON.parse(JSON.stringify(o));
 let dados={globais:{}},marca='',pendente=null,iniciado=false;
 try{const c=nuvem.usuario()?JSON.parse(localStorage.getItem(CACHE)||'null'):null;if(c?.globais&&typeof c.globais==='object'&&!Array.isArray(c.globais))dados={globais:c.globais};}catch(_){}
 const admin=()=>!!window.ACESSO?.admin?.();
 const registros=tipo=>Object.values(dados.globais||{}).filter(r=>r&&r.tipo===tipo);
 const registro=(tipo,chave)=>dados.globais?.[tipo+':'+chave]||null;
 function url(path){return path?window.NUVEM_CONFIG.url+'/storage/v1/object/public/'+BUCKET+'/'+path.split('/').map(encodeURIComponent).join('/'):null;}
 function imagem(tipo,chave){const r=registro(tipo,chave);return r?.imagemDefinida?url(r.imagem):undefined;}
 function avisar(){try{localStorage.setItem(CACHE,JSON.stringify({globais:dados.globais||{}}));}catch(_){}if(typeof CustomEvent!=='undefined')window.dispatchEvent?.(new CustomEvent('catalogo:atualizado'));}
 /* Visitante sem conta: o JSON do catálogo continua fechado (catalogo_publicado não é legível por anon), mas os CAMINHOS das imagens públicas vêm de uma função mínima.
    Só aceita caminhos no formato do bucket público; qualquer falha (função ainda não instalada, sem rede) deixa tudo como estava: ícones padrão. Nada vai para o localStorage. */
 const CAMINHO=/^(itens|monstros)\/[0-9a-f-]{36}\.(jpg|png|webp)$/;
 async function carregarPublico(){
  if(pendente)return pendente;
  pendente=(async()=>{
   try{
    const r=await nuvem.catalogoImagensPublicas?.(),lista=Array.isArray(r)?r:[],g={};
    for(const x of lista)if(x&&(x.tipo==='item'||x.tipo==='monstro')&&typeof x.chave==='string'&&/^[A-Za-z0-9_:/.-]{1,180}$/.test(x.chave)&&(x.imagem===null||(typeof x.imagem==='string'&&CAMINHO.test(x.imagem))))g[x.tipo+':'+x.chave]={tipo:x.tipo,chave:x.chave,imagem:x.imagem,imagemDefinida:true};   // imagem null = o administrador removeu a imagem (continua valendo para o visitante)
    dados={globais:g};if(typeof CustomEvent!=='undefined')window.dispatchEvent?.(new CustomEvent('catalogo:atualizado'));
   }catch(_){/* sem imagens públicas: os ícones padrão continuam */}
   return dados;
  })();try{return await pendente;}finally{pendente=null;}
 }
 async function carregar(forcar=false){
  if(!nuvem.usuario()){dados={globais:{}};marca='';try{localStorage.removeItem(CACHE);}catch(_){}return carregarPublico();}
  if(pendente)return pendente;
  pendente=(async()=>{
   const ler=campos=>nuvem.get('catalogo_publicado?select='+campos+'&id=eq.2014');
   const meta=await ler('atualizado_em'),nova=meta[0]?.atualizado_em||'';
   if(!forcar&&marca&&nova===marca)return dados;
   const rows=await ler('dados,atualizado_em'),row=rows[0];if(!row)return dados;
   dados={...(row.dados||{}),globais:row.dados?.globais||{}};marca=row.atualizado_em||'';avisar();return dados;
  })();try{return await pendente;}finally{pendente=null;}
 }
 function iniciar(){if(iniciado)return;iniciado=true;carregar(true).catch(e=>window.FEEDBACK?.mostrar('Catálogo: '+e.message,{erro:true}));nuvem.observar?.(()=>carregar(),5000);window.addEventListener?.('online',()=>carregar(true).catch(()=>{}));}
 async function exigirAdmin(){if(!nuvem.usuario()||await window.ACESSO?.pronto!==true||!admin())throw Error('Somente administradores editam os catálogos globais.');}
 function blobDe(src){
  if(typeof Blob!=='undefined'&&src instanceof Blob)return src;
  const m=/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(src||'');if(!m)throw Error('Envie uma imagem PNG, JPEG ou WebP.');
  const b=atob(m[2]),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return new Blob([a],{type:m[1]});
 }
 async function enviarImagem(tipo,src){
  await exigirAdmin();const blob=blobDe(src),ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[blob.type];
  if(!ext||!blob.size||blob.size>2097152)throw Error('Use uma imagem PNG, JPEG ou WebP de até 2 MB.');
  const path=(tipo==='item'?'itens':'monstros')+'/'+crypto.randomUUID()+'.'+ext;
  await nuvem.enviarArquivo(path,blob,BUCKET);return path;
 }
 async function salvar(tipo,chave,valor,opcoes={}){
  await exigirAdmin();const uid=nuvem.usuario().id;await carregar(true);const anterior=registro(tipo,chave),versao=opcoes.versao??anterior?.versao??0;
  const alterar=Object.prototype.hasOwnProperty.call(opcoes,'imagem');
  const path=alterar&&opcoes.imagem?await enviarImagem(tipo,opcoes.imagem):null;
  if(nuvem.usuario()?.id!==uid)throw Error('A conta mudou. Reabra o catálogo.');
  const d=valor?clonar(valor):null;if(d){delete d.imagem;delete d.photo;delete d.global;}
  const r=await nuvem.rpc('salvar_catalogo_global',{p_tipo:tipo,p_chave:chave,p_dados:d,p_alterar_imagem:alterar,p_imagem:path,p_excluido:!!opcoes.excluido,p_versao:versao});
  const reg=Array.isArray(r)?r[0]:r;if(!reg||reg.chave!==chave||reg.versao!==versao+1)throw Error('O servidor não confirmou a alteração do catálogo.');
  dados.globais={...(dados.globais||{}),[tipo+':'+chave]:reg};marca='';avisar();window.FEEDBACK?.mostrar('Catálogo atualizado para todos os usuários.');return reg;
 }
 function monstros(base){const mapa=new Map(base.map(m=>[m.key,m]));for(const r of registros('monstro')){if(r.excluido){mapa.delete(r.chave);continue;}if(r.dados)mapa.set(r.chave,{...clonar(r.dados),global:true});}return [...mapa.values()];}
 async function atualizar({registros:mon=[],fotos=[],nomes={}}={}){
  await exigirAdmin();await carregar(true);
  const porChave=new Map(mon.map(m=>[m.key,m]));
  for(const img of fotos){const m=porChave.get(img.key);if(m&&!m.custom)await salvar('monstro',m.key,null,{imagem:img.data||null});}
  for(const [nome,traducao] of Object.entries(nomes)){const m=mon.find(x=>!x.custom&&x.name.toLowerCase()===nome);if(!m)continue;await salvar('monstro',m.key,{...m,nomeCatalogo:traducao||''});}
 }
 return{admin,carregar,iniciar,registros,registro,imagem,url,salvar,atualizar,monstros,legado:()=>dados};
})();
