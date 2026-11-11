/* Escapa HTML antes de formatar os subtítulos dos textos de regras. */
window.TEXTO_REGRAS=(()=>{
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const limpar=s=>String(s??'').replace(/#{1,6}\s*/g,'').replace(/\*{2,3}/g,'');
 const html=s=>esc(s).replace(/(^|\n)\s*#{1,6}\s*([^\n]+)/g,'$1<strong class="regra-subtitulo">$2</strong>').replace(/\*{2,3}([^*]+)\*{2,3}/g,'<strong>$1</strong>').replace(/#{1,6}/g,'').replace(/\n/g,'<br>');
 return{limpar,html};
})();
