/* Opções embutidas na conta; autorização confirmada pelo servidor. */
(()=>{
 const $=s=>document.querySelector(s),esc=nuvem.esc,painel=$('#opcoes-admin');if(!painel)return;
 let iniciou=false;
 const msg=t=>{$('#pub-status').textContent=t;};
 const abrirDB=()=>new Promise((ok,no)=>{const q=indexedDB.open(acervo.banco(),3);q.onupgradeneeded=()=>['mon','spl','img'].forEach(s=>{if(!q.result.objectStoreNames.contains(s))q.result.createObjectStore(s,{keyPath:'key'});});q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error);});
 const ler=(db,s)=>new Promise((ok,no)=>{const q=db.transaction(s).objectStore(s).getAll();q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error);});
 async function dados(){const db=await abrirDB();try{const [mon,spl,img]=await Promise.all(['mon','spl','img'].map(s=>ler(db,s)));return{mon,spl,img};}finally{db.close();}}
 function download(nome,d){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(d)],{type:'application/json'}));a.href=url;a.download=nome;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 async function resumoDados(){const d=await dados();$('#admin-dados-resumo').textContent=d.mon.length+' fichas, '+d.spl.length+' magias e '+d.img.length+' fotos neste aparelho.';}
 async function iniciar(){
  if(iniciou||!painel.open)return;
  if(!nuvem.usuario()||!await ACESSO.pronto)return;
  iniciou=true;
  try{
   const [perfis,campanhas]=await Promise.all([nuvem.get('perfis?select=id,nome&order=nome'),nuvem.get('campanhas?select=id,nome&order=nome')]);
   $('#resumo').textContent='Opções de Administração vinculadas ao seu perfil.';
   $('#admin-campanhas').innerHTML=campanhas.map(c=>'<a class="card" href="campanha.html?id='+encodeURIComponent(c.id)+'">'+esc(c.nome)+'</a>').join('')||'Nenhuma campanha.';
   $('#admin-perfis').innerHTML=perfis.map(p=>'<form class="row" data-perfil="'+esc(p.id)+'"><input aria-label="Nome do perfil" maxlength="60" value="'+esc(p.nome)+'" required><button class="small" type="submit">Salvar Nome</button></form>').join('');
   await resumoDados();
  }catch(e){msg(e.message);iniciou=false;}
 }
 painel.addEventListener('toggle',iniciar);
 if(location.hash==='#opcoes-admin'){ACESSO.pronto.then(admin=>{if(admin){painel.open=true;iniciar();}});}
 $('#admin-perfis').addEventListener('submit',async e=>{e.preventDefault();try{if(!await ACESSO.pronto)return;await nuvem.patch('perfis?id=eq.'+encodeURIComponent(e.target.dataset.perfil),{nome:e.target.querySelector('input').value.trim()});msg('Perfil atualizado.');}catch(err){msg(err.message);}});
 $('#admin-exportar').onclick=async()=>{try{if(!await ACESSO.pronto)return;download('dados-2014.json',{v:1,...await dados()});msg('Dados exportados.');}catch(e){msg(e.message);}};
 $('#admin-importar').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
   if(!await ACESSO.pronto)return;if(file.size>20000000)throw Error('Escolha um arquivo de até 20 MB.');
   const d=JSON.parse(await file.text()),mon=d.mon||d.monsters||[],spl=d.spl||d.spells||[],img=d.img||[];
   if(!Array.isArray(mon)||!Array.isArray(spl)||!Array.isArray(img))throw Error('Arquivo inválido. Use listas mon/monsters, spl/spells e img.');
   for(const m of [...mon,...spl])if(!m||typeof m.key!=='string'||typeof m.name!=='string')throw Error('Cada registro precisa de key e name.');
   if([...mon,...spl].some(m=>!EDICOES.permitida(m)))throw Error('Este aplicativo usa apenas dados de 2014. O arquivo contém conteúdo 2024.');
   const permitidos=new Set([...mon,...spl].map(m=>m.key));if(img.some(i=>!i||!permitidos.has(i.key)||!String(i.data).startsWith('data:image/')))throw Error('As fotos precisam corresponder aos registros do arquivo.');
   const db=await abrirDB();try{await new Promise((ok,no)=>{const t=db.transaction(['mon','spl','img'],'readwrite');mon.forEach(m=>t.objectStore('mon').put(m.custom?m:{...m,document:{...(m.document||{}),key:'admin-2014'}}));spl.forEach(m=>t.objectStore('spl').put(m.custom?m:{...m,document:{...(m.document||{}),key:'admin-2014'}}));img.forEach(i=>t.objectStore('img').put(i));t.oncomplete=ok;t.onerror=()=>no(t.error);t.onabort=()=>no(t.error);});}finally{db.close();}
   await acervo.sincronizar();await resumoDados();msg('Dados adicionados. Criações pessoais sincronizadas; use Publicar Catálogo 2014 para compartilhar os registros públicos.');
  }catch(err){msg(err.message);}finally{e.target.value='';}
 };
 $('#pub-go').onclick=async()=>{
  const b=$('#pub-go');b.disabled=true;
  try{
   if(!await ACESSO.pronto)return;const d=await dados(),mon=d.mon.filter(m=>!m.custom&&EDICOES.permitida(m)),keys=new Set(mon.map(m=>m.key));
   const out={mon,spl:d.spl.filter(m=>!m.custom&&EDICOES.permitida(m)),img:d.img.filter(i=>keys.has(i.key))};
   if(!out.mon.length&&!out.spl.length)throw Error('Nenhum dado público de 2014 para publicar. Abra Consultas para carregar o catálogo ou adicione um arquivo.');
   const rows=await nuvem.post('catalogo_publicado?on_conflict=id',{id:'2014',dados:out,atualizado_em:new Date().toISOString()},{Prefer:'resolution=merge-duplicates,return=representation'});
   if(!rows?.length)throw Error('Publicação não confirmada.');msg('Catálogo 2014 publicado para as contas do aplicativo.');
  }catch(e){msg(e.message);}finally{b.disabled=false;}
 };
})();
