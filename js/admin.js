/* Administração autenticada; publicação sem token pessoal. */
(async()=>{
 const $=s=>document.querySelector(s),esc=nuvem.esc;
 if(!nuvem.usuario()){location.replace('conta.html');return;}
 if(!await ACESSO.pronto){$('#resumo').textContent='Seu perfil não tem acesso à administração.';return;}
 $('#admin-conteudo').hidden=false;
 const [perfis,campanhas]=await Promise.all([nuvem.get('perfis?select=id,nome&order=nome'),nuvem.get('campanhas?select=id,nome&order=nome')]);
 $('#resumo').textContent='Administrador conectado. Suas criações e traduções sincronizam com sua conta.';
 $('#admin-campanhas').innerHTML=campanhas.map(c=>'<a class="card" href="campanha.html?id='+encodeURIComponent(c.id)+'">'+esc(c.nome)+'</a>').join('')||'Nenhuma campanha.';
 $('#admin-perfis').innerHTML=perfis.map(p=>'<form class="row" data-perfil="'+esc(p.id)+'"><input aria-label="Nome do perfil" maxlength="60" value="'+esc(p.nome)+'" required><button class="small" type="submit">Salvar nome</button></form>').join('');
 $('#admin-perfis').addEventListener('submit',async e=>{e.preventDefault();try{await nuvem.patch('perfis?id=eq.'+encodeURIComponent(e.target.dataset.perfil),{nome:e.target.querySelector('input').value.trim()});$('#pub-status').textContent='Perfil atualizado.';}catch(err){$('#pub-status').textContent=err.message;}});
 const ler=(db,s)=>new Promise((ok,no)=>{const r=db.transaction(s).objectStore(s).getAll();r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});
 $('#pub-go').onclick=async()=>{
  const b=$('#pub-go');b.disabled=true;
  try{
   const db=await new Promise((ok,no)=>{const r=indexedDB.open(acervo.banco(),3);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});
   const [mon,spl,img]=await Promise.all(['mon','spl','img'].map(s=>ler(db,s)));db.close();
   const permitidos=mon.filter(m=>!m.custom&&EDICOES.permitida(m)),keys=new Set(permitidos.map(m=>m.key));
   const dados={mon:permitidos,spl:spl.filter(m=>!m.custom&&EDICOES.permitida(m)),img:img.filter(i=>keys.has(i.key))};
   if(!dados.mon.length&&!dados.spl.length)throw Error('Carregue o catálogo 2014 antes de publicar.');
   const rows=await nuvem.post('catalogo_publicado?on_conflict=id',{id:'2014',dados,atualizado_em:new Date().toISOString()},{Prefer:'resolution=merge-duplicates,return=representation'});
   if(!rows?.length)throw Error('A publicação não foi confirmada.');
   $('#pub-status').textContent='Catálogo publicado: '+dados.mon.length+' monstros, '+dados.spl.length+' magias e '+dados.img.length+' fotos.';
  }catch(e){$('#pub-status').textContent=e.message;}finally{b.disabled=false;}
 };
})().catch(e=>{document.querySelector('#resumo').textContent=e.message;});
