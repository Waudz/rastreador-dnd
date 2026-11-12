/* Edição de imagens privadas; publicação somente após confirmação do servidor. */
(() => {
  const esc=window.FICHA_COMPONENTES.esc;
  const vazio=()=>({simbolo:'',backdrop:'',posicao:50,posicaoMobile:50,enquadramento:null});
  let estado=vazio(),original=vazio(),campanha='',podeEditar=false,urls=[],geracao=0;
  let quadroMudou=false,base=null,editando=false,salvando=false,preparando=0,conta='',mudancas={},parar=null,consulta=0;
  const $=s=>document.querySelector(s);
  const enquadramentoDisponivel=()=>!!base&&Object.prototype.hasOwnProperty.call(base,'enquadramento');
  const mensagem=t=>{const el=$('#visual-msg');if(el)el.textContent=t;};
  /* Mostra o que está vinculado à campanha: imagem salva, arquivo escolhido ainda não salvo, ou nada. */
  const nomesEscolhidos={};
  const chaveNome=t=>'visual_nome:'+campanha+':'+t;
  const nomeSalvo=t=>{try{return localStorage.getItem(chaveNome(t))||'';}catch(_){return '';}};
  function rotuloArquivo(tipo){if(tipo in mudancas&&mudancas[tipo]===null)return 'Remoção preparada (salve para confirmar)';if(mudancas[tipo])return (nomesEscolhidos[tipo]||'Imagem escolhida')+' (prévia, ainda não salva)';return estado[tipo]?((nomeSalvo(tipo)||nomesEscolhidos[tipo])?(nomeSalvo(tipo)||nomesEscolhidos[tipo])+' (salva e vinculada)':'Imagem salva e vinculada à campanha'):'Nenhum arquivo selecionado';}
  function atualizarRotulos(){for(const tipo of ['simbolo','backdrop']){const el=$('[data-arquivo-nome="'+tipo+'"]');if(el)el.textContent=rotuloArquivo(tipo);}}
  function liberarUrls(){urls.forEach(u=>URL.revokeObjectURL(u));urls=[];}
  function formulario(){
    const area=$('#campanha-aparencia');if(!area)return;
    area.innerHTML=podeEditar?'<p class="muted">Escolha as imagens e ajuste o enquadramento. As alterações serão compartilhadas ao salvar.</p><div class="campanha-visual-campos"><label>Imagem de capa<span class="visual-upload">Escolher imagem<input type="file" accept="image/png,image/jpeg,image/webp" data-visual-arquivo="simbolo"></span><small data-arquivo-nome="simbolo">'+rotuloArquivo('simbolo')+'</small></label><button type="button" class="small" data-visual-remover="simbolo">Remover imagem de capa</button><label>Imagem de fundo<span class="visual-upload">Escolher imagem<input type="file" accept="image/png,image/jpeg,image/webp" data-visual-arquivo="backdrop"></span><small data-arquivo-nome="backdrop">'+rotuloArquivo('backdrop')+'</small></label><button type="button" class="small" data-visual-remover="backdrop">Remover imagem de fundo</button><button type="button" data-visual-ajustar '+(!estado.backdrop?'disabled':'')+'>Ajustar enquadramento PC e celular</button></div><div class="row"><button type="button" class="small" id="visual-descartar">Cancelar</button><button type="button" class="small primary" id="visual-salvar" '+(!base?'disabled':'')+'>Salvar imagens</button><button type="button" class="small" id="visual-recarregar">Recarregar imagens salvas</button></div><p class="muted">Salvar confirma a prévia. Recarregar recupera a última versão salva.</p><p id="visual-msg" class="muted" role="status"></p>':'';
    if(podeEditar){
      if(base&&!enquadramentoDisponivel())area.insertAdjacentHTML('beforeend','<p class="muted">Enquadramento avançado indisponível nesta campanha. Novas imagens usarão a posição atual.</p>');
      travar(salvando||preparando>0);
    }
  }
  async function atualizar(){
    const u=window.nuvem?.usuario()?.id||'';if(!u||u!==conta){geracao++;liberarUrls();podeEditar=false;base=null;estado=vazio();aplicar();formulario();parar?.();parar=null;return;}
    if(editando||salvando||preparando)return;const g=geracao,q=++consulta;
    try{const v=await window.CAMPANHA_IMAGENS.carregar(campanha);const pronto=await window.CAMPANHA_IMAGENS.apresentar(v);
      if(g!==geracao||q!==consulta||editando||salvando||preparando)return;base=v;estado=pronto;original={...pronto};aplicar();formulario();
    }catch(err){if(g===geracao){mensagem('Não foi possível carregar as imagens: '+err.message);}}
  }
  async function salvar(){
        if (!editando || (Object.keys(mudancas).length === 0 && !quadroMudou)) {
      mensagem('Nada para salvar. Escolha uma imagem ou ajuste o enquadramento antes de salvar.');
      return;
    }
    if(!podeEditar||!base||salvando||preparando)return;const usuarioSalvar=conta;salvando=true;consulta++;geracao++;travar(true);mensagem('Salvando imagens…');
    try{const r=await window.CAMPANHA_IMAGENS.salvar(campanha,base,{...mudancas,posicao:estado.posicao,posicaoMobile:estado.posicaoMobile,...(estado.enquadramento?{enquadramento:estado.enquadramento}:{})});
      if(window.nuvem.usuario()?.id!==usuarioSalvar)throw Error('A conta mudou. Abra a campanha novamente.');for(const t of ['simbolo','backdrop']){if(mudancas[t]&&nomesEscolhidos[t]){try{localStorage.setItem(chaveNome(t),nomesEscolhidos[t]);}catch(_){}}if(mudancas[t]===null){try{localStorage.removeItem(chaveNome(t));}catch(_){}}}
      base=r.visual;mudancas={};editando=false;quadroMudou=false;
      try{const pronto=r.apresentacao||await window.CAMPANHA_IMAGENS.apresentar(base);liberarUrls();estado=pronto;original={...pronto};aplicar();mensagem(r.aviso||'Imagens salvas para todos os participantes.');window.FEEDBACK?.mostrar(r.aviso||'Imagens salvas');document.dispatchEvent(new CustomEvent('campanha-visual:fechar'));}
      catch(err){mensagem('Imagens salvas, mas não foi possível recarregá-las: '+err.message);}
    }catch(err){mensagem('Não foi possível confirmar a gravação: '+err.message+' As imagens anteriores não foram apagadas. Use Atualizar imagens antes de tentar novamente.');}
    finally{salvando=false;travar(false);}
  }
  function travar(valor){document.querySelectorAll('#campanha-aparencia input,#campanha-aparencia button').forEach(el=>{el.disabled=valor;});if($('#visual-salvar'))$('#visual-salvar').disabled=valor||!base;const ajustar=$('[data-visual-ajustar]');if(ajustar)ajustar.disabled=valor||!estado.backdrop||!enquadramentoDisponivel();}

  function simbolo(src,nome='',pequeno=false){
    return '<span class="campanha-simbolo'+(pequeno?' pequeno':'')+'">'+(src?'<img src="'+esc(src)+'" alt="Imagem de capa de '+esc(nome)+'">':(window.ico?window.ico('book'):''))+'</span>';
  }
  /* Tamanho real da faixa da campanha no computador e no celular: o preview do editor usa a mesma proporção da página. */
  function referenciaFundo(){
    const faixa=$('#campanha-faixa'),cab=$('.campanha-compacta');if(!faixa||!cab)return null;
    const h=faixa.offsetHeight,conteudo=cab.offsetHeight,extra=Math.max(0,h-conteudo),cw=document.documentElement.clientWidth;
    if(!h||!cw)return null;
    return {desktop:{w:innerWidth>=840?cw:1280,h:Math.max(conteudo,340)+extra},mobile:{w:innerWidth<840?cw:390,h:Math.max(conteudo,220)+extra}};
  }
  function posicionarFundo(){
    const faixa=$('#campanha-faixa'),fundo=$('#campanha-fundo'),imagem=$('#campanha-backdrop');
    if(!faixa||!fundo||fundo.hidden)return;
    if(innerWidth>=840){
      const m=ENQUADRAMENTO.fundoDesktop(document.documentElement.clientWidth,faixa.getBoundingClientRect().left);
      fundo.style.left=m.esquerda+'px';fundo.style.width=m.largura+'px';fundo.style.right='auto';
    }else{fundo.style.left='0px';fundo.style.width='100%';fundo.style.right='0px';}
    if(estado.enquadramento)ENQUADRAMENTO.aplicar(imagem,fundo,innerWidth<=600?estado.enquadramento.mobile:estado.enquadramento.desktop);
  }
  function aplicar(){
    const cab=$('.campanha-compacta');if(!cab)return;
    const imagem=$('#campanha-backdrop');imagem.hidden=!estado.backdrop;if(estado.backdrop)imagem.src=estado.backdrop;else imagem.removeAttribute('src');
    cab.classList.toggle('com-backdrop',!!estado.backdrop);
    const faixa=$('#campanha-faixa');faixa?.classList.toggle('com-backdrop',!!estado.backdrop);
    const fundo=$('#campanha-fundo');if(fundo)fundo.hidden=!estado.backdrop;
    faixa?.style.setProperty?.('--backdrop-y',estado.posicao+'%');faixa?.style.setProperty?.('--backdrop-y-mobile',estado.posicaoMobile+'%');
    cab.style.setProperty('--backdrop-y',estado.posicao+'%');cab.style.setProperty('--backdrop-y-mobile',estado.posicaoMobile+'%');
    if(estado.enquadramento&&window.ENQUADRAMENTO){imagem.onload=posicionarFundo;posicionarFundo();}
    else if(imagem){imagem.removeAttribute('style');imagem.onload=null;}
    posicionarFundo();
    $('#campanha-simbolo').innerHTML=simbolo(estado.simbolo,$('#titulo').textContent);
    atualizarRotulos();
    const link=document.querySelector('#camp-lista [aria-current="page"] .campanha-simbolo');if(link)link.outerHTML=simbolo(estado.simbolo,$('#titulo').textContent,true);
  }
  function montar({id,mestre,visual={}}){
    const uid=window.nuvem?.usuario()?.id||'';
    if(campanha!==id||uid!==conta){liberarUrls();campanha=id;conta=uid;estado={...vazio(),...visual};original={...estado};geracao++;base=null;editando=false;mudancas={};}
    podeEditar=mestre;aplicar();if(!editando&&!salvando&&!preparando)formulario();
    if(!observadorFundo)window.addEventListener?.('paineis:layout',()=>requestAnimationFrame(()=>requestAnimationFrame(posicionarFundo)));   // fechar a ficha lateral move a faixa sem mudar o tamanho dela
    if(!observadorFundo&&window.ResizeObserver){observadorFundo=new ResizeObserver(posicionarFundo);observadorFundo.observe(document.documentElement);observadorFundo.observe($('#campanha-faixa'));}
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
    const arquivo = e.target.files?.[0];
if (!arquivo) return;

const nomeArquivo = document.querySelector(
  '[data-arquivo-nome="' + tipo + '"]'
);

if (nomeArquivo) {
  nomeArquivo.textContent = arquivo.name;
}

mensagem('Imagem selecionada. Preparando prévia...');

preparando++;
const atual = ++geracao;
consulta++;
travar(true);
    try{let entrada=arquivo,frame=null;
      if (tipo === 'simbolo') {
  const data = await window.recortarFoto(arquivo);
  if (!data) return;

  const [cabecalho, conteudo] = data.split(',');
  const mime = cabecalho.match(/^data:([^;]+);base64$/)?.[1];

  if (!mime || !conteudo) {
    throw new Error('Formato inválido da imagem recortada.');
  }

  const binario = atob(conteudo);
  const bytes = new Uint8Array(binario.length);

  for (let i = 0; i < binario.length; i++) {
    bytes[i] = binario.charCodeAt(i);
  }

  entrada = new Blob([bytes], { type: mime });
}
      else if(enquadramentoDisponivel()){arquivo.referencia=referenciaFundo();frame=await window.ajustarFundo(arquivo);if(!frame)return;}
      const blob = await otimizar(entrada, tipo);

if (atual !== geracao || !podeEditar) {
  mensagem('A seleção da imagem foi interrompida por uma atualização da campanha. Tente novamente.');
  return;
}
if(frame)estado.enquadramento=frame;const url=URL.createObjectURL(blob);urls.push(url);estado[tipo]=url;mudancas[tipo]=blob;editando=true;const nome=$('[data-arquivo-nome="'+tipo+'"]');nomesEscolhidos[tipo]=arquivo.name||'Imagem selecionada';aplicar();mensagem('Prévia atualizada. Clique em Salvar imagens para compartilhar.');}
    catch(err){$('#visual-msg').textContent=err.message;}finally{e.target.value='';preparando--;if(!preparando)travar(false);}
  });
  document.addEventListener('input',e=>{const campo=e.target.dataset?.visualPos;if(!podeEditar||salvando||!['posicao','posicaoMobile'].includes(campo))return;editando=true;estado[campo]=Math.max(0,Math.min(100,Number(e.target.value)||0));aplicar();});
  document.addEventListener('click',e=>{
    if(!podeEditar||salvando||preparando)return;
    if(e.target.closest('[data-visual-ajustar]')){if(!enquadramentoDisponivel())return;(async()=>{preparando++;travar(true);try{const r=await fetch(estado.backdrop);if(!r.ok)throw Error('Não foi possível abrir a imagem original.');const arquivo=await r.blob();arquivo.enquadramento=estado.enquadramento;arquivo.referencia=referenciaFundo();const frame=await window.ajustarFundo(arquivo);if(frame){estado.enquadramento=frame;editando=true;quadroMudou=true;aplicar();mensagem('Enquadramento preparado. Salve para compartilhar.');}}catch(err){mensagem(err.message);}finally{preparando--;travar(false);}})();return;}
    if(e.target.closest('#visual-salvar')){salvar();return;}if(e.target.closest('#visual-recarregar')){if(editando&&!confirm('Descartar alterações locais e carregar as imagens salvas?'))return;editando=false;mudancas={};geracao++;atualizar();return;}const b=e.target.closest('[data-visual-remover]');if(b){estado[b.dataset.visualRemover]='';if(b.dataset.visualRemover==='backdrop')estado.enquadramento=null;mudancas[b.dataset.visualRemover]=null;editando=true;aplicar();mensagem('Remoção preparada. Clique em Salvar imagens para confirmar.');}
    if(e.target.closest('#visual-descartar')&&sair())document.dispatchEvent(new CustomEvent('campanha-visual:fechar'));
  });
  function sair(){if(salvando||preparando){mensagem('Aguarde a operação terminar.');return false;}if(editando&&!confirm('Descartar alterações de aparência não salvas?'))return false;estado={...original};liberarUrls();editando=false;quadroMudou=false;mudancas={};geracao++;aplicar();formulario();return true;}
  window.addEventListener?.('beforeunload',e=>{if(editando||salvando||preparando){e.preventDefault();e.returnValue='';}});
  let observadorFundo=null;
  window.addEventListener?.('resize',posicionarFundo);
  window.CAMPANHA_VISUAL={montar,simbolo,validar,sair};
})();
