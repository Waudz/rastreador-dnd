/* Personagens da campanha na iniciativa; só o mestre sincroniza PV com as fichas. */
(() => {
  "use strict";
  const $ = s => document.querySelector(s), box = $("#camp-ini");
  if (!box || !window.nuvem) return;
  const esc = nuvem.esc;
  const params = new URLSearchParams(location.search), pedido = params.get("campanha"), personagemPedido = params.get("personagem");
  const conta = nuvem.usuario()?.id;
  let camps = [], pers = [], atual = "", enviado = {}, falhas = 0, adicionouPedido = false, buscando = false, carregou = false, resumoId = null, focoAnterior = null;
  const msg = (t, erro) => { $("#ci-msg").innerHTML = erro ? '<span class="err">'+esc(t)+'</span>' : esc(t || ""); };
  const mesmaConta = () => nuvem.usuario()?.id === conta;
  const emCombate = p => window.__ini.list().some(c => c.pid === p.id);
  function desenhar() {
    const html = pers.length ? pers.map(p => {
      const f = p.ficha || {}, foto = f.foto && /^data:image\//.test(f.foto) ? '<img class="av" style="width:36px;height:36px" src="'+esc(f.foto)+'" alt="">' : "";
      return '<article class="ci-cartao"><button type="button" class="ci-personagem" data-ci-resumo="'+esc(p.id)+'" aria-label="Ver resumo de '+esc(p.nome)+'">'+foto+'<span><b>'+esc(p.nome)+'</b><small>'+esc(f.classe||[f.npc?"NPC":"Personagem",f.nivel?'Nível '+f.nivel:''].filter(Boolean).join(' · '))+'</small><small>PV '+p.pv_atual+'/'+p.pv_max+' · CA '+p.ca+'</small></span></button>'+(emCombate(p)?'<span class="muted ci-no-combate">No combate</span>':'<button type="button" class="small" data-ci="'+esc(p.id)+'">Adicionar à iniciativa</button>')+'</article>';
    }).join("") : '<span class="muted">Esta campanha ainda não tem personagens. Importe ou crie as fichas dentro da campanha.</span>';
    if($("#ci-lista").innerHTML!==html)$("#ci-lista").innerHTML=html;
  }
  function abrirResumo(p){
    resumoId=p.id;focoAnterior=document.activeElement;
    const f=p.ficha||{},r=window.REGRAS,atributos=f.atributos||{},fontes=r.fontesPericias(f);
    const detalhes=(nome,desc)=>'<details class="item"><summary>'+esc(nome)+'</summary><p class="descricao-regra">'+esc(desc||'Sem descrição cadastrada.')+'</p></details>';
    const foto=f.foto&&/^data:image\//.test(f.foto)?'<img class="av" width="64" height="64" src="'+esc(f.foto)+'" alt="">':'';
    $("#ci-resumo-corpo").innerHTML=foto+'<h2>'+esc(p.nome)+'</h2><p>'+esc([f.raca,f.classe||r.resumoClasses(f.classes||[]).descricao].filter(Boolean).join(' · '))+'</p><p>PV '+p.pv_atual+' / '+p.pv_max+' · CA '+p.ca+' · Proficiência +'+r.prof(r.nivelTotal(f.classes||[])||f.nivel||1)+'</p><div class="ci-atributos">'+r.ATR.map(k=>'<div><small>'+esc(r.ATR_NOME[k])+'</small><strong>'+(Number(atributos[k])||10)+'</strong><span>'+((r.mod(atributos[k]||10)>=0?'+':'')+r.mod(atributos[k]||10))+'</span></div>').join('')+'</div><h3>Perícias</h3><p>'+r.PERICIAS.filter(([k])=>fontes.basicas.includes(k)).map(([k,n])=>esc(n)+(fontes.especializadas.includes(k)?' (Especialização)':'')).join(', ')+'</p><h3>Traços Raciais</h3>'+(f.tracosRaciais||r.tracosRaciais(f.raca)).map(t=>detalhes(t.nome,t.desc)).join('')+(f.backgroundCaracteristica?'<h3>Origem · '+esc(f.background||'')+'</h3>'+detalhes(f.backgroundCaracteristica.nome,f.backgroundCaracteristica.desc):'')+'<h3>Características</h3>'+(f.caracteristicas||[]).map(h=>detalhes(h.nome,h.desc)).join('')+'<h3>Magias</h3>'+(f.magias||[]).map(m=>detalhes(m.n+' · '+(m.l?m.l+'º Círculo':'Truque')+(m.prep&&m.l?' · Preparada':''),m.d)).join('')+'<a class="btnlike" href="personagem.html?id='+encodeURIComponent(p.id)+'">Abrir ficha completa</a>';
    $("#ci-resumo").hidden=false;$("#ci-resumo-fechar").focus?.();
  }
  function fecharResumo(){resumoId=null;$("#ci-resumo").hidden=true;focoAnterior?.focus?.();}
  function adicionar(p) {
    if (emCombate(p)) return;
    const f = p.ficha || {};
    const usados = new Set(window.__ini.list().map(c => c.name));
    let nome = p.nome, n = 2; while (usados.has(nome)) nome = p.nome+" "+n++;
    window.__ini.add({name:nome,kind:f.npc?"NPC":"Personagem",initiative:null,hp:p.pv_atual,maxHp:Math.max(1,p.pv_max),ac:p.ca||0,key:"",pid:p.id,campanhaId:atual,foto:f.foto||""});
    enviado[p.id] = p.pv_atual;
  }
  async function carregar() {
    if (buscando || !mesmaConta()) return;
    buscando = true; if(!carregou)msg("Carregando personagens…");
    try {
      const lista = await nuvem.get("personagens?select=id,nome,pv_atual,pv_max,ca,ficha&campanha_id=eq."+encodeURIComponent(atual)+"&order=nome");
      if (!mesmaConta()) return;
      pers = lista;
      let mudouFoto = false;
      for (const c of window.__ini.list()) {
        const p = pers.find(p => p.id === c.pid);
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
    box.hidden = false; box.open = true;
    if (!conta) { msg("Entre na sua conta para usar personagens de campanhas na iniciativa.",true); return; }
    msg("Carregando campanhas…");
    try {
      const ms = await nuvem.get("membros?select=campanha_id,papel,campanha:campanhas(id,nome)&usuario_id=eq."+encodeURIComponent(conta)+"&papel=eq.mestre");
      if (!mesmaConta()) return;
      camps = ms.filter(m => m.campanha).map(m => m.campanha);
      if(window.ACESSO && await ACESSO.pronto)camps=await nuvem.get("campanhas?select=id,nome&order=nome");
      if (!camps.length) { msg("Você pode consultar o bestiário. Para adicionar o grupo à iniciativa, abra uma campanha onde você é mestre."); return; }
      $("#ci-camp").innerHTML = camps.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.nome)+'</option>').join("");
      let anterior = ""; try { anterior = localStorage.getItem("ini_campanha") || ""; } catch (_) {}
      atual = camps.find(c=>c.id===pedido)?.id || camps.find(c=>c.id===anterior)?.id || camps[0].id;
      $("#ci-camp").value = atual;
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
    if(e.target.id!=="ci-camp")return;atual=e.target.value;carregou=false;if(resumoId)fecharResumo();
    try{localStorage.setItem("ini_campanha",atual);}catch(_){}
    carregar();
  });
  $("#ci-resumo-fechar").addEventListener("click",fecharResumo);
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&resumoId)fecharResumo();});
  $("#combatants").addEventListener("click",e=>{if(e.target.closest("button,input,select"))return;const artigo=e.target.closest("[data-pid]");const p=artigo&&pers.find(p=>p.id===artigo.dataset.pid);if(p)abrirResumo(p);});
  setInterval(async()=>{
    if(!mesmaConta() || falhas>5)return;
    for(const c of window.__ini.list()){
      if(!c.pid || !pers.some(p=>p.id===c.pid))continue;
      const v=Math.max(0,Math.min(c.maxHp,Math.round(c.hp)));
      if(enviado[c.pid]===undefined){enviado[c.pid]=v;continue;}
      if(enviado[c.pid]===v)continue;
      try{const r=await nuvem.patch("personagens?id=eq."+encodeURIComponent(c.pid),{pv_atual:v});if(!r?.[0])throw new Error("A ficha não confirmou a atualização.");enviado[c.pid]=v;falhas=0;}
      catch(e){falhas++;msg("Não foi possível salvar os PV na ficha: "+e.message,true);}
    }
  },2500);
  iniciar();
})();
