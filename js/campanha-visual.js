/* Edição de imagens privadas; publicação somente após confirmação do servidor. */
(() => {
  const esc=window.FICHA_COMPONENTES.esc;
  const vazio=()=>({simbolo:'',backdrop:'',posicao:50,posicaoMobile:50});
  let estado=vazio(),original=vazio(),campanha='',podeEditar=false,urls=[],geracao=0;
  let base=null,editando=false,salvando=false,preparando=0,conta='',mudancas={},parar=null,consulta=0;
  const $=s=>document.querySelector(s);
  const mensagem=t=>{const el=$('#visual-msg');if(el)el.textContent=t;};
  function liberarUrls(){urls.forEach(u=>URL.revokeObjectURL(u));urls=[];}
  function formulario(){
    const area=$('#campanha-aparencia');if(!area)return;
    area.innerHTML=podeEditar?'<p class="muted">Escolha as imagens e ajuste o enquadramento. As alterações serão compartilhadas ao salvar.</p><div class="campanha-visual-campos"><label>Símbolo<input type="file" accept="image/png,image/jpeg,image/webp" data-visual-arquivo="simbolo"></label><button type="button" class="small" data-visual-remover="simbolo">Remover símbolo</button><label>Imagem de fundo<input type="file" accept="image/png,image/jpeg,image/webp" data-visual-arquivo="backdrop"></label><button type="button" class="small" data-visual-remover="backdrop">Remover fundo</button><label>Enquadramento vertical — computador<input type="range" min="0" max="100" value="'+estado.posicao+'" data-visual-pos="posicao"></label><label>Enquadramento vertical — celular<input type="range" min="0" max="100" value="'+estado.posicaoMobile+'" data-visual-pos="posicaoMobile"></label></div><div class="row"><button type="button" class="small" id="visual-descartar">Cancelar alterações</button><button type="button" class="small primary" id="visual-salvar" '+(!base?'disabled':'')+'>Salvar imagens</button><button type="button" class="small" id="visual-recarregar">Atualizar imagens</button></div><p id="visual-msg" class="muted" role="status"></p>':'';
  }
  async function atualizar(){
    const u=window.nuvem?.usuario()?.id||'';if(!u||u!==conta){geracao++;liberarUrls();podeEditar=false;base=null;estado=vazio();aplicar();formulario();parar?.();parar=null;return;}
    if(editando||salvando||preparando)return;const g=geracao,q=++consulta;
    try{const v=await window.CAMPANHA_IMAGENS.carregar(campanha);const pronto=await window.CAMPANHA_IMAGENS.apresentar(v);
      if(g!==geracao||q!==consulta||editando||salvando||preparando)return;base=v;estado=pronto;original={...pronto};aplicar();formulario();
    }catch(err){if(g===geracao){mensagem('Não foi possível carregar as imagens: '+err.message);}}
  }
  async function salvar(){
    if(!podeEditar||!base||salvando||preparando)return;const usuarioSalvar=conta;salvando=true;consulta++;geracao++;travar(true);mensagem('Salvando imagens…');
    try{const r=await window.CAMPANHA_IMAGENS.salvar(campanha,base,{...mudancas,posicao:estado.posicao,posicaoMobile:estado.posicaoMobile});
      if(window.nuvem.usuario()?.id!==usuarioSalvar)throw Error('A conta mudou. Abra a campanha novamente.');base=r.visual;mudancas={};editando=false;
      try{const pronto=r.apresentacao||await window.CAMPANHA_IMAGENS.apresentar(base);liberarUrls();estado=pronto;original={...pronto};aplicar();mensagem(r.aviso||'Imagens salvas para todos os participantes.');}
      catch(err){mensagem('Imagens salvas, mas não foi possível recarregá-las: '+err.message);}
    }catch(err){mensagem('Não foi possível confirmar a gravação: '+err.message+' As imagens anteriores não foram apagadas. Use Atualizar imagens antes de tentar novamente.');}
    finally{salvando=false;travar(false);}
  }
  function travar(valor){document.querySelectorAll('#campanha-aparencia input,#campanha-aparencia button').forEach(el=>{el.disabled=valor;});if($('#visual-salvar'))$('#visual-salvar').disabled=valor||!base;}

  function simbolo(src,nome='',pequeno=false){
    return '<span class="campanha-simbolo'+(pequeno?' pequeno':'')+'">'+(src?'<img src="'+esc(src)+'" alt="Símbolo de '+esc(nome)+'">':(window.ico?window.ico('book'):''))+'</span>';
  }
  function aplicar(){
    const cab=$('.campanha-compacta');if(!cab)return;
    const imagem=$('#campanha-backdrop');imagem.hidden=!estado.backdrop;if(estado.backdrop)imagem.src=estado.backdrop;else imagem.removeAttribute('src');
    cab.classList.toggle('com-backdrop',!!estado.backdrop);
    const faixa=$('#campanha-faixa');faixa?.classList.toggle('com-backdrop',!!estado.backdrop);
    faixa?.style.setProperty?.('--backdrop-y',estado.posicao+'%');faixa?.style.setProperty?.('--backdrop-y-mobile',estado.posicaoMobile+'%');
    cab.style.setProperty('--backdrop-y',estado.posicao+'%');cab.style.setProperty('--backdrop-y-mobile',estado.posicaoMobile+'%');
    $('#campanha-simbolo').innerHTML=simbolo(estado.simbolo,$('#titulo').textContent);
    const link=document.querySelector('#camp-lista [aria-current="page"] .campanha-simbolo');if(link)link.outerHTML=simbolo(estado.simbolo,$('#titulo').textContent,true);
  }
  function montar({id,mestre,visual={}}){
    const uid=window.nuvem?.usuario()?.id||'';
    if(campanha!==id||uid!==conta){liberarUrls();campanha=id;conta=uid;estado={...vazio(),...visual};original={...estado};geracao++;base=null;editando=false;mudancas={};}
    podeEditar=mestre;aplicar();formulario();
    if(window.CAMPANHA_IMAGENS){atualizar();if(!parar)parar=window.nuvem.observar?.(atualizar,60000);}
  }
  function validar(arquivo){if(!['image/png','image/jpeg','image/webp'].includes(arquivo.type))throw Error('Use uma imagem PNG, JPEG ou WebP.');if(arquivo.size>8*1024*1024)throw Error('A imagem deve ter até 8 MB.');}
  async function otimizar(arquivo,tipo){
    validar(arquivo);const src=URL.createObjectURL(arquivo);
    try{const im=new Image();await new Promise((ok,erro)=>{im.onload=ok;im.onerror=()=>erro(Error('Não foi possível ler a imagem.'));im.src=src;});
      if(im.width*im.height>40000000)throw Error('Use uma imagem com até 40 megapixels.');
      const escala=Math.min(1,(tipo==='simbolo'?256:1600)/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*escala));c.height=Math.max(1,Math.round(im.height*escala));c.getContext('2d').drawImage(im,0,0,c.width,c.height);
      const blob=await new Promise(ok=>c.toBlob(ok,tipo==='simbolo'?'image/png':'image/jpeg',.82));if(!blob)throw Error('Não foi possível preparar a imagem.');if(blob.size>2097152)throw Error('A imagem otimizada ainda excede 2 MB. Escolha uma imagem menor.');return blob;
    }finally{URL.revokeObjectURL(src);}
  }
  document.addEventListener('change',async e=>{
    const tipo=e.target.dataset?.visualArquivo;if(!['simbolo','backdrop'].includes(tipo)||!podeEditar||salvando)return;
    const arquivo=e.target.files?.[0];if(!arquivo)return;const atual=++geracao;preparando++;travar(true);
    try{const blob=await otimizar(arquivo,tipo);if(atual!==geracao||!podeEditar)return;const url=URL.createObjectURL(blob);urls.push(url);estado[tipo]=url;mudancas[tipo]=blob;editando=true;aplicar();mensagem('Prévia atualizada. Clique em Salvar imagens para compartilhar.');}
    catch(err){$('#visual-msg').textContent=err.message;}finally{e.target.value='';preparando--;if(!preparando)travar(false);}
  });
  document.addEventListener('input',e=>{const campo=e.target.dataset?.visualPos;if(!podeEditar||salvando||!['posicao','posicaoMobile'].includes(campo))return;editando=true;estado[campo]=Math.max(0,Math.min(100,Number(e.target.value)||0));aplicar();});
  document.addEventListener('click',e=>{
    if(!podeEditar||salvando||preparando)return;if(e.target.closest('#visual-salvar')){salvar();return;}if(e.target.closest('#visual-recarregar')){if(editando&&!confirm('Descartar alterações locais e carregar as imagens salvas?'))return;editando=false;mudancas={};geracao++;atualizar();return;}const b=e.target.closest('[data-visual-remover]');if(b){estado[b.dataset.visualRemover]='';mudancas[b.dataset.visualRemover]=null;editando=true;aplicar();mensagem('Remoção preparada. Clique em Salvar imagens para confirmar.');}
    if(e.target.closest('#visual-descartar')){estado={...original};liberarUrls();editando=false;mudancas={};geracao++;aplicar();formulario();atualizar();}
  });
  window.CAMPANHA_VISUAL={montar,simbolo,validar};
})();
