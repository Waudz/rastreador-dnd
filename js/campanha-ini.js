/* Personagens da campanha na iniciativa; só o mestre sincroniza PV com as fichas. */
(() => {
  "use strict";
  const $ = s => document.querySelector(s), box = $("#camp-ini");
  if (!box || !window.nuvem) return;
  const esc = nuvem.esc;
  const params = new URLSearchParams(location.search), pedido = params.get("campanha"), personagemPedido = params.get("personagem");
  const conta = nuvem.usuario()?.id;
  let camps = [], pers = [], atual = "", enviado = {}, falhas = 0, adicionouPedido = false, buscando = false;
  const msg = (t, erro) => { $("#ci-msg").innerHTML = erro ? '<span class="err">'+esc(t)+'</span>' : esc(t || ""); };
  const mesmaConta = () => nuvem.usuario()?.id === conta;
  const emCombate = p => window.__ini.list().some(c => c.pid === p.id);
  function desenhar() {
    $("#ci-lista").innerHTML = pers.length ? pers.map(p => {
      const f = p.ficha || {}, foto = f.foto && /^data:image\//.test(f.foto) ? '<img class="av" style="width:36px;height:36px" src="'+esc(f.foto)+'" alt="">' : "";
      return '<div class="res"><span class="inline">'+foto+'<span><b>'+esc(p.nome)+'</b> <span class="badge jog">'+(f.npc?"NPC":"Personagem")+'</span> <span class="muted">PV '+p.pv_atual+'/'+p.pv_max+' · CA '+p.ca+'</span></span></span>'+(emCombate(p)?'<span class="muted">No combate</span>':'<button type="button" class="small primary" data-ci="'+esc(p.id)+'">Adicionar</button>')+'</div>';
    }).join("") : '<span class="muted">Esta campanha ainda não tem personagens. Importe ou crie as fichas dentro da campanha.</span>';
  }
  function adicionar(p) {
    if (emCombate(p)) return;
    const f = p.ficha || {}, des = Number(f.atributos?.des) || 10;
    const md = Math.floor((des - 10) / 2) + REGRAS.bonusSemProf(f);
    const usados = new Set(window.__ini.list().map(c => c.name));
    let nome = p.nome, n = 2; while (usados.has(nome)) nome = p.nome+" "+n++;
    window.__ini.add({name:nome,kind:f.npc?"NPC":"Personagem",initiative:1+Math.floor(Math.random()*20)+md,hp:p.pv_atual,maxHp:Math.max(1,p.pv_max),ac:p.ca||0,key:"",pid:p.id,campanhaId:atual,foto:f.foto||""});
    enviado[p.id] = p.pv_atual;
  }
  async function carregar() {
    if (buscando || !mesmaConta()) return;
    buscando = true; msg("Carregando personagens…");
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
      desenhar();
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
    const b=e.target.closest("[data-ci]");
    if(b){const p=pers.find(p=>p.id===b.dataset.ci);if(p){adicionar(p);desenhar();}return;}
    if(e.target.closest("#ci-todos")){pers.forEach(adicionar);desenhar();return;}
    if(e.target.closest("#ci-recarregar")){falhas=0;carregar();}
  });
  box.addEventListener("change",e=>{
    if(e.target.id!=="ci-camp")return;atual=e.target.value;
    try{localStorage.setItem("ini_campanha",atual);}catch(_){}
    carregar();
  });
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
