/* Primeira etapa visual. Prévia temporária; nenhuma imagem é enviada ou persistida. */
(() => {
  const esc=window.FICHA_COMPONENTES.esc;
  const vazio=()=>({simbolo:'',backdrop:'',posicao:50,posicaoMobile:50});
  let estado=vazio(),original=vazio(),campanha='',podeEditar=false,urls=[],geracao=0;
  const $=s=>document.querySelector(s);
  function simbolo(src,nome='',pequeno=false){
    return '<span class="campanha-simbolo'+(pequeno?' pequeno':'')+'">'+(src?'<img src="'+esc(src)+'" alt="Símbolo de '+esc(nome)+'">':(window.ico?window.ico('book'):''))+'</span>';
  }
  function aplicar(){
    const cab=$('.campanha-compacta');if(!cab)return;
    const imagem=$('#campanha-backdrop');imagem.hidden=!estado.backdrop;if(estado.backdrop)imagem.src=estado.backdrop;else imagem.removeAttribute('src');
    cab.classList.toggle('com-backdrop',!!estado.backdrop);
    cab.style.setProperty('--backdrop-y',estado.posicao+'%');cab.style.setProperty('--backdrop-y-mobile',estado.posicaoMobile+'%');
    $('#campanha-simbolo').innerHTML=simbolo(estado.simbolo,$('#titulo').textContent);
    const link=document.querySelector('#camp-lista [aria-current="page"] .campanha-simbolo');if(link)link.outerHTML=simbolo(estado.simbolo,$('#titulo').textContent,true);
  }
  function montar({id,mestre,visual={}}){
    if(campanha!==id){urls.forEach(u=>URL.revokeObjectURL(u));urls=[];campanha=id;estado={...vazio(),...visual};original={...estado};geracao++;}
    podeEditar=mestre;aplicar();
    const area=$('#campanha-aparencia');if(!area)return;
    area.innerHTML=mestre?'<p class="muted">Prévia visual: as imagens ficam somente nesta página e não são enviadas. O salvamento compartilhado será ativado após aprovar a integração.</p><div class="campanha-visual-campos"><label>Símbolo<input type="file" accept="image/png,image/jpeg,image/webp" data-visual-arquivo="simbolo"></label><button type="button" class="small" data-visual-remover="simbolo">Remover símbolo da prévia</button><label>Imagem de fundo<input type="file" accept="image/png,image/jpeg,image/webp" data-visual-arquivo="backdrop"></label><button type="button" class="small" data-visual-remover="backdrop">Remover fundo da prévia</button><label>Enquadramento vertical — computador<input type="range" min="0" max="100" value="'+estado.posicao+'" data-visual-pos="posicao"></label><label>Enquadramento vertical — celular<input type="range" min="0" max="100" value="'+estado.posicaoMobile+'" data-visual-pos="posicaoMobile"></label></div><button type="button" class="small" id="visual-descartar">Descartar prévia</button><p id="visual-msg" class="muted" role="status"></p>':'';
  }
  function validar(arquivo){if(!['image/png','image/jpeg','image/webp'].includes(arquivo.type))throw Error('Use uma imagem PNG, JPEG ou WebP.');if(arquivo.size>8*1024*1024)throw Error('A imagem deve ter até 8 MB.');}
  async function otimizar(arquivo,tipo){
    validar(arquivo);const src=URL.createObjectURL(arquivo);
    try{const im=new Image();await new Promise((ok,erro)=>{im.onload=ok;im.onerror=()=>erro(Error('Não foi possível ler a imagem.'));im.src=src;});
      if(im.width*im.height>40000000)throw Error('Use uma imagem com até 40 megapixels.');
      const escala=Math.min(1,(tipo==='simbolo'?256:1600)/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*escala));c.height=Math.max(1,Math.round(im.height*escala));c.getContext('2d').drawImage(im,0,0,c.width,c.height);
      const blob=await new Promise(ok=>c.toBlob(ok,tipo==='simbolo'?'image/png':'image/jpeg',.82));if(!blob)throw Error('Não foi possível preparar a imagem.');return blob;
    }finally{URL.revokeObjectURL(src);}
  }
  document.addEventListener('change',async e=>{
    const tipo=e.target.dataset?.visualArquivo;if(!tipo||!podeEditar)return;
    const arquivo=e.target.files?.[0];if(!arquivo)return;const atual=geracao;
    try{const blob=await otimizar(arquivo,tipo);if(atual!==geracao||!podeEditar)return;const url=URL.createObjectURL(blob);urls.push(url);estado[tipo]=url;aplicar();$('#visual-msg').textContent='Prévia atualizada. Nenhuma imagem foi enviada.';}
    catch(err){$('#visual-msg').textContent=err.message;}finally{e.target.value='';}
  });
  document.addEventListener('input',e=>{const campo=e.target.dataset?.visualPos;if(!podeEditar||!['posicao','posicaoMobile'].includes(campo))return;estado[campo]=Math.max(0,Math.min(100,Number(e.target.value)||0));aplicar();});
  document.addEventListener('click',e=>{
    if(!podeEditar)return;const b=e.target.closest('[data-visual-remover]');if(b){estado[b.dataset.visualRemover]='';aplicar();}
    if(e.target.closest('#visual-descartar')){estado={...original};urls.forEach(u=>URL.revokeObjectURL(u));urls=[];geracao++;montar({id:campanha,mestre:podeEditar});}
  });
  window.CAMPANHA_VISUAL={montar,simbolo,validar};
})();
