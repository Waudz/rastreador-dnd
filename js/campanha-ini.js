/* Personagens da campanha na iniciativa; só o mestre sincroniza PV com as fichas. */
(() => {
  "use strict";
  const $ = s => document.querySelector(s), box = $("#camp-ini");
  if (!box || !window.nuvem) return;
  const esc = nuvem.esc;
  const params = new URLSearchParams(location.search), pedido = params.get("campanha"), personagemPedido = params.get("personagem");
  const conta = nuvem.usuario()?.id;
  let forcarSync = false, vistos = {}, jogador = false, camps = [], pers = [], atual = "", enviado = {}, falhas = 0, adicionouPedido = false, buscando = false, carregou = false, resumoId = null, focoAnterior = null, ultimaGrade = null;
  const msg = (t, erro) => { $("#ci-msg").innerHTML = erro ? '<span class="err">'+esc(t)+'</span>' : esc(t || ""); };
  const mesmaConta = () => nuvem.usuario()?.id === conta;
  const emCombate = p => window.__ini.list().some(c => c.pid === p.id);
  /* O mestre usa a campanha inteira e sincroniza PV com as fichas; o jogador só vê e adiciona os PRÓPRIOS personagens (leitura) e usa o rastreador no aparelho dele. */
  const podeUsar = () => mesmaConta() && camps.some(c => c.id === atual);
  const sincroniza = () => podeUsar() && !jogador;
  /* ataques da ficha (nome, bônus de acerto e dano já com atributo e proficiência) para o painel Atacar */
  window.__ini.ataquesDe = (pid) => {
    const p = pers.find((x) => x.id === pid), f = p && p.ficha, R = window.REGRAS, A = window.ATAQUE_INI;
    if (!f || !R || !A || !Array.isArray(f.ataques)) return [];
    return f.ataques.map((a) => { const v = R.valoresAtaque(f, a), partes = A.parseExpressao(a.dado || "1"); if (!partes) return null; partes[0].b = (partes[0].b || 0) + v.dano; partes[0].t = a.tipo || ""; return { nome: a.nome || "Ataque", hit: v.ataque, dmg: partes }; }).filter(Boolean);
  };
  const TIPOS_PT = ["cortante", "perfurante", "contundente", "fogo", "frio", "ácido", "elétrico", "trovejante", "necrótico", "psíquico", "radiante", "venenoso", "veneno", "energia", "energético", "força"];
  window.__ini.salvaPersonagem = (pid, ab) => { const p = pers.find((x) => x.id === pid), f = p && p.ficha, R = window.REGRAS; if (!f || !R) return null; const c0 = f.classes && f.classes[0] && R.classe(f.classes[0].c); return R.mod(R.atributoEf(f, ab)) + (c0 && (c0.salv || []).includes(ab) ? R.prof(R.nivelTotal(f.classes || []) || 1) : 0) + R.bonusTemp(f, "salvaguardas"); };
  window.__ini.defesasPersonagem = (pid) => {                       // só resistências escritas na ficha (texto livre), por tipo de dano em português
    const p = pers.find((x) => x.id === pid), f = p && p.ficha, A = window.ATAQUE_INI; if (!f || !A) return null;
    const texto = (Array.isArray(f.resistencias) ? f.resistencias.join(" ") : String(f.resistencias || "")).toLowerCase(), achados = [...new Set(TIPOS_PT.filter((t) => texto.includes(t)).map((t) => A.tipoEn(t)).filter(Boolean))];
    return achados.length ? { resistencias: achados, imunidades: [], vulnerabilidades: [], naoMagico: false } : null;
  };
  const bonusIniBase = window.__ini.bonusIniciativaDe;
  window.__ini.bonusIniciativaDe = (c) => { if (c && c.pid) { const f = window.__ini.fichaDe(c.pid); if (f && window.GRUPO_PERSONAGENS) return window.GRUPO_PERSONAGENS.bonus(f); } return bonusIniBase ? bonusIniBase(c) : undefined; };
  window.__ini.papel = () => (!conta ? "visitante" : atual ? (jogador ? "jogador" : "mestre") : "sem-campanha");
  window.__ini.fichaDe = (pid) => (pers.find((x) => x.id === pid) || {}).ficha || null;
  /* Fora do modo treino (só mestre): conjurar com um personagem da campanha gasta um espaço na ficha dele, com controle de versão (nunca sobrescreve uma edição simultânea). */
  window.__ini.gastarEspaco = async (pid, circulo) => {
    if (!sincroniza()) return { ok: false, msg: "Só o mestre gasta espaços na ficha. Use o modo treino." };
    try {
      if (await nuvem.rpc("eh_mestre", { c: atual }) !== true) return { ok: false, msg: "Sem permissão de mestre nesta campanha." };
      const r = await nuvem.get("personagens?select=versao,ficha&id=eq." + encodeURIComponent(pid) + "&campanha_id=eq." + encodeURIComponent(atual)), reg = r[0];
      if (!reg) return { ok: false, msg: "Ficha não encontrada." };
      const f = reg.ficha || {}, c = window.REGRAS.conjuracao(f.classes || []), us = Array.isArray(f.slotsUsados) ? f.slotsUsados.slice() : [], total = c.slots[circulo - 1] || 0;
      let texto;
      if (total > 0 && (Number(us[circulo - 1]) || 0) < total) { us[circulo - 1] = (Number(us[circulo - 1]) || 0) + 1; f.slotsUsados = us; texto = "Gastou 1 espaço de " + circulo + "º círculo (" + us[circulo - 1] + " de " + total + " usados)."; }
      else if (c.pact && c.pact.nivel >= circulo && (Number(f.pactoUsado) || 0) < c.pact.qtd) { f.pactoUsado = (Number(f.pactoUsado) || 0) + 1; texto = "Gastou 1 espaço de Pacto (" + f.pactoUsado + " de " + c.pact.qtd + " usados)."; }
      else return { ok: false, msg: "Sem espaço de " + circulo + "º círculo disponível. Ligue o modo treino para testar sem gastar." };
      const salvo = await nuvem.patch("personagens?id=eq." + encodeURIComponent(pid) + "&versao=eq." + encodeURIComponent(reg.versao), { ficha: f });
      if (!salvo || !salvo[0]) throw new Error("a ficha mudou durante o uso; tente de novo");
      const p = pers.find((x) => x.id === pid); if (p) p.ficha = f;
      return { ok: true, msg: texto };
    } catch (e) { return { ok: false, msg: "Não foi possível gastar o espaço: " + e.message }; }
  };
  const selecionados=new Set(), digitadas = {}, resultadosCartao = {};   // digitadas: iniciativa informada à mão (dado físico) por personagem
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
    const html=pers.length?pers.map(p=>'<article class="ci-cartao grupo-cartao ci-cartao-ini"><div class="ci-topo">'+G.checkbox(p,selecionados.has(p.id),'ci-sel',emCombate(p))+G.identidade(p,{resumo:true,vida:true})+'</div>'+(emCombate(p)?'<span class="muted ci-no-combate">No combate</span>':'<div class="ci-acoes"><label class="ci-ini"><span>Ini.</span><input type="number" step="1" data-ci-ini="'+esc(p.id)+'" placeholder="d20" title="Digite o resultado final do dado físico, ou use Rolar d20" aria-label="Iniciativa de '+esc(p.nome)+'"></label><button type="button" class="small" data-ci-rolar="'+esc(p.id)+'" title="Rola 1d20 mais o bônus de iniciativa e preenche o campo">Rolar d20</button><button type="button" class="small primary" data-ci="'+esc(p.id)+'" title="Adicionar à iniciativa" aria-label="Adicionar '+esc(p.nome)+' à iniciativa">Adicionar</button></div><p class="ci-ini-res" role="status">'+esc(resultadosCartao[p.id]||'')+'</p>')+'</article>').join(''):'<span class="muted">Esta campanha ainda não tem personagens. Importe ou crie as fichas dentro da campanha.</span>';
    if(ultimaGrade!==html){$("#ci-lista").innerHTML=html;ultimaGrade=html;}
    document.querySelectorAll?.('[data-ci-ini]').forEach(i=>{if(digitadas[i.dataset.ciIni]!==undefined&&i.value!==String(digitadas[i.dataset.ciIni]))i.value=digitadas[i.dataset.ciIni];});
  }
  function abrirResumo(p){
    if (!podeUsar()) return;
    if (resumoId && resumoId !== p.id && ocupadas.has(resumoId)) { msg('Aguarde a ficha terminar de salvar antes de trocar de personagem.'); return; }
    if (resumoId === p.id && !$("#ci-resumo").hidden) return;
    resumoId=p.id;focoAnterior=document.activeElement;
    if(window.LEITOR_FICHAS){if(!window.LEITOR_FICHAS.personagem(p.id,p.nome))return;}else{$('#ci-resumo-corpo').innerHTML='<iframe id="ci-ficha-frame" data-personagem="'+esc(p.id)+'" title="Ficha de '+esc(p.nome)+'" src="personagem.html?id='+encodeURIComponent(p.id)+'&modo=painel"></iframe>';$('#ci-resumo').hidden=false;window.reorganizarPaineis?.();}
  }
  function fecharResumo(){if(window.PAINEL)window.PAINEL.fechar();$("#ci-resumo").hidden=true;document.body.classList.remove('com-ficha-lateral');window.reorganizarPaineis?.();focoAnterior?.focus?.();}

  function adicionar(p,rolar=false,numero) {
    if (!podeUsar() || emCombate(p)) return;
    const f = p.ficha || {};
    const usados = new Set(window.__ini.list().map(c => c.name));
    let nome = p.nome, n = 2; while (usados.has(nome)) nome = p.nome+" "+n++;
    window.__ini.add({name:nome,kind:f.npc?"NPC":"Personagem",initiative:Number.isFinite(numero)?numero:rolar?window.GRUPO_PERSONAGENS.rolar(p):null,hp:p.pv_atual,maxHp:Math.max(1,p.pv_max),ac:p.ca||0,key:"",pid:p.id,campanhaId:atual,foto:f.foto||""});
    enviado[p.id] = p.pv_atual;
  }
  /* iniciativa informada à mão (vazio = não informada); aceita inteiros razoáveis */
  const numeroDe=pid=>{const t=String(digitadas[pid]??'').trim();if(t==='')return undefined;const n=Number(t);return Number.isInteger(n)&&n>=-20&&n<=60?n:NaN;};
  function mostrarResultados(linhas){
    const el=$('#ci-resultado');if(!el)return;
    el.innerHTML=linhas.length?'<strong>Iniciativa</strong><ul>'+linhas.map(l=>'<li>'+esc(l)+'</li>').join('')+'</ul>':'';
    if(linhas.length)window.FEEDBACK?.mostrar(linhas.length===1?linhas[0]:linhas.length+' iniciativas definidas. Veja o resultado dos dados no painel Personagens.');
  }
  async function adicionarSelecionados(ids){
    if(!podeUsar())return;
    const campanha=atual;
    if(!jogador&&await nuvem.rpc('eh_mestre',{c:campanha})!==true){if(campanha===atual){bloquear();contextoVisual(false);}return false;}
    if(!podeUsar()||campanha!==atual)return;
    const escolhidos=pers.filter(p=>ids.includes(p.id)&&!emCombate(p));
    const linhas=[],invalidos=[];
    for(const p of escolhidos){
      const n=numeroDe(p.id);
      if(Number.isNaN(n)){invalidos.push(p.nome);continue;}
      if(n!==undefined){adicionar(p,false,n);linhas.push(p.nome+': '+n+' (informado por você)');}
      else{const r=window.GRUPO_PERSONAGENS.rolarDetalhe(p);adicionar(p,false,r.total);linhas.push(p.nome+': '+(r.d20===null?'':'d20 '+r.d20+(r.bonus?(r.bonus>0?' + ':' - ')+Math.abs(r.bonus):'')+' = ')+r.total+' (rolado)');}
      delete digitadas[p.id];delete resultadosCartao[p.id];
    }
    selecionados.clear();desenhar();mostrarResultados(linhas);
    if(invalidos.length)msg('Iniciativa inválida para: '+invalidos.join(', ')+'. Use um número inteiro ou deixe vazio para o app rolar.',true);
    else msg((escolhidos.length-invalidos.length)+' personagem(ns) adicionado(s). Os participantes atuais foram preservados.');return true;
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
        /* A ficha é a fonte dos PV, CA e PV máximo: quando ela muda (ou o jogador pede "Atualizar personagens"), o combate acompanha. O jogador não grava na ficha. */
        if (p && (jogador || forcarSync)) {
          const assinatura = [p.pv_atual, p.pv_max, p.ca].join("|");
          if (forcarSync || (vistos[p.id] !== undefined && vistos[p.id] !== assinatura)) { c.hp = p.pv_atual; c.maxHp = Math.max(1, p.pv_max); c.ac = p.ca || 0; enviado[p.id] = p.pv_atual; mudouFoto = true; }
          vistos[p.id] = assinatura;
          if (p.ficha?.foto && c.foto !== p.ficha.foto) { c.foto = p.ficha.foto; mudouFoto = true; }
          continue;
        }
        if(p && !ocupadas.has(p.id) && enviado[p.id] === c.hp && (c.hp !== p.pv_atual || c.maxHp !== p.pv_max || c.ac !== p.ca)) {
          c.hp=p.pv_atual;c.maxHp=p.pv_max;c.ac=p.ca;enviado[p.id]=p.pv_atual;mudouFoto=true;
        }
        if (p?.ficha?.foto && c.foto !== p.ficha.foto) { c.foto = p.ficha.foto; mudouFoto = true; }
      }
      forcarSync = false;
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
      if(!c){if(preferida)window.CAMPANHAS_UI?.esquecer(preferida);atual='';jogador=false;window.__ini.trocarContexto?.('');contextoVisual(true);box.hidden=true;await window.CAMPANHAS_UI?.montarSeletor({});return;}   // sem campanha ativa: rastreador próprio, independente do mestre
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
    const rl=e.target.closest("[data-ci-rolar]");
    if(rl){const p=pers.find(p=>p.id===rl.dataset.ciRolar);if(p&&!emCombate(p)){const r=window.GRUPO_PERSONAGENS.rolarDetalhe(p);digitadas[p.id]=String(r.total);resultadosCartao[p.id]=(r.d20===null?'':'d20 '+r.d20+(r.bonus?(r.bonus>0?' + ':' - ')+Math.abs(r.bonus):'')+' = ')+r.total;desenhar();}return;}
    if(b){const p=pers.find(p=>p.id===b.dataset.ci);if(p){const n=numeroDe(p.id);if(Number.isNaN(n)){msg('Iniciativa inválida para '+p.nome+'. Use um número inteiro ou deixe vazio.',true);return;}adicionar(p,false,n);delete digitadas[p.id];delete resultadosCartao[p.id];desenhar();mostrarResultados([n===undefined?p.nome+' entrou sem iniciativa: preencha o número na ordem do combate ou use Rolar iniciativa.':p.nome+': '+n+' (informado por você)']);}return;}
    if(e.target.closest('#ci-todos')){if(!podeUsar())return;pers.filter(p=>!emCombate(p)).forEach(p=>selecionados.add(p.id));desenhar();return;}
    if(e.target.closest('#ci-nenhum')){selecionados.clear();desenhar();return;}
    if(e.target.closest('#ci-rolar')){adicionarSelecionados([...selecionados]).catch(e=>msg(e.message,true));return;}
    if(e.target.closest("#ci-recarregar")){falhas=0;carregou=false;forcarSync=true;carregar();}
  });
  box.addEventListener("input",e=>{if(e.target.dataset?.ciIni!==undefined)digitadas[e.target.dataset.ciIni]=e.target.value;});
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
