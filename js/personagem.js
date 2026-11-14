/* Ficha do personagem (automática): raça, classes e multiclasse, vida e dados de vida, CA, salvaguardas, perícias,
   ataques, idiomas, magias e espaços, inventário com peso, dinheiro, habilidades e notas.
   O dono e o mestre da campanha podem editar; o banco de dados garante isso (regras de acesso). */
(() => {
  "use strict";
  const perguntar = (m, o) => (typeof CONFIRMAR === "function" ? CONFIRMAR(m, o) : Promise.resolve(confirm(m)));
  const $ = (s) => document.querySelector(s), esc = nuvem.esc, R = window.REGRAS, C = window.FICHA_COMPONENTES;
  const J = window.JOGO, JU = window.JOGO_UI;
  const id = new URLSearchParams(location.search).get("id");
  const modoLeitura=new URLSearchParams(location.search).get("modo"),exclusivoMestre=modoLeitura==="painel";
  const emPainel = ["painel","leitura"].includes(modoLeitura);
  if (emPainel) document.body.classList.add('ficha-embutida');
  const notificar = tipo => { if(emPainel && window.parent !== window) window.parent.postMessage({tipo,id},location.origin); };
  let editandoFicha = false, P = null, camp = null, souMestre = false, donoNome = "", pend = null, salvando = false, timer = null, catalogo = null, magiasCat = null;
  const ATR = [["for", "FOR"], ["des", "DES"], ["con", "CON"], ["int", "INT"], ["sab", "SAB"], ["car", "CAR"]];
  const MOEDAS = [["pc", "Cobre (PC)"], ["pp", "Prata (PP)"], ["po", "Ouro (PO)"]];
  const CLASSES = { Barbarian: "Bárbaro", Bard: "Bardo", Cleric: "Clérigo", Druid: "Druida", Fighter: "Guerreiro", Monk: "Monge", Paladin: "Paladino", Ranger: "Patrulheiro", Rogue: "Ladino", Sorcerer: "Feiticeiro", Warlock: "Bruxo", Wizard: "Mago" };
  const nz = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const num = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
  const mod = (v) => Math.floor((num(v, 10) - 10) / 2), fm = (n) => (n >= 0 ? "+" : "") + n;
  const kg = (n) => (Math.round(n * 10) / 10).toLocaleString("pt-BR");
  const F = () => (P.ficha = P.ficha || {});
  const A = () => (F().atributos = F().atributos || {});
  const INV = () => (P.inventario = Array.isArray(P.inventario) ? P.inventario : []);
  const moeda = v => Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(num(v, 0))));
  const DIN = () => (P.dinheiro = P.dinheiro || { pc: 0, pp: 0, po: 0 });
  const CAR = () => (F().caracteristicas = Array.isArray(F().caracteristicas) ? F().caracteristicas : []);
  const CLS = () => (F().classes = Array.isArray(F().classes) ? F().classes : []);
  const ATQ = () => (F().ataques = Array.isArray(F().ataques) ? F().ataques : []);
  const MAG = () => (F().magias = Array.isArray(F().magias) ? F().magias : []);
  const IDI = () => (Array.isArray(F().idiomas) ? F().idiomas : []);          // automáticos (raça, origem, escolhas do criador)
  const IDX = () => (F().idiomasExtras = Array.isArray(F().idiomasExtras) ? F().idiomasExtras : []);   // aprendidos durante o jogo
  const EQ = () => (F().equip = F().equip || { armadura: "", escudo: false, bonus: 0 });
  const PER = () => R.fontesPericias(F()).valores;
  const aviso = (t, erro) => { $("#erro").innerHTML = t ? (erro ? `<span class="err">${esc(t)}</span>` : esc(t)) : ""; };
  const autoOn = (k) => (F()[k] === undefined ? (k === "caAuto" ? !F().npc : !(F().origem || F().npc)) : !!F()[k]);



  const magiaRacial = () => /Tiefling|Elfo \(Alto\)|Elfo \(Drow\)|Fada|Firbolg|Genasi|Yuan-ti/.test(F().raca||"");
  function escolhasAtributosRaca() {
    const r=R.racial(F().raca);if(!r.atributos)return "";
    const escolhidos=F().atrRaca||[];
    return '<p class="muted">Escolha os atributos do bônus racial. Os demais valores e melhorias de nível são escolhas do jogador.</p><div class="row">'+Array.from({length:r.atributos},(_,i)=>`<select data-atr-raca="${i}" aria-label="Atributo racial ${i+1}">${opt("","Escolha um atributo…",!escolhidos[i])}${R.ATR.filter(k=>!(k in r.bonus)&&(!escolhidos.includes(k)||escolhidos[i]===k)).map(k=>opt(k,R.ATR_NOME[k],escolhidos[i]===k)).join("")}</select>`).join("")+'</div>';
  }
  async function carregarCatalogo() {
    if(catalogo)return;
    const [a,b,d]=await Promise.all([fetch("dados/habilidades.json").then(r=>{if(!r.ok)throw Error("Catálogo indisponível");return r.json();}),fetch("dados/habilidades-pt.json").then(r=>r.ok?r.json():{}),fetch("dados/criacao-srd2014.json").then(r=>r.ok?r.json():{features:[]})]);
    window.SUBCLASSES_2014?.aplicar(d);
    catalogo={itens:a.filter(h=>h.e==="2014"),pt:b,criador:d.features,achados:[]};
  }
  function sincronizarHabilidades() {
    const f=F(), manuais=CAR().filter(x=>!x.auto||x.auto==="escolha"||x.auto==="criador"); f.tracosRaciais=R.tracosDaFicha(f); const raciais=[];
    const classes=f.criacao?.concluido?[]:catalogo?R.habilidadesAutomaticas(f,catalogo.itens,catalogo.pt):CAR().filter(x=>x.auto==="classe");
    const vistos=new Set(manuais.flatMap(x=>[x.cf,x.nome].filter(Boolean)));
    for(const h of manuais){const d=catalogo?.criador?.find(x=>x.id===h.cf);if(d){h.nome=d.nome;h.desc=d.descricao;}}
    f.caracteristicas=manuais.concat([...raciais,...classes].filter(x=>{const k=x.cf||x.nome;if(vistos.has(k)||vistos.has(x.nome))return false;vistos.add(k);vistos.add(x.nome);return true;}));
  }
  document.addEventListener("focusin",e=>{if(!P)return;if(e.target.id==="pg-mag"&&e.target.options.length<3)catalogoMagiasInv().then(l=>{const sel=document.getElementById("pg-mag");if(sel&&sel.options.length<3)sel.insertAdjacentHTML("beforeend",l.slice().sort((a,b)=>a.l-b.l||a.n.localeCompare(b.n,"pt-BR")).map(m=>opt(m.en,`${m.n} (${m.l?m.l+"º círculo":"truque"})`,false)).join(""));}).catch(()=>{});if(e.target.id==="cat-q")buscarCatalogo(e.target.value);});

  /* ---------- salvar (agrupa as alterações por 0,6 s) ---------- */
  function agendar(campos) { if (soLeitura) return; pend = { ...(pend || {}), ...campos }; notificar('ficha-salvando'); $("#estado").textContent = "Salvando…"; clearTimeout(timer); timer = setTimeout(enviar, 600); }
  async function enviar() {
    if (soLeitura || !pend || salvando) return;
    const corpo = JSON.parse(JSON.stringify(pend)); pend = null; salvando = true; let falhou = false;
    try {
      if(exclusivoMestre && await nuvem.rpc('eh_mestre',{c:P.campanha_id}) !== true) throw new Error('Este painel é exclusivo do mestre da campanha.');
      const r = await nuvem.patch(`personagens?id=eq.${encodeURIComponent(id)}&versao=eq.${encodeURIComponent(P.versao)}`, corpo);
      if (!r || !r[0]) throw new Error("O personagem não foi atualizado: a ficha mudou em outra sessão ou você perdeu o acesso. Reabra a ficha antes de salvar.");
      P.versao = r[0].versao;
      $("#estado").textContent = "Salvo";
      if(!pend) notificar('ficha-salva');
    } catch (e) { falhou = true; pend = { ...corpo, ...(pend || {}) }; $("#estado").innerHTML = `<span class="err">Não salvou: ${esc(e.message)}</span>`; }
    finally { salvando = false; if(pend && !falhou){clearTimeout(timer);timer=setTimeout(enviar,0);} }
  }
  window.addEventListener("beforeunload", () => { if (pend) enviar(); });

  /* ---------- visão restrita do grupo ---------- */
  let soLeitura = false;
  async function visaoGrupo(campId, recarregar) {
    let r, perfis;
    try { [r, perfis] = await Promise.all([nuvem.rpc("grupo_fichas", { p_campanha: campId }), nuvem.get("perfis?select=id,nome")]); }
    catch (_) { return visaoGrupoBasica(campId, recarregar); }                       // banco sem a função completa: mostra só os dados básicos
    const voltar = $("#voltar"); if (voltar) { voltar.href = "campanha.html?id=" + encodeURIComponent(campId); voltar.textContent = "Voltar ao grupo"; }
    try {
      const reg = (Array.isArray(r) ? r : []).find((x) => x.id === id); if (!reg) throw new Error("Personagem não encontrado neste grupo.");
      soLeitura = true;                                                              // nada abaixo grava: agendar() e enviar() ficam inertes
      P = { ...reg, campanha_id: campId, inventario: [], dinheiro: { pc: 0, pp: 0, pe: 0, po: 0, pl: 0 }, versao: 0 };
      camp = { id: campId, nome: "Campanha" }; souMestre = false; donoNome = (perfis.find((x) => x.id === P.dono_id) || {}).nome || "";
      migrar(); try { await carregarCatalogo(); } catch (_) {} aplicarAuto(true); desenhar();
      document.title = P.nome + " — Compêndio 5e";
      const tirar = (e) => { if (e && e.remove) e.remove(); };
      for (const k of ["inventario", "notas"]) { tirar(document.querySelector('[data-ficha-aba="' + k + '"]')); tirar(document.querySelector("#secao-" + k)); }
      document.querySelectorAll("#b-foto,.ficha-subir-nivel,.ficha-construcao,#editar-ficha").forEach((e) => e.remove());
      $("#ficha").classList?.add?.("ficha-so-leitura");
      document.querySelectorAll('#ficha input,#ficha select,#ficha textarea,#ficha button:not([data-ficha-aba]):not([data-consultar-magia])').forEach((e) => { e.disabled = true; });
      const est = $("#estado"); if (est) est.textContent = "Somente leitura: ficha de " + donoNome;
      window.atualizarAbasFicha?.();
    } catch (e) { if (window.ESQ) window.ESQ.erro($("#ficha"), e.message, recarregar); else $("#ficha").innerHTML = `<p class="err">${esc(e.message)}</p>`; }
  }
  async function visaoGrupoBasica(campId, recarregar) {
    const box = $("#ficha"), voltar = $("#voltar"); if (voltar) { voltar.href = "campanha.html?id=" + encodeURIComponent(campId); voltar.textContent = "Voltar ao grupo"; }
    const est = $("#estado"); if (est) est.textContent = "";
    try {
      const [lista, perfis] = await Promise.all([nuvem.rpc("grupo_basico", { p_campanha: campId }), nuvem.get("perfis?select=id,nome")]);
      const p = (Array.isArray(lista) ? lista : []).find((x) => x.id === id);
      if (!p) throw new Error("Personagem não encontrado neste grupo.");
      const dono = (perfis.find((x) => x.id === p.dono_id) || {}).nome || "Jogador", pct = p.pv_max > 0 ? Math.max(0, Math.min(100, Math.round(p.pv_atual / p.pv_max * 100))) : 0;
      const foto = p.foto && /^data:image\//.test(p.foto) ? `<img class="av" style="width:96px;height:96px;margin:0" src="${esc(p.foto)}" alt="Foto de ${esc(p.nome)}">` : `<span class="av av0" style="width:96px;height:96px;font-size:40px;margin:0">${esc((p.nome || "?").charAt(0).toUpperCase())}</span>`;
      document.title = p.nome + " — Compêndio 5e";
      box.removeAttribute("aria-busy");
      box.innerHTML = `<header class="panel ficha-resumo"><div class="ficha-identidade"><div class="ficha-foto">${foto}</div><div><p class="eyebrow">Personagem do grupo</p><h1>${esc(p.nome)}</h1><p>Jogador: ${esc(dono)}</p></div></div><div class="ficha-destaques"><div class="est"><span class="muted">PV</span><strong>${p.pv_atual} / ${p.pv_max}</strong>${p.pv_temp ? `<small>+${p.pv_temp} temporários</small>` : ""}</div><div class="est"><span class="muted">CA</span><strong>${p.ca}</strong></div></div></header><div class="panel"><div class="hp-track" aria-hidden="true"><div class="hp-fill" style="width:${pct}%"></div></div><p class="muted">Você vê só os dados básicos. Atributos, magias, inventário e o resto da ficha são vistos apenas pelo dono e pelo mestre.</p></div>`;
    } catch (e) { if (window.ESQ) window.ESQ.erro(box, e.message, recarregar); else box.innerHTML = `<p class="err">${esc(e.message)}</p>`; }
  }

  /* ---------- carregar ---------- */
  async function carregar() {
    const r = await nuvem.get(`personagens?select=*&id=eq.${encodeURIComponent(id)}`);
    if (!r[0]) throw new Error("Personagem não encontrado ou você não tem acesso.");
    return r[0];
  }
  async function contexto() {
    const [c, m, pf] = await Promise.all([
      nuvem.get(`campanhas?select=id,nome&id=eq.${encodeURIComponent(P.campanha_id)}`),
      nuvem.get(`membros?select=papel&campanha_id=eq.${encodeURIComponent(P.campanha_id)}&usuario_id=eq.${nuvem.usuario().id}`),
      nuvem.get("perfis?select=id,nome")
    ]);
    camp = c[0] || { id: P.campanha_id, nome: "Campanha" };
    if(exclusivoMestre && await nuvem.rpc('eh_mestre',{c:P.campanha_id}) !== true) throw new Error('Este painel é exclusivo do mestre da campanha.');
    souMestre = !!(m[0] && m[0].papel === "mestre") || !!(window.ACESSO && await ACESSO.pronto);
    const d = pf.find((x) => x.id === P.dono_id); donoNome = d ? d.nome : "";
    $("#voltar").href = souMestre ? `campanha.html?id=${encodeURIComponent(P.campanha_id)}` : "conta.html";
    $("#voltar").textContent = "Voltar";
  }

  /* fichas antigas: classe/nível em texto viram a lista de classes; moedas de electro e platina somem */
  function migrar() {
    const f = F(); let mudou = false;
    if (!Array.isArray(f.classes)) {
      f.classes = [];
      const inferida = window.PERSONAGENS_DADOS.classeDaDescricao(f.classe);
      const c = R.classe(inferida);
      if (c && f.nivel) f.classes.push({ c: c.id, n: Math.max(1, Math.min(20, num(f.nivel, 1))), sub: "" });
      mudou = mudou || f.classes.length > 0;
    }
    if(f.bonusRaca===undefined && f.raca){f.bonusRaca={...R.racial(f.raca).bonus};mudou=true;}
    const d = DIN();
    if (d.pe || d.pl || "pe" in d || "pl" in d) { d.pp = num(d.pp, 0) + num(d.pe, 0) * 5; d.po = num(d.po, 0) + num(d.pl, 0) * 10; delete d.pe; delete d.pl; agendar({ dinheiro: P.dinheiro }); }

    if (!f.perClasse) {
      const antigas = f.pericias || {}, c = CLS()[0] && R.classe(CLS()[0].c);
      f.perClasse = Object.keys(antigas).filter(k=>c && c.per[1].includes(k) && antigas[k]).slice(0,c ? c.per[0] : 0);
      f.especializacoes = Object.keys(antigas).filter(k=>antigas[k]===2 && f.perClasse.includes(k)).slice(0,R.limiteEspecializacao(CLS()));
      mudou = true;
    }
    if(f.criacao?.concluido&&!f.criacao.revisaoEquipamento){const couro=INV().some(i=>i.id==="srd51:item/leather-armor"),acolchoada=INV().some(i=>i.id==="srd51:item/padded-armor");if(couro&&!acolchoada&&EQ().armadura==="acolchoada"){EQ().armadura="couro";mudou=true;}f.criacao.revisaoEquipamento=true;mudou=true;}
    for(const x of R.preparacao(f)){let contagem=0;for(const m of MAG()){if(m.prep&&m.l>0&&!m.semprePreparada&&m.origem!=="Raça"&&x.pertence(m)){contagem++;if(contagem>x.limite){m.prep=false;mudou=true;}}}}
    // Não reaplica bônus raciais em fichas antigas: seus atributos já podem incluí-los.
    if (mudou) agendar({ ficha: P.ficha });
  }

  /* ---------- cálculos ---------- */
  const nivelTotal = () => R.nivelTotal(CLS());
  const bonusProf = () => R.prof(nivelTotal() || num(F().nivel, 1) || 1);
  const modA = (k) => mod(R.atributoEf(F(), k));   // inclui o modificador temporário (f.modTemp); o permanente nunca é alterado aqui
  const salvaProf = () => { const c = CLS()[0] && R.classe(CLS()[0].c); return c ? c.salv : []; };

  function calcCA() {
    const eq = EQ(), d = modA("des"), ids = CLS().map((c) => c.c), arm = R.ARMADURAS.find((a) => a[0] === eq.armadura);
    let base, desc;
    if (arm) { base = arm[3] + (arm[2] === "leve" ? d : arm[2] === "media" ? Math.min(d, 2) : 0); desc = `${arm[1]} (${arm[3]}${arm[2] === "leve" ? " + Des" : arm[2] === "media" ? " + Des, máx. 2" : ""})`; }
    else {
      base = 10 + d; desc = "sem armadura (10 + Des)";
      if (ids.includes("Barbarian") && 10 + d + modA("con") > base) { base = 10 + d + modA("con"); desc = "Sem armadura: 10 + Des + Con"; }
      if (ids.includes("Monk") && !eq.escudo && 10 + d + modA("sab") > base) { base = 10 + d + modA("sab"); desc = "Sem armadura: 10 + Des + Sab"; }
    }
    if (eq.escudo) { base += 2; desc += " + escudo (+2)"; }
    if (num(eq.bonus, 0)) { base += num(eq.bonus, 0); desc += ` ${fm(num(eq.bonus, 0))} outros`; }
    if (R.bonusTemp(F(), "ca")) { base += R.bonusTemp(F(), "ca"); desc += ` ${fm(R.bonusTemp(F(), "ca"))} temporário`; }
    return { ca: base, desc };
  }
  function calcPV() {
    const cls = CLS().filter((c) => c.n > 0 && R.classe(c.c)); if (!cls.length) return null;
    const con = modA("con"), extra = num(F().pvExtra, 0) + (F().raca === "Anão (da Colina)" ? 1 : 0); let total = 0, primeiro = true;
    cls.forEach((c) => { const dv = R.classe(c.c).dv; for (let i = 1; i <= c.n; i++) { total += Math.max(1, (primeiro && i === 1 ? dv : num(F().pvPorNivel?.[c.c+":"+i], Math.floor(dv / 2) + 1)) + con + extra); } primeiro = false; });
    return total;
  }
  const dadosVida = () => { const m = {}; CLS().forEach((c) => { const d = R.classe(c.c); if (d && c.n > 0) m[d.dv] = (m[d.dv] || 0) + c.n; }); return m; };
  const conj = () => R.conjuracao(CLS());

  /* aplica CA e PV automáticos (quando ligados) e atualiza o resumo */
  function aplicarAuto(forcar) {
    R.aplicarMelhorias(F()); sincronizarHabilidades();
    const f = F(), campos = {}, n0 = f.nivel, c0 = f.classe;
    const resumo=R.resumoClasses(CLS());
    f.nivel = resumo.nivel || (f.classesEditadas ? null : f.nivel || null);
    f.classe = resumo.descricao || (f.classesEditadas ? "" : f.classe || "");
    if (forcar || f.nivel !== n0 || f.classe !== c0) campos.ficha = P.ficha;
    if (autoOn("caAuto")) { const { ca } = calcCA(); if (ca !== P.ca) { P.ca = ca; campos.ca = ca; } }
    if (autoOn("pvAuto")) { const pv = calcPV(); if (pv != null && pv !== P.pv_max) { P.pv_max = pv; P.pv_atual = Math.min(P.pv_atual, pv); campos.pv_max = pv; campos.pv_atual = P.pv_atual; } }
    if (Object.keys(campos).length) agendar(campos);
  }

  /* ---------- desenho ---------- */
  const pctPV = () => (J.pvMaxEf(P) > 0 ? Math.max(0, Math.min(100, (P.pv_atual / J.pvMaxEf(P)) * 100)) : 0);
  const pesoTotal = () => INV().reduce((s, i) => s + num(i.qtd, 0) * num(i.peso, 0), 0);
  const capacidade = () => num(A()["for"], 10) * 7;
  const totalPO = () => { const d = DIN(); return num(d.pc, 0) / 100 + num(d.pp, 0) / 10 + num(d.po, 0); };
  const opt = (v, t, sel) => `<option value="${esc(v)}"${sel ? " selected" : ""}>${esc(t)}</option>`;

  const blocoPV = () => `<div class="vida-cabecalho"><h2 class="panel-title">Pontos de vida</h2><div class="big" id="pv-num">${P.pv_atual}<span class="muted"> / ${J.pvMaxEf(P)} PV</span></div></div>
    <div class="hp-track" role="progressbar" aria-label="Pontos de vida" aria-valuemin="0" aria-valuemax="${J.pvMaxEf(P)}" aria-valuenow="${P.pv_atual}"><div class="hp-fill ${pctPV()<=25?'low':pctPV()<=50?'mid':''}" id="pv-barra" style="width:${pctPV()}%"></div></div>
    <div class="vida-controles"><div class="inline"><button type="button" class="danger" id="b-dano">− Dano</button><input class="num" id="qtd" type="number" min="1" value="1" aria-label="Quantidade de dano ou cura"><button type="button" id="b-cura">+ Cura</button></div><span class="muted" id="pv-temp-txt">${P.pv_temp ? '+'+P.pv_temp+' PV temporários' : 'PV temporários: 0'}</span></div>
    <details class="vida-config"><summary>Tipo de dano e ajustes de vida</summary><label class="inline"><input type="checkbox" id="critico-jogo"> Acerto crítico (duas falhas a 0 PV)</label><label>Tipo de dano (opcional) <select id="tipo-dano-jogo"><option value="">Não informado</option>${R.TIPOS_DANO.map(t=>opt(t,t,false)).join("")}</select></label><div class="row" style="margin:0"><div><label>PV máximo (ajuste manual)</label><input class="num" type="number" min="0" data-col="pv_max" value="${P.pv_max}"></div><div><label>PV temporário</label><input class="num" type="number" min="0" data-col="pv_temp" value="${P.pv_temp}"></div></div>
    <div class="row" style="margin:8px 0 0"><label class="inline" style="margin:0"><input type="checkbox" style="width:auto;height:auto" data-auto="pvAuto" ${autoOn("pvAuto") ? "checked" : ""}> PV máximo automático (dado de vida médio + Constituição)</label><div class="inline"><label style="margin:0">PV extra por nível</label><input class="num" type="number" step="1" data-f="pvExtra" value="${num(F().pvExtra, 0)}" title="Ex.: anão da colina +1, talento Robusto +2"></div></div></details>`;

  const cabInv = '<div class="row inv-h" style="margin:0 0 4px"><span style="flex:1 1 160px">Item</span><span class="num-h">Qtd.</span><span class="num-h">Peso cada (kg)</span><span style="width:34px"></span></div>';
  const blocoCarga = () => { const c = capacidade(), p = pesoTotal(), pc = Math.min(100, c > 0 ? (p / c) * 100 : 0); return `<div class="hp-top"><span>Carga total (qtd. × peso)</span><strong id="carga-txt" ${p > c ? 'class="err"' : ""}>${kg(p)} / ${kg(c)} kg</strong></div><div class="hp-track"><div class="hp-fill ${p > c ? "low" : pc > 66 ? "mid" : ""}" id="carga-barra" style="width:${pc}%"></div></div>`; };

  const blocoAtr = () => '<div class="attrs">'+ATR.map(([k,r])=>C.atributo({sigla:r,valor:R.atributoEf(F(),k),modificador:fm(modA(k)),id:'mod-'+k,controle:`<span class="atr-valor" id="atributo-${k}" role="text" aria-label="${R.ATR_NOME[k]}: ${R.atributoEf(F(),k)}">${R.atributoEf(F(),k)}${num(F().modTemp?.[k],0)?`<small class="atr-temp" title="Modificador temporário de jogo">${fm(num(F().modTemp[k],0))} temp.</small>`:""}</span>`,rolagem:`<button type="button" class="rolar-atributo" data-rolar-atr="${k}" aria-label="Rolar teste de ${R.ATR_NOME[k]}">Rolar d20</button>`})).join('')+'</div><div class="muted" id="prof-txt"></div>';

  /* CD (classe de dificuldade) das características que pedem salvaguarda do alvo: o jogador vê o número pronto na própria característica (2014: 8 + proficiência + modificador). */
  const cdSoma = (rotulo, atrNome, mod, extra = 0) => { const pb = bonusProf(); return { rotulo, cd: 8 + pb + mod + extra, formula: `8 + proficiência (${fm(pb)}) + ${atrNome} (${fm(mod)})${extra ? " " + fm(extra) + " temporário" : ""}` }; };
  const cdMagiaClasse = (cid) => { const h = conj().habilidades.find((x) => x.id === cid); return h ? cdSoma("CD de magia de " + h.classe, R.ATR_NOME[h.atr], modA(h.atr), R.bonusTemp(F(), "cdMagia")) : null; };
  const cdKi = () => (CLS().some((c) => c.c === "Monk" && c.n >= 2) ? cdSoma("CD de Ki", R.ATR_NOME.sab, modA("sab")) : null);
  const cdManobras = () => (CLS().some((c) => c.c === "Fighter" && /Mestre de Batalha/i.test(c.sub || "")) ? cdSoma("CD de manobra", "Força ou Destreza (o maior)", Math.max(modA("for"), modA("des"))) : null);
  function cdDaCaracteristica(c) {
    const id = String(c.cf || "").replace(/^srd51:feature\//, ""), nome = String(c.nome || "");
    if (/^(stunning-strike|open-hand-technique|quivering-palm|ki|tranquility)$/.test(id) || /Ataque Atordoante|Mão Aberta|Palma Vibrante|Tranquilidade/i.test(nome)) return cdKi();
    if (id === "channel-divinity" || /sacred-weapon|turn-the-unholy/.test(id)) return cdMagiaClasse("Paladin");
    if (/^channel-divinity-/.test(id) || /Canalizar Divindade/i.test(nome) && !id) return cdMagiaClasse("Cleric");
    if (id === "natures-sanctuary") return cdMagiaClasse("Druid");
    if (id === "hurl-through-hell") return cdMagiaClasse("Warlock");
    if (/manobra|superioridade em combate/i.test(nome)) return cdManobras();
    return null;
  }
  const marcaCD = (c) => { const d = cdDaCaracteristica(c); return d ? ` <span class="badge" title="${esc(d.formula)}">CD ${d.cd}</span>` : ""; };
  const linhaCD = (c) => { const d = cdDaCaracteristica(c); return d ? `<p class="cd-linha"><b>${esc(d.rotulo)}: ${d.cd}</b> <span class="muted">= ${esc(d.formula)}</span></p>` : ""; };
  const resumoCDs = () => { const l = [cdKi(), cdManobras(), ...conj().habilidades.map((h) => cdMagiaClasse(h.id))].filter(Boolean); return l.length ? `<div class="cds-resumo"><h3 class="sub">CDs das suas características</h3>${l.map((d) => `<p class="cd-linha"><b>${esc(d.rotulo)}: ${d.cd}</b> <span class="muted">= ${esc(d.formula)}</span></p>`).join("")}</div>` : ""; };
  const itemCar = (c, i) => `<details class="item"><summary>${esc(c.nome)}${marcaCD(c)}</summary><div>${linhaCD(c)}<div class="pre">${TEXTO_REGRAS.html(c.desc || "")}</div>${!c.auto?`<div class="row" style="margin:8px 0 0"><button type="button" class="small danger" data-rm-car="${i}">Remover</button></div>`:""}</div></details>`;
  const recursosCombate = () => resumoCDs() + CAR().map(c=>`<details class="item"><summary>${esc(c.nome)}${marcaCD(c)}</summary>${linhaCD(c)}<div class="pre">${TEXTO_REGRAS.html(c.desc||'')}</div></details>`).join('') || '<p class="muted">As habilidades e recursos cadastrados em Personagem aparecem aqui para consulta durante o combate.</p>';
  const atualizarRecursos = () => { const e=$('#recursos-combate');if(e)e.innerHTML=recursosCombate(); };

  const racaSel = () => { const r = F().raca || ""; return R.RACAS.some((x) => x[0] === r) ? r : (r || F().racaCustom ? "__custom" : ""); };
  const blocoClasses = () => {
    const l = CLS().length ? CLS() : [{c:"",n:1,sub:""}];
    return l.map((c, i) => { const d = R.classe(c.c); return `<div class="row" style="margin:0 0 6px" data-ci="${i}"><select data-cls="c" style="flex:1 1 150px" aria-label="Classe">${opt("", "Classe…", !c.c)}${R.CLASSES.filter(x=>x.id===c.c || !l.some(outro=>outro.c===x.id)).map((x) => opt(x.id, x.n, x.id === c.c)).join("")}</select><input class="num" type="number" min="1" max="${Math.max(1,20-R.nivelTotal(l.filter((_,j)=>j!==i)))}" data-cls="n" value="${c.n}" aria-label="Nível na classe" title="Nível nesta classe"><input style="flex:1 1 150px" list="subs-${i}" data-cls="sub" value="${esc(c.sub || "")}" maxlength="50" placeholder="Subclasse"><datalist id="subs-${i}">${(d ? d.subs : []).map((s) => `<option value="${esc(s)}">`).join("")}</datalist>${l.length > 1 || c.c ? `<button type="button" class="small subtle" data-rm-cls="${i}" aria-label="Remover classe">${window.ico ? window.ico("x") : "x"}</button>` : ""}</div>`; }).join("");
  };
  const infoRaca = () => { const r = R.RACAS.find((x) => x[0] === F().raca); return r ? `<div class="muted" style="margin-top:6px">${esc(r[0])}: deslocamento ${String(r[1]).replace(".", ",")} m · atributos ${esc(r[2])} · ${esc(r[3])}</div>` : ""; };

  /* salvaguardas e perícias */
  function blocoSal() {
    const pb = bonusProf(), ps = salvaProf();
    return `<div class="grade2">${ATR.map(([k, r]) => { const p = ps.includes(k), v = modA(k) + (p ? pb : 0) + R.bonusTemp(F(), "salvaguardas"); return `<div class="lin"><span class="pbol${p ? " on" : ""}"></span><b>${fm(v)}</b><button type="button" class="rolar-pericia" data-rolar-sal="${k}" aria-label="Rolar salvaguarda de ${R.ATR_NOME[k]}">${R.ATR_NOME[k]}</button></div>`; }).join("")}</div>`;
  }

  function blocoPer() {
    const pb = bonusProf(), f=F(), fontes=R.fontesPericias(f), pr=fontes.valores, c0=CLS()[0]&&R.classe(CLS()[0].c), r=R.racial(f.raca);
    const nome=k=>(R.PERICIAS.find(p=>p[0]===k)||[k,k])[1];
    const escolhas=(tipo,opcoes,selecionadas,limite)=>'<div class="anexos">'+opcoes.map(k=>{
      const on=selecionadas.includes(k), ocupado=!on && fontes.basicas.includes(k);
      return `<button type="button" class="small ${on?'primary':''}" data-escolha="${tipo}" data-k="${k}" ${ocupado||(!on&&selecionadas.length>=limite)?'disabled':''}>${on?'✓ ':''}${esc(nome(k))}</button>`;
    }).join("")+'</div>';
    let h=c0?`<div class="sub">Classe: escolha ${c0.per[0]} (${fontes.classePer.length}/${c0.per[0]})</div>${escolhas("classe",c0.per[1],fontes.classePer,c0.per[0])}`:'';
    if(r.fixas.length) h+=`<p class="muted">Da raça: ${r.fixas.map(nome).join(", ")}.</p>`;
    if(r.escolhas) h+=`<div class="sub">Raça: escolha ${r.escolhas} (${fontes.raciais.length}/${r.escolhas})</div>${escolhas("raca",r.opcoes,fontes.raciais,r.escolhas)}`;
    CLS().slice(1).forEach((c,i)=>{const d=R.classe(c.c);if(d&&["Bard","Ranger","Rogue"].includes(c.c))h+=`<div class="sub">Multiclasse: ${esc(d.n)} · uma perícia</div>${escolhas("multi-"+(i+1),d.per[1],c.per||[],1)}`;});
    const lim=R.limiteEspecializacao(CLS());
    if(lim)h+=`<p class="muted">Especializações: ${fontes.especializadas.length}/${lim}. Escolha entre as perícias proficientes.</p>`;
    h='<div class="grade2">'+R.PERICIAS.map(([k,n,a])=>{
      const e=pr[k]||0,v=R.valorPericia(f,k);
      return `<div class="lin pericia-linha"><span class="pbol${e?' on':''}${e===2?' dup':''}" role="img" aria-label="${e===2?'Especialização':e?'Proficiente':'Sem proficiência'}" title="${e===2?'Especialização':e?'Proficiente':'Sem proficiência'}"></span><b>${fm(v)}</b><button type="button" class="rolar-pericia" data-rolar-per="${k}" aria-label="Rolar ${n}, ${R.ATR_NOME[a]}"><span>${n}</span><small class="pericia-atributo">${a.toUpperCase()}</small></button>${editandoFicha&&lim&&e?`<button type="button" class="small pericia-editar" data-per="${k}" aria-pressed="${e===2}">${e===2?'Especializada':'Especializar'}</button>`:''}</div>`;
    }).join("")+'</div>';
    return h+`<p class="muted">Percepção passiva: <b>${R.percepcaoPassiva(f)}</b></p>`;
  }
  function blocoProf() {
    const c0 = CLS()[0] && R.classe(CLS()[0].c); if (!c0) return '<span class="muted">Escolha uma classe para ver as proficiências.</span>';
    return (F().proficienciasSubclasse?.length?'<div class="muted">Proficiências da Subclasse: <b>'+F().proficienciasSubclasse.map(esc).join(", ")+'</b></div>':"")+`<div class="muted">Armaduras: <b style="color:var(--text)">${esc(c0.arm)}</b></div><div class="muted">Armas: <b style="color:var(--text)">${esc(c0.armas)}</b></div>${c0.ferr ? `<div class="muted">Ferramentas: <b style="color:var(--text)">${esc(c0.ferr)}</b></div>` : ""}<div class="muted">Salvaguardas: <b style="color:var(--text)">${c0.salv.map((k) => R.ATR_NOME[k]).join(", ")}</b></div>`;
  }
  const blocoCA = () => { const { ca, desc } = calcCA(), on = autoOn("caAuto"); return `<div class="hp-top"><span>CA ${on ? "calculada" : "manual"}</span><strong class="ca-num">${on ? ca : P.ca}</strong></div><div class="muted ca-desc">${on ? esc(desc) : `A CA manual é ${P.ca}. A automática seria ${ca} (${esc(desc)}).`}</div>`; };

  /* dados de vida */
  function blocoDV() {
    const dv = dadosVida(), usados = F().dvUsados || {}, ks = Object.keys(dv).map(Number).sort((a, b) => b - a);
    if (!ks.length) return '<span class="muted">Escolha uma classe para ter dados de vida.</span>';
    return ks.map((d) => { const tot = dv[d], us = Math.min(tot, num(usados[d], 0)); return `<div class="res"><span><b>d${d}</b> <span class="muted">· restam ${tot - us} de ${tot}</span></span><div class="dv-acoes"><button type="button" class="small" data-dv="${d}" ${tot-us<=0?"disabled":""}>${window.ico?window.ico("d20"):""}Rolar no App</button><input type="number" min="1" max="${d}" data-rolagem-fisica="${d}" aria-label="Rolagem Física de d${d}, sem Constituição" placeholder="Dado Físico"><button type="button" class="small" data-dv-manual="${d}" ${tot-us<=0?"disabled":""}>Usar Rolagem Física</button><button type="button" class="small" data-dv-marcar="${d}" ${tot-us<=0?"disabled":""}>Só Marcar Uso</button></div></div>`; }).join("");
  }

  /* ataques */
  function resAtq(a) {
    const valores=R.valoresAtaque(F(),a),hit=valores.ataque,dm=valores.dano;
    return `Ataque ${fm(hit)} · Dano ${esc(a.dado || "—")}${dm ? fm(dm) : ""} ${esc(a.tipo || "")}`;
  }
  /* ataque desarmado automático (derivado de REGRAS.ataqueDesarmado; não está na ficha nem no inventário). Some se o jogador já tem o seu, manual. */
  const cartaoDesarmado = () => {
    if (R.temDesarmadoManual(F())) return ""; const a = R.ataqueDesarmado(F());
    const nota = a.artesMarciais ? `Artes Marciais (Monge ${a.nivelMonge}): usa o maior entre Força e Destreza e o dado ${a.dado}.` : a.nivelMonge ? "Artes Marciais não vale com armadura ou escudo: Força, dano 1 + Força." : "Força; dano 1 + Força; proficiente.";
    return `<article class="panel2 ataque-ficha" data-ataque-auto="desarmado"><h3>${esc(a.nome)}</h3><p class="muted">${esc(nota)}</p><div class="atk-res" id="atk-res-auto"><b>${resAtq(a)}</b></div><div class="row"><button type="button" class="small" data-rolar-atq="auto">${window.ico?window.ico("d20"):""}Rolar ataque</button><button type="button" class="small" data-rolar-dano="auto">${window.ico?window.ico("d20"):""}Rolar dano</button></div></article>`;
  };
  const listaAtq = () => cartaoDesarmado() + ATQ().map(linhaAtq).join("");
  const ataqueDe = (k) => (k === "auto" ? R.ataqueDesarmado(F()) : ATQ()[+k]);
  const linhaAtq = (a, i) => `<article class="panel2 ataque-ficha" data-ai="${i}"><h3>${esc(a.nome||"Ataque personalizado")}</h3><details class="ataque-editor"><summary>Ajustar arma e bônus</summary><div class="row" style="margin:0 0 6px"><input style="flex:1 1 160px" data-atq="nome" value="${esc(a.nome || "")}" placeholder="Nome do ataque" maxlength="60"><button type="button" class="small subtle" data-rm-atq="${i}" aria-label="Remover ataque">${window.ico ? window.ico("x") : "x"}</button></div>
      <div class="row" style="margin:0 0 6px"><div><label>Atributo</label><select data-atq="atr">${opt("for", "Força", (a.atr || "for") === "for")}${opt("des", "Destreza", a.atr === "des")}${opt("acuidade", "Acuidade (maior)", a.atr === "acuidade")}${opt("int", "Inteligência", a.atr === "int")}${opt("sab", "Sabedoria", a.atr === "sab")}${opt("car", "Carisma", a.atr === "car")}</select></div>
      <div><label>Dano</label><input class="num" data-atq="dado" value="${esc(a.dado || "1d6")}" maxlength="12"></div><div><label>Tipo de dano</label><select data-atq="tipo">${R.TIPOS_DANO.map((t) => opt(t, t, t === a.tipo)).join("")}</select></div>
      <div><label>Bônus mágico</label><input class="num" type="number" data-atq="magico" value="${num(a.magico, 0)}"></div><div><label>Dano extra</label><input class="num" type="number" data-atq="extra" value="${num(a.extra, 0)}" title="Somado ao dano (ex.: fúria, estilo de luta)"></div>
      <label class="inline" style="margin:14px 0 0"><input type="checkbox" style="width:auto;height:auto" data-atq="prof" ${a.prof === false ? "" : "checked"}> Proficiente</label></div>
      </details><div class="atk-res" id="atk-res-${i}"><b>${resAtq(a)}</b></div><div class="row"><button type="button" class="small" data-rolar-atq="${i}">${window.ico?window.ico("d20"):""}Rolar ataque</button><button type="button" class="small" data-rolar-dano="${i}">${window.ico?window.ico("d20"):""}Rolar dano</button></div></article>`;

  /* magias */
  function blocoSlots() {
    const c = conj(), f = F(), us = f.slotsUsados || [], partes = [];
    if (c.slots.length) partes.push(c.slots.map((tot, i) => { const g = Math.min(tot, num(us[i], 0)); return window.MAGIAS_UI.slot({titulo:(i+1)+'º círculo',total:tot,usados:g,chave:i}); }).join(""));
    if (c.pact) { const g = Math.min(c.pact.qtd, num(f.pactoUsado, 0)); partes.push(window.MAGIAS_UI.slot({titulo:'Pacto',subtitulo:c.pact.nivel+'º círculo',total:c.pact.qtd,usados:g,chave:'p'})); }
    const pb = bonusProf(), niv = (id) => (CLS().find((x) => x.c === id) || {}).n || 0;
    const info = c.habilidades.map((h) => { const m = modA(h.atr), prep = h.id === "Cleric" || h.id === "Druid" ? niv(h.id) + m : h.id === "Wizard" ? niv(h.id) + m : h.id === "Paladin" ? Math.floor(niv(h.id) / 2) + m : h.id === "Artificer" ? Math.floor(niv(h.id) / 2) + m : null; return window.MAGIAS_UI.conjurador({classe:h.classe,atributo:R.ATR_NOME[h.atr],cd:8+pb+m+R.bonusTemp(F(),"cdMagia"),ataque:fm(pb+m+R.bonusTemp(F(),"cdMagia")),preparar:prep==null?null:Math.max(1,prep)}); }).join("");
    return '<div class="magia-conjuradores">'+info+'</div><h3 class="sub magia-secao-titulo">Espaços de magia</h3>' + (partes.length ? '<div class="magia-slots">'+partes.join("")+'</div>' : '<span class="muted">Sem espaços de magia para esta combinação de classes.</span>');
  }
  const MJ = window.MAGIAS_JOGO;
  const cp = { en: "", fonte: "grimorio", uid: "", arc: "" };
  const cidMag = (m) => m.classeConj || (m.classes && m.classes[0] ? m.classes[0].replace(/^./, (x) => x.toUpperCase()) : "");
  const catMag = (m) => m.fonte === "mestre" ? "Concedidas pelo mestre" : m.origem === "Raça" || m.fonte === "raca" ? "Raciais e de características" : m.noGrimorio ? "Grimório do Mago" : (m.registroOrigem?.vaga || MJ.tipoClasse(cidMag(m)) === "known" || m.fonte==="classe"&&["Fighter","Rogue"].includes(cidMag(m))) ? "Magias conhecidas" : MJ.tipoClasse(cidMag(m)) === "prepared" ? "Lista da classe (preparar)" : "Outras magias";
  const ORDEM_CAT = ["Magias conhecidas", "Grimório do Mago", "Lista da classe (preparar)", "Raciais e de características", "Concedidas pelo mestre", "Outras magias"];
  const rotuloOrigem = (m) => { const t = m.registroOrigem && m.registroOrigem.tipo; return t && t !== "classe" && MJ.ROTULO_ORIGEM[t] ? MJ.ROTULO_ORIGEM[t] : ""; };
  const linhaMag = (m, i) => {
    const inativa = m.ativa === false, org = rotuloOrigem(m);
    const pp = !inativa && m.l > 0 && !m.semprePreparada && m.origem !== "Raça" && R.preparacao(F()).some((x) => x.pertence(m)) && MJ.podePreparar(F(), m).ok;
    const etiqueta = inativa ? ' <span class="badge">Inativa</span>' : m.l === 0 ? ' <span class="badge">Truque</span>' : m.semprePreparada ? ' <span class="badge">Sempre Preparada</span>' : m.origem === "Raça" ? ' <span class="badge">Magia Racial</span>' : R.preparacao(F()).some((x) => x.pertence(m)) ? (m.prep ? ' <span class="badge">Preparada</span>' : ' <span class="muted">Não Preparada</span>') : ' <span class="badge">Conhecida</span>';
    return `<article class="item magia-conhecida${inativa ? " magia-inativa" : ""}" data-mag-i="${i}"><button type="button" class="magia-consultar" data-consultar-magia="${i}">${esc(m.n)} <span class="muted" style="font-weight:400">· ${m.l === 0 ? "Truque" : m.l + "º círculo"}</span>${etiqueta}${org ? ` <span class="muted">· ${esc(org)}</span>` : ""}</button>${m.concessao && m.concessao.modo ? `<p class="muted" style="margin:6px 0 0">Concessão: ${esc(MJ.MODOS_CONCESSAO[m.concessao.modo] || "")}${m.concessao.forma ? " · " + esc(m.concessao.forma) : ""}${m.concessao.usos ? ` · usos ${m.concessao.usos.max - m.concessao.usos.usados} de ${m.concessao.usos.max} (recarga: ${{ curto: "descanso curto ou longo", longo: "descanso longo", nenhum: "não recarrega" }[m.concessao.usos.recarga]})` : ""}</p>` : ""}${inativa ? '<p class="muted" style="margin:6px 0 0">Guardada: o círculo desta magia ainda não é alcançado. Volta a valer se o nível voltar.</p>' : ""}<div class="row" style="margin:8px 0 0">${pp ? `<label class="inline" style="margin:0"><input type="checkbox" style="width:auto;height:auto" data-prep="${i}" ${m.prep ? "checked" : ""}> Preparada</label>` : ""}${m.concessao && m.concessao.usos ? `<button type="button" class="small" data-usar-concedida="${i}" ${m.concessao.usos.usados >= m.concessao.usos.max ? "disabled" : ""}>Usar (gasta 1)</button>` : ""}${!inativa&&m.conc?`<button type="button" class="small" data-jogo="concentrar" data-valor="${i}">Concentrar</button>`:""}${!inativa&&m.arcanum?`<button type="button" class="small" data-jogo="arcanum" data-valor="${m.arcanum}" ${F().arcanumUsado?.[m.arcanum]?"disabled":""}>Conjurar Arcanum</button>`:""}<span class="grow"></span>${m.fonte === "mestre" && souMestre ? `<button type="button" class="small danger" data-rm-mag="${i}">Retirar concessão</button>` : ""}</div></article>`;
  };
  function listaMagias() {
    const l = MAG().map((m, i) => ({ m, i })).sort((a, b) => a.m.l - b.m.l || a.m.n.localeCompare(b.m.n));
    if (!l.length) return '<div class="estado-vazio"><strong>Nenhuma magia ainda</strong><p>As magias vêm das escolhas da criação e de cada nível, de raça, talentos e itens. Para mudar o repertório, use Subir de nível ou Editar personagem.</p></div>';
    const grupos = {};
    l.forEach((x) => (grupos[catMag(x.m)] = grupos[catMag(x.m)] || []).push(x));
    return R.preparacao(F()).map((x) => `<p class="muted">${esc(x.nome)}: ${x.usadas} de ${x.limite} magias preparadas. Truques e magias sempre preparadas não contam nesse limite.</p>`).join("") +
      ORDEM_CAT.filter((k) => grupos[k]).map((k) => `<h3 class="sub magia-secao-titulo">${k} <span class="muted">(${grupos[k].length})</span></h3>` + grupos[k].map((x, n) => (n === 0 || grupos[k][n - 1].m.l !== x.m.l ? '<h4 class="circulo-titulo">' + (x.m.l ? x.m.l + "º círculo" : "Truques") + "</h4>" : "") + linhaMag(x.m, x.i)).join("")).join("");
  }
  /* ---------- inventário: itens, uso de consumíveis e efeitos ---------- */
  const IV = window.INVENTARIO, IE = window.ITENS_EFEITOS;
  const II = window.INV_IMG || { ICONE: {}, obter: () => null, definir: () => ({ ok: false, erro: "Indisponível." }), remover() {}, limpar: () => false, reduzir: () => Promise.reject(new Error("indisponível")) };
  const cont = () => IV.conteinerDe(P);
  const ROT_ORIGEM = { inicial: "Inicial", criacao: "Criação", compra: "Compra", saque: "Saque", jogo: "Jogo", mestre: "Mestre", transferencia: "Transferência" };
  let uso = null, usando = false, edEf = null;
  const itemPor = (i) => INV()[i];
  /* exibição do inventário: lista (padrão) ou grade de cartões; a escolha fica neste aparelho */
  const invAbertos = new Set();
  let vistaInv = "lista"; try { vistaInv = localStorage.getItem("dnd5e_inv_vista") === "grade" ? "grade" : "lista"; } catch (_) { /* sem armazenamento: lista */ }
  const cabecalhoInv = () => `<div class="inv-cab"><h3 class="sub inv-tit">Itens que você carrega</h3><button type="button" class="small primary" id="inv-add-abrir" aria-expanded="false" aria-controls="inv-add">+ Adicionar item</button><button type="button" class="small subtle" id="inv-vinculos" title="Mostra, sem alterar nada, quais itens e equipamentos podem ser ligados ao catálogo">Verificar vínculos</button><div class="inv-vista" role="group" aria-label="Modo de exibição do inventário">${[["lista", "Lista"], ["grade", "Grade"]].map(([k, n]) => `<button type="button" class="small${vistaInv === k ? " ativo" : ""}" data-inv-vista="${k}" aria-pressed="${vistaInv === k}">${n}</button>`).join("")}</div></div>`;
  /* Origem informada ao adicionar manualmente (qualquer tipo de item): vira `origem.texto`; os ids técnicos do item (catálogo, pacote) não mudam */
  const origemAdd = (base) => { const e = document.getElementById("add-origem"), t = e ? e.value.replace(/\s+/g, " ").trim().slice(0, 120) : ""; return t ? { ...base, texto: t } : base; };
  function fecharAdd() { const oa = document.getElementById("add-origem"); if (oa) oa.value = ""; const p = document.getElementById("inv-add"); if (!p) return; p.hidden = true; p.querySelectorAll("[data-add-linha]").forEach((x) => { x.hidden = true; }); p.querySelectorAll("[data-inv-add-tipo]").forEach((x) => x.setAttribute("aria-pressed", "false")); p.querySelectorAll("select").forEach((x) => { x.selectedIndex = 0; }); const n = document.getElementById("pg-nota"); if (n) n.value = ""; const b = document.getElementById("inv-add-abrir"); if (b) { b.setAttribute("aria-expanded", "false"); b.textContent = "+ Adicionar item"; } }
  function abrirAdd() { const p = document.getElementById("inv-add"); if (!p) return; p.hidden = false; const b = document.getElementById("inv-add-abrir"); if (b) { b.setAttribute("aria-expanded", "true"); b.textContent = "Fechar"; } p.querySelector("[data-inv-add-tipo]")?.focus(); }
  function escolherAdd(tipo) { const p = document.getElementById("inv-add"); if (!p) return; if (tipo === "cat") desenharCatAdd(); p.querySelectorAll("[data-inv-add-tipo]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.invAddTipo === tipo))); p.querySelectorAll("[data-add-linha]").forEach((x) => { x.hidden = x.dataset.addLinha !== tipo; }); const f = p.querySelector('[data-add-linha="' + tipo + '"] input, [data-add-linha="' + tipo + '"] select, [data-add-linha="' + tipo + '"] button'); if (f) f.focus(); }
  function atualizarCartao(card, it) {
    if (!card || !it) return; const n = card.querySelector(".inv-nome-txt"), q = card.querySelector(".inv-qtd-badge"), p = card.querySelector(".inv-peso-txt");
    if (n) n.textContent = (it.nome || "").trim() || "Item sem nome"; if (q) q.textContent = "×" + qtdLinha(it); if (p) p.textContent = kg(num(it.peso, 0)) + " kg cada";
  }
  /* arma, armadura ou escudo do catálogo: o "Equipado" do inventário liga o item à ficha (EQUIP_FICHA) */
  const EF = () => window.EQUIP_FICHA;
  const equipavel = (it) => { const E = EF(); return !!(E && E.tipoEquipavel(E.catDoItem(it))); };
  /* "Faz parte do Pacote de X": origem do componente (não substitui a descrição do item). Itens antigos da criação trazem o nome do pacote só na nota. */
  const pacoteDe = (it) => { const o = (it && it.origem) || {}; if (o.pacote && o.pacote.nome) return o.pacote.nome; const m = /(Pacote d[eao] [^—]+)$/.exec(o.nota || ""); return m ? m[1].trim() : ""; };
  /* agrupamento visual de itens idênticos (registros, uid e origens continuam individuais; ver INVENTARIO.agrupar) */
  const exclGrupo = () => { const f = F(), e = f.equip || {}; return new Set([...(f.ataques || []).map((a) => a.itemUid), e.armaduraUid, e.escudoUid, ...Object.keys(f.armasGuardadas || {})].filter(Boolean)); };
  const gruposInv = () => IV.agrupar(INV(), exclGrupo());
  const membrosDe = (it) => { const g = gruposInv().get(it.uid); return g ? g.membros : [it]; };
  const qtdLinha = (it) => { const m = membrosDe(it); return m.length > 1 ? IV.totalDe(m) : Math.max(0, num(it.qtd, 1)); };
  const rotuloOrigemItem = (it) => { const p = pacoteDe(it), o = (it && it.origem) || {}; return p ? "Faz parte do " + p : !o.tipo || o.tipo === "inicial" ? "Inicial" : (ROT_ORIGEM[o.tipo] || o.tipo) + (o.nota ? ": " + o.nota : ""); };
  const listaInvHTML = () => { const gs = gruposInv(); return INV().map((it, i) => { const g = gs.get(it.uid); return g && g.principal !== it ? "" : linhaInv(it, i); }).join(""); };
  /* O nome é só o rótulo apresentado: o vínculo com o catálogo é o catId/ref, que o renomear nunca toca. */
  const nomeDoCatalogo = (it) => { const C = CAT(), cat = C && C.doInventario(it); return cat && !cat.custom && cat.nome ? cat.nome : ""; };
  const nomeDivergente = (it) => { const n = nomeDoCatalogo(it); return !!n && nz(n) !== nz(it.nome || ""); };
  function restaurarNomeCatalogo(it) { const n = nomeDoCatalogo(it); if (!n) return false; it.nome = n; salvarInv(); redesenharInv(); return true; }
  function linhaInv(it, i) {
    const t = it.tipo || "equipamento", pr = it.propriedades || {}, sint = pr.sintonia && pr.sintonia.requer, passivo = IE.efeitosDe(it).some((e) => e.passivo);
    const acoes = []; let usar = "";   // "Usar" fica junto da quantidade (linha própria dos controles principais)
    if (t === "pergaminho" && it.magiaVinculada) { acoes.push(`<span class="muted">Contém ${esc(it.magiaVinculada.n)} (${it.magiaVinculada.l}º círculo)</span>`); if (wizard()) acoes.push(`<button type="button" class="small" data-inv-copiar="${i}">Copiar para o grimório</button>`); usar = `<button type="button" class="small" data-inv-usar="${i}" aria-label="Usar o pergaminho">Usar<span class="inv-usar-resto"> o pergaminho</span></button>`; }
    else if (IE.temEfeitos(it) || t === "consumivel") usar = `<button type="button" class="small" data-inv-usar="${i}">Usar</button>`;
    if (passivo || sint || t === "magico" || (equipavel(it) && qtdLinha(it) > 0)) acoes.push(`<label class="inline" style="margin:0"><input type="checkbox" style="width:auto;height:auto" data-inv-equip ${it.equipado ? "checked" : ""}> Equipado</label>`);
    if (sint) acoes.push(`<label class="inline" style="margin:0"><input type="checkbox" style="width:auto;height:auto" data-inv-sint ${pr.sintonia.sintonizado ? "checked" : ""}> Sintonizado</label>`);
    if (pr.cargas) acoes.push(`<span class="muted">Cargas ${num(pr.cargas.atual, 0)}/${num(pr.cargas.max, 0)}</span>`);
    /* mágico e raridade são informações separadas (CAT_ITENS.infoMagica): a tag "Mágico" e o nome dourado vêm da classificação; a cor do indicador vem só da raridade */
    const mg = CAT() ? CAT().infoMagica(it) : { magico: false, raridade: null }, selo = CAT() ? CAT().seloRaridade(mg.raridade) : "";
    const selos = mg.magico || selo ? `<span class="inv-selos">${mg.magico ? '<span class="inv-magico-tag">Mágico</span>' : ""}${selo}</span>` : "";   // na linha secundária (tipo · peso), não na dos controles: não aumenta o cartão
    const nMem = membrosDe(it).length, orig = nMem > 1 ? `${nMem} origens (veja os detalhes)` : IV.origemTexto(it);
    const catI = CAT() && CAT().doInventario(it), RS = window.INV_RESUMO, mec = RS ? RS.mecanico(it, catI, IE.efeitosDe(it).map(descreverEfeito)) : "", resumo = RS ? RS.descricao(it, catI) : "";
    const im = II.obter(F(), it), nomeIt = esc(it.nome || "item"), aberto = invAbertos.has(it.uid) || !(it.nome || "").trim(), membros = membrosDe(it), agrup = membros.length > 1, qn = agrup ? IV.totalDe(membros) : Math.max(0, num(it.qtd, 1));
    const thumb = `<button type="button" class="inv-thumb${im ? "" : " vazio"}" data-inv-detalhes="${i}" aria-label="Abrir os detalhes de ${nomeIt}" title="Ver detalhes">${im ? `<img class="inv-thumb-img" src="${esc(im.src)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : (window.ico ? window.ico(II.ICONE[t] || "bag") : "")}</button>`;
    const qtdCtl = `<span class="inv-qtd-ctl" role="group" aria-label="Quantidade de ${nomeIt}"><button type="button" class="small" data-inv-qtd-menos="${i}" aria-label="Diminuir a quantidade de ${nomeIt}"${qn <= 0 ? " disabled" : ""}>−</button><input class="num" type="number" min="0" step="1" inputmode="numeric" data-inv="qtd" value="${qn}" aria-label="Quantidade de ${nomeIt}"><button type="button" class="small" data-inv-qtd-mais="${i}" aria-label="Aumentar a quantidade de ${nomeIt}">+</button></span>`;
    const qtdUI = it.conjunto ? `<span class="inv-conj-tag">Conjunto · ${it.conjunto.reduce((n, c) => n + Math.max(0, num(c.qtd, 0)), 0)} unidades</span>` : qtdCtl;
    const mais = `<details class="inv-mais"><summary class="small" aria-label="Mais ações de ${nomeIt}" title="Mais ações">${window.ico ? window.ico("more") : "…"}</summary><div class="inv-mais-menu"><button type="button" data-inv-editar-abrir="${i}">Editar…</button><button type="button" data-inv-descartar="${i}">Descartar…</button><button type="button" class="danger" data-inv-excluir="${i}">Excluir item…</button></div></details>`;
    return `<div class="item-inv inv-card${mg.magico ? " item-magico" : ""}${qn <= 0 ? " zerado" : ""}" data-i="${i}">${thumb}<div class="inv-corpo"><div class="inv-titulo"><button type="button" class="inv-nome-btn" data-inv-detalhes="${i}" title="Ver detalhes"><b class="inv-nome-txt">${esc(it.nome || "Item sem nome")}</b></button>${mec ? `<span class="inv-mec">${esc(mec)}</span>` : ""}</div>
      <div class="inv-meta muted"><span class="inv-base"><span class="inv-tipo-txt">${esc(IV.TIPOS[t] || t)}</span> · <span class="inv-peso-txt">${kg(num(it.peso, 0))} kg cada</span></span>${selos}${resumo ? `<span class="inv-resumo">${esc(resumo)}</span>` : ""}${orig ? `<span class="inv-origem muted">Origem: ${esc(orig)}</span>` : ""}</div>
      <div class="inv-acoes"><span class="inv-ctl">${qtdUI}${usar}</span>${acoes.join(" ")}<span class="inv-fim"><button type="button" class="small subtle inv-info" data-inv-detalhes="${i}" aria-label="Detalhes de ${nomeIt}" title="Detalhes">${window.ico ? window.ico("info") : "i"}</button>${mais}</span></div></div>
      <div class="inv-edit" data-inv-uid="${esc(it.uid)}"${aberto ? "" : " hidden"}><div class="inv-edit-campos">
        <label class="inv-c-nome">Nome<input data-inv="nome" value="${esc(it.nome || "")}" placeholder="Item"></label>
        <label>Peso cada (kg)<input class="num" type="number" min="0" step="0.1" data-inv="peso" value="${num(it.peso, 0)}"></label>
        <label>Tipo<select data-inv-tipo aria-label="Tipo do item">${Object.entries(IV.TIPOS).map(([k, n]) => opt(k, n, t === k)).join("")}</select></label>
        ${!soLeitura ? `<label class="inv-c-nome">Origem<span class="inv-origem-campo"><input data-inv-origem maxlength="120" value="${esc(typeof (it.origem && it.origem.texto) === "string" ? it.origem.texto : IV.origemTexto(it))}" placeholder="Ex.: Recompensa de missão">${seletorModelos()}</span></label>` : ""}
        <label class="inv-c-nome">Descrição<textarea data-inv="desc" rows="3" maxlength="1500" placeholder="Aparência, história, funcionamento conhecido…">${esc(it.desc || "")}</textarea></label>
        <div class="inv-edit-botoes">${nomeDivergente(it) ? `<button type="button" class="small" data-inv-nome-restaurar="${i}">Restaurar nome do catálogo</button>` : ""}<button type="button" class="small" data-inv-img-gerir="${i}">${im ? "Trocar ou remover imagem" : "Adicionar imagem"}</button><button type="button" class="small subtle" data-inv-editar-abrir="${i}">Concluir edição</button></div></div></div></div>`;
  }
  /* Imagem do item: ver maior, enviar do aparelho, usar URL https, trocar ou remover (o retrato usa o mesmo recorte) */
  function abrirImagemItem(i) {
    const it = INV()[i]; if (!it) return; document.getElementById("inv-img-dlg")?.remove();
    const t = it.tipo || "equipamento", ov = document.createElement("div"); ov.id = "inv-img-dlg"; ov.className = "crop-ov";
    const pinta = () => {
      const im = II.obter(F(), it), editar = !soLeitura;
      ov.innerHTML = `<div class="crop-box inv-img-box" role="dialog" aria-label="Imagem do item"><h3>${esc(it.nome || "Item")}</h3>
        <div class="inv-img-grande">${im ? `<img src="${esc(im.src)}" alt="Imagem de ${esc(it.nome || "item")}" referrerpolicy="no-referrer">` : `<span class="inv-img-padrao">${window.ico ? window.ico(II.ICONE[t] || "bag") : ""}</span>`}</div>
        ${im && im.origem === "aparelho" ? '<p class="muted inv-img-nota">Sugestão deste aparelho (outro personagem usou esta imagem para o mesmo item). Envie ou escolha outra para guardá-la nesta ficha.</p>' : ""}
        ${editar ? `<div class="row inv-img-acoes"><button type="button" class="small primary" data-ii="arq">${im ? "Trocar por uma imagem do aparelho" : "Enviar imagem do aparelho"}</button>${im ? '<button type="button" class="small danger" data-ii="rm">Remover imagem</button>' : ""}</div>
        <div class="row inv-img-url"><input id="inv-img-url" type="url" inputmode="url" maxlength="500" placeholder="ou cole o endereço da imagem (https://…)" autocomplete="off" aria-label="Endereço da imagem"><button type="button" class="small" data-ii="url">Usar endereço</button></div>
        <p class="muted inv-img-nota">Administradores atualizam a imagem global dos itens do catálogo. Outras imagens são pessoais desta ficha e sincronizam com ela. Um endereço da internet só aparece com conexão.</p>` : ""}
        <div class="inv-img-erro err" role="alert"></div>
        <div class="row" style="justify-content:flex-end;margin:6px 0 0"><button type="button" class="small subtle" data-ii="fechar">Fechar</button></div></div>`;
    };
    const fim = () => { document.removeEventListener("keydown", esc2, true); ov.remove(); };
    const esc2 = (e) => { if (e.key === "Escape") { e.stopPropagation(); fim(); } };
    const erro = (m) => { const e = ov.querySelector(".inv-img-erro"); if (e) e.textContent = m || ""; };
    const globalRef=II.refCatalogo?.(it),editarGlobal=!!globalRef&&window.CATALOGO?.admin();
    const itemFoto=globalRef&&!editarGlobal?{uid:it.uid}:it;
    const gravarImagem=async src=>{if(editarGlobal){await CATALOGO.salvar('item',globalRef,null,{imagem:src});redesenharInv();pinta();}else aplicado(II.definir(F(),itemFoto,src));};
    const aplicado = (r) => { if (!r.ok) { erro(r.erro); return false; } salvarInv(); redesenharInv(); pinta(); return true; };
    ov.addEventListener("click", async (e) => {
      if (e.target === ov) return fim();
      const b = e.target.closest("[data-ii]"); if (!b || soLeitura && b.dataset.ii !== "fechar") return;
      const a = b.dataset.ii; erro("");
      if (a === "fechar") return fim();
      if (a === "rm") { if(editarGlobal)await CATALOGO.salvar('item',globalRef,null,{imagem:null});else II.remover(F(),itemFoto);salvarInv();redesenharInv();pinta();return; }
      if (a === "url") { if(editarGlobal){erro('Envie um arquivo para guardá-lo no catálogo global.');return;}await gravarImagem((ov.querySelector("#inv-img-url").value || "").trim()); return; }
      if (a === "arq") { const f = document.createElement("input"); f.type = "file"; f.accept = "image/*"; f.onchange = async () => { const file = f.files && f.files[0]; if (!file) return; try { const rec = await window.recortarFoto(file); if (!rec) return; await gravarImagem(await II.reduzir(rec)); } catch (_) { erro("Não foi possível ler essa imagem."); } }; f.click(); }
    });
    ov.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.id === "inv-img-url") { e.preventDefault(); ov.querySelector('[data-ii="url"]').click(); } });
    pinta(); document.body.appendChild(ov); document.addEventListener("keydown", esc2, true); ov.querySelector("[data-ii]")?.focus();
  }
  /* miniatura que não carrega (URL fora do ar, sem internet): volta ao ícone do tipo */
  document.addEventListener("error", (e) => {
    const im = e.target; if (!im || im.tagName !== "IMG" || !im.classList.contains("inv-thumb-img")) return;
    const b = im.closest(".inv-thumb"), it = b && INV()[+b.dataset.invImg]; if (!b) return;
    b.classList.add("vazio"); b.innerHTML = window.ico ? window.ico((it && II.ICONE[it.tipo || "equipamento"]) || "bag") : "";
  }, true);
  document.addEventListener("toggle", (e) => { const d = e.target; if (!d || !d.matches || !d.matches("details.inv-edit")) return; const u = d.dataset.invUid; if (u) d.open ? invAbertos.add(u) : invAbertos.delete(u); }, true);
  /* ---------- janelas do inventário: detalhes do item, descartar e excluir ---------- */
  function modalInv(rotulo, html) {
    document.getElementById("inv-modal")?.remove();
    const ov = document.createElement("div"); ov.id = "inv-modal"; ov.className = "inv-ov";
    ov.innerHTML = `<div class="crop-box inv-modal-box" role="dialog" aria-modal="true" aria-label="${esc(rotulo)}">${html}</div>`;
    const fim = () => { document.removeEventListener("keydown", tecla, true); ov.remove(); };
    const tecla = (e) => { if (e.key === "Escape" && !document.querySelector(".vi-ov")) { e.stopPropagation(); fim(); } };
    ov.addEventListener("click", (e) => { if (e.target === ov || e.target.closest("[data-modal-fechar]")) fim(); });
    document.body.appendChild(ov); document.addEventListener("keydown", tecla, true);
    const f = ov.querySelector("input,textarea,button:not([data-modal-fechar])"); if (f) f.focus({ preventScroll: true });
    return { ov, fim };
  }
  const mediaDados = (d) => (d && d.n && d.d ? Math.round((num(d.n) * (num(d.d) + 1) / 2 + num(d.b)) * 10) / 10 : num(d && d.b));
  /* texto compreensível de cada efeito (consulta do jogador; nada de formulário) */
  function descreverEfeito(e) {
    const T = IE.TIPOS_EFEITO[e.tipo] || {}, dur = e.duracao && e.duracao.texto ? ` Dura: ${e.duracao.texto}.` : "", pas = e.passivo ? " Vale enquanto o item estiver equipado." : "";
    if (e.tipo === "cura") return `Recupera ${IE.formatarDados(e.dados)} pontos de vida (média ${mediaDados(e.dados)}), sem passar do máximo.${pas}`;
    if (e.tipo === "pv-temp") return `Concede ${IE.formatarDados(e.dados)} pontos de vida temporários (média ${mediaDados(e.dados)}).${pas}`;
    return `${T.rotulo || e.tipo}: ${T.descrever ? T.descrever(e) : ""}.${dur}${pas}`;
  }
  /* ficha de leitura do item: a mesma de js/catalogo-itens.js (aba Itens), com o estado deste personagem (quantidade, sintonia, cargas) */
  const CAT = () => window.CAT_ITENS || null;
  /* ---------- Modelos de Origem: só SUGESTÕES de preenchimento ----------
     Escolher um modelo escreve o texto no campo (o jogador altera o que quiser, ou escreve tudo do zero). Nunca é aplicado sozinho e nunca troca a Origem existente ao abrir o editor.
     Só usa o que a ficha já sabe (classe, antecedente, pacote do próprio item); o resto fica para o jogador completar (sem inventar nome nem local). Não há tabela nem cor por categoria. */
  const MODELOS_ORIGEM = [["inicial", "Equipamento inicial da classe [classe]"], ["escolha", "Escolha de equipamento da classe [classe]"], ["antecedente", "Equipamento do antecedente [antecedente]"], ["pacote", "Componente do [pacote]"],
    ["comprado", "Comprado"], ["encontrado", "Encontrado"], ["recompensa", "Recompensa de missão"], ["presente", "Presente"], ["recebido", "Recebido"], ["fabricado", "Fabricado"], ["livre", "Origem personalizada"]];
  function textoModelo(chave, rec) {
    const c0 = CLS()[0], classe = c0 ? CLASSES[c0.c] || "" : "", ante = F().background || "", pac = (rec && rec.origem && rec.origem.pacote && rec.origem.pacote.nome) || "Pacote de ";
    return ({ inicial: "Equipamento inicial da classe " + classe, escolha: "Escolha de equipamento da classe " + classe, antecedente: "Equipamento do antecedente " + ante, pacote: "Componente do " + pac,
      comprado: "Comprado", encontrado: "Encontrado", recompensa: "Recompensa de missão", presente: "Presente", recebido: "Recebido", fabricado: "Fabricado" })[chave];
  }
  const seletorModelos = (uid) => `<select class="inv-origem-modelo" data-origem-modelo${uid ? ` data-modelo-uid="${esc(uid)}"` : ""} aria-label="Modelo de origem"><option value="">Modelos…</option>${MODELOS_ORIGEM.map(([k, r]) => `<option value="${k}">${esc(r)}</option>`).join("")}</select>`;
  document.addEventListener("change", (e) => {
    const s = e.target; if (!s || !s.matches || !s.matches("[data-origem-modelo]")) return;
    const campo = s.parentElement && s.parentElement.querySelector("input"), chave = s.value; s.value = "";
    if (!campo || !chave || soLeitura) return;
    const uid = s.dataset.modeloUid || (s.closest(".inv-edit") && s.closest(".inv-edit").dataset.invUid), rec = uid ? INV().find((x) => x.uid === uid) : null, texto = chave === "livre" ? null : textoModelo(chave, rec);
    campo.focus(); if (texto != null) campo.value = texto;   // foco antes: ao sair do campo o texto é salvo pelo tratador normal
    try { campo.setSelectionRange(campo.value.length, campo.value.length); } catch (_) { /* tipo sem seleção */ }
  });
  /* Origem e histórico de transferências nos detalhes. A origem é um texto por registro (lote); dono e mestre editam. O histórico só aparece quando existe. */
  const dataBR = (q) => { const d = new Date(q); return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR"); };
  function blocoOrigemHTML(it) {
    const mem = membrosDe(it), multi = mem.length > 1;
    const textos = mem.map((m) => IV.origemTexto(m));
    const hist = mem.flatMap((m) => (m.transferencias || []).map((t) => ({ t, m })));
    let html = "";
    if (!soLeitura || textos.some(Boolean)) {
      html += `<h4 class="sub">Origem</h4><ul class="inv-det-origens">${mem.map((m, k) => { const q = Math.max(0, num(m.qtd, 0)), txt = textos[k];
        return `<li><span class="inv-det-origem-txt">${multi ? `<b>${q}×</b> · ` : ""}${txt ? esc(txt) : '<span class="muted">Sem origem informada</span>'}</span>${!soLeitura ? `<span class="inv-origem-campo"><input data-lote-origem="${esc(m.uid)}" value="${esc(typeof (m.origem && m.origem.texto) === "string" ? m.origem.texto : txt)}" maxlength="120" placeholder="Origem" aria-label="Origem${multi ? " do lote de " + q + " unidades" : ""}">${seletorModelos(m.uid)}</span>` : ""}</li>`; }).join("")}</ul>`;
    }
    if (hist.length) {
      html += `<h4 class="sub">Histórico de transferências</h4><ul class="inv-det-hist">${hist.map(({ t, m }) => `<li>${[dataBR(t.quando), `${esc((t.de && t.de.nome) || "personagem")} → ${esc((t.para && t.para.nome) || "personagem")}`, `${num(t.qtd, 0)}×`, multi ? `lote de ${Math.max(0, num(m.qtd, 0))}` : "", t.nota ? esc(t.nota) : ""].filter(Boolean).join(" · ")}</li>`).join("")}</ul>`;
    }
    return html;
  }
  /* quem edita a ficha (dono ou mestre) corrige o texto da Origem de UM registro; nada além do texto muda (nome, quantidade, peso, imagem, propriedades, vínculos e id técnico ficam como estão) */
  document.addEventListener("change", (e) => {
    const t = e.target; if (!t || !t.matches || !t.matches("[data-lote-origem],[data-inv-origem]")) return;
    if (soLeitura) return;   // visão somente leitura do grupo: nada é gravado
    const uid = t.dataset.loteOrigem || (t.closest(".inv-edit") && t.closest(".inv-edit").dataset.invUid), rec = INV().find((x) => x.uid === uid);
    if (!rec) return;
    IV.definirOrigemTexto(rec, t.value); salvarInv(); redesenharInv();
  });
  function viewDoItem(it) {
    const C = CAT(), cat = C && C.doInventario(it), t = it.tipo || "equipamento", pr = it.propriedades || {}, efs = IE.efeitosDe(it), im = II.obter(F(), it), membros = membrosDe(it), qn = membros.length > 1 ? IV.totalDe(membros) : Math.max(0, num(it.qtd, 1));
    const consumo = pr.consumo || (t === "magico" ? "carga" : "unidade"), usavel = IE.temEfeitos(it) || t === "consumivel";
    const org = it.origem && it.origem.tipo && it.origem.tipo !== "inicial" ? (ROT_ORIGEM[it.origem.tipo] || it.origem.tipo) + (it.origem.nota ? ": " + it.origem.nota : "") : "";
    const raridade = pr.raridade || (cat && cat.raridade ? C.RARIDADES[cat.raridade] : ""), exigeSint = pr.sintonia ? !!pr.sintonia.requer : !!(cat && cat.sintonia);
    const pesoLinha = it.conjunto ? `${kg(num(it.peso, 0))} kg no conjunto (soma dos componentes)` : `${kg(num(it.peso, 0))} kg cada · ${kg(qn * num(it.peso, 0))} kg no total`;
    const doEstado = [
      ["Tipo", IV.TIPOS[t] || t], cat && !cat.custom && nz(cat.nome) !== nz(it.nome) ? ["Item do catálogo", cat.nome + (cat.en ? ` (${cat.en})` : "")] : null, raridade ? ["Raridade", raridade] : null, it.conjunto ? null : ["Quantidade", String(qn)], ["Peso", pesoLinha],
      exigeSint ? ["Sintonia", pr.sintonia && pr.sintonia.sintonizado ? "Exige sintonia · você está sintonizado" : "Exige sintonia" + (pr.sintonia ? " · você não está sintonizado" : "")] : null,
      pr.cargas ? ["Cargas", `${num(pr.cargas.atual, 0)} de ${num(pr.cargas.max, 0)}${pr.cargas.recarga ? " · recarga: " + pr.cargas.recarga : ""}`] : null,
      usavel && efs.some((e) => !e.passivo) ? ["Ao usar", consumo === "carga" ? "Gasta carga(s) do item" : consumo === "nenhum" ? "Não gasta nada" : "Gasta 1 unidade"] : null,
      it.magiaVinculada ? ["Magia", `${it.magiaVinculada.n} (${Number(it.magiaVinculada.l) ? it.magiaVinculada.l + "º círculo" : "truque"})`] : null,
    ].filter(Boolean);
    const doCatalogo = cat ? C.linhas(cat).filter(([k]) => !["Peso", "Raridade", "Sintonia"].includes(k)) : [];
    return { usavel, v: { nome: it.nome || "Item sem nome", categoria: cat ? cat.categoria : t, imagem: im ? im.src : null, subtitulo: [IV.TIPOS[t] || t, raridade].filter(Boolean).join(" · ") + (cat ? " · " + C.rotuloCat(cat.categoria) : ""),
      desc: it.desc || null, lacunaDesc: !!cat && !cat.custom && !it.desc && !efs.length, efeitos: efs.map(descreverEfeito), componentes: it.conjunto || null, acoesComponente: !!it.conjunto,
      notaConjunto: it.conjunto ? "Conjunto agrupado: retire ou consuma cada componente aqui. O peso do conjunto é a soma do que resta, sem contar duas vezes." : null, dados: doEstado.concat(doCatalogo), extraHTML: blocoOrigemHTML(it), rodape: cat ? "Dados básicos do catálogo (SRD 5.1)" + (cat.en ? `; original: ${cat.en}.` : ".") : "" } };
  }
  function htmlDetalhes(it, i) {
    const C = CAT(); if (!C) return '<p class="err">Os detalhes do catálogo não carregaram. Recarregue a página.</p>';
    const { usavel, v } = viewDoItem(it);
    return C.fichaHTML(v) + `<div class="row inv-det-acoes">${nomeDivergente(it) && !soLeitura ? `<button type="button" class="small subtle" data-det-restaurar="${i}">Restaurar nome do catálogo</button>` : ""}<button type="button" class="small" data-det-imagem="${i}">${v.imagem?"Trocar imagem":"Adicionar imagem"}</button>${usavel ? `<button type="button" class="small primary" data-det-usar="${i}">Usar</button>` : ""}${souMestre ? `<button type="button" class="small" data-det-config="${i}">Configurar efeitos (mestre)</button>` : ""}<button type="button" class="small subtle" data-modal-fechar>Fechar</button></div>`;
  }
  /* conjunto: retirar 1 unidade de um componente (vira item separado) ou consumi-la; o peso do conjunto é recalculado pela soma do que resta */
  function acaoComponente(it, k, acao) {
    const c = it.conjunto && it.conjunto[k]; if (!c || !(c.qtd >= 1)) return "Este componente acabou.";
    const C = CAT(), cont_ = cont();
    if (acao === "retirar") {
      const cat = C && C.obter(c.ref), sep = cat ? C.paraInventario(cat, 1, { tipo: "jogo", nota: "Retirado de " + (it.nome || "conjunto") }) : IV.novoItem({ nome: c.nome, qtd: 1, peso: c.peso, origem: { tipo: "jogo", nota: "Retirado de " + (it.nome || "conjunto") } });
      c.qtd -= 1; IV.adicionar(cont_, sep, { tipo: "entrada", nota: "Retirado de " + (it.nome || "conjunto") });
      IV.registrar(cont_, { tipo: "retirada-componente", uid: it.uid, nome: it.nome, qtd: 1, nota: c.nome });
    } else { c.qtd -= 1; IV.registrar(cont_, { tipo: "uso", uid: it.uid, nome: c.nome, qtd: 1, nota: "Consumido do conjunto " + (it.nome || "") }); }
    it.peso = Math.round(C.pesoDoConjunto(it.conjunto) * 1000) / 1000;
    if (it.conjunto.every((x) => !(x.qtd >= 1))) { const p = INV().indexOf(it); if (p >= 0) { IV.registrar(cont_, { tipo: "exclusao", uid: it.uid, nome: it.nome, qtd: 1, nota: "Conjunto esvaziado" }); INV().splice(p, 1); } return "esvaziou"; }
    return "";
  }
  function abrirDetalhes(i) {
    const it = itemPor(i); if (!it) return;
    const { ov, fim } = modalInv("Detalhes do item", htmlDetalhes(it, i));
    ov.addEventListener("click", (e) => {
      const comp = e.target.closest("[data-comp-retirar],[data-comp-consumir]");
      if (comp) {
        const retirar = comp.dataset.compRetirar !== undefined, r = acaoComponente(it, +(retirar ? comp.dataset.compRetirar : comp.dataset.compConsumir), retirar ? "retirar" : "consumir");
        if (r && r !== "esvaziou") { aviso(r, true); return; }
        salvarInv(); redesenharInv();
        if (r === "esvaziou") { fim(); aviso(`${it.nome || "Conjunto"} esvaziado e removido da lista.`); return; }
        ov.querySelector(".inv-modal-box").innerHTML = htmlDetalhes(it, INV().indexOf(it)); return;
      }
      const rest = e.target.closest('[data-det-restaurar]'); if (rest) { if (restaurarNomeCatalogo(it)) ov.querySelector(".inv-modal-box").innerHTML = htmlDetalhes(it, INV().indexOf(it)); return; }
      const foto=e.target.closest('[data-det-imagem]');if(foto){fim();abrirImagemItem(+foto.dataset.detImagem);return;}
      const b = e.target.closest("[data-det-usar],[data-det-config]"); if (!b) return;
      fim();
      if (b.dataset.detUsar !== undefined) { abrirUso(+b.dataset.detUsar); $("#uso-box")?.scrollIntoView({ block: "center" }); }
      else { abrirEditor(+b.dataset.detConfig); $("#ef-box")?.scrollIntoView({ block: "center" }); }
    });
  }
  /* ---------- adicionar do catálogo de itens ---------- */
  let catAdd = { q: "", cat: "" };
  function desenharCatAdd() {
    const box = document.getElementById("ci-res"), C = CAT(); if (!box) return;
    if (!C) { box.innerHTML = '<p class="muted">Catálogo de itens indisponível.</p>'; return; }
    let todos; try { todos = C.todos(); } catch (_) { todos = []; }
    if (!todos.length) { box.innerHTML = '<p class="muted">Carregando o catálogo…</p>'; C.carregar().then(desenharCatAdd).catch(() => { box.innerHTML = '<p class="err">Não foi possível carregar o catálogo de itens.</p>'; }); return; }
    const l = C.filtrar(todos, { q: catAdd.q, cat: catAdd.cat }), mostra = l.slice(0, 30);
    box.innerHTML = (mostra.length ? mostra.map((x) => { const im = x.custom ? x.imagem : (II.obter && II.obter({}, { ref: x.id }) || {}).src; return `<div class="inv-cat-item" data-cat-id="${esc(x.id)}"><button type="button" class="inv-thumb${im ? "" : " vazio"}" data-cat-det="${esc(x.id)}" aria-label="Ver detalhes de ${esc(x.nome)}">${im ? `<img class="inv-thumb-img" src="${esc(im)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : (window.ico ? window.ico(C.ICONE[x.categoria] || "bag") : "")}</button>
      <div class="inv-corpo"><button type="button" class="inv-nome-btn" data-cat-det="${esc(x.id)}"><b class="inv-nome-txt">${esc(x.nome)}</b></button><div class="inv-meta muted">${esc([C.rotuloCat(x.categoria), C.custoTexto(x), C.pesoDe(x) > 0 ? kg(C.pesoDe(x)) + " kg" : ""].filter(Boolean).join(" · "))}</div></div>
      <div class="inv-cat-add"><input class="num" type="number" min="1" max="99" step="1" value="1" aria-label="Quantidade de ${esc(x.nome)}"><button type="button" class="small primary" data-cat-add="${esc(x.id)}">Adicionar</button></div></div>`; }).join("") : '<p class="muted">Nenhum item encontrado.</p>') + (l.length > mostra.length ? `<p class="muted">Mostrando ${mostra.length} de ${l.length}. Refine a busca para ver os demais.</p>` : "");
  }
  function adicionarDoCatalogo(id, qtd) {
    const C = CAT(), cat = C && C.obter(id); if (!cat) return;
    const n = Math.max(1, Math.min(99, Math.floor(num(qtd, 1)))), origem = origemAdd({ tipo: souMestre ? "mestre" : "jogo" }), copias = 1;
    let ultimo = null;
    if (cat.pacote) { for (const x of C.paraInventarioPacote(cat, n, origem)) ultimo = IV.adicionar(cont(), x, { tipo: "entrada", nota: cat.nome }); }   // pacote: componentes individuais, sem item "pacote"
    else { for (let k = 0; k < copias; k++) ultimo = IV.adicionar(cont(), C.paraInventario(cat, n, origem), { tipo: "entrada" }); }
    if (cat.custom && !cat.global && cat.imagem && ultimo) { const r = II.definir(F(), ultimo, cat.imagem); if (!r.ok) aviso("Item adicionado, mas a imagem não coube: " + r.erro, true); }
    salvarInv(); redesenharInv(); fecharAdd(); if (!document.querySelector(".err")) aviso(`${n} × ${cat.nome} adicionado${n === 1 ? "" : "s"} ao inventário.`);
  }
  function detalhesCatalogoAdd(id) {
    const C = CAT(), cat = C && C.obter(id); if (!cat) return;
    const lib = cat.custom ? cat.imagem : (II.obter && II.obter({}, { ref: cat.id }) || {}).src;
    const { ov, fim } = modalInv("Detalhes do item do catálogo", C.fichaHTML(C.viewDoCatalogo(cat, lib || null)) + `<div class="row inv-det-acoes"><label class="inline">Quantidade<input id="cat-det-qtd" class="num" type="number" min="1" max="99" value="1"></label><button type="button" class="small primary" id="cat-det-add">Adicionar ao inventário</button><button type="button" class="small subtle" data-modal-fechar>Fechar</button></div>`);
    ov.querySelector("#cat-det-add").addEventListener("click", () => { const n = ov.querySelector("#cat-det-qtd").value; fim(); adicionarDoCatalogo(id, n); });
  }
  /* Descartar: escolhe quantas unidades; registra no histórico; zerar tira o item da lista (com confirmação extra) */
  function abrirDescartar(i) {
    const it = itemPor(i); if (!it) return; const total = qtdLinha(it);
    if (total < 1) { aviso("Este item não tem unidades para descartar. Use Excluir item para tirá-lo da lista.", true); return; }
    const { ov, fim } = modalInv("Descartar item", `<h3>Descartar: ${esc(it.nome || "item")}</h3><p class="muted">Você tem ${total} unidade${total === 1 ? "" : "s"}. O descarte fica registrado no histórico de movimentações.</p>
      <label>Quantas unidades<input id="dsc-qtd" class="num" type="number" min="1" max="${total}" step="1" value="1"></label>
      <label>Observação (opcional)<input id="dsc-nota" maxlength="80" placeholder="Ex.: jogado fora, perdido"></label>
      <p id="dsc-aviso" class="err" role="alert"></p>
      <div class="row"><button type="button" class="danger" id="dsc-ok">Descartar</button><button type="button" class="small subtle" data-modal-fechar>Cancelar</button></div>`);
    let confirmando = false; const ok = ov.querySelector("#dsc-ok"), q = ov.querySelector("#dsc-qtd"), av = ov.querySelector("#dsc-aviso");
    q.addEventListener("input", () => { confirmando = false; ok.textContent = "Descartar"; av.textContent = ""; });
    ok.addEventListener("click", () => {
      const n = Math.floor(num(q.value, 0)); if (!(n >= 1) || n > total) { av.textContent = `Informe de 1 a ${total}.`; return; }
      if (n === total && !confirmando) { confirmando = true; ok.textContent = "Confirmar: descartar todas"; av.textContent = `Isso descarta todas as ${total} unidades e tira o item da lista.`; return; }
      try { const mem = membrosDe(it); if (mem.length > 1) IV.retirarDoGrupo(cont(), mem, n, { tipo: "descarte", nota: ov.querySelector("#dsc-nota").value.trim() }); else IV.retirar(cont(), it.uid, n, { tipo: "descarte", nota: ov.querySelector("#dsc-nota").value.trim() }); } catch (err) { av.textContent = err.message; return; }
      fim(); salvarInv(); redesenharInv(); aviso(`${n} unidade${n === 1 ? "" : "s"} de ${it.nome || "item"} descartada${n === 1 ? "" : "s"}.`);
    });
  }
  /* Excluir: correção administrativa (cadastro errado); não é descarte nem uso, e fica marcada no histórico como exclusão */
  function abrirExcluir(i) {
    const it = itemPor(i); if (!it) return;
    const { ov, fim } = modalInv("Excluir item", `<h3>Excluir: ${esc(it.nome || "item")}</h3><p>${membrosDe(it).length > 1 ? `Esta linha reúne ${membrosDe(it).length} registros (${qtdLinha(it)} unidades) e todos serão excluídos. ` : ""}Remove o item da lista <b>sem</b> contar como descarte ou uso, como a correção de um cadastro errado. A exclusão fica marcada no histórico e não pode ser desfeita.</p>
      <div class="row"><button type="button" class="danger" id="exc-ok">Excluir item</button><button type="button" class="small subtle" data-modal-fechar>Cancelar</button></div>`);
    ov.querySelector("#exc-ok").addEventListener("click", () => {
      const alvos = membrosDe(it).filter((m) => INV().indexOf(m) >= 0); if (!alvos.length) { fim(); return; }
      for (const m of alvos) { IV.registrar(cont(), { tipo: "exclusao", uid: m.uid, nome: m.nome, qtd: num(m.qtd, 0), nota: "Excluído do inventário" }); INV().splice(INV().indexOf(m), 1); }
      fim(); salvarInv(); redesenharInv(); aviso(`${it.nome || "Item"} excluído do inventário.`);
    });
  }
  /* quantidade: + e −, ou valor digitado; só ajusta (não é uso nem descarte); nunca negativa */
  function ajustarQtd(i, delta) {
    const it = itemPor(i); if (!it) return;
    IV.ajustarQuantidade(cont(), membrosDe(it), delta);   // + ganha origem própria ("Adicionado manualmente"); − sai do manual primeiro; nada de pacote é inflado
    atualizarCarga(); salvarInv(); redesenharInv();
  }
  /* Menu "…": abre para o lado e para o sentido que tiverem espaço dentro da janela (ou da barra lateral), sem ser cortado e sem criar rolagem horizontal */
  function posicionarMenuMais(d) {
    const m = d.querySelector(".inv-mais-menu"); if (!m) return;
    m.style.transform = ""; m.style.top = ""; m.style.bottom = "";
    const vw = document.documentElement.clientWidth, vh = window.innerHeight, M = 8, r = m.getBoundingClientRect(), b = d.getBoundingClientRect();
    let dx = 0; if (r.left < M) dx = M - r.left; else if (r.right > vw - M) dx = vw - M - r.right;
    if (dx) m.style.transform = "translateX(" + Math.round(dx) + "px)";
    if (r.bottom > vh - M && b.top - M > r.height + 4) { m.style.top = "auto"; m.style.bottom = "calc(100% + 4px)"; }
  }
  document.addEventListener("toggle", (e) => { const d = e.target; if (d && d.matches && d.matches("details.inv-mais") && d.open) posicionarMenuMais(d); }, true);
  window.addEventListener("resize", () => document.querySelectorAll("details.inv-mais[open]").forEach(posicionarMenuMais));
  document.addEventListener("click", (e) => { document.querySelectorAll("details.inv-mais[open]").forEach((d) => { if (!d.contains(e.target)) d.removeAttribute("open"); }); });
  document.addEventListener("change", (e) => { const t = e.target; if (!t || !t.matches || !t.matches('input[data-inv="qtd"]')) return; const c = t.closest(".item-inv"), it = c && INV()[+c.dataset.i]; if (it) { const alvo = Math.max(0, Math.floor(num(t.value, 0))), tot = qtdLinha(it); if (alvo !== tot) { IV.ajustarQuantidade(cont(), membrosDe(it), alvo - tot); atualizarCarga(); salvarInv(); redesenharInv(); } else t.value = tot; } });
  document.addEventListener("input", (e) => { if (e.target && e.target.id === "ci-q") { catAdd.q = e.target.value; desenharCatAdd(); } });
  document.addEventListener("change", (e) => { if (e.target && e.target.id === "ci-cat") { catAdd.cat = e.target.value; desenharCatAdd(); } });
  if (CAT()) CAT().carregar().then(() => { try { if (P && document.getElementById("inv")) redesenharInv(); } catch (_) { /* a ficha ainda não carregou */ } }).catch(() => {});
  function histInv() {
    const l = (F().movimentos || []).slice(-20).reverse();
    return l.length ? `<ul class="hist-inv">${l.map((m) => `<li><b>${esc(IV.ROTULO_MOV[m.tipo] || (m.tipo === "uso-efeito" ? "Uso" : m.tipo))}</b> · ${esc(m.nome || "")}${m.qtd ? " ×" + m.qtd : ""}${m.alvo && m.tipo === "uso-efeito" ? " em " + esc(m.alvo) : ""}${m.resultado && m.resultado.length ? " — " + esc(m.resultado.join("; ")) : ""}${m.nota ? " (" + esc(m.nota) + ")" : ""} <span class="muted">${esc(String(m.quando || "").slice(0, 16).replace("T", " "))}</span></li>`).join("")}</ul>` : '<span class="muted">Nenhuma movimentação registrada.</span>';
  }
  function redesenharInv() {
    const l = $("#inv"); if (l) l.innerHTML = listaInvHTML();
    const h = $("#inv-hist"); if (h) h.innerHTML = histInv();
    atualizarCarga(); const e = $("#bloco-efeitos"); if (e) e.innerHTML = blocoEfeitos();
  }
  /* Item digitado à mão (ou de lista rápida) sem vínculo: se o nome corresponde a UM único item do catálogo, recebe catId/ref (imagem, dados e equipar passam a funcionar).
     Nada mais muda (nome, quantidade, peso). Nome ambíguo (ex.: "Bastão") ou desconhecido fica como está. */
  function vincularPorNome(it) {
    const C = window.CAT_ITENS; if (!C || !it || it.catId || it.ref || !(it.nome || "").trim()) return false;
    const id = C.idPorNomeUnico(it.nome); if (!id) return false; it.catId = id; it.ref = id; return true;
  }
  document.addEventListener("change", (e) => {
    const t = e.target; if (!t || !t.matches || !t.matches('input[data-inv="nome"]')) return;
    const card = t.closest("[data-i]"), it = card && INV()[+card.dataset.i];
    if (vincularPorNome(it)) { salvarInv(); redesenharInv(); }
  });
  /* Armadura, escudo ou arma escolhidos direto na ficha: procura o item no INVENTÁRIO. Um só → liga; vários → pergunta qual; nenhum → fica como está (sem vínculo)
     e avisa. Nunca cria item. `aplicar(uid)` faz a ligação; `jaLigado` evita perguntar de novo para o item que já estava vestido. */
  function escolherNoInventario(alvo, rotulo, aplicar) {
    const E = EF(); if (!E) return;
    const { catId, itens } = E.procurar(P, alvo);
    const ligar = (uid) => {
      try { if (aplicar) aplicar(uid); else E.vincularItem(P, uid, catId); } catch (err) { aviso(err.message, true); return; }
      const l = $("#lista-atq"); if (l) l.innerHTML = listaAtq();
      const sa = $("#eq-arm"), se = $("#eq-esc"); if (sa) sa.value = EQ().armadura || ""; if (se) se.checked = !!EQ().escudo;
      salvarInv(); refrescar(); redesenharInv();
    };
    if (!itens.length) { aviso(`${rotulo}: não há item correspondente no inventário. A ficha usa a escolha sem vínculo; adicione o item ao inventário para ligá-lo (nada foi criado).`); return; }
    if (itens.length === 1) { ligar(itens[0].uid); return; }
    const { ov, fim } = modalInv("Escolher item", `<h3>${esc(rotulo)}: qual item do inventário?</h3><p class="muted">Há ${itens.length} itens correspondentes. Escolha o que você está usando; o outro continua no inventário.</p>
      <div class="col">${itens.map((x, k) => `<label class="inline"><input type="radio" name="esc-item" value="${esc(x.uid)}" style="width:auto;height:auto" ${k === 0 ? "checked" : ""}> ${esc(x.nome || "Item")} · ${num(x.qtd, 1)}× · ${kg(num(x.peso, 0))} kg${x.origem && x.origem.nota ? " · " + esc(x.origem.nota) : ""}</label>`).join("")}</div>
      <div class="row"><button type="button" data-esc-ok>Ligar este item</button><button type="button" class="subtle" data-modal-fechar>Não ligar</button></div>`);
    ov.querySelector("[data-esc-ok]").addEventListener("click", () => { const v = ov.querySelector('input[name="esc-item"]:checked'); fim(); if (v) ligar(v.value); });
  }
  /* Relatório SOMENTE LEITURA dos vínculos com o catálogo e entre ficha e inventário. Aplicar os seguros é um segundo passo, com confirmação. */
  function verificarVinculos() {
    const E = EF(), C = window.CAT_ITENS; if (!E || !C) { aviso("Catálogo ainda não carregado.", true); return; }
    const rs = E.resumo(E.diagnosticar(P)), nomeCat = (id) => (C.obter(id) || {}).nome || id, nomeUid = (u) => (INV().find((x) => x.uid === u) || {}).nome || u;
    const lista = (arr, f) => (arr.length ? `<ul>${arr.map((x) => `<li>${f(x)}</li>`).join("")}</ul>` : '<p class="muted">Nenhum.</p>');
    const botaoAplicar = rs.seguros.length ? `<button type="button" data-vinc-aplicar>Ligar os ${rs.seguros.length} seguros</button>` : "";
    const { ov, fim } = modalInv("Vínculos", `<h3>Vínculos de equipamento</h3><p class="muted">Somente leitura: nada foi alterado.</p>
      <h4>Podem ser ligados com segurança (${rs.seguros.length})</h4>${lista(rs.seguros, (x) => `${esc(x.tipo)} <b>${esc(x.nome)}</b> → ${esc(x.tipo === "item" ? nomeCat(x.vinculo) : nomeUid(x.vinculo))}`)}
      <h4>Ambíguos: é preciso escolher (${rs.ambiguos.length})</h4>${lista(rs.ambiguos, (x) => `${esc(x.tipo)} <b>${esc(x.nome)}</b>: ${(x.candidatos || []).map((c) => esc(x.tipo === "item" ? nomeCat(c) : nomeUid(c))).join(" ou ")}${x.sugestao ? " (sugestão pelo contexto: " + esc(nomeCat(x.sugestao)) + ")" : ""}`)}
      <h4>Sem correspondência (${rs.semCorrespondencia.length})</h4>${lista(rs.semCorrespondencia, (x) => `${esc(x.tipo)} <b>${esc(x.nome)}</b>: ${x.motivo === "item-removido" ? "o item vinculado não está mais no inventário" : "não há item correspondente no inventário"}`)}
      <p class="muted">Já vinculados: ${rs.ok.length}. Equipados sem vínculo com a ficha: ${rs.equipadosSemVinculo.length}.</p>
      <div class="row">${botaoAplicar}<button type="button" class="subtle" data-modal-fechar>Fechar</button></div>`);
    const ap = ov.querySelector("[data-vinc-aplicar]");
    if (ap) ap.addEventListener("click", async () => {
      if (!(await perguntar(`Ligar ${rs.seguros.length} item(ns) ao catálogo/ficha? Só são preenchidos os vínculos (catId, ref, itemUid); nome, quantidade, peso e imagens não mudam.`, { titulo: "Ligar vínculos seguros", ok: "Ligar" }))) return;
      fim(); const m = E.aplicarVinculos(P); salvarInv(); redesenharInv(); const l = $("#lista-atq"); if (l) l.innerHTML = listaAtq(); refrescar(); aviso(`${m.length} vínculo(s) preenchido(s).`);
    });
  }
  function blocoEfeitos() {
    const l = F().efeitosAtivos || [];
    return l.length ? `<h3 class="sub">Efeitos ativos</h3><ul class="efeitos-ativos">${l.map((e) => `<li><b>${esc(e.texto || e.tipo)}</b>${e.duracao && e.duracao.texto ? ` <span class="muted">· ${esc(e.duracao.texto)}</span>` : ""}${e.origem ? ` <span class="muted">· ${esc(e.origem.item)}</span>` : ""} ${e.passivo ? "" : `<button type="button" class="small subtle" data-enc-efeito="${esc(e.id)}">Encerrar</button>`}</li>`).join("")}</ul>` : "";
  }
  function salvarInv(extra = {}) { if (EF() && EF().reconciliar(P).mudou) { const l = $("#lista-atq"); if (l) l.innerHTML = listaAtq(); const sa = $("#eq-arm"), se = $("#eq-esc"); if (sa) sa.value = EQ().armadura || ""; if (se) se.checked = !!EQ().escudo; } IE.sincronizarPassivos(P); II.limpar(F(), INV()); agendar({ inventario: P.inventario, ficha: P.ficha, ...extra }); }
  /* --- usar item --- */
  function abrirUso(i) {
    const it = itemPor(i); if (!it) return;
    uso = { uid: it.uid, alvo: "proprio", nome: "", rolagens: {}, danos: {}, textoRolagem: {} };
    renderUso();
  }
  const escUso = () => ({ alvo: uso.alvo === "outro" ? { tipo: "outro", nome: uso.nome } : { tipo: "proprio" }, rolagens: uso.rolagens, danos: uso.danos });
  function previaUso() {
    const it = INV().find((x) => x.uid === uso.uid); if (!it) return "";
    const v = IE.previa(P, uso.uid, escUso()); let h = "";
    if (v.ok && uso.alvo === "proprio") {
      const cura = v.linhas.filter((l) => l.tipo === "cura").reduce((s, l) => s + l.ctx.total, 0);
      if (cura) h += `<p><b>PV:</b> ${P.pv_atual} → ${Math.min(P.pv_max, P.pv_atual + cura)} de ${P.pv_max}</p>`;
      const pt = v.linhas.filter((l) => l.tipo === "pv-temp").reduce((m, l) => Math.max(m, l.ctx.total), 0);
      if (pt) h += `<p><b>PV temporários:</b> ${num(P.pv_temp, 0)} → ${Math.max(num(P.pv_temp, 0), pt)}</p>`;
    }
    h += `<p class="muted">Consumo: ${v.consumo === "carga" ? "1 carga do item" : v.consumo === "unidade" ? "1 unidade" : "nenhum (o item permanece)"}.</p>`;
    if (!v.ok) h += `<ul class="err">${v.motivos.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>`;
    return h;
  }
  function renderUso() {
    const box = $("#uso-box"); if (!box || !uso) return;
    const it = INV().find((x) => x.uid === uso.uid); if (!it) { box.hidden = true; return; }
    const plano = IE.plano(it);
    const linhas = plano.map((p) => {
      if (!p.suportado) return `<p class="err">Efeito ${p.i + 1}: tipo "${esc(p.tipo)}" ainda não é suportado.</p>`;
      if (p.dado && num(p.dados.n) * num(p.dados.d) > 0) { const fx = IE.faixa(p.dados); return `<div class="row"><b>${esc(p.rotulo)} ${IE.formatarDados(p.dados)}</b><button type="button" class="small" data-uso-rolar="${p.i}">Rolar</button><label class="inline" style="margin:0">Resultado <input class="num" type="number" min="${fx.min}" max="${fx.max}" step="1" data-uso-rol="${p.i}" value="${uso.rolagens[p.i] ?? ""}"></label><span class="muted">${esc(uso.textoRolagem[p.i] || "ou informe o resultado de " + fx.min + " a " + fx.max)}</span></div>`; }
      if (p.dado) return `<p><b>${esc(p.rotulo)}:</b> ${num(p.dados.b)} (valor fixo)</p>`;
      if (p.escolhaDano) return `<label>Tipo de dano da resistência<select data-uso-dano="${p.i}">${opt("", "Escolher…", !uso.danos[p.i])}${IE.TIPOS_DANO.map((d) => opt(d, d, uso.danos[p.i] === d)).join("")}</select></label>`;
      const t = IE.TIPOS_EFEITO[p.tipo]; return `<p><b>${esc(p.rotulo)}:</b> ${esc(t.descrever ? t.descrever(p.ef) : "")}${p.ef.duracao && p.ef.duracao.texto ? ` <span class="muted">(${esc(p.ef.duracao.texto)})</span>` : ""}</p>`;
    }).join("");
    const nota = it.tipo === "pergaminho" && it.magiaVinculada ? `<p class="muted">Pergaminho de ${esc(it.magiaVinculada.n)}: se a magia está na lista da sua classe, basta usar; se o círculo for maior do que você conjura, faça um teste de característica de conjuração com CD ${10 + num(it.magiaVinculada.l)} (a falha faz a magia sumir). O pergaminho é consumido. A magia em si é conjurada à mesa.</p>` : "";
    box.hidden = false;
    box.innerHTML = `<h3>Usar: ${esc(it.nome)}</h3>${nota}${linhas}
      <fieldset><legend class="muted">Alvo</legend><label class="inline"><input type="radio" name="uso-alvo" value="proprio" style="width:auto;height:auto" ${uso.alvo === "proprio" ? "checked" : ""}> Este personagem</label> <label class="inline"><input type="radio" name="uso-alvo" value="outro" style="width:auto;height:auto" ${uso.alvo === "outro" ? "checked" : ""}> Outro alvo</label></fieldset>
      ${uso.alvo === "outro" ? `<label>Nome do alvo<input id="uso-nome" maxlength="80" value="${esc(uso.nome)}"></label><p class="muted">Para outro alvo o resultado fica registrado e a ficha dele deve ser ajustada pelo próprio jogador ou pelo mestre. Este personagem só gasta o item.</p>` : ""}
      <div id="uso-previa">${previaUso()}</div><div class="row"><button type="button" id="uso-ok" ${IE.previa(P, uso.uid, escUso()).ok ? "" : "disabled"}>Confirmar uso</button><button type="button" class="small subtle" id="uso-cancel">Cancelar</button></div><div id="uso-res" role="status" class="muted"></div>`;
  }
  const atualizaUso = () => { const p = $("#uso-previa"); if (p && uso) p.innerHTML = previaUso(); const b = $("#uso-ok"); if (b && uso) b.disabled = !IE.previa(P, uso.uid, escUso()).ok; };
  function confirmarUso() {
    if (usando || !uso) return;
    usando = true;
    try {
      const nome = (INV().find((x) => x.uid === uso.uid) || {}).nome || "item";
      const r = IE.usar(P, uso.uid, escUso());
      if (!r.ok) { $("#uso-res").innerHTML = `<span class="err">${esc(r.motivos.join(" "))}</span>`; return; }
      agendar({ inventario: P.inventario, ficha: P.ficha, pv_atual: P.pv_atual, pv_temp: P.pv_temp });   // uma única gravação: item, PV e efeitos juntos
      IE.sincronizarPassivos(P);
      uso = null; const box = $("#uso-box"); box.hidden = true; box.innerHTML = "";
      redesenharInv(); atualizarPV(); const bpv = $("#bloco-pv"); if (bpv) bpv.innerHTML = blocoPV(); refrescar();
      aviso(`${nome} usado. ${r.resultado.map((x) => x.texto).join(" ")}`);
    } finally { usando = false; }
  }
  /* --- editor de efeitos do item (mestre) --- */
  function htmlEditorEfeitos(it) {
    const ef = IE.efeitosDe(it), pr = it.propriedades;
    const campos = (tipos, h) => `<div data-ef-campos="${tipos}" ${edEf && tipos.split(" ").includes(edEf.tipo) ? "" : "hidden"}>${h}</div>`;
    return `<h3>Efeitos de ${esc(it.nome)}</h3><p class="muted">Configuração do mestre. Os tipos manuais não são automatizados: ficam como texto no efeito ativo.</p>
      ${ef.length ? `<ul>${ef.map((e, k) => `<li>${esc((IE.TIPOS_EFEITO[e.tipo] || {}).rotulo || e.tipo)}: ${esc(e.tipo === "cura" || e.tipo === "pv-temp" ? IE.formatarDados(e.dados) : ((IE.TIPOS_EFEITO[e.tipo] || {}).descrever ? IE.TIPOS_EFEITO[e.tipo].descrever(e) : ""))}${e.passivo ? " (enquanto equipado)" : ""} <button type="button" class="small subtle" data-ef-rm="${k}">Remover</button></li>`).join("")}</ul>` : '<p class="muted">Sem efeitos.</p>'}
      <label>Novo efeito<select id="ef-tipo">${Object.entries(IE.TIPOS_EFEITO).map(([k, t]) => opt(k, t.rotulo, edEf && edEf.tipo === k)).join("")}</select></label>
      ${campos("cura pv-temp", '<div class="row"><label>Dados<input class="num" id="ef-n" type="number" min="0" max="20" value="1"></label><label>Faces<input class="num" id="ef-d" type="number" min="0" max="100" value="4"></label><label>Bônus<input class="num" id="ef-b" type="number" min="0" max="500" value="0"></label></div>')}
      ${campos("modificador", `<label>Categoria<select id="ef-cat">${R.CATEGORIAS_TEMP.map(([k, n]) => opt(k, n, false)).join("")}</select></label>`)}
      ${campos("atributo", `<label>Atributo<select id="ef-atr">${ATR.map(([k]) => opt(k, R.ATR_NOME[k], false)).join("")}</select></label>`)}
      ${campos("modificador atributo", '<label>Valor<input class="num" id="ef-valor" type="number" min="-20" max="20" value="1"></label>')}
      ${campos("condicao", `<label>Condição<select id="ef-cond">${opt("", "Selecionar…", true)}${IE.CONDICOES.map((c) => opt(c, c, false)).join("")}</select></label>`)}
      ${campos("resistencia", `<label>Tipo de dano<select id="ef-dano">${opt("escolher", "Escolhido ao usar", true)}${IE.TIPOS_DANO.map((d) => opt(d, d, false)).join("")}</select></label>`)}
      ${campos("manual", '<label>Descrição<textarea id="ef-texto" rows="2" maxlength="300"></textarea></label>')}
      ${campos("modificador atributo condicao resistencia manual", `<label>Duração (texto)<input id="ef-dur" maxlength="60" placeholder="Ex.: 1 hora"></label><label>Termina<select id="ef-ate">${Object.entries(IE.DURACOES).map(([k, n]) => opt(k, n, k === "manual")).join("")}</select></label>`)}
      <label class="inline"><input type="checkbox" id="ef-passivo" style="width:auto;height:auto"> Passivo (vale enquanto o item estiver equipado)</label>
      <div class="row"><button type="button" class="small" id="ef-add">Adicionar efeito</button></div>
      <h4 class="sub">Consumo e propriedades</h4>
      <div class="row"><label>Ao usar<select id="ef-consumo">${opt("unidade", "Gasta 1 unidade", (pr.consumo || (it.tipo === "magico" ? "carga" : "unidade")) === "unidade")}${opt("carga", "Gasta carga(s)", (pr.consumo || (it.tipo === "magico" ? "carga" : "unidade")) === "carga")}${opt("nenhum", "Não gasta nada", pr.consumo === "nenhum")}</select></label><label>Cargas (atual)<input class="num" id="ef-c-atual" type="number" min="0" max="999" value="${pr.cargas ? pr.cargas.atual : 0}"></label><label>Cargas (máx.)<input class="num" id="ef-c-max" type="number" min="0" max="999" value="${pr.cargas ? pr.cargas.max : 0}"></label><label>Custo por uso<input class="num" id="ef-c-custo" type="number" min="1" max="99" value="${num(pr.custoCarga, 1)}"></label></div>
      <label class="inline"><input type="checkbox" id="ef-sint" style="width:auto;height:auto" ${pr.sintonia && pr.sintonia.requer ? "checked" : ""}> Exige sintonia</label>
      <label>Raridade<input id="ef-rar" maxlength="30" value="${esc(pr.raridade || "")}"></label>
      <div class="row"><button type="button" class="small" id="ef-salvar-props">Salvar propriedades</button><button type="button" class="small subtle" id="ef-fechar">Fechar</button></div><div id="ef-res" class="err" role="alert"></div>`;
  }
  function abrirEditor(i) { const it = itemPor(i); if (!it || !souMestre) return; edEf = { uid: it.uid, tipo: "cura" }; const box = $("#ef-box"); box.hidden = false; box.innerHTML = htmlEditorEfeitos(it); }
  function efeitoDoForm() {
    const t = $("#ef-tipo").value, v = (id) => $("#" + id).value, ef = { tipo: t };
    if (t === "cura" || t === "pv-temp") ef.dados = { n: Math.round(num(v("ef-n"), 0)), d: Math.round(num(v("ef-d"), 0)), b: Math.round(num(v("ef-b"), 0)) };
    if (t === "modificador") { ef.categoria = v("ef-cat"); ef.valor = Math.round(num(v("ef-valor"), 0)); }
    if (t === "atributo") { ef.atributo = v("ef-atr"); ef.valor = Math.round(num(v("ef-valor"), 0)); }
    if (t === "condicao") ef.condicao = v("ef-cond");
    if (t === "resistencia") ef.dano = v("ef-dano");
    if (t === "manual") ef.texto = v("ef-texto").trim();
    if (["modificador", "atributo", "condicao", "resistencia", "manual"].includes(t)) ef.duracao = { texto: v("ef-dur").trim(), ate: v("ef-ate") };
    if ($("#ef-passivo").checked) ef.passivo = true;
    return ef;
  }
  function addEfeito() {
    const it = INV().find((x) => x.uid === edEf.uid); if (!it) return;
    const ef = efeitoDoForm(), antes = JSON.stringify(it.propriedades);
    it.propriedades.efeitos = [...IE.efeitosDe(it), ef];
    const erros = IE.validarItem(it);
    if (erros.length) { it.propriedades = JSON.parse(antes); $("#ef-res").textContent = erros.join(" "); return; }
    salvarInv(); redesenharInv(); $("#ef-box").innerHTML = htmlEditorEfeitos(it);
  }
  function salvarProps() {
    const it = INV().find((x) => x.uid === edEf.uid); if (!it) return; const pr = it.propriedades, v = (id) => $("#" + id).value;
    pr.consumo = v("ef-consumo"); const max = Math.max(0, Math.round(num(v("ef-c-max"), 0))), atual = Math.max(0, Math.min(max, Math.round(num(v("ef-c-atual"), 0))));
    if (max > 0) { pr.cargas = { atual, max, recarga: (pr.cargas && pr.cargas.recarga) || "" }; pr.custoCarga = Math.max(1, Math.round(num(v("ef-c-custo"), 1))); } else { delete pr.cargas; delete pr.custoCarga; }
    if ($("#ef-sint").checked) pr.sintonia = { requer: true, sintonizado: !!(pr.sintonia && pr.sintonia.sintonizado) }; else delete pr.sintonia;
    const r = v("ef-rar").trim(); if (r) pr.raridade = r; else delete pr.raridade;
    if (pr.consumo === "carga" && !pr.cargas) { $("#ef-res").textContent = "Defina as cargas máximas."; return; }
    salvarInv(); redesenharInv(); $("#ef-res").textContent = "";
  }
  async function catalogoMagiasInv() { await carregarCat(); return magiasCat; }
  function adicionarPergaminho() {
    const en = $("#pg-mag").value; if (!en || !magiasCat) return;
    const m = magiasCat.find((x) => x.en === en); if (!m) return;
    IV.adicionar(cont(), IV.criarPergaminho(m, { origem: origemAdd({ tipo: souMestre ? "mestre" : "jogo", nota: $("#pg-nota").value.trim().slice(0, 80) }) }), { nota: $("#pg-nota").value.trim().slice(0, 80) });
    $("#pg-nota").value = ""; salvarInv(); redesenharInv(); fecharAdd();
  }
  /* ---------- grimório: copiar magia (Mago) ---------- */
  async function carregarCat() { if (!magiasCat) magiasCat = await fetch("dados/magias.json").then((r) => r.json()); return magiasCat; }
  const wizard = () => CLS().some((c) => c.c === "Wizard");
  const parCopia = () => ({ fonte: cp.fonte, pergaminhoUid: cp.uid });
  function previaCopia() {
    const m = (magiasCat || []).find((x) => x.en === cp.en); if (!m) return '<p class="muted">Escolha uma magia da lista do Mago.</p>';
    const v = MJ.validarCopia(P, m, parCopia()), c = v.custo;
    return `<p><b>Custo e tempo:</b> ${c.po} PO e ${c.horas} h${c.metade ? " (metade: Escola de Evocação, Evocation Savant)" : ""}.</p>` +
      (cp.fonte === "pergaminho" ? `<p><b>Teste:</b> Inteligência (Arcanismo), CD ${v.cd}. O pergaminho é destruído com sucesso ou com falha.</p>` : '<p class="muted">Cópia de outro grimório: sem teste.</p>') +
      (v.ok ? "" : `<ul class="err">${v.motivos.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`);
  }
  function htmlCopia() {
    const mx = MJ.maiorCirculo(F()), cand = (magiasCat || []).filter((m) => (m.c || []).includes("Wizard") && m.l >= 1 && m.l <= mx && !MJ.noGrimorio(F(), m)).sort((a, b) => a.l - b.l || a.n.localeCompare(b.n, "pt-BR"));
    const perg = MJ.listaPergaminhos(P).filter((i) => i.magiaVinculada.en === cp.en);
    if (cp.fonte === "pergaminho" && !perg.some((i) => i.uid === cp.uid)) cp.uid = perg[0] ? perg[0].uid : "";
    return `<label>Magia<select id="cp-mag">${opt("", "Escolher…", !cp.en)}${cand.map((m) => opt(m.en, `${m.n} (${m.l}º círculo)`, m.en === cp.en)).join("")}</select></label>
      <fieldset><legend class="muted">Origem da cópia</legend><label class="inline"><input type="radio" name="cp-fonte" value="grimorio" style="width:auto;height:auto" ${cp.fonte === "grimorio" ? "checked" : ""}> Outro grimório</label> <label class="inline"><input type="radio" name="cp-fonte" value="pergaminho" style="width:auto;height:auto" ${cp.fonte === "pergaminho" ? "checked" : ""}> Pergaminho do inventário</label></fieldset>
      ${cp.fonte === "pergaminho" ? (perg.length ? `<label>Pergaminho<select id="cp-perg">${perg.map((i) => opt(i.uid, `${i.nome} (x${i.qtd})`, i.uid === cp.uid)).join("")}</select></label><label>Resultado do teste de Inteligência (Arcanismo)<input id="cp-arc" class="num" type="number" step="1" value="${esc(cp.arc)}"></label>` : '<p class="muted">Nenhum pergaminho com essa magia no inventário.</p>') : ""}
      <div id="cp-previa">${previaCopia()}</div><div class="row"><button type="button" class="small" id="cp-ok">Copiar para o grimório</button><button type="button" class="small subtle" id="cp-fechar">Fechar</button></div><div id="cp-res" class="muted" role="status"></div>`;
  }
  const copiaPronta = () => { const m = (magiasCat || []).find((x) => x.en === cp.en); if (!m) return false; return MJ.validarCopia(P, m, parCopia()).ok && (cp.fonte !== "pergaminho" || cp.arc !== ""); };
  const atualizaCopia = () => { const b = $("#cp-ok"); if (b) b.disabled = !copiaPronta(); const pv = $("#cp-previa"); if (pv) pv.innerHTML = previaCopia(); };
  async function abrirCopia() {
    const box = $("#copia-box"); if (!box) return;
    try { await carregarCat(); } catch (_) { box.hidden = false; box.innerHTML = '<span class="err">Não consegui carregar as magias.</span>'; return; }
    box.hidden = false; box.innerHTML = htmlCopia(); atualizaCopia();
  }
  async function confirmarCopia() {
    const m = (magiasCat || []).find((x) => x.en === cp.en); if (!m || !copiaPronta()) return;
    const v = MJ.validarCopia(P, m, parCopia());
    if (!(await perguntar(`Copiar “${m.n}” para o grimório?\n\nCusto: ${v.custo.po} PO e ${v.custo.horas} h.${cp.fonte === "pergaminho" ? `\nTeste: Arcanismo ${cp.arc} contra CD ${v.cd}. O pergaminho será destruído em qualquer resultado.` : ""}`, { titulo: "Copiar magia", ok: "Copiar" }))) return;
    const r = MJ.copiarParaGrimorio(P, m, { ...parCopia(), arcanismo: cp.arc === "" ? undefined : Number(cp.arc) });
    if (!r.ok) { $("#cp-res").textContent = r.motivos.join(" "); return; }
    agendar({ ficha: P.ficha, dinheiro: P.dinheiro, inventario: P.inventario });
    cp.en = ""; cp.arc = ""; cp.uid = "";
    $("#lista-mag").innerHTML = listaMagias();
    const po = document.querySelector('[data-din="po"]'); if (po) po.value = DIN().po;
    redesenharInv();
    $("#copia-box").innerHTML = htmlCopia(); atualizaCopia();
    $("#cp-res").textContent = r.sucesso ? `“${m.n}” entrou no grimório (${r.custo.po} PO, ${r.custo.horas} h).` : "A cópia falhou: a magia não entrou no grimório. O custo foi gasto e o pergaminho foi destruído.";
  }
  /* ---------- concessão do mestre ---------- */
  async function abrirMestre() {
    if(!souMestre)return;
    const box = $("#mestre-box"); if (!box) return;
    try { await carregarCat(); } catch (_) { box.hidden = false; box.innerHTML = '<span class="err">Não consegui carregar as magias.</span>'; return; }
    box.hidden = false;
    box.innerHTML = `<p class="muted">Uso do mestre para magias especiais ou personalizadas. Fica registrada como concedida pelo mestre, com a forma escolhida abaixo. Nenhuma forma conta no limite de preparadas, exceto a que entra no grimório (regras do Mago).</p>
      <label>Magia do catálogo<select id="ms-cat">${opt("", "Magia personalizada (preencher abaixo)", true)}${magiasCat.slice().sort((a, b) => a.n.localeCompare(b.n, "pt-BR")).map((m) => opt(m.en, `${m.n} (${m.l ? m.l + "º" : "truque"})`, false)).join("")}</select></label>
      <div id="ms-custom"><label>Nome<input id="ms-nome" maxlength="80"></label><label>Círculo (0 a 9)<input id="ms-nivel" class="num" type="number" min="0" max="9" value="1"></label><label>Descrição<textarea id="ms-desc" rows="3" maxlength="1500"></textarea></label></div>
      <label>Forma da concessão<select id="ms-modo">${Object.entries(MJ.MODOS_CONCESSAO).map(([k, n]) => opt(k, n, k === "conhecida")).join("")}</select></label>
      <div id="ms-uso" hidden><label>Usos<input id="ms-usos" class="num" type="number" min="1" max="99" value="1"></label><label>Recarga<select id="ms-recarga">${opt("longo", "Descanso longo", true)}${opt("curto", "Descanso curto ou longo", false)}${opt("nenhum", "Não recarrega", false)}</select></label></div>
      <div id="ms-outra" hidden><label>Como foi concedida<input id="ms-forma" maxlength="200" placeholder="Ex.: dom de um artefato, só em combate"></label></div>
      <label>Nota (opcional)<input id="ms-nota" maxlength="200" placeholder="Ex.: recompensa da missão"></label>
      <div class="row"><button type="button" class="small" id="ms-ok">Conceder magia</button><button type="button" class="small subtle" id="ms-fechar">Fechar</button></div><div id="ms-res" class="err" role="alert"></div>`;
  }
  function concederMagia() {
    if (!souMestre) return;
    const en = $("#ms-cat").value, nota = $("#ms-nota").value; let m;
    if (en) m = magiasCat.find((x) => x.en === en);
    else { const n = $("#ms-nome").value.trim(); if (!n) { $("#ms-res").textContent = "Informe o nome da magia."; return; } m = { n, l: Math.max(0, Math.min(9, Math.round(num($("#ms-nivel").value, 1)))), d: $("#ms-desc").value.trim(), cab: "Personalizada" }; }
    try { MJ.concederMestre(P, m, nota, { modo: $("#ms-modo").value, usos: $("#ms-usos").value, recarga: $("#ms-recarga").value, forma: $("#ms-forma").value }); } catch (e) { $("#ms-res").textContent = e.message; return; }
    agendar({ ficha: P.ficha }); $("#lista-mag").innerHTML = listaMagias(); $("#mestre-box").hidden = true;
  }

  const fotoHTML = () => { const f = F().foto; return f && /^data:image\//.test(f) ? `<img class="av" style="width:72px;height:72px;margin:0" src="${esc(f)}" alt="Foto">` : `<span class="av av0" style="width:72px;height:72px;font-size:30px;margin:0">${esc((P.nome || "?").charAt(0).toUpperCase())}</span>`; };

  function desenhar() {
    IV.normalizar(INV(), "p" + (P.id || id)); IE.sincronizarPassivos(P);
    const f = F(), outro = souMestre && P.dono_id !== nuvem.usuario().id, rs = racaSel(), c = conj();
    const mostraMag = c.habilidades.length || MAG().length || magiaRacial();
    $("#ficha").innerHTML = `
      <header class="panel ficha-resumo"><div class="ficha-identidade"><div class="ficha-foto">${fotoHTML()}<button type="button" class="small subtle ficha-trocar-foto" id="b-foto">Trocar foto</button><input type="file" id="in-foto" accept="image/*" hidden></div><div><p class="eyebrow">Ficha de personagem · D&D 2014</p><h1>${esc(P.nome)}</h1><p>${esc(f.raca||"Raça não definida")} · ${esc(R.resumoClasses(CLS()).descricao||"Classe não definida")}</p><p>${esc(CLS().map(c=>c.sub).filter(Boolean).join(" · "))}</p><p class="ficha-meta"><span class="badge">Nível ${nivelTotal()}</span>${nivelTotal()<20?`<a class="btnlike small ficha-subir-nivel" href="criar-personagem.html?id=${encodeURIComponent(id)}&modo=nivel">Subir de nível</a>`:""} Proficiência ${fm(bonusProf())} · ${esc(f.background||"Origem não definida")}</p></div></div><div class="ficha-destaques">${C.estatistica({rotulo:"CA",valor:P.ca,id:"resumo-ca"})}${C.estatistica({rotulo:"Iniciativa",valor:fm(modA("des")+R.bonusSemProf(F())),id:"resumo-iniciativa",tipo:"iniciativa"})}${C.estatistica({rotulo:"Desloc.",valor:String(J.deslocamentoEfetivo(f,f.deslocamento ?? 9)).replace(".",",")+" m",id:"resumo-deslocamento",tipo:"deslocamento"})}</div></header>
      <div class="panel vida-ficha"><div id="bloco-pv">${blocoPV()}</div><details class="vida-descanso"><summary>Dados de vida e descanso</summary><div id="bloco-dv">${blocoDV()}</div>
        <div class="row" style="margin:8px 0 0"><button type="button" class="small" id="b-curto">Registrar Descanso Curto</button><button type="button" class="small" id="b-longo">Descanso Longo</button><span class="muted">Recupera todos os PV, os espaços de magia e metade dos dados de vida.</span></div></details><div id="bloco-efeitos">${blocoEfeitos()}</div></div>
<nav class="ficha-abas" aria-label="Seções da ficha" role="tablist"><button type="button" role="tab" id="aba-principal" aria-controls="secao-principal" data-ficha-aba="principal">Principal</button><button type="button" role="tab" id="aba-combate" aria-controls="secao-combate" data-ficha-aba="combate">Combate</button><button type="button" role="tab" id="aba-magias" aria-controls="secao-magias" data-ficha-aba="magias">Magias</button><button type="button" role="tab" id="aba-inventario" aria-controls="secao-inventario" data-ficha-aba="inventario">Inventário</button><button type="button" role="tab" id="aba-personagem" aria-controls="secao-personagem" data-ficha-aba="personagem">Personagem</button><button type="button" role="tab" id="aba-notas" aria-controls="secao-notas" data-ficha-aba="notas">Notas</button></nav><section id="secao-principal" role="tabpanel" aria-labelledby="aba-principal" data-ficha-secao="principal" class="ficha-conteudo" tabindex="0">      <div class="panel atributos-ficha"><h2 class="panel-title">Atributos</h2>${blocoAtr()}<details class="mod-temp-ficha"><summary>Modificadores temporários</summary><p class="muted">Poções, magias e itens que alteram um atributo por um tempo. São ajustes de jogo: <b>não mudam o atributo permanente</b> (isso é no Editar personagem ou ao subir de nível).</p><div class="grade2">${ATR.map(([k,r])=>`<label class="mod-temp-campo">${esc(R.ATR_NOME[k])}<input class="num" type="number" min="-20" max="20" step="1" data-modtemp="${k}" value="${num(F().modTemp?.[k],0)}" aria-label="Modificador temporário de ${esc(R.ATR_NOME[k])}"></label>`).join("")}</div><p class="muted">Bônus temporários por categoria (valem só para o que descrevem; o valor do atributo é o único que muda a capacidade de preparar magias):</p><div class="grade2">${R.CATEGORIAS_TEMP.map(([k,n])=>`<label class="mod-temp-campo">${esc(n)}<input class="num" type="number" min="-20" max="20" step="1" data-bonustemp="${k}" value="${R.bonusTemp(F(),k)}" aria-label="Bônus temporário: ${esc(n)}"></label>`).join("")}</div><div class="row" style="margin:8px 0 0"><button type="button" class="small" id="zerar-modtemp">Zerar modificadores temporários</button></div></details></div>
      <div class="panel"><h2 class="panel-title">Testes de resistência</h2><div id="bloco-sal">${blocoSal()}</div></div>
      <details class="panel pericias-ficha" open><summary class="panel-title">Perícias <span class="muted">Expandir / recolher</span></summary><div id="bloco-per">${blocoPer()}</div></details>
      <div class="panel inspiracao-ficha"><label class="inline"><input type="checkbox" id="inspiracao" ${f.inspiracao?"checked":""}> Inspiração</label><span class="muted">Concedida pelo mestre · marque quando disponível.</span></div><details class="panel proficiencias-ficha"><summary class="panel-title">Proficiências e idiomas</summary><div id="bloco-prof">${blocoProf()}</div>
        <div class="sub">Idiomas</div><div id="idiomas" class="anexos">${IDI().map((x) => `<span class="chip" title="Definido na construção do personagem">${esc(x)}</span>`).join("")}${IDX().map((x, i) => `<span class="chip">${esc(x)}<button type="button" class="chip-x" data-rm-idi="${i}" aria-label="Tirar">${window.ico ? window.ico("x") : "x"}</button></span>`).join("")}${IDI().length || IDX().length ? "" : '<span class="muted">Nenhum ainda.</span>'}</div>
        <div class="row" style="margin:8px 0 0"><select id="idi-sel" style="flex:1 1 160px">${opt("", "Adicionar idioma…", true)}${R.IDIOMAS.filter((x) => !IDI().includes(x) && !IDX().includes(x)).map((x) => opt(x, x)).join("")}</select><input id="idi-txt" style="flex:1 1 160px" maxlength="40" placeholder="Outro idioma"><button type="button" class="small" id="add-idi">Adicionar</button></div>
        <div class="sub">Outras proficiências (ferramentas, veículos, jogos…)</div>${f.outrasProf?`<p class="muted">Da construção do personagem: <b style="color:var(--text)">${esc(f.outrasProf)}</b></p>`:""}<label class="muted" for="outras-extra">Registradas no jogo</label><textarea id="outras-extra" data-f="outrasProfExtras" rows="2" style="width:100%">${esc(f.outrasProfExtras || "")}</textarea></details>
      </section><section id="secao-combate" role="tabpanel" aria-labelledby="aba-combate" data-ficha-secao="combate" class="ficha-conteudo" tabindex="0">      <div class="panel"><h2 class="panel-title">Classe de armadura</h2><div id="bloco-ca">${blocoCA()}</div>
        <div class="row" style="margin:8px 0 0"><div style="flex:1 1 200px"><label>Armadura</label><select id="eq-arm">${opt("", "Nenhuma", !EQ().armadura)}${R.ARMADURAS.map((a) => opt(a[0], `${a[1]} (${a[2]}, CA ${a[3]})`, EQ().armadura === a[0])).join("")}</select></div>
          <label class="inline" style="margin:18px 0 0"><input type="checkbox" style="width:auto;height:auto" id="eq-esc" ${EQ().escudo ? "checked" : ""}> Escudo (+2)</label>
          <div><label>Outros bônus</label><input class="num" type="number" id="eq-bonus" value="${num(EQ().bonus, 0)}" title="Armadura +1, anel de proteção, etc."></div>
          <label class="inline" style="margin:18px 0 0"><input type="checkbox" style="width:auto;height:auto" data-auto="caAuto" ${autoOn("caAuto") ? "checked" : ""}> CA automática</label></div>
        <div class="muted" id="aviso-arm"></div></div>
<div class="panel"><h2 class="panel-title">Ataques</h2><div id="lista-atq">${listaAtq()}</div>
        <div class="row" style="margin:8px 0 0"><select id="atq-arma" style="flex:1 1 180px">${opt("", "Adicionar arma comum…", true)}${R.ARMAS.map((a, i) => opt(i, `${a[0]} (${a[1]} ${a[2]})`)).join("")}</select><button type="button" class="small" id="add-atq-arma">Adicionar arma</button><button type="button" class="small" id="add-atq">Personalizado</button></div></div>
      <div id="estado-jogo">${JU.html(P,esc)}</div><details class="panel recursos-combate"><summary class="panel-title">Recursos e habilidades</summary><div id="recursos-combate">${recursosCombate()}</div><p class="muted">Condições da ficha ficam no Estado de jogo; combatentes da iniciativa mantêm seu próprio estado.</p></details>
      </section><section id="secao-magias" role="tabpanel" aria-labelledby="aba-magias" data-ficha-secao="magias" class="ficha-conteudo" tabindex="0">${mostraMag ? `<div class="panel" id="painel-mag"><h2 class="panel-title">Magias</h2><div id="bloco-slots">${blocoSlots()}</div>
<h3 class="sub">Repertório</h3><div id="lista-mag">${listaMagias()}</div>
        ${wizard() ? '<div class="sub">Grimório</div><button type="button" class="small" id="cp-abrir">Copiar magia para o grimório</button><div id="copia-box" class="panel" hidden></div>' : ""}
        ${souMestre ? '<div class="sub">Mestre</div><button type="button" class="small" id="ms-abrir">Conceder magia ao personagem</button><div id="mestre-box" class="panel" hidden></div>' : ""}</div>` : `<div class="panel"><h2 class="panel-title">Magias</h2><span class="muted">Sem espaços de magia. Magias de raça, talento ou item aparecem aqui quando o personagem as tiver.</span></div>`}
      </section><section id="secao-inventario" role="tabpanel" aria-labelledby="aba-inventario" data-ficha-secao="inventario" class="ficha-conteudo" tabindex="0"><div class="panel"><h2 class="panel-title">Inventário e equipamento</h2>
        ${cabecalhoInv()}<div class="inv-add panel" id="inv-add" hidden><div class="inv-add-cab"><h3 class="sub inv-tit">Adicionar ao inventário</h3><button type="button" class="small subtle" id="inv-add-fechar">Cancelar</button></div>
          <div class="inv-add-linha inv-add-origem"><label for="add-origem">Origem (opcional)</label><span class="inv-origem-campo"><input id="add-origem" maxlength="120" placeholder="Ex.: Recompensa da missão em Julkoun" autocomplete="off">${seletorModelos()}</span></div>
          <div class="inv-add-tipos" role="group" aria-label="Tipo de item a adicionar"><button type="button" class="small" data-inv-add-tipo="cat" aria-pressed="false">Catálogo de itens</button><button type="button" class="small" data-inv-add-tipo="perg" aria-pressed="false">Pergaminho de magia</button><button type="button" class="small" data-inv-add-tipo="livre" aria-pressed="false">Outro item (em branco)</button></div>
          <div class="inv-add-linha" data-add-linha="cat" hidden><label for="ci-q">Buscar no catálogo (armas, armaduras, equipamento, poções, itens mágicos, pacotes…)</label><div class="row"><input id="ci-q" type="search" placeholder="Nome do item…" autocomplete="off" style="flex:1 1 180px"><select id="ci-cat" aria-label="Categoria" style="flex:0 1 200px"><option value="">Todas as categorias</option>${(CAT() ? CAT().CATEGORIAS : []).map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join("")}</select></div><div id="ci-res" class="inv-cat-res"></div></div>
          <div class="inv-add-linha" data-add-linha="perg" hidden><label for="pg-mag">Pergaminho de magia</label><div class="row"><select id="pg-mag" style="flex:1 1 200px" aria-label="Magia do pergaminho">${opt("", "Escolher a magia…", true)}</select><input id="pg-nota" style="flex:1 1 140px" maxlength="80" placeholder="Onde foi encontrado (opcional)"><button type="button" class="small" id="pg-add">Adicionar pergaminho</button></div></div>
          <div class="inv-add-linha" data-add-linha="livre" hidden><label>Outro item (personalizado)</label><div class="row"><button type="button" class="small" id="add-item">Adicionar item em branco</button><span class="muted">Cria uma linha vazia na lista acima para você preencher nome, quantidade e peso.</span></div></div>
        </div><div id="inv" class="${vistaInv === "grade" ? "inv-grade" : ""}">${listaInvHTML()}</div>
        <div id="bloco-carga">${blocoCarga()}</div>
        <div id="uso-box" class="panel" hidden></div><div id="ef-box" class="panel" hidden></div>
<h3 class="sub inv-tit">Dinheiro</h3>
        <div class="moedas">${MOEDAS.map(([k, r]) => `<div class="moeda-controle"><label>${r}</label><input class="num" type="number" min="0" step="1" data-din="${k}" value="${moeda(DIN()[k])}"><div class="inline"><button type="button" data-moeda="${k}" data-sinal="-1" aria-label="Diminuir ${r}">−</button><input class="num" type="number" min="1" step="1" id="ajuste-${k}" placeholder="1" aria-label="Quantidade de ${r}"><button type="button" data-moeda="${k}" data-sinal="1" aria-label="Somar ${r}">+</button></div></div>`).join("")}<div><label>Total em PO</label><div style="height:39px;display:flex;align-items:center;font-weight:800;color:var(--gold)" id="total-po">${totalPO().toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div></div>
        <details class="historico-inv"><summary>Histórico de movimentações</summary><div id="inv-hist">${histInv()}</div></details>
      </div>
      </section><section id="secao-personagem" role="tabpanel" aria-labelledby="aba-personagem" data-ficha-secao="personagem" class="ficha-conteudo" tabindex="0"><div class="panel ficha-construcao"><h2 class="panel-title">Construção do personagem</h2><p class="muted">Raça, origem, classes, subclasses, atributos, perícias, talentos e melhorias de atributo se escolhem nos fluxos guiados. Aqui na ficha ficam só as ações de jogo.</p><div class="row"><a class="btnlike" href="criar-personagem.html?id=${encodeURIComponent(id)}&modo=editar">Editar personagem</a><a class="btnlike" href="criar-personagem.html?id=${encodeURIComponent(id)}&modo=nivel">Subir de nível</a></div></div><div class="panel"><h2 class="panel-title">Traços raciais</h2>${R.tracosDaFicha(f).map(t=>'<details class="item" open><summary>'+esc(t.nome)+'</summary><p class="muted">'+esc(t.origem)+'</p><p class="descricao-regra">'+esc(t.desc)+'</p></details>').join("")||'<p class="muted">Esta raça não concede traços adicionais.</p>'}</div>
      ${f.backgroundCaracteristica?'<div class="panel"><h2 class="panel-title">Origem · '+esc(f.background||"")+'</h2><h3>'+esc(f.backgroundCaracteristica.nome)+'</h3><p class="descricao-regra">'+esc(f.backgroundCaracteristica.desc)+'</p></div>':""}
      <div class="panel"><h2 class="panel-title">Características de classe e outras habilidades</h2>
        <div id="lista-car">${CAR().length ? CAR().map(itemCar).join("") : '<span class="muted">Nenhuma habilidade ainda.</span>'}</div>
        <details class="item" style="margin-top:8px"><summary>Registrar uma habilidade própria ou ganha no jogo</summary><div>
          <input id="car-nome" maxlength="80" placeholder="Nome" style="margin-bottom:6px"><textarea id="car-desc" rows="4" placeholder="O que ela faz" style="width:100%"></textarea>
          <div class="row" style="margin:6px 0 0"><button type="button" class="small primary" id="add-car">Adicionar</button></div></div></details>
      </div>
      </section><section id="secao-notas" role="tabpanel" aria-labelledby="aba-notas" data-ficha-secao="notas" class="ficha-conteudo" tabindex="0"><div class="panel"><h2 class="panel-title">Diário de aventuras</h2><p class="muted">História, objetivos, personalidade, aparência e aliados. Suas anotações permanecem reunidas neste diário.</p><textarea data-f="notas" rows="12" style="width:100%" placeholder="Anotações do personagem">${esc(f.notas || "")}</textarea></div></section>`;
    window.atualizarAbasFicha?.();
    document.querySelector("#ficha").classList?.toggle("editando-ficha",editandoFicha);
    /* ações do topo (Ficha completa / Editar): ficam fora do #ficha, então são atualizadas aqui */
    const topo = document.querySelector(".ficha-topo-acoes"), be = $("#editar-ficha"), fc = $("#ficha-completa");
    if (topo) { topo.hidden = false; document.querySelector(".esq-topo")?.remove?.(); }
    if (be) be.textContent = editandoFicha ? "Concluir Edição" : "Editar Personagem";
    const ui = $("#usar-iniciativa"), ex = $("#excluir-personagem");
    if (ui) { ui.href = "iniciativa.html?aba=iniciativa&campanha=" + encodeURIComponent(P.campanha_id) + "&personagem=" + encodeURIComponent(id); ui.hidden = !!emPainel; }
    if (ex) ex.hidden = !!emPainel;
    if($("#ficha-mais"))$("#ficha-mais").hidden=!!emPainel;
    if (fc && emPainel) { fc.href = "personagem.html?id=" + encodeURIComponent(id); fc.hidden = false; }
    document.title = P.nome + " — Compêndio 5e"; profTxt(); avisoArm();
    document.querySelectorAll(".atributos-ficha input,.atributos-ficha select").forEach(el=>{el.disabled=!editandoFicha;});
  }

  function profTxt() { const e = $("#prof-txt"); if (e) e.textContent = `Bônus de proficiência ${fm(bonusProf())} · Iniciativa ${fm(modA("des")+R.bonusSemProf(F()))}`; }
  function avisoArm() {
    const e = $("#aviso-arm"); if (!e) return; const arm = R.ARMADURAS.find((a) => a[0] === EQ().armadura), t = [];
    if (arm && arm[4] && num(A()["for"], 10) < arm[4]) t.push(`Exige Força ${arm[4]}: deslocamento reduzido em 3 m.`);
    if (arm && arm[5]) t.push("Desvantagem em Furtividade.");
    const c0 = CLS()[0] && R.classe(CLS()[0].c);
    if (arm && c0 && ((arm[2] === "pesada" && !/Todas/.test(c0.arm)) || (arm[2] === "media" && !/(médias|Todas)/.test(c0.arm)) || (arm[2] === "leve" && /Nenhuma/.test(c0.arm)))) t.push("Sua classe não tem proficiência com esta armadura.");
    e.textContent = t.join(" ");
  }
  function atualizarPV() {
    $("#bloco-pv .big").innerHTML = `${P.pv_atual}<span class="muted" style="font-size:18px"> / ${J.pvMaxEf(P)}</span>`;
    $("#pv-temp-txt").innerHTML = P.pv_temp ? `+${P.pv_temp} PV temporários` : "PV temporários: 0";
    const trilho = $("#bloco-pv .hp-track"); trilho?.setAttribute("aria-valuemax", J.pvMaxEf(P)); trilho?.setAttribute("aria-valuenow", P.pv_atual);
    const b = $("#pv-barra"); b.style.width = pctPV() + "%"; b.className = "hp-fill " + (pctPV() <= 25 ? "low" : pctPV() <= 50 ? "mid" : "");
    const m = $('#bloco-pv [data-col="pv_max"]'); if (m && document.activeElement !== m) m.value = P.pv_max;
  }
  const atualizarCarga = () => { $("#bloco-carga").innerHTML = blocoCarga(); };
  /* recalcula tudo o que depende de atributos, classes, armadura */
  function refrescar() {
    if(P&&$("#estado-jogo"))$("#estado-jogo").innerHTML=JU.html(P,esc);
    if(P&&$("#resumo-deslocamento"))$("#resumo-deslocamento").textContent=J.deslocamentoEfetivo(F(),F().deslocamento??9)+" m";
    aplicarAuto(true); atualizarPV();
    ATR.forEach(([k])=>{const v=$("#atributo-"+k);if(v)v.innerHTML=R.atributoEf(F(),k)+(num(F().modTemp?.[k],0)?`<small class="atr-temp" title="Modificador temporário de jogo">${fm(num(F().modTemp[k],0))} temp.</small>`:"");const m=$("#mod-"+k);if(m)m.textContent=fm(modA(k));});
    $("#bloco-ca").innerHTML = blocoCA(); $("#bloco-sal").innerHTML = blocoSal(); $("#bloco-per").innerHTML = blocoPer(); $("#bloco-dv").innerHTML = blocoDV(); $("#bloco-prof").innerHTML = blocoProf();
    const lc=$("#lista-car");if(lc)lc.innerHTML=CAR().map(itemCar).join("");atualizarRecursos();
    const nt = $("#nivel-total"); if (nt) nt.textContent = nivelTotal() || "—";
    const bs = $("#bloco-slots"); if (bs) bs.innerHTML = blocoSlots();
    const be = $("#bloco-efeitos"); if (be) be.innerHTML = blocoEfeitos();
    { const ca = document.querySelector("[data-ataque-auto]"); if (ca) { const nv = cartaoDesarmado(); if (nv) ca.outerHTML = nv; else ca.remove(); } }
    ATQ().forEach((a, i) => { const e = $("#atk-res-" + i); if (e) e.innerHTML = `<b>${resAtq(a)}</b>`; });
    profTxt(); avisoArm(); atualizarCarga();
    if($("#resumo-pv"))$("#resumo-pv").textContent=P.pv_atual+" / "+P.pv_max;if($("#resumo-ca"))$("#resumo-ca").textContent=P.ca;
    if($("#resumo-iniciativa"))$("#resumo-iniciativa").textContent=fm(modA("des")+R.bonusSemProf(F()));
  }

  /* ---------- edições ---------- */
  function salvarJogo() {
    agendar({ficha:P.ficha,pv_atual:P.pv_atual,pv_temp:P.pv_temp});
    refrescar(); $('#estado-jogo').innerHTML=JU.html(P,esc);
    $('#bloco-dv').innerHTML=blocoDV(); const lm=$('#lista-mag');if(lm)lm.innerHTML=listaMagias();
    $('#resumo-deslocamento').textContent=J.deslocamentoEfetivo(F(),F().deslocamento??9)+' m';
  }
  function mudarPV(dano) {
    const n=Math.max(1,Math.floor(num($('#qtd').value,1)));
    if(dano){const r=J.dano(P,n,{tipo:$('#tipo-dano-jogo')?.value||undefined,critico:!!$('#critico-jogo')?.checked});
      if(r.concentracao)(F().testesConcentracao??=[]).push(r.concentracao.cd);
      if(!F().concentracao)F().testesConcentracao=[];
      aviso(r.mensagens.concat(r.concentracao?'Concentração: salvaguarda CD '+r.concentracao.cd:[]).join('. ')||'Dano aplicado.');
    }else{const r=J.cura(P,n);if(r.morto)aviso('O personagem está morto; cura não o revive.',true);}
    salvarJogo();
  }
  function usarDado(d,modo='app') {
    const rolou=modo==='marcar'?null:modo==='fisico'?Number($('[data-rolagem-fisica="'+d+'"]').value):1+Math.floor(Math.random()*d);
    try{const r=J.gastarDadoVida(P,d,rolou);salvarJogo();aviso(rolou===null?'Uso registrado, sem cura.':'Dado d'+d+': '+rolou+'; recuperou '+r.recuperado+' PV.');}catch(e){aviso(e.message,true);}
  }
  async function descansoLongo() {
    if(!(await perguntar('Concluir descanso longo (com comida e bebida)? Recupera PV, espaços e recursos, metade dos dados de vida e reduz exaustão em 1.', { titulo: "Descanso longo", ok: "Concluir" })))return;
    const r=J.descansoLongo(P);if(!r.ok){aviso(r.motivo,true);return;}salvarJogo();aviso('Descanso longo concluído.');
  }

  document.addEventListener("input", (e) => {
    const t = e.target; if (!P) return;
    if (t.dataset.col) {
      const col = t.dataset.col, v = col === "nome" ? t.value : Math.max(0, Math.floor(num(t.value, 0)));
      if (col === "nome" && !v.trim()) return;
      if (col === "pv_max") { F().pvAuto = false; const cb = $('[data-auto="pvAuto"]'); if (cb) cb.checked = false; }
      P[col] = v; if (col === "pv_max") P.pv_atual = Math.min(P.pv_atual, P.pv_max);
      atualizarPV(); agendar(col === "pv_max" ? { ficha: P.ficha, pv_max: P.pv_max, pv_atual: P.pv_atual } : { [col]: v }); return;
    }
    if (t.dataset.f) { const k = t.dataset.f; F()[k] = ["nivel", "deslocamento", "pvExtra"].includes(k) ? (t.value === "" ? (k === "pvExtra" ? 0 : null) : num(t.value, 0)) : t.value; if(k === "deslocamento" && $("#resumo-deslocamento")) $("#resumo-deslocamento").textContent=(F()[k] ?? 9)+" m"; if (k === "pvExtra") return refrescar(); agendar({ ficha: P.ficha }); return; }
    if (t.dataset.bonustemp) { const k = t.dataset.bonustemp, v = Math.max(-20, Math.min(20, Math.round(num(t.value, 0)))), f = F(); f.bonusTemp = { ...(f.bonusTemp || {}) }; if (v) f.bonusTemp[k] = v; else delete f.bonusTemp[k]; refrescar(); agendar({ ficha: P.ficha }); return; }
    if (t.dataset.modtemp) { const k = t.dataset.modtemp, v = Math.max(-20, Math.min(20, Math.round(num(t.value, 0)))); const f = F(); f.modTemp = { ...(f.modTemp || {}) }; if (v) f.modTemp[k] = v; else delete f.modTemp[k]; refrescar(); agendar({ ficha: P.ficha }); return; }
    if (t.dataset.atr) { const k = t.dataset.atr; A()[k] = num(t.value, 10); $("#mod-" + k).textContent = fm(mod(A()[k])); refrescar(); return; }
    if (t.dataset.inv) { const i = +t.closest("[data-i]").dataset.i, k = t.dataset.inv; { const it_ = INV()[i]; if (k === "nome") it_.nome = t.value; else if (k === "desc") it_.desc = t.value.slice(0, 1500); else if (k === "qtd") { /* aplicado ao confirmar (evento change), para não desfazer origens a cada tecla */ } else it_[k] = Math.max(0, num(t.value, 0)); } atualizarCarga(); atualizarCartao(t.closest(".item-inv"), INV()[i]); agendar({ inventario: P.inventario }); return; }
    if (t.dataset.din) { DIN()[t.dataset.din] = moeda(t.value); t.value = DIN()[t.dataset.din]; $("#total-po").textContent = totalPO().toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); agendar({ dinheiro: P.dinheiro }); return; }
    if (t.dataset.cls) { const i = +t.closest("[data-ci]").dataset.ci, k = t.dataset.cls; if(!CLS()[i])CLS()[i]={c:"",n:1,sub:""}; if (k === "n") CLS()[i].n = Math.max(1, Math.min(Math.max(1,20-R.nivelTotal(CLS().filter((_,j)=>j!==i))), Math.floor(num(t.value, 1)))); else if (k === "sub") { CLS()[i].sub = t.value; } else return; refrescar(); return; }
    if (t.dataset.atq && t.tagName === "INPUT" && t.type !== "checkbox") { const i = +t.closest("[data-ai]").dataset.ai, k = t.dataset.atq; ATQ()[i][k] = ["magico", "extra"].includes(k) ? num(t.value, 0) : t.value; const r = $("#atk-res-" + i); if (r) r.innerHTML = `<b>${resAtq(ATQ()[i])}</b>`; agendar({ ficha: P.ficha }); return; }
    if (t.id === "eq-bonus") { EQ().bonus = num(t.value, 0); refrescar(); return; }
    if (t.id === "raca-txt") { F().raca = t.value; F().racaCustom = true; agendar({ ficha: P.ficha }); return; }
    if (t.id === "cat-q") return buscarCatalogo(t.value);
    if (t.dataset.usoRol !== undefined && uso) { uso.rolagens[+t.dataset.usoRol] = t.value; uso.textoRolagem[+t.dataset.usoRol] = ""; atualizaUso(); return; }
    if (t.id === "uso-nome" && uso) { uso.nome = t.value; atualizaUso(); return; }
    if (t.id === "cp-arc") { cp.arc = t.value; atualizaCopia(); return; }
    if (t.id === "ms-modo") { $("#ms-uso").hidden = t.value !== "uso-limitado"; $("#ms-outra").hidden = t.value !== "outra"; return; }
    if (t.id === "ms-cat") { $("#ms-custom").hidden = !!t.value; return; }
  });

  document.addEventListener("change", (e) => {
    const t = e.target; if (!P) return;
    if (t.dataset.cls === "n") { desenhar(); return; }
    if (t.dataset.cls === "c") { const i = +t.closest("[data-ci]").dataset.ci; if(CLS().some((c,j)=>j!==i && c.c===t.value && t.value)){aviso("Esta classe já foi adicionada.",true);desenhar();return;} if(!CLS()[i])CLS()[i]={c:"",n:1,sub:""}; CLS()[i].c = t.value; CLS()[i].sub = ""; F().classesEditadas=true; if(i===0){F().perClasse=[];F().especializacoes=[];} refrescar(); desenhar(); return; }
    if (t.dataset.atq && (t.tagName === "SELECT" || t.type === "checkbox")) { const i = +t.closest("[data-ai]").dataset.ai, k = t.dataset.atq; ATQ()[i][k] = t.type === "checkbox" ? t.checked : t.value; const r = $("#atk-res-" + i); if (r) r.innerHTML = `<b>${resAtq(ATQ()[i])}</b>`; agendar({ ficha: P.ficha }); return; }

    if(t.dataset.atrRaca!==undefined){const f=F(), i=+t.dataset.atrRaca; f.atrRaca ||= []; f.atrRaca[i]=t.value; R.aplicarRaca(f,f.bonusRaca);refrescar();desenhar();return;}
    if (t.dataset.auto) { F()[t.dataset.auto] = t.checked; refrescar(); return; }
    /* escolher à mão na lista de armaduras/escudo continua valendo; só solta o vínculo com o item que estava vestido (o item segue no inventário) */
    const soltar = (campo) => { const u = EQ()[campo]; if (!u) return false; const it = INV().find((x) => x.uid === u); if (it) it.equipado = false; delete EQ()[campo]; return true; };
    if (t.id === "eq-arm") { EQ().armadura = t.value; if (soltar("armaduraUid")) { salvarInv(); redesenharInv(); } refrescar(); if (t.value) escolherNoInventario({ tipo: "armadura", chave: t.value }, `Armadura: ${(R.ARMADURAS.find((a) => a[0] === t.value) || [])[1] || ""}`); return; }
    if (t.id === "eq-esc") { EQ().escudo = t.checked; if (soltar("escudoUid")) { salvarInv(); redesenharInv(); } refrescar(); if (t.checked) escolherNoInventario({ tipo: "escudo" }, "Escudo"); return; }
    if (t.id === "raca-sel") {
      const v = t.value, f = F(), antes=f.bonusRaca; f.perRaca=[]; f.atrRaca=[];
      if (v === "__custom") { f.raca = ""; f.racaCustom = true; $("#raca-txt-box").hidden = false; $("#raca-txt").focus(); }
      else { f.raca = v; f.racaCustom = false; $("#raca-txt-box").hidden = true; const r = R.RACAS.find((x) => x[0] === v); if (r) { f.deslocamento = r[1]; const d = $('[data-f="deslocamento"]'); if (d) d.value = r[1]; } $("#info-raca").innerHTML = infoRaca(); }
      R.aplicarRaca(f,antes); refrescar(); desenhar(); agendar({ ficha: P.ficha }); return;
    }
    if (t.dataset.prep) { const magia=MAG()[+t.dataset.prep],limites=R.preparacao(F()).filter(x=>x.pertence(magia)),disponivel=limites.find(x=>x.usadas<x.limite);if(t.checked&&!magia.prep&&!disponivel){t.checked=false;aviso("Limite de magias preparadas atingido. Desmarque uma magia antes de preparar outra.",true);return;}if(disponivel)magia.classePreparacao=disponivel.id; magia.prep = t.checked; $("#lista-mag").innerHTML = listaMagias(); agendar({ ficha: P.ficha }); return; }
    if (t.dataset.invTipo !== undefined) { const it = itemPor(+t.closest("[data-i]").dataset.i); if (!it) return; it.tipo = t.value; salvarInv(); redesenharInv(); return; }
    if (t.dataset.invEquip !== undefined) { const it = itemPor(+t.closest("[data-i]").dataset.i); if (!it) return; if (equipavel(it)) { try { EF().alternar(P, (t.checked ? (membrosDe(it).find((m) => num(m.qtd, 0) >= 1) || it) : it).uid, t.checked); } catch (err) { t.checked = !t.checked; aviso(err.message, true); return; } $("#lista-atq") && ($("#lista-atq").innerHTML = listaAtq()); const sa = $("#eq-arm"), se = $("#eq-esc"); if (sa) sa.value = EQ().armadura || ""; if (se) se.checked = !!EQ().escudo; } else it.equipado = t.checked; salvarInv(); refrescar(); redesenharInv(); return; }
    if (t.dataset.invSint !== undefined) { const it = itemPor(+t.closest("[data-i]").dataset.i); if (!it) return; try { IV.sintonizar(cont(), it.uid, t.checked); } catch (e) { t.checked = !t.checked; aviso(e.message, true); return; } salvarInv(); refrescar(); redesenharInv(); return; }
    if (t.name === "uso-alvo" && uso) { uso.alvo = t.value; renderUso(); return; }
    if (t.dataset.usoDano !== undefined && uso) { uso.danos[+t.dataset.usoDano] = t.value; atualizaUso(); return; }
    if (t.id === "ef-tipo" && edEf) { edEf.tipo = t.value; const it = INV().find((x) => x.uid === edEf.uid); if (it) $("#ef-box").innerHTML = htmlEditorEfeitos(it); return; }
    if (t.id === "cp-mag") { cp.en = t.value; cp.uid = ""; $("#copia-box").innerHTML = htmlCopia(); atualizaCopia(); return; }
    if (t.name === "cp-fonte") { cp.fonte = t.value; $("#copia-box").innerHTML = htmlCopia(); atualizaCopia(); return; }
    if (t.id === "cp-perg") { cp.uid = t.value; atualizaCopia(); return; }
    if(t.id==="inspiracao"){F().inspiracao=t.checked;agendar({ficha:P.ficha});return;}
    if (t.id === "in-foto" && t.files[0]) { trocarFoto(t.files[0]); t.value = ""; }
  });

  /* na ficha embutida na iniciativa, a magia abre no painel de detalhes do rastreador (e "Voltar" retorna a esta ficha) */
  document.addEventListener("click", (e) => {
    const botao=e.target.closest('[data-consultar-magia]'),linha=botao?.closest('#lista-mag [data-mag-i]');if(!linha)return;
    const m=MAG()[Number(linha.dataset.magI)];if(!m)return;e.preventDefault();
    if(emPainel&&window.parent!==window)window.parent.postMessage({tipo:'ficha-magia',id,magia:m,en:m.en},location.origin);
    else window.LEITOR_FICHAS?.magia(m);
  }, true);
  document.addEventListener("click", async (e) => {
    const t = e.target, c = (s) => t.closest(s); if (!P) return;
    let b;
    if((b=c('[data-jogo]'))){try{if(JU.agir(P,b))salvarJogo();}catch(e){aviso(e.message,true);}return;}
    if((b=c('[data-rolar-atr],[data-rolar-sal],[data-rolar-per],[data-rolar-atq],[data-rolar-dano]'))){
      try {
        let expressao='1d20', bonus=0, nome='Teste';
        if(b.dataset.rolarAtr){nome=R.ATR_NOME[b.dataset.rolarAtr];bonus=modA(b.dataset.rolarAtr);}
        if(b.dataset.rolarSal){const k=b.dataset.rolarSal;nome="Salvaguarda de "+R.ATR_NOME[k];bonus=modA(k)+(salvaProf().includes(k)?bonusProf():0)+R.bonusTemp(F(),"salvaguardas");}
        if(b.dataset.rolarPer){const k=b.dataset.rolarPer;nome=R.PERICIAS.find(p=>p[0]===k)?.[1]||k;bonus=R.valorPericia(F(),k);}
        if(b.dataset.rolarAtq!==undefined || b.dataset.rolarDano!==undefined){
          const dano=b.dataset.rolarDano!==undefined,a=ataqueDe(dano?b.dataset.rolarDano:b.dataset.rolarAtq),v=R.valoresAtaque(F(),a);
          nome=(dano?'Dano: ':'Ataque: ')+(a.nome||'Personalizado');expressao=dano?a.dado:'1d20';bonus=dano?v.dano:v.ataque;
        }
        const r=window.ROLAGENS.rolar(expressao,bonus);
        $('#rolagem-ficha').textContent=nome+': '+r.total+' ('+r.dados.join(' + ')+(r.modificador?' '+fm(r.modificador):'')+')';
      }catch(e){aviso(e.message,true);}return;
    }

    if ((b=c("[data-moeda]"))) { const k=b.dataset.moeda, n=Math.max(1,moeda($("#ajuste-"+k).value||1)); DIN()[k]=moeda(moeda(DIN()[k])+(+b.dataset.sinal)*n); $('[data-din="'+k+'"]').value=DIN()[k]; $("#total-po").textContent=totalPO().toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});agendar({dinheiro:P.dinheiro});return; }
    if (c("#zerar-modtemp")) { F().modTemp = {}; F().bonusTemp = {}; document.querySelectorAll("[data-modtemp],[data-bonustemp]").forEach(e => { e.value = 0; }); refrescar(); agendar({ ficha: P.ficha }); return; }
    if (c("#b-dano")) return mudarPV(true);
    if (c("#b-cura")) return mudarPV(false);
    if (c("#b-foto")) return $("#in-foto").click();
    if (c("#b-longo")) return descansoLongo();
    if(c("#b-curto")){const r=J.descansoCurto(P);if(!r.ok){aviso(r.motivo,true);return;}salvarJogo();aviso("Descanso curto registrado; gaste dados de vida separadamente.");return;}
    if((b=c("[data-dv-manual]")))return usarDado(+b.dataset.dvManual,"fisico");
    if((b=c("[data-dv-marcar]")))return usarDado(+b.dataset.dvMarcar,"marcar");
    if ((b = c("[data-dv]"))) return usarDado(+b.dataset.dv);
    if ((b = c("[data-slot]"))) {
      const f = F(), d = +b.dataset.d;
      if(d>0){try{J.gastarEspaco(P,b.dataset.slot==="p"?"p":Number(b.dataset.slot)+1);}catch(e){aviso(e.message,true);return;}}
      else if (b.dataset.slot === "p") f.pactoUsado = Math.max(0, num(f.pactoUsado, 0) + d);
      else { f.slotsUsados = f.slotsUsados || []; const i = +b.dataset.slot; f.slotsUsados[i] = Math.max(0, num(f.slotsUsados[i], 0) + d); }
      $("#bloco-slots").innerHTML = blocoSlots(); agendar({ ficha: P.ficha }); return;
    }
    if (c("#add-cls")) { if(CLS().some(c=>!c.c)){aviso("Escolha a classe pendente antes de adicionar outra.",true);return;} if(nivelTotal()>=20){aviso("O limite é 20 níveis no total.",true);return;} CLS().push({ c: "", n: 1, sub: "" }); desenhar(); return; }
    if ((b = c("[data-rm-cls]"))) { CLS().splice(+b.dataset.rmCls, 1); F().classesEditadas=true; refrescar(); desenhar(); return; }
    if ((b = c("[data-per]"))) { const k=b.dataset.per, f=F(), fontes=R.fontesPericias(f); f.especializacoes=fontes.especializadas; const i=f.especializacoes.indexOf(k); if(i>=0)f.especializacoes.splice(i,1); else if(fontes.basicas.includes(k)&&f.especializacoes.length<R.limiteEspecializacao(CLS()))f.especializacoes.push(k); $("#bloco-per").innerHTML = blocoPer(); agendar({ ficha: P.ficha }); return; }
    if ((b = c("[data-rm-idi]"))) { IDX().splice(+b.dataset.rmIdi, 1); desenhar(); agendar({ ficha: P.ficha }); return; }
    if (c("#add-idi")) { const v = ($("#idi-txt").value.trim() || $("#idi-sel").value); if (v && !IDI().includes(v) && !IDX().includes(v)) { IDX().push(v); desenhar(); agendar({ ficha: P.ficha }); } return; }
    if(c("#editar-ficha")){location.href="criar-personagem.html?id="+encodeURIComponent(id)+"&modo=editar";return;}
    if(c("#excluir-personagem")){if(!(await perguntar("Excluir "+P.nome+" e sua ficha?", { titulo: "Excluir personagem", ok: "Excluir", perigo: true })))return;try{await nuvem.apagar("personagens?id=eq."+encodeURIComponent(id));location.href="campanha.html?id="+encodeURIComponent(P.campanha_id);}catch(e){aviso(e.message,true);}return;}
    if (c("#add-atq")) { ATQ().push({ nome: "Personalizado", atr: "for", dado: "1d6", tipo: "cortante", magico: 0, extra: 0, prof: true }); $("#lista-atq").innerHTML = listaAtq(); agendar({ ficha: P.ficha }); return; }
    if (c("#add-atq-arma")) { const v = $("#atq-arma").value; if (v === "") return; const a = R.ARMAS[+v]; ATQ().push({ nome: a[0], atr: a[3], dado: a[1], tipo: a[2], magico: 0, extra: 0, prof: true }); $("#lista-atq").innerHTML = listaAtq(); $("#atq-arma").value = ""; agendar({ ficha: P.ficha }); const idx = ATQ().length - 1; escolherNoInventario({ tipo: "arma", nome: a[0] }, a[0], (uid) => EF().vincularLinha(P, idx, uid)); return; }
    if ((b = c("[data-rm-atq]"))) { const [ret] = ATQ().splice(+b.dataset.rmAtq, 1); const itv = ret && ret.itemUid && INV().find((x) => x.uid === ret.itemUid); if (itv) { itv.equipado = false; agendar({ inventario: P.inventario }); redesenharInv(); } $("#lista-atq").innerHTML = listaAtq(); agendar({ ficha: P.ficha }); return; }
    if ((b = c("[data-rm-mag]"))) { const i = +b.dataset.rmMag, m = MAG()[i]; if (!m || m.fonte !== "mestre" || !souMestre) return; if (!(await perguntar(`Retirar a concessão de “${m.n}”?`, { titulo: "Retirar concessão", ok: "Retirar", perigo: true }))) return; F().magiasMestre = (F().magiasMestre || []).filter((x) => x.en !== m.en); MAG().splice(i, 1); $("#lista-mag").innerHTML = listaMagias(); agendar({ ficha: P.ficha }); return; }
    if ((b = c("[data-usar-concedida]"))) { const m = MAG()[+b.dataset.usarConcedida]; try { MJ.usarConcedida(F(), m); } catch (e) { aviso(e.message, true); return; } $("#lista-mag").innerHTML = listaMagias(); agendar({ ficha: P.ficha }); return; }
    if (c("#cp-abrir")) { abrirCopia(); return; }
    if (c("#cp-fechar")) { $("#copia-box").hidden = true; return; }
    if (c("#cp-ok")) { confirmarCopia(); return; }
    if (c("#ms-abrir")) { abrirMestre(); return; }
    if (c("#ms-fechar")) { $("#mestre-box").hidden = true; return; }
    if (c("#ms-ok")) { concederMagia(); return; }
    if (c("#add-item")) { INV().push(IV.novoItem({ nome: "", qtd: 1, peso: 0, origem: origemAdd({ tipo: "jogo" }) })); $("#inv").insertAdjacentHTML("beforeend", linhaInv(INV()[INV().length - 1], INV().length - 1)); $("#inv").lastElementChild.querySelector('input[data-inv="nome"]').focus(); agendar({ inventario: P.inventario }); fecharAdd(); return; }
    if ((b = c("[data-rm-item]"))) { const it = itemPor(+b.dataset.rmItem); if (!it) return; if (num(it.qtd, 0) >= 1) IV.retirar(cont(), it.uid, null, { tipo: "descarte" }); else INV().splice(+b.dataset.rmItem, 1); salvarInv(); redesenharInv(); return; }
    if ((b = c("[data-inv-nome-restaurar]"))) { const it = itemPor(+b.dataset.invNomeRestaurar); if (it && !soLeitura) { restaurarNomeCatalogo(it); aviso("Nome do catálogo restaurado."); } return; }
    if (c("#inv-vinculos")) { verificarVinculos(); return; }
    if (c("#inv-add-abrir")) { const p = $("#inv-add"); if (p && !p.hidden) fecharAdd(); else abrirAdd(); return; }
    if (c("#inv-add-fechar")) { fecharAdd(); return; }
    if ((b = c("[data-inv-add-tipo]"))) { escolherAdd(b.dataset.invAddTipo); return; }
    if ((b = c("[data-inv-editar-abrir]"))) { const card = b.closest(".item-inv"), p = card && card.querySelector(".inv-edit"), it = INV()[+b.dataset.invEditarAbrir]; if (p && it) { const abre = p.hidden; p.hidden = !abre; abre ? invAbertos.add(it.uid) : invAbertos.delete(it.uid); card.querySelector(".inv-mais")?.removeAttribute("open"); if (abre) p.querySelector('input[data-inv="nome"]')?.focus(); } return; }
    if ((b = c("[data-cat-add]"))) { const row = b.closest(".inv-cat-item"); adicionarDoCatalogo(b.dataset.catAdd, row && row.querySelector("input") ? row.querySelector("input").value : 1); return; }
    if ((b = c("[data-cat-det]"))) { detalhesCatalogoAdd(b.dataset.catDet); return; }
    if ((b = c("[data-inv-qtd-mais]"))) { ajustarQtd(+b.dataset.invQtdMais, 1); return; }
    if ((b = c("[data-inv-qtd-menos]"))) { ajustarQtd(+b.dataset.invQtdMenos, -1); return; }
    if ((b = c("[data-inv-detalhes]"))) { abrirDetalhes(+b.dataset.invDetalhes); return; }
    if ((b = c("[data-inv-descartar]"))) { b.closest("details")?.removeAttribute("open"); abrirDescartar(+b.dataset.invDescartar); return; }
    if ((b = c("[data-inv-excluir]"))) { b.closest("details")?.removeAttribute("open"); abrirExcluir(+b.dataset.invExcluir); return; }
    if ((b = c("[data-inv-img]"))) { const it = INV()[+b.dataset.invImg], im = it && II.obter(F(), it); if (im && window.VISUALIZADOR) window.VISUALIZADOR.abrir({ src: im.src, titulo: it.nome || "Item", origem: b }); else abrirImagemItem(+b.dataset.invImg); return; }
    if ((b = c("[data-inv-img-gerir]"))) { abrirImagemItem(+b.dataset.invImgGerir); return; }
    if ((b = c("[data-inv-vista]"))) { vistaInv = b.dataset.invVista === "grade" ? "grade" : "lista"; try { localStorage.setItem("dnd5e_inv_vista", vistaInv); } catch (_) { /* segue sem guardar */ } const inv = $("#inv"); if (inv) inv.classList.toggle("inv-grade", vistaInv === "grade"); document.querySelectorAll("[data-inv-vista]").forEach((x) => { const on = x.dataset.invVista === vistaInv; x.classList.toggle("ativo", on); x.setAttribute("aria-pressed", String(on)); }); return; }
    if ((b = c("[data-inv-usar]"))) { abrirUso(+b.dataset.invUsar); return; }
    if ((b = c("[data-inv-copiar]"))) { const it = itemPor(+b.dataset.invCopiar); if (!it || !it.magiaVinculada) return; cp.fonte = "pergaminho"; cp.en = it.magiaVinculada.en; cp.uid = it.uid; cp.arc = ""; const aba = document.querySelector('[data-ficha-aba="magias"]'); if (aba) aba.click(); abrirCopia(); return; }
    if (c("#uso-ok")) { confirmarUso(); return; }
    if (c("#uso-cancel")) { uso = null; $("#uso-box").hidden = true; return; }
    if ((b = c("[data-uso-rolar]"))) { const k = +b.dataset.usoRolar, it = INV().find((x) => x.uid === uso.uid), p = it && IE.plano(it).find((x) => x.i === k); if (!p) return; const r = IE.rolar(p.dados, window.crypto && crypto.getRandomValues ? () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296 : Math.random); uso.rolagens[k] = r.total; uso.textoRolagem[k] = "rolou " + r.rolls.join(" + ") + (r.bonus ? (r.bonus > 0 ? " + " : " - ") + Math.abs(r.bonus) : "") + " = " + r.total; renderUso(); return; }
    if ((b = c("[data-enc-efeito]"))) { try { IE.encerrarEfeito(P, b.dataset.encEfeito); } catch (e) { aviso(e.message, true); return; } agendar({ ficha: P.ficha }); refrescar(); return; }
    if (c("#pg-add")) { adicionarPergaminho(); return; }
    if ((b = c("[data-inv-editar]"))) { abrirEditor(+b.dataset.invEditar); return; }
    if (c("#ef-add")) { addEfeito(); return; }
    if (c("#ef-salvar-props")) { salvarProps(); return; }
    if (c("#ef-fechar")) { $("#ef-box").hidden = true; edEf = null; return; }
    if ((b = c("[data-ef-rm]"))) { const it = edEf && INV().find((x) => x.uid === edEf.uid); if (!it) return; it.propriedades.efeitos.splice(+b.dataset.efRm, 1); salvarInv(); redesenharInv(); $("#ef-box").innerHTML = htmlEditorEfeitos(it); return; }
    if ((b = c("[data-rm-car]"))) { const i = +b.dataset.rmCar; if(CAR()[i].auto)return; if (!(await perguntar(`Remover “${CAR()[i].nome}” da ficha?`, { titulo: "Remover característica", ok: "Remover", perigo: true }))) return; CAR().splice(i, 1); $("#lista-car").innerHTML = CAR().length ? CAR().map(itemCar).join("") : '<span class="muted">Nenhuma habilidade ainda.</span>';atualizarRecursos(); agendar({ ficha: P.ficha }); return; }
    if (c("#add-car")) { const nome = $("#car-nome").value.trim(); if (!nome) return; adicionarCar({ nome, desc: $("#car-desc").value }); $("#car-nome").value = ""; $("#car-desc").value = ""; return; }
    if ((b = c("[data-cat]"))) { const r = (catalogo || {}).achados[+b.dataset.cat]; if (r) { adicionarCar({ nome: r.titulo, desc: r.desc, cf: r.chave }); $("#cat-q").value = ""; $("#cat-res").innerHTML = ""; } return; }
  });


  function adicionarCar(c) {
    if (CAR().some((x) => x.nome === c.nome)) { aviso(`Você já tem “${c.nome}”.`, true); return; }
    aviso(""); CAR().push(c);
    $("#lista-car").innerHTML = CAR().map(itemCar).join("");atualizarRecursos();
    agendar({ ficha: P.ficha });
  }

  window.addEventListener('catalogo:atualizado',()=>{if(P)redesenharInv();});
  window.CATALOGO?.iniciar();
  /* ---------- foto ---------- */

  async function trocarFoto(file) {
    try { const foto=await window.recortarFoto(file);if(!foto)return; F().foto=foto;document.querySelector(".ficha-foto .av")?.replaceWith(Object.assign(document.createElement("div"),{innerHTML:fotoHTML()}).firstElementChild);agendar({ficha:P.ficha}); }
    catch(e){aviso("Não consegui usar a imagem: "+e.message,true);}
  }

  /* ---------- catálogos (dados do próprio site) ---------- */
  async function buscarCatalogo(q) {
    const box = $("#cat-res"); q = nz(q.trim());

    if (!catalogo) {
      if (window.ESQ) window.ESQ.mostrar(box, "linhas", "Carregando catálogo…", 3); else box.innerHTML = '<span class="muted">Carregando catálogo…</span>';
      try {
        const [a, b] = await Promise.all([fetch("dados/habilidades.json").then((r) => r.json()), fetch("dados/habilidades-pt.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({}))]);
        catalogo = { itens: a.filter((f) => f.e === "2014"), pt: b, achados: [] };
      } catch (_) { box.innerHTML = '<span class="err">Não consegui carregar o catálogo.</span>'; return; }
    }
    if(!document.contains(box))return;
    window.ESQ?.pronto(box);
    const ws = q.split(/\s+/);
    catalogo.achados = catalogo.itens.filter((f) => { const h = nz(`${f.n} ${f.p} ${CLASSES[f.u || f.c] || ""} ${f.u || f.c}`); return ws.every((w) => h.includes(w)); }).sort((a,b)=>(a.l?.[0]??99)-(b.l?.[0]??99)||(a.p||a.n).localeCompare(b.p||b.n,"pt-BR")).map((f) => {
      const chave = `${f.e}|${f.c}|${f.n}`;
      return { titulo: f.p || f.n, sub: `${CLASSES[f.u || f.c] || f.u || f.c}${f.u ? " (" + f.c + ")" : ""}${f.l && f.l.length ? " · nível " + f.l[0] : ""}`, chave, desc: String(catalogo.pt[chave] || f.d).replace(/\r/g, "").replace(/^\s*#{1,6}\s*(.+)$/gm, "$1").replace(/^\s*[*-]\s+/gm, "• ").replace(/[*_]+/g, "").replace(/\n{3,}/g, "\n\n").trim() };
    });
    box.innerHTML = catalogo.achados.length ? catalogo.achados.map((r, i) => `<div class="res" data-cat="${i}" style="cursor:pointer"><span><b>${esc(r.titulo)}</b> <span class="muted">· ${esc(r.sub)}</span></span><span class="small">Adicionar</span></div>`).join("") : '<span class="muted">Nada encontrado.</span>';
  }

  /* ---------- início ---------- */
  (async () => {
    try { await nuvem.retornoDoLink(); } catch (_) {}
    if (!nuvem.usuario()) { location.replace((window.nuvem && nuvem.entradaUrl ? nuvem.entradaUrl() : "entrar.html")); return; }
    if (!id) { location.replace("conta.html"); return; }
    const recarregar = () => location.reload(), cancelar = window.ESQ ? window.ESQ.vigiar($("#ficha"), recarregar, 20000, "A conexão está lenta e a ficha ainda não chegou.") : () => {};
    /* Visão do grupo (?grupo=<campanha>): quem não é dono nem mestre abre a ficha, mas só vê os dados básicos; o resto não é carregado nem desenhado. */
    const campGrupo = new URLSearchParams(location.search).get("grupo");
    if (campGrupo) {
      let visivel = true; try { visivel = !!(await nuvem.get(`personagens?select=id&id=eq.${encodeURIComponent(id)}`))[0]; } catch (_) {}
      if (!visivel) { await visaoGrupo(campGrupo, recarregar); cancelar(); return; }
    }
    try { P = await carregar(); await contexto(); migrar(); try {await carregarCatalogo();} catch (_) {aviso("Catálogo indisponível. Tente novamente quando houver conexão.",true);} aplicarAuto(true); desenhar(); cancelar(); window.ESQ?.pronto($("#ficha")); } catch (e) { cancelar(); document.querySelector(".esq-topo")?.remove?.(); if (window.ESQ) window.ESQ.erro($("#ficha"), e.message, recarregar); else aviso(e.message, true); return; }
    nuvem.observar(async () => {
      if (pend || salvando) return;
      if(exclusivoMestre && await nuvem.rpc('eh_mestre',{c:P.campanha_id}) !== true){$('#ficha').innerHTML='';aviso('Este painel é exclusivo do mestre da campanha.',true);return;}
      const a = document.activeElement; if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;
      const r = await carregar();
      if (r.versao > P.versao) { P = r; desenhar(); $("#estado").textContent = "Atualizado"; }
    }, 5000);
  })();
})();
