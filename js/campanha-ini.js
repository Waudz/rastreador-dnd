/* Personagens da campanha na iniciativa; só o mestre sincroniza PV com as fichas. */
(() => {
  "use strict";
  const $ = s => document.querySelector(s), box = $("#camp-ini");
  if (!box || !window.nuvem) return;
  const esc = nuvem.esc;
  const params = new URLSearchParams(location.search), pedido = params.get("campanha"), personagemPedido = params.get("personagem");
  const conta = nuvem.usuario()?.id;
  let camps = [], pers = [], atual = "", enviado = {}, falhas = 0, adicionouPedido = false, buscando = false, carregou = false, resumoId = null, focoAnterior = null, ultimaGrade = null;
  const msg = (t, erro) => { $("#ci-msg").innerHTML = erro ? '<span class="err">'+esc(t)+'</span>' : esc(t || ""); };
  const mesmaConta = () => nuvem.usuario()?.id === conta;
  const emCombate = p => window.__ini.list().some(c => c.pid === p.id);
  const podeUsar = () => mesmaConta() && camps.some(c => c.id === atual);
  const ocupadas = new Set();
  const basesPV = new Map();
  function bloquear(){
    pers=[];camps=[];ocupadas.clear();basesPV.clear();box.hidden=true;
    fecharResumo();$('#ci-lista').innerHTML='';$('#ci-resumo-corpo').innerHTML='';resumoId=null;
  }
  function desenhar() {
    const html = pers.length ? pers.map(p => {
      const f = p.ficha || {}, foto = f.foto && /^data:image\//.test(f.foto) ? '<img class="av" style="width:36px;height:36px" src="'+esc(f.foto)+'" alt="">' : '<span class="av av0" style="width:36px;height:36px" aria-hidden="true">'+esc((p.nome||'?').charAt(0).toUpperCase())+'</span>';
      return '<article class="ci-cartao"><button type="button" class="ci-personagem" data-ci-resumo="'+esc(p.id)+'" aria-label="Ver resumo de '+esc(p.nome)+'">'+foto+'<span><b>'+esc(p.nome)+'</b><small>'+esc(f.classe||[f.npc?"NPC":"Personagem",f.nivel?'Nível '+f.nivel:''].filter(Boolean).join(' · '))+'</small><small>PV '+p.pv_atual+'/'+p.pv_max+' · CA '+p.ca+'</small></span></button>'+(emCombate(p)?'<span class="muted ci-no-combate">No combate</span>':'<button type="button" class="small" data-ci="'+esc(p.id)+'">Adicionar à iniciativa</button>')+'</article>';
    }).join("") : '<span class="muted">Esta campanha ainda não tem personagens. Importe ou crie as fichas dentro da campanha.</span>';
    if(ultimaGrade!==html){$("#ci-lista").innerHTML=html;ultimaGrade=html;}
  }
  function abrirResumo(p){
    if (!podeUsar()) return;
    if (resumoId && resumoId !== p.id && ocupadas.has(resumoId)) { msg('Aguarde a ficha terminar de salvar antes de trocar de personagem.'); return; }
    if (resumoId === p.id && !$("#ci-resumo").hidden) return;
    resumoId=p.id;focoAnterior=document.activeElement;
    if($('#ci-ficha-frame')?.dataset?.personagem !== p.id) $("#ci-resumo-corpo").innerHTML='<iframe id="ci-ficha-frame" data-personagem="'+esc(p.id)+'" title="Ficha de '+esc(p.nome)+'" src="personagem.html?id='+encodeURIComponent(p.id)+'&modo=painel"></iframe>';
    
    document.body.classList.add('com-ficha-lateral');
    if(window.PAINEL)window.PAINEL.mostrar("ci-resumo");else{if(window.reorganizarPaineis)$("#sheet").hidden=true;$("#ci-resumo").hidden=false;}
    window.reorganizarPaineis?.();$("#ci-resumo-fechar").focus?.();
  }
  function fecharResumo(){if(window.PAINEL)window.PAINEL.fechar();$("#ci-resumo").hidden=true;document.body.classList.remove('com-ficha-lateral');window.reorganizarPaineis?.();focoAnterior?.focus?.();}

  function adicionar(p) {
    if (!podeUsar() || emCombate(p)) return;
    const f = p.ficha || {};
    const usados = new Set(window.__ini.list().map(c => c.name));
    let nome = p.nome, n = 2; while (usados.has(nome)) nome = p.nome+" "+n++;
    window.__ini.add({name:nome,kind:f.npc?"NPC":"Personagem",initiative:null,hp:p.pv_atual,maxHp:Math.max(1,p.pv_max),ac:p.ca||0,key:"",pid:p.id,campanhaId:atual,foto:f.foto||""});
    enviado[p.id] = p.pv_atual;
  }
  async function carregar() {
    if (buscando || !podeUsar()) return;
    buscando = true; if(!carregou)msg("Carregando personagens…");
    const campanhaConsultada=atual;
    try {
      const mestre = await nuvem.rpc('eh_mestre', {c:atual});
      if(mestre !== true){bloquear();return;}
      const lista = await nuvem.get("personagens?select=id,nome,pv_atual,pv_max,ca,ficha&campanha_id=eq."+encodeURIComponent(atual)+"&order=nome");
      if (!mesmaConta() || atual !== campanhaConsultada) return;
      pers = lista;
      if(resumoId && !pers.some(p=>p.id===resumoId)){fecharResumo();$('#ci-resumo-corpo').innerHTML='';resumoId=null;}
      let mudouFoto = false;
      for (const c of window.__ini.list()) {
        const p = pers.find(p => p.id === c.pid);
        if(p && !ocupadas.has(p.id) && enviado[p.id] === c.hp && (c.hp !== p.pv_atual || c.maxHp !== p.pv_max || c.ac !== p.ca)) {
          c.hp=p.pv_atual;c.maxHp=p.pv_max;c.ac=p.ca;enviado[p.id]=p.pv_atual;mudouFoto=true;
        }
        if (p?.ficha?.foto && c.foto !== p.ficha.foto) { c.foto = p.ficha.foto; mudouFoto = true; }
      }
      if (mudouFoto) window.__ini.render();
      if (personagemPedido && !adicionouPedido) {
        const p = pers.find(p => p.id === personagemPedido);
        if (!p) { msg("Esse personagem não está disponível nesta campanha.",true); }
        else { adicionar(p); adicionouPedido = true; msg("Personagem adicionado à iniciativa."); }
      } else msg("");
      desenhar();carregou=true;
    } catch(e) { msg("Não foi possível carregar os personagens: "+e.message,true); }
    finally { buscando = false; }
  }
  async function iniciar() {
    if (!conta) { box.hidden = true; return; }   // visitante: o painel de campanhas nem aparece (a iniciativa continua com combatentes manuais)
    box.hidden = false; box.open = true;
    msg("Carregando campanhas…");
    try {
      const ms = await nuvem.get("membros?select=campanha_id,papel,campanha:campanhas(id,nome)&usuario_id=eq."+encodeURIComponent(conta)+"&papel=eq.mestre");
      if (!mesmaConta()) return;
      camps = ms.filter(m => m.papel === "mestre" && m.campanha).map(m => m.campanha);

      if (!camps.length) { box.hidden=true; msg("Você pode consultar o bestiário. Para adicionar o grupo à iniciativa, abra uma campanha onde você é mestre."); return; }
      $("#ci-camp").innerHTML = camps.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.nome)+'</option>').join("");
      let anterior = ""; try { anterior = (window.CAMPANHAS_UI ? window.CAMPANHAS_UI.ativaId() : localStorage.getItem("ini_campanha")) || ""; } catch (_) {}
      atual = camps.find(c=>c.id===pedido)?.id || camps.find(c=>c.id===anterior)?.id || camps[0].id;
      $("#ci-camp").value = atual;
      if(window.CAMPANHAS_UI)window.CAMPANHAS_UI.lembrar(atual);
      window.__ini.trocarContexto?.(atual);
      await carregar();
      nuvem.observar?.(carregar,5000);
    } catch(e) { msg("Não foi possível carregar as campanhas: "+e.message,true); }
  }
  box.addEventListener("click",e=>{
    const resumo=e.target.closest("[data-ci-resumo]");if(resumo){const p=pers.find(p=>p.id===resumo.dataset.ciResumo);if(p)abrirResumo(p);return;}
    const b=e.target.closest("[data-ci]");
    if(b){const p=pers.find(p=>p.id===b.dataset.ci);if(p){adicionar(p);desenhar();}return;}
    if(e.target.closest("#ci-todos")){pers.forEach(adicionar);desenhar();return;}
    if(e.target.closest("#ci-recarregar")){falhas=0;carregou=false;carregar();}
  });
  box.addEventListener("change",e=>{
    if(e.target.id!=="ci-camp" || !camps.some(c=>c.id===e.target.value))return;atual=e.target.value;carregou=false;if(resumoId)fecharResumo();
    if(window.CAMPANHAS_UI)window.CAMPANHAS_UI.lembrar(atual);else try{localStorage.setItem("ini_campanha",atual);}catch(_){}
    window.__ini.trocarContexto?.(atual);
    carregar();
  });
  document.addEventListener("ficha:fechar-personagem",()=>{if(!$("#ci-resumo").hidden)fecharResumo();});
  $("#ci-resumo-fechar").addEventListener("click",fecharResumo);
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&resumoId)fecharResumo();});
  $("#combatants").addEventListener("click",e=>{if(e.target.closest("button,input,select"))return;const artigo=e.target.closest("[data-pid]");const p=artigo&&pers.find(p=>p.id===artigo.dataset.pid);if(p)abrirResumo(p);});
  setInterval(async()=>{
    if(!podeUsar() || falhas>5)return;
    for(const c of window.__ini.list()){
      if(!c.pid || ocupadas.has(c.pid) || !pers.some(p=>p.id===c.pid))continue;
      const v=Math.max(0,Math.min(c.maxHp,Math.round(c.hp)));
      if(enviado[c.pid]===undefined){enviado[c.pid]=v;continue;}
      if(enviado[c.pid]===v)continue;
      try{if(await nuvem.rpc('eh_mestre',{c:atual}) !== true){bloquear();return;}const r=await nuvem.patch("personagens?id=eq."+encodeURIComponent(c.pid),{pv_atual:v});if(!r?.[0])throw new Error("A ficha não confirmou a atualização.");enviado[c.pid]=v;falhas=0;}
      catch(e){falhas++;msg("Não foi possível salvar os PV na ficha: "+e.message,true);}
    }
  },2500);
  window.addEventListener('message',async e=>{
    const frame=$('#ci-ficha-frame');
    if(!podeUsar() || e.origin!==location.origin || !frame?.contentWindow || e.source!==frame.contentWindow || e.data?.id!==frame.dataset.personagem)return;
    if(e.data.tipo==='ficha-fechar'){fecharResumo();return;}
    if(e.data.tipo==='ficha-magia'){if(typeof e.data.en==='string'&&e.data.en.length<120)window.abrirMagiaNoPainel?.(e.data.en);return;}
    if(e.data.tipo==='ficha-salvando'){
      if(!ocupadas.has(e.data.id))basesPV.set(e.data.id,window.__ini.list().find(c=>c.pid===e.data.id)?.hp);
      ocupadas.add(e.data.id);return;
    }
    if(e.data.tipo!=='ficha-salva')return;
    const pid=e.data.id;
    try {
      if(await nuvem.rpc('eh_mestre',{c:atual}) !== true){bloquear();return;}
      const rows=await nuvem.get('personagens?select=*&id=eq.'+encodeURIComponent(pid)+'&campanha_id=eq.'+encodeURIComponent(atual));
      if(!podeUsar() || !rows[0])return;
      const p=rows[0],combatente=window.__ini.list().find(c=>c.pid===pid),base=basesPV.get(pid);
      // Preserva dano/cura feitos no combate enquanto a ficha estava gravando.
      if(combatente && Number.isFinite(base) && combatente.hp!==base){
        p.pv_atual=Math.max(0,Math.min(p.pv_max,p.pv_atual+combatente.hp-base));
        const salvo=await nuvem.patch('personagens?id=eq.'+encodeURIComponent(pid),{pv_atual:p.pv_atual});
        if(!salvo?.[0])throw Error('A ficha não confirmou a conciliação de PV.');
      }
      pers=pers.map(x=>x.id===pid?p:x);
      for(const c of window.__ini.list().filter(c=>c.pid===pid)){c.hp=p.pv_atual;c.maxHp=p.pv_max;c.ac=p.ca;c.foto=p.ficha?.foto||'';}
      enviado[pid]=p.pv_atual;ocupadas.delete(pid);basesPV.delete(pid);window.__ini.render();desenhar();
    } catch(e){msg(e.message,true);}
  });
  window.__ini.aoAlterar?.(desenhar);
  iniciar();
})();
