/* Persistência compartilhada: referências versionadas e arquivos privados imutáveis. */
(() => {
  const BUCKET='campanhas-visuais',cache=new Map();let conta='';
  const vazio=id=>({campanha_id:id,simbolo_path:null,backdrop_path:null,backdrop_y:50,backdrop_y_mobile:50,versao:0});
  function usuario(){const id=window.nuvem.usuario()?.id||'';if(id!==conta){cache.clear();conta=id;}if(!id)throw Error('Faça login para visualizar as imagens.');return id;}
  function mesma(id){if(usuario()!==id)throw Error('A conta mudou. Abra a campanha novamente.');}
  async function carregar(id){const u=usuario(),r=await nuvem.get('campanha_visual?select=*&campanha_id=eq.'+encodeURIComponent(id));mesma(u);return r[0]||vazio(id);}
  async function assinar(path){if(!path)return '';const u=usuario(),k=u+':'+path,c=cache.get(k);if(c&&c.expira>Date.now())return c.url;
    const url=await nuvem.urlDoArquivo(path,300,BUCKET);mesma(u);cache.set(k,{url,expira:Date.now()+240000});return url;}
  async function apresentar(v){const [simbolo,backdrop]=await Promise.all([assinar(v.simbolo_path),assinar(v.backdrop_path)]);return {simbolo,backdrop,posicao:v.backdrop_y??50,posicaoMobile:v.backdrop_y_mobile??50,...(v.enquadramento?{enquadramento:v.enquadramento}:{})};}
  async function salvar(id,base,edicao){
    if(edicao.enquadramento && !Object.prototype.hasOwnProperty.call(base,'enquadramento')){
      try{await nuvem.get('campanha_visual?select=enquadramento&limit=0');}
      catch(_){throw Error('O servidor ainda precisa habilitar os enquadramentos de PC e celular. Nenhuma imagem foi enviada.');}
    }
    const u=usuario(),payload={p_campanha:id,p_versao:base.versao,p_simbolo:base.simbolo_path,p_backdrop:base.backdrop_path,p_y:edicao.posicao,p_y_mobile:edicao.posicaoMobile};
    for(const tipo of ['simbolo','backdrop']){
      if(!(tipo in edicao))continue;const blob=edicao[tipo];if(blob===null){payload['p_'+tipo]=null;continue;}
      const ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[blob.type];
      if(!ext||!blob.size||blob.size>2097152)throw Error('A imagem preparada deve ser PNG, JPEG ou WebP de até 2 MB.');
      const path=id+'/'+tipo+'/'+crypto.randomUUID()+'.'+ext;
      await nuvem.enviarArquivo(path,blob,BUCKET);mesma(u);payload['p_'+tipo]=path;
    }
    // Em falha de rede a RPC pode ter concluído. Não apagar uploads com resultado incerto.
    if(edicao.enquadramento){payload.p_enquadramento=edicao.enquadramento;payload.p_y=Math.round(edicao.enquadramento.desktop.y);payload.p_y_mobile=Math.round(edicao.enquadramento.mobile.y);}
    const resposta=await nuvem.rpc(edicao.enquadramento?'salvar_visual_campanha_enquadrada':'salvar_visual_campanha',payload);mesma(u);
    const visual=Array.isArray(resposta)?resposta[0]:resposta;
    if(!visual||visual.campanha_id!==id||visual.versao!==base.versao+1)throw Error('O servidor não confirmou a gravação. Atualize antes de tentar novamente.');
    let apresentacao;
    try{apresentacao=await apresentar(visual);mesma(u);}catch(_){return {visual,aviso:'Imagens salvas. Não foi possível preparar a visualização; os arquivos anteriores foram preservados.'};}
    const antigos=[base.simbolo_path,base.backdrop_path].filter(p=>p&&p!==visual.simbolo_path&&p!==visual.backdrop_path);
    let aviso='';if(antigos.length){try{await nuvem.apagarArquivos(antigos,BUCKET);mesma(u);antigos.forEach(p=>cache.delete(u+':'+p));}catch(_){aviso='Imagens salvas. A limpeza dos arquivos antigos ficou pendente.';}}
    return {visual,aviso,apresentacao};
  }
  async function miniaturas(ids){
    const u=usuario();const r=await nuvem.get('campanha_visual?select=campanha_id,simbolo_path');mesma(u);
    const pares=await Promise.all(r.filter(v=>ids.includes(v.campanha_id)&&v.simbolo_path).map(async v=>[v.campanha_id,await assinar(v.simbolo_path)]));mesma(u);return Object.fromEntries(pares);
  }
  window.CAMPANHA_IMAGENS={carregar,apresentar,salvar,miniaturas,vazio};
})();
