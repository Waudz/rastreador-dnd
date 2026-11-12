/* Personagens da campanha na iniciativa; só o mestre sincroniza PV com as fichas. */
(() => {
  "use strict";
  const $ = s => document.querySelector(s), box = $("#camp-ini");
  if (!box || !window.nuvem) return;
  const esc = nuvem.esc;
  const params = new URLSearchParams(location.search), pedido = params.get("campanha"), personagemPedido = params.get("personagem");
  const conta = nuvem.usuario()?.id;
  let jogador = false, camps = [], pers = [], atual = "", enviado = {}, falhas = 0, adicionouPedido = false, buscando = false, carregou = false, resumoId = null, focoAnterior = null, ultimaGrade = null;
  const msg = (t, erro) => { $("#ci-msg").innerHTML = erro ? '<span class="err">'+esc(t)+'</span>' : esc(t || ""); };
  const mesmaConta = () => nuvem.usuario()?.id === conta;
  const emCombate = p => window.__ini.list().some(c => c.pid === p.id);
  /* O mestre usa a campanha inteira e sincroniza PV com as fichas; o jogador só vê e adiciona os PRÓPRIOS personagens (leitura) e usa o rastreador no aparelho dele. */
  const podeUsar = () => mesmaConta() && camps.some(c => c.id === atual);
  const sincroniza = () => podeUsar() && !jogador;
  const selecionados=new Set();
  const ocupadas = new Set();
  const basesPV = new Map();
  function bloquear(){
    pers=[];camps=[];ocupadas.clear();basesPV.clear();box.hidden=true;
    fecharResumo();$('#ci-lista').innerHTML='';$('#ci-resumo-corpo').innerHTML='';resumoId=null;
  }
  function desenhar() {
    const G=window.GRUPO_PERSONAGENS;
    for(const pid of selecionados)if(!pers.some(p=>p.id===pid&&!emCombate(p)))selecionados.delete(pid);
    window.__ini.selecaoPendente?.(selecionados.size,()=>adicionarSelecionados([...selecionados]));
    const barra=G.barra('ci',selecionados.size);if($('#ci-selecao').innerHTML!==barra)$('#ci-selecao').innerHTML=barra;
    const html=pers.length?pers.map(p=>'<article class="ci-cartao grupo-cartao">'+G.checkbox(p,selecionados.has(p.id),'ci-sel',emCombate(p))+G.identidade(p,{resumo:true,vida:true})+(emCombate(p)?'<span class="muted ci-no-combate">No combate</span>':'<button type="button" class="grupo-icone" data-ci="'+esc(p.id)+'" title="Adicionar à iniciativa" aria-label="Adicionar '+esc(p.nome)+' à iniciativa">'+G.icone('swords')+'</button>')+'</article>').join(''):'<span class="muted">Esta campanha ainda não tem personagens. Importe ou crie as fichas dentro da campanha.</span>';
    if(ultimaGrade!==html){$("#ci-lista").innerHTML=html;ultimaGrade=html;}
  }
  function abrirResumo(p){
    if (!podeUsar()) return;
    if (resumoId && resumoId !== p.id && ocupadas.has(resumoId)) { msg('Aguarde a ficha terminar de salvar antes de trocar de personagem.'); return; }
    if (resumoId === p.id && !$("#ci-resumo").hidden) return;
    resumoId=p.id;focoAnterior=document.activeElement;
    if(window.LEITOR_FICHAS){if(!window.LEITOR_FICHAS.personagem(p.id,p.nome))return;}else{$('#ci-resumo-corpo').innerHTML='<iframe id="ci-ficha-frame" data-personagem="'+esc(p.id)+'" title="Ficha de '+esc(p.nome)+'" src="personagem.html?id='+encodeURIComponent(p.id)+'&modo=painel"></iframe>';$('#ci-resumo').hidden=false;window.reorganizarPaineis?.();}
  }
  function fecharResumo(){if(window.PAINEL)window.PAINEL.fechar();$("#ci-resumo").hidden=true;document.body.classList.remove('com-ficha-lateral');window.reorganizarPaineis?.();focoAnterior?.focus?.();}

  function adicionar(p,rolar=false) {
    if (!podeUsar() || emCombate(p)) return;
    const f = p.ficha || {};
    const usados = new Set(window.__ini.list().map(c => c.name));
    let nome = p.nome, n = 2; while (usados.has(nome)) nome = p.nome+" "+n++;
    window.__ini.add({name:nome,kind:f.npc?"NPC":"Personagem",initiative:rolar?window.GRUPO_PERSONAGENS.rolar(p):null,hp:p.pv_atual,maxHp:Math.max(1,p.pv_max),ac:p.ca||0,key:"",pid:p.id,campanhaId:atual,foto:f.foto||""});
    enviado[p.id] = p.pv_atual;
  }
  async function adicionarSelecionados(ids){
    if(!podeUsar())return;
    const campanha=atual;
    if(!jogador&&await nuvem.rpc('eh_mestre',{c:campanha})!==true){if(campanha===atual){bloquear();contextoVisual(false);}return false;}
    if(!podeUsar()||campanha!==atual)return;
    const escolhidos=pers.filter(p=>ids.includes(p.id)&&!emCombate(p));
    escolhidos.forEach(p=>adicionar(p,true));selecionados.clear();desenhar();
    msg(escolhidos.length+' personagem(ns) adicionado(s). Os participantes atuais foram preservados.');return true;
  }
  async function carregar() {
    if (buscando || !podeUsar()) return;
    buscando = true; if(!carregou&&window.ESQ){window.ESQ.mostrar($("#ci-lista"),"lista","Carregando personagens…",3);msg("");}
    const campanhaConsultada=atual,geracaoConsultada=geracaoContexto;
    try {
      if(!jogador){
        const mestre = await nuvem.rpc('eh_mestre', {c:atual});
        if(atual!==campanhaConsultada||geracaoConsultada!==geracaoContexto)return;
        if(mestre !== true){window.CAMPANHAS_UI?.esquecer(atual);bloquear();contextoVisual(false);return;}
      }
      const lista = await nuvem.get("personagens?select=id,nome,pv_atual,pv_max,ca,ficha&campanha_id=eq."+encodeURIComponent(campanhaConsultada)+(jogador?"&dono_id=eq."+encodeURIComponent(conta):"")+"&order=nome");
      if (!mesmaConta() || atual !== campanhaConsultada||geracaoConsultada!==geracaoContexto) return;
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
      const pedidos=(params.get('personagens')||'').split(',').filter(Boolean);
      if(pedidos.length&&!adicionouPedido){
        await adicionarSelecionados(pedidos);adicionouPedido=true;
      } else if (personagemPedido && !adicionouPedido) {
        const p = pers.find(p => p.id === personagemPedido);
        if (!p) { msg("Esse personagem não está disponível nesta campanha.",true); }
        else { adicionar(p); adicionouPedido = true; msg("Personagem adicionado à iniciativa."); }
      } else msg("");
      desenhar();carregou=true;
    } catch(e) { if(atual!==campanhaConsultada||geracaoConsultada!==geracaoContexto)return;if(!carregou&&window.ESQ)window.ESQ.erro($("#ci-lista"),"Não foi possível carregar os personagens: "+e.message+".",()=>carregar(),""); else msg("Não foi possível carregar os personagens: "+e.message,true); }
    finally { if(atual===campanhaConsultada&&geracaoConsultada===geracaoContexto)buscando = false; }
  }
  function contextoVisual(ativa){
    for(const id of ['iniciativa-atual','adicionar-combatente']){const el=$('#'+id);if(el)el.hidden=!ativa;}
    box.hidden=!ativa;const vazio=$('#ini-sem-campanha');if(vazio)vazio.hidden=ativa;
  }
  let geracaoContexto=0,pararConsulta=null;
  async function iniciar(novoPedido){
    if(!conta){box.hidden=true;return;}
    const g=++geracaoContexto;buscando=false;pararConsulta?.();pararConsulta=null;selecionados.clear();pers=[];ultimaGrade=null;carregou=false;
    window.__ini.selecaoPendente?.(0,null);
    try{
      const ms=window.CAMPANHAS_UI?.carregar?await window.CAMPANHAS_UI.carregar(true):await nuvem.get('membros?select=papel,campanha:campanhas(id,nome)&usuario_id=eq.'+encodeURIComponent(conta));
      if(!mesmaConta()||g!==geracaoContexto)return;
      camps=ms.filter(m=>m.campanha).map(m=>({...m.campanha,papel:m.papel}));
      const preferida=novoPedido||pedido||(window.CAMPANHAS_UI?.ativaId()||localStorage.getItem('ini_campanha'));
      const c=window.CAMPANHAS_UI?.validar?window.CAMPANHAS_UI.validar(ms,preferida):camps.find(c=>c.id===preferida);
      if(!c){if(preferida)window.CAMPANHAS_UI?.esquecer(preferida);atual='';jogador=false;contextoVisual(false);await window.CAMPANHAS_UI?.montarSeletor({});return;}
      jogador=c.papel==='jogador';const titulo=box.querySelector('summary');if(titulo)titulo.textContent=jogador?'Meus personagens':'Personagens';
      atual=c.id;window.CAMPANHAS_UI?.lembrar(atual);window.__ini.trocarContexto?.(atual);contextoVisual(true);box.open=true;
      await carregar();if(g!==geracaoContexto)return;
      await window.CAMPANHAS_UI?.montarSeletor({...c,podeEditarVisual:false});
      pararConsulta=nuvem.observar?.(carregar,5000);
    }catch(e){box.hidden=false;msg('Não foi possível carregar as campanhas: '+e.message,true);}
  }
  window.addEventListener('campanha:alterada',e=>{if(e.detail?.id&&e.detail.id!==atual){fecharResumo();iniciar(e.detail.id);}});
  box.addEventListener("click",e=>{
    const resumo=e.target.closest("[data-ci-resumo]");if(resumo){const p=pers.find(p=>p.id===resumo.dataset.ciResumo);if(p)abrirResumo(p);return;}
    const b=e.target.closest("[data-ci]");
    if(b){const p=pers.find(p=>p.id===b.dataset.ci);if(p){adicionar(p);desenhar();}return;}
    if(e.target.closest('#ci-todos')){if(!podeUsar())return;pers.filter(p=>!emCombate(p)).forEach(p=>selecionados.add(p.id));desenhar();return;}
    if(e.target.closest('#ci-nenhum')){selecionados.clear();desenhar();return;}
    if(e.target.closest('#ci-rolar')){adicionarSelecionados([...selecionados]).catch(e=>msg(e.message,true));return;}
    if(e.target.closest("#ci-recarregar")){falhas=0;carregou=false;carregar();}
  });
  box.addEventListener("change",e=>{
    if(e.target.dataset?.ciSel){if(!podeUsar())return;const pid=e.target.dataset.ciSel;if(!pers.some(p=>p.id===pid&&!emCombate(p)))return;e.target.checked?selecionados.add(pid):selecionados.delete(pid);desenhar();document.querySelector('[data-ci-sel="'+pid+'"]')?.focus();return;}

  });
  document.addEventListener("ficha:fechar-personagem",()=>{if(!$("#ci-resumo").hidden)fecharResumo();});
  $("#ci-resumo-fechar").addEventListener("click",fecharResumo);
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&resumoId&&!window.PAINEL)fecharResumo();});
  $("#combatants").addEventListener("click",e=>{if(e.target.closest("button,input,select"))return;const artigo=e.target.closest("[data-pid]");const p=artigo&&pers.find(p=>p.id===artigo.dataset.pid);if(p)abrirResumo(p);});
  setInterval(async()=>{
    if(!sincroniza() || falhas>5)return;
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
    if(!sincroniza() || e.origin!==location.origin || !frame?.contentWindow || e.source!==frame.contentWindow || e.data?.id!==frame.dataset.personagem)return;
    if(e.data.tipo==='ficha-fechar'||e.data.tipo==='ficha-magia')return;
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
  let estavaEmCombate=null;
  window.__ini.aoAlterar?.(()=>{desenhar();const em=!!document.querySelector('.combatant.active');if(em!==estavaEmCombate){estavaEmCombate=em;if(em){box.open=false;const add=$('#adicionar-combatente');if(add)add.open=false;}else if(!window.__ini.list().length){const add=$('#adicionar-combatente');if(add)add.open=true;}}});
  iniciar();
})();
