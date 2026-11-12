/* Geometria única para prévia, arraste e imagem final. Não corta o arquivo original. */
(() => {
 const normalizar=f=>({x:Math.max(0,Math.min(100,Number(f?.x??50))),y:Math.max(0,Math.min(100,Number(f?.y??50))),zoom:Math.max(1,Math.min(4,Number(f?.zoom)||1))});
 function medir(iw,ih,w,h,frame){const f=normalizar(frame),s=Math.max(w/iw,h/ih)*f.zoom,largura=iw*s,altura=ih*s;return {largura,altura,x:-(largura-w)*f.x/100,y:-(altura-h)*f.y/100,excessoX:largura-w,excessoY:altura-h};}
 function aplicar(img,box,frame){if(!img?.naturalWidth||!box)return;const m=medir(img.naturalWidth,img.naturalHeight,box.clientWidth,box.clientHeight,frame);Object.assign(img.style,{width:m.largura+'px',height:m.altura+'px',left:m.x+'px',top:m.y+'px',right:'auto',bottom:'auto',maxWidth:'none',objectFit:'fill'});}
 // Coordenadas em relação à faixa central. Nunca usa 100vw, que pode incluir scrollbar.
 const fundoDesktop=(larguraUtil,esquerdaFaixa)=>({esquerda:-esquerdaFaixa,largura:larguraUtil});
 window.ENQUADRAMENTO={normalizar,medir,aplicar,fundoDesktop};
 window.ajustarFundo=arquivo=>new Promise((ok,no)=>{
  const url=URL.createObjectURL(arquivo),img=new Image();
  img.onerror=()=>{URL.revokeObjectURL(url);no(Error('Não foi possível ler a imagem.'));};
  img.onload=()=>{
   const frames={desktop:normalizar(arquivo.enquadramento?.desktop),mobile:normalizar(arquivo.enquadramento?.mobile)};let modo='desktop',drag=null;
   const ov=document.createElement('div');ov.className='crop-ov';ov.innerHTML='<div class="crop-box crop-fundo" role="dialog" aria-modal="true" aria-label="Enquadrar imagem de fundo"><h3>Imagem de fundo</h3><div class="row"><button type="button" data-frame="desktop" aria-pressed="true">Computador</button><button type="button" data-frame="mobile" aria-pressed="false">Celular</button></div><canvas class="crop-stage" width="680" height="340"></canvas><label>Zoom<input type="range" min="1" max="4" step="0.01" value="1"></label><p class="muted">Arraste para posicionar. Cada prévia guarda seu próprio enquadramento.</p><div class="row"><button type="button" data-crop="center">Centralizar imagem</button><button type="button" data-crop="cancel">Cancelar</button><button type="button" data-crop="ok">Confirmar enquadramento</button></div></div>';
   document.body.append(ov);const cv=ov.querySelector('canvas'),rg=ov.querySelector('input'),ctx=cv.getContext('2d'),foco=document.activeElement;
   const ref=arquivo.referencia||{},dimensao=modo=>{const r=ref[modo];return r&&r.w>0&&r.h>0?r:(modo==='desktop'?{w:680,h:340}:{w:340,h:220});};
   const desenhar=()=>{const r=dimensao(modo);cv.width=modo==='desktop'?680:340;cv.height=Math.max(60,Math.min(520,Math.round(cv.width*r.h/r.w)));rg.value=frames[modo].zoom;const m=medir(img.width,img.height,cv.width,cv.height,frames[modo]);ctx.clearRect(0,0,cv.width,cv.height);ctx.drawImage(img,m.x,m.y,m.largura,m.altura);
    /* mesma película escura que a página aplica sobre o fundo, para o preview ser fiel ao resultado */
    const g=ctx.createLinearGradient(0,0,0,cv.height);g.addColorStop(0,'#10182055');g.addColorStop(.25,'#10182066');g.addColorStop(.72,'#101820CC');g.addColorStop(1,'#101820');ctx.fillStyle=g;ctx.fillRect(0,0,cv.width,cv.height);ov.querySelectorAll('[data-frame]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.frame===modo)));};
   const fim=r=>{document.removeEventListener('keydown',tecla,true);ov.remove();URL.revokeObjectURL(url);foco?.focus();ok(r);};
   const tecla=e=>{if(e.key==='Escape'){e.stopPropagation();fim(null);}};document.addEventListener('keydown',tecla,true);
   cv.addEventListener('pointerdown',e=>{const f=frames[modo];drag={x:e.clientX,y:e.clientY,frame:{...f}};cv.setPointerCapture(e.pointerId);});
   cv.addEventListener('pointermove',e=>{if(!drag)return;const m=medir(img.width,img.height,cv.width,cv.height,drag.frame),k=cv.width/cv.getBoundingClientRect().width;frames[modo]=normalizar({...drag.frame,x:m.excessoX?drag.frame.x-(e.clientX-drag.x)*k*100/m.excessoX:50,y:m.excessoY?drag.frame.y-(e.clientY-drag.y)*k*100/m.excessoY:50});desenhar();});
   for(const e of ['pointerup','pointercancel'])cv.addEventListener(e,()=>drag=null);
   rg.addEventListener('input',()=>{frames[modo].zoom=Number(rg.value);desenhar();});
   cv.addEventListener('wheel',e=>{e.preventDefault();frames[modo]=normalizar({...frames[modo],zoom:frames[modo].zoom*(e.deltaY<0?1.1:1/1.1)});desenhar();},{passive:false});
   ov.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.frame){modo=b.dataset.frame;desenhar();}if(b.dataset.crop==='center'){frames[modo]=normalizar();desenhar();}if(b.dataset.crop==='cancel')fim(null);if(b.dataset.crop==='ok')fim(frames);});
   desenhar();ov.querySelector('button').focus();
  };img.src=url;
 });
})();
