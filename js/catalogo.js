/* Apenas fotos/nomes de registros SRD são públicos. Criações nunca entram aqui. */
window.CATALOGO=(()=>{
 async function atualizar({registros=[],magias=[],fotos=[],nomes={}}={}){
  const usuario=nuvem.usuario()?.id;if(!usuario||!await ACESSO.pronto)return;
  const base=registros.filter(m=>!m.custom&&m.document?.key==='srd-2014'),permitidos=new Set(base.map(m=>m.key)),nomesBase=new Set(base.map(m=>m.name.toLowerCase()));
  const imagens=fotos.filter(i=>permitidos.has(i.key)&&(i.data===''||String(i.data).startsWith('data:image/'))),tr=Object.fromEntries(Object.entries(nomes).filter(([n])=>nomesBase.has(n)));
  if(!imagens.length&&!Object.keys(tr).length)return;
  for(let tentativa=0;tentativa<3;tentativa++){
   if(nuvem.usuario()?.id!==usuario)throw Error('A conta mudou durante a sincronização.');
   const rows=await nuvem.get('catalogo_publicado?select=dados,atualizado_em&id=eq.2014'),anterior=rows[0],d=anterior?.dados||{};
   const porFoto=new Map((d.img||[]).map(i=>[i.key,i]));imagens.forEach(i=>porFoto.set(i.key,i));
   const chavesPublicas=new Set([...(d.mon||[]).filter(m=>!m.custom&&m.document?.key==='srd-2014'),...base].map(m=>m.key));
   const dados={...d,mon:(d.mon?.length?d.mon:base).filter(m=>!m.custom&&m.document?.key==='srd-2014'),spl:(d.spl||magias).filter(m=>!m.custom&&m.document?.key==='srd-2014'),img:[...porFoto.values()].filter(i=>chavesPublicas.has(i.key)),tr:{...(d.tr||{}),...tr}};
   let resultado;
   if(anterior)resultado=await nuvem.patch('catalogo_publicado?id=eq.2014&atualizado_em=eq.'+encodeURIComponent(anterior.atualizado_em),{dados,atualizado_em:new Date().toISOString()});
   else try{resultado=await nuvem.post('catalogo_publicado',{id:'2014',dados,atualizado_em:new Date().toISOString()});}catch(e){if(e.status===409)continue;throw e;}
   if(resultado?.length)return;
  }throw Error('Outro aparelho alterou as fotos. Tente novamente.');
 }
 return{atualizar};
})();
