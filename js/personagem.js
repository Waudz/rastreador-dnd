/* Ficha do personagem (automática): raça, classes e multiclasse, vida e dados de vida, CA, salvaguardas, perícias,
   ataques, idiomas, magias e espaços, inventário com peso, dinheiro, habilidades e notas.
   O dono e o mestre da campanha podem editar; o banco de dados garante isso (regras de acesso). */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s), esc = nuvem.esc, R = window.REGRAS;
  const id = new URLSearchParams(location.search).get("id");
  let P = null, camp = null, souMestre = false, donoNome = "", pend = null, salvando = false, timer = null, catalogo = null, magiasCat = null, achadosM = [];
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
  const IDI = () => (F().idiomas = Array.isArray(F().idiomas) ? F().idiomas : []);
  const EQ = () => (F().equip = F().equip || { armadura: "", escudo: false, bonus: 0 });
  const PER = () => R.fontesPericias(F()).valores;
  const aviso = (t, erro) => { $("#erro").innerHTML = t ? (erro ? `<span class="err">${esc(t)}</span>` : esc(t)) : ""; };
  const autoOn = (k) => (F()[k] === undefined ? (k === "caAuto" ? !F().npc : !(F().origem || F().npc)) : !!F()[k]);



  function blocoMelhorias(){
    const disponiveis=R.melhoriasDisponiveis(CLS());
    return disponiveis.map(x=>'<div class="sub">'+esc(x.classe)+' · melhoria de atributos no nível '+x.n+'</div><p class="muted">Escolha dois +1 (podem ser no mesmo atributo, até 20), ou deixe vazio se escolheu um talento.</p><div class="row">'+[0,1].map(i=>`<select data-asi="${esc(x.id)}" data-i="${i}" aria-label="Melhoria ${esc(x.id)} escolha ${i+1}">${opt("","Talento / escolher depois",!F().melhorias?.[x.id]?.[i])}${R.ATR.map(k=>opt(k,R.ATR_NOME[k],F().melhorias?.[x.id]?.[i]===k)).join("")}</select>`).join("")+'</div>').join("");
  }
  const magiaRacial = () => /Tiefling|Elfo \(Alto\)|Elfo \(Drow\)|Fada|Firbolg|Genasi|Yuan-ti/.test(F().raca||"");
  function escolhasAtributosRaca() {
    const r=R.racial(F().raca);if(!r.atributos)return "";
    const escolhidos=F().atrRaca||[];
    return '<p class="muted">Escolha os atributos do bônus racial. Os demais valores e melhorias de nível são escolhas do jogador.</p><div class="row">'+Array.from({length:r.atributos},(_,i)=>`<select data-atr-raca="${i}" aria-label="Atributo racial ${i+1}">${opt("","Escolha um atributo…",!escolhidos[i])}${R.ATR.filter(k=>!(k in r.bonus)&&(!escolhidos.includes(k)||escolhidos[i]===k)).map(k=>opt(k,R.ATR_NOME[k],escolhidos[i]===k)).join("")}</select>`).join("")+'</div>';
  }
  async function carregarCatalogo() {
    if(catalogo)return;
    const [a,b]=await Promise.all([fetch("dados/habilidades.json").then(r=>{if(!r.ok)throw Error("Catálogo indisponível");return r.json();}),fetch("dados/habilidades-pt.json").then(r=>r.ok?r.json():{})]);
    catalogo={itens:a.filter(h=>h.e==="2014"),pt:b,achados:[]};
  }
  function sincronizarHabilidades() {
    const f=F(), manuais=CAR().filter(x=>!x.auto), raciais=R.racial(f.raca).tracos.map((desc,i)=>({nome:desc.split(":")[0],desc,auto:"raca",cf:"raca|"+f.raca+"|"+i}));
    const classes=catalogo?R.habilidadesAutomaticas(f,catalogo.itens,catalogo.pt):CAR().filter(x=>x.auto==="classe");
    const vistos=new Set(manuais.flatMap(x=>[x.cf,x.nome].filter(Boolean)));
    f.caracteristicas=manuais.concat([...raciais,...classes].filter(x=>{const k=x.cf||x.nome;if(vistos.has(k)||vistos.has(x.nome))return false;vistos.add(k);vistos.add(x.nome);return true;}));
  }
  document.addEventListener("focusin",e=>{if(!P)return;if(e.target.id==="cat-q")buscarCatalogo(e.target.value);if(e.target.id==="mag-q")buscarMagias();});

  /* ---------- salvar (agrupa as alterações por 0,6 s) ---------- */
  function agendar(campos) { pend = { ...(pend || {}), ...campos }; $("#estado").textContent = "Salvando…"; clearTimeout(timer); timer = setTimeout(enviar, 600); }
  async function enviar() {
    if (!pend || salvando) return;
    const corpo = JSON.parse(JSON.stringify(pend)); pend = null; salvando = true; let falhou = false;
    try {
      const r = await nuvem.patch(`personagens?id=eq.${encodeURIComponent(id)}`, corpo);
      if (!r || !r[0]) throw new Error("O personagem não foi atualizado. Confira se você ainda tem acesso.");
      P.versao = r[0].versao;
      $("#estado").textContent = "Salvo";
    } catch (e) { falhou = true; pend = { ...corpo, ...(pend || {}) }; $("#estado").innerHTML = `<span class="err">Não salvou: ${esc(e.message)}</span>`; }
    finally { salvando = false; if(pend && !falhou){clearTimeout(timer);timer=setTimeout(enviar,0);} }
  }
  window.addEventListener("beforeunload", () => { if (pend) enviar(); });

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
    souMestre = !!(m[0] && m[0].papel === "mestre");
    const d = pf.find((x) => x.id === P.dono_id); donoNome = d ? d.nome : "";
    $("#voltar").href = souMestre ? `campanha.html?id=${encodeURIComponent(P.campanha_id)}` : "conta.html";
    $("#voltar").textContent = souMestre ? camp.nome : "Voltar";
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
    // Não reaplica bônus raciais em fichas antigas: seus atributos já podem incluí-los.
    if (mudou) agendar({ ficha: P.ficha });
  }

  /* ---------- cálculos ---------- */
  const nivelTotal = () => R.nivelTotal(CLS());
  const bonusProf = () => R.prof(nivelTotal() || num(F().nivel, 1) || 1);
  const modA = (k) => mod(A()[k]);
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
    return { ca: base, desc };
  }
  function calcPV() {
    const cls = CLS().filter((c) => c.n > 0 && R.classe(c.c)); if (!cls.length) return null;
    const con = modA("con"), extra = num(F().pvExtra, 0) + (F().raca === "Anão (da Colina)" ? 1 : 0); let total = 0, primeiro = true;
    cls.forEach((c) => { const dv = R.classe(c.c).dv; for (let i = 1; i <= c.n; i++) { total += Math.max(1, (primeiro && i === 1 ? dv : Math.floor(dv / 2) + 1) + con + extra); } primeiro = false; });
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
  const pctPV = () => (P.pv_max > 0 ? Math.max(0, Math.min(100, (P.pv_atual / P.pv_max) * 100)) : 0);
  const pesoTotal = () => INV().reduce((s, i) => s + num(i.qtd, 0) * num(i.peso, 0), 0);
  const capacidade = () => num(A()["for"], 10) * 7;
  const totalPO = () => { const d = DIN(); return num(d.pc, 0) / 100 + num(d.pp, 0) / 10 + num(d.po, 0); };
  const opt = (v, t, sel) => `<option value="${esc(v)}"${sel ? " selected" : ""}>${esc(t)}</option>`;

  const blocoPV = () => `<div class="row" style="align-items:flex-end;gap:16px">
      <div><div class="big" id="pv-num">${P.pv_atual}<span class="muted" style="font-size:18px"> / ${P.pv_max}</span></div><div class="muted" id="pv-temp-txt">${P.pv_temp ? `+${P.pv_temp} PV temporários` : "&nbsp;"}</div></div>
      <div class="inline"><input class="num" id="qtd" type="number" min="1" value="1" aria-label="Quantidade"><button type="button" class="danger" id="b-dano">Dano</button><button type="button" id="b-cura">Cura</button></div>
    </div>
    <div class="hp-track" style="height:9px;margin:10px 0"><div class="hp-fill ${pctPV() <= 25 ? "low" : pctPV() <= 50 ? "mid" : ""}" id="pv-barra" style="width:${pctPV()}%"></div></div>
    <div class="row" style="margin:0"><div><label>PV máximo</label><input class="num" type="number" min="0" data-col="pv_max" value="${P.pv_max}"></div><div><label>PV temporário</label><input class="num" type="number" min="0" data-col="pv_temp" value="${P.pv_temp}"></div></div>
    <div class="row" style="margin:8px 0 0"><label class="inline" style="margin:0"><input type="checkbox" style="width:auto;height:auto" data-auto="pvAuto" ${autoOn("pvAuto") ? "checked" : ""}> PV máximo automático (dado de vida médio + Constituição)</label><div class="inline"><label style="margin:0">PV extra por nível</label><input class="num" type="number" step="1" data-f="pvExtra" value="${num(F().pvExtra, 0)}" title="Ex.: anão da colina +1, talento Robusto +2"></div></div>`;

  const linhaInv = (it, i) => `<div class="row" style="margin:0 0 6px" data-i="${i}"><input style="flex:1 1 160px" data-inv="nome" value="${esc(it.nome || "")}" placeholder="Item"><input class="num" type="number" min="0" step="1" data-inv="qtd" value="${num(it.qtd, 1)}" aria-label="Quantidade"><input class="num" type="number" min="0" step="0.1" data-inv="peso" value="${num(it.peso, 0)}" aria-label="Peso de cada unidade em kg"><button type="button" class="small subtle" data-rm-item="${i}" aria-label="Remover item">${window.ico ? window.ico("x") : "x"}</button></div>`;
  const cabInv = '<div class="row inv-h" style="margin:0 0 4px"><span style="flex:1 1 160px">Item</span><span class="num-h">Qtd.</span><span class="num-h">Peso cada (kg)</span><span style="width:34px"></span></div>';
  const blocoCarga = () => { const c = capacidade(), p = pesoTotal(), pc = Math.min(100, c > 0 ? (p / c) * 100 : 0); return `<div class="hp-top"><span>Carga total (qtd. × peso)</span><strong id="carga-txt" ${p > c ? 'class="err"' : ""}>${kg(p)} / ${kg(c)} kg</strong></div><div class="hp-track"><div class="hp-fill ${p > c ? "low" : pc > 66 ? "mid" : ""}" id="carga-barra" style="width:${pc}%"></div></div>`; };

  const blocoAtr = () => `<div class="attrs">${ATR.map(([k, r]) => `<div class="attr"><label>${r}</label><input type="number" min="1" max="30" data-atr="${k}" value="${num(A()[k], 10)}"><div class="mod" id="mod-${k}">${fm(mod(A()[k]))}</div></div>`).join("")}</div><div class="muted" style="margin-top:8px" id="prof-txt"></div>`;

  const itemCar = (c, i) => `<details class="item"><summary>${esc(c.nome)}</summary><div><div class="pre">${esc(c.desc || "")}</div><div class="row" style="margin:8px 0 0"><button type="button" class="small danger" data-rm-car="${i}" ${c.auto ? 'disabled title="Concedida automaticamente pela raça ou classe"' : ""}>${c.auto ? "Automática" : "Remover"}</button></div></div></details>`;

  const racaSel = () => { const r = F().raca || ""; return R.RACAS.some((x) => x[0] === r) ? r : (r || F().racaCustom ? "__custom" : ""); };
  const blocoClasses = () => {
    const l = CLS().length ? CLS() : [{c:"",n:1,sub:""}];
    return l.map((c, i) => { const d = R.classe(c.c); return `<div class="row" style="margin:0 0 6px" data-ci="${i}"><select data-cls="c" style="flex:1 1 150px" aria-label="Classe">${opt("", "Classe…", !c.c)}${R.CLASSES.filter(x=>x.id===c.c || !l.some(outro=>outro.c===x.id)).map((x) => opt(x.id, x.n, x.id === c.c)).join("")}</select><input class="num" type="number" min="1" max="${Math.max(1,20-R.nivelTotal(l.filter((_,j)=>j!==i)))}" data-cls="n" value="${c.n}" aria-label="Nível na classe" title="Nível nesta classe"><input style="flex:1 1 150px" list="subs-${i}" data-cls="sub" value="${esc(c.sub || "")}" maxlength="50" placeholder="Subclasse"><datalist id="subs-${i}">${(d ? d.subs : []).map((s) => `<option value="${esc(s)}">`).join("")}</datalist>${l.length > 1 || c.c ? `<button type="button" class="small subtle" data-rm-cls="${i}" aria-label="Remover classe">${window.ico ? window.ico("x") : "x"}</button>` : ""}</div>`; }).join("");
  };
  const infoRaca = () => { const r = R.RACAS.find((x) => x[0] === F().raca); return r ? `<div class="muted" style="margin-top:6px">${esc(r[0])}: deslocamento ${String(r[1]).replace(".", ",")} m · atributos ${esc(r[2])} · ${esc(r[3])}</div>` : ""; };

  /* salvaguardas e perícias */
  function blocoSal() {
    const pb = bonusProf(), ps = salvaProf();
    return `<div class="grade2">${ATR.map(([k, r]) => { const p = ps.includes(k), v = modA(k) + (p ? pb : 0); return `<div class="lin"><span class="pbol${p ? " on" : ""}"></span><b>${fm(v)}</b><span>${R.ATR_NOME[k]}</span></div>`; }).join("")}</div>`;
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
    h+='<div class="grade2">'+R.PERICIAS.map(([k,n,a])=>{
      const e=pr[k]||0,v=modA(a)+R.bonusPericia(f,k);
      return `<div class="lin"><span class="pbol${e?' on':''}${e===2?' dup':''}"></span><b>${fm(v)}</b><span>${n}</span>${lim&&e?`<button type="button" class="small" data-per="${k}" aria-pressed="${e===2}">${e===2?'Especializada':'Especializar'}</button>`:''}</div>`;
    }).join("")+'</div>';
    return h+`<p class="muted">Percepção passiva: <b>${10+modA("sab")+R.bonusPericia(f,"percepcao")}</b></p>`;
  }
  function blocoProf() {
    const c0 = CLS()[0] && R.classe(CLS()[0].c); if (!c0) return '<span class="muted">Escolha uma classe para ver as proficiências.</span>';
    return `<div class="muted">Armaduras: <b style="color:var(--text)">${esc(c0.arm)}</b></div><div class="muted">Armas: <b style="color:var(--text)">${esc(c0.armas)}</b></div>${c0.ferr ? `<div class="muted">Ferramentas: <b style="color:var(--text)">${esc(c0.ferr)}</b></div>` : ""}<div class="muted">Salvaguardas: <b style="color:var(--text)">${c0.salv.map((k) => R.ATR_NOME[k]).join(", ")}</b></div>`;
  }
  const blocoCA = () => { const { ca, desc } = calcCA(), on = autoOn("caAuto"); return `<div class="hp-top"><span>CA ${on ? "calculada" : "manual"}</span><strong class="ca-num">${on ? ca : P.ca}</strong></div><div class="muted ca-desc">${on ? esc(desc) : `A CA manual é ${P.ca}. A automática seria ${ca} (${esc(desc)}).`}</div>`; };

  /* dados de vida */
  function blocoDV() {
    const dv = dadosVida(), usados = F().dvUsados || {}, ks = Object.keys(dv).map(Number).sort((a, b) => b - a);
    if (!ks.length) return '<span class="muted">Escolha uma classe para ter dados de vida.</span>';
    return ks.map((d) => { const tot = dv[d], us = Math.min(tot, num(usados[d], 0)); return `<div class="res"><span><b>d${d}</b> <span class="muted">· restam ${tot - us} de ${tot}</span></span><button type="button" class="small" data-dv="${d}" ${tot - us <= 0 ? "disabled" : ""}>Usar (descanso curto)</button></div>`; }).join("");
  }

  /* ataques */
  function resAtq(a) {
    const pb = bonusProf(), at = a.atr === "acuidade" ? Math.max(modA("for"), modA("des")) : modA(a.atr || "for"), mg = num(a.magico, 0);
    const hit = at + (a.prof === false ? 0 : pb) + mg, dm = at + mg + num(a.extra, 0);
    return `Ataque ${fm(hit)} · Dano ${esc(a.dado || "—")}${dm ? fm(dm) : ""} ${esc(a.tipo || "")}`;
  }
  const linhaAtq = (a, i) => `<div class="panel2" data-ai="${i}"><div class="row" style="margin:0 0 6px"><input style="flex:1 1 160px" data-atq="nome" value="${esc(a.nome || "")}" placeholder="Nome do ataque" maxlength="60"><button type="button" class="small subtle" data-rm-atq="${i}" aria-label="Remover ataque">${window.ico ? window.ico("x") : "x"}</button></div>
      <div class="row" style="margin:0 0 6px"><div><label>Atributo</label><select data-atq="atr">${opt("for", "Força", (a.atr || "for") === "for")}${opt("des", "Destreza", a.atr === "des")}${opt("acuidade", "Acuidade (maior)", a.atr === "acuidade")}${opt("int", "Inteligência", a.atr === "int")}${opt("sab", "Sabedoria", a.atr === "sab")}${opt("car", "Carisma", a.atr === "car")}</select></div>
      <div><label>Dano</label><input class="num" data-atq="dado" value="${esc(a.dado || "1d6")}" maxlength="12"></div><div><label>Tipo de dano</label><select data-atq="tipo">${R.TIPOS_DANO.map((t) => opt(t, t, t === a.tipo)).join("")}</select></div>
      <div><label>Bônus mágico</label><input class="num" type="number" data-atq="magico" value="${num(a.magico, 0)}"></div><div><label>Dano extra</label><input class="num" type="number" data-atq="extra" value="${num(a.extra, 0)}" title="Somado ao dano (ex.: fúria, estilo de luta)"></div>
      <label class="inline" style="margin:14px 0 0"><input type="checkbox" style="width:auto;height:auto" data-atq="prof" ${a.prof === false ? "" : "checked"}> Proficiente</label></div>
      <div class="atk-res" id="atk-res-${i}"><b>${resAtq(a)}</b></div></div>`;

  /* magias */
  function blocoSlots() {
    const c = conj(), f = F(), us = f.slotsUsados || [], partes = [];
    if (c.slots.length) partes.push(c.slots.map((tot, i) => { const g = Math.min(tot, num(us[i], 0)); return `<div class="res"><span><b>${i + 1}º círculo</b> <span class="muted">· restam ${tot - g} de ${tot}</span></span><span class="inline"><button type="button" class="small" data-slot="${i}" data-d="1" ${tot - g <= 0 ? "disabled" : ""}>Gastar</button><button type="button" class="small" data-slot="${i}" data-d="-1" ${g <= 0 ? "disabled" : ""}>Recuperar</button></span></div>`; }).join(""));
    if (c.pact) { const g = Math.min(c.pact.qtd, num(f.pactoUsado, 0)); partes.push(`<div class="res"><span><b>Pacto</b> <span class="muted">· ${c.pact.qtd} espaço(s) de ${c.pact.nivel}º círculo · restam ${c.pact.qtd - g}</span></span><span class="inline"><button type="button" class="small" data-slot="p" data-d="1" ${c.pact.qtd - g <= 0 ? "disabled" : ""}>Gastar</button><button type="button" class="small" data-slot="p" data-d="-1" ${g <= 0 ? "disabled" : ""}>Recuperar</button></span></div>`); }
    const pb = bonusProf(), niv = (id) => (CLS().find((x) => x.c === id) || {}).n || 0;
    const info = c.habilidades.map((h) => { const m = modA(h.atr), prep = h.id === "Cleric" || h.id === "Druid" ? niv(h.id) + m : h.id === "Wizard" ? niv(h.id) + m : h.id === "Paladin" ? Math.floor(niv(h.id) / 2) + m : h.id === "Artificer" ? Math.floor(niv(h.id) / 2) + m : null; return `<div class="muted">${esc(h.classe)}: atributo ${R.ATR_NOME[h.atr]} · CD ${8 + pb + m} · ataque ${fm(pb + m)}${prep != null ? ` · preparar até ${Math.max(1, prep)} magias` : ""}</div>`; }).join("");
    return info + (partes.join("") || '<span class="muted">Sem espaços de magia para esta combinação de classes.</span>');
  }
  const linhaMag = (m, i) => `<details class="item"><summary>${esc(m.n)} <span class="muted" style="font-weight:400">· ${m.l === 0 ? "truque" : m.l + "º círculo"}</span>${m.prep ? ' <span class="badge">Preparada</span>' : ""}</summary><div>${m.cab ? `<div class="muted" style="margin-bottom:6px">${esc(m.cab)}</div>` : ""}<div class="pre">${esc(m.d || "")}</div><div class="row" style="margin:8px 0 0">${m.l > 0 ? `<label class="inline" style="margin:0"><input type="checkbox" style="width:auto;height:auto" data-prep="${i}" ${m.prep ? "checked" : ""}> Preparada</label>` : ""}<span class="grow"></span><button type="button" class="small danger" data-rm-mag="${i}">Remover</button></div></div></details>`;
  function listaMagias() {
    const l = MAG().map((m, i) => ({ m, i })).sort((a, b) => a.m.l - b.m.l || a.m.n.localeCompare(b.m.n));
    return l.length ? l.map((x) => linhaMag(x.m, x.i)).join("") : '<span class="muted">Nenhuma magia ainda.</span>';
  }

  const fotoHTML = () => { const f = F().foto; return f && /^data:image\//.test(f) ? `<img class="av" style="width:72px;height:72px;margin:0" src="${esc(f)}" alt="Foto">` : `<span class="av av0" style="width:72px;height:72px;font-size:30px;margin:0">${esc((P.nome || "?").charAt(0).toUpperCase())}</span>`; };

  function desenhar() {
    const f = F(), outro = souMestre && P.dono_id !== nuvem.usuario().id, rs = racaSel(), c = conj();
    const mostraMag = c.habilidades.length || MAG().length || f.magiaExtra || magiaRacial();
    $("#ficha").innerHTML = `
      <div class="panel">
        <div class="row" style="margin:0 0 8px;flex-wrap:nowrap;gap:12px"><span id="foto-box">${fotoHTML()}</span><div style="flex:1 1 auto;min-width:0">
          <input id="nome" data-col="nome" value="${esc(P.nome)}" maxlength="80" style="font-family:Georgia,serif;font-size:22px;height:46px;font-weight:700" aria-label="Nome">
          <div class="muted" style="margin-top:4px"><button type="button" class="small" id="b-foto">Trocar foto</button><input type="file" id="in-foto" accept="image/*" hidden> ${esc(camp.nome)}${donoNome ? " · responsável: " + esc(donoNome) : ""}${outro ? ' · <span class="badge">editando como mestre</span>' : ""}</div></div></div>
        <div class="row" style="margin:0">
          <div style="flex:1 1 200px"><label>Raça</label><select id="raca-sel">${opt("", "Escolha…", !rs)}${R.RACAS.map((r) => opt(r[0], r[0], rs === r[0])).join("")}${opt("__custom", "Outra (personalizada)…", rs === "__custom")}</select></div>
          <div style="flex:1 1 200px" id="raca-txt-box" ${rs === "__custom" ? "" : "hidden"}><label>Nome da raça personalizada</label><input id="raca-txt" value="${esc(R.RACAS.some((x) => x[0] === f.raca) ? "" : f.raca || "")}" maxlength="60" placeholder="Ex.: Fada, Sereia…"></div>
          <div><label>Deslocamento (m)</label><input class="num" type="number" min="0" step="1.5" data-f="deslocamento" value="${f.deslocamento != null ? f.deslocamento : 9}"></div>
          <div><label>Nível total</label><div style="height:39px;display:flex;align-items:center;font-weight:800;color:var(--gold)" id="nivel-total">${nivelTotal() || "—"}</div></div>
        </div>
        <div id="info-raca">${infoRaca()}${escolhasAtributosRaca()}</div>
        <div class="sub">Classes</div>
        <div id="classes">${blocoClasses()}</div>
        <div class="row" style="margin:0"><button type="button" class="small" id="add-cls">${CLS().length ? "Adicionar classe (multiclasse)" : "Escolher classe"}</button>${!CLS().length && f.classe ? `<span class="muted">Classe anterior: ${esc(f.classe)}</span>` : ""}</div>
      </div>
      <div class="panel"><h2 class="panel-title">Vida</h2><div id="bloco-pv">${blocoPV()}</div><div class="sub">Dados de vida</div><div id="bloco-dv">${blocoDV()}</div>
        <div class="row" style="margin:8px 0 0"><button type="button" class="small" id="b-longo">Descanso longo</button><span class="muted">Recupera todos os PV, os espaços de magia e metade dos dados de vida.</span></div></div>
      <div class="panel"><h2 class="panel-title">Classe de armadura</h2><div id="bloco-ca">${blocoCA()}</div>
        <div class="row" style="margin:8px 0 0"><div style="flex:1 1 200px"><label>Armadura</label><select id="eq-arm">${opt("", "Nenhuma", !EQ().armadura)}${R.ARMADURAS.map((a) => opt(a[0], `${a[1]} (${a[2]}, CA ${a[3]})`, EQ().armadura === a[0])).join("")}</select></div>
          <label class="inline" style="margin:18px 0 0"><input type="checkbox" style="width:auto;height:auto" id="eq-esc" ${EQ().escudo ? "checked" : ""}> Escudo (+2)</label>
          <div><label>Outros bônus</label><input class="num" type="number" id="eq-bonus" value="${num(EQ().bonus, 0)}" title="Armadura +1, anel de proteção, etc."></div>
          <label class="inline" style="margin:18px 0 0"><input type="checkbox" style="width:auto;height:auto" data-auto="caAuto" ${autoOn("caAuto") ? "checked" : ""}> CA automática</label></div>
        <div class="muted" id="aviso-arm"></div></div>
      <div class="panel"><h2 class="panel-title">Atributos</h2>${blocoAtr()}<div id="melhorias">${blocoMelhorias()}</div></div>
      <div class="panel"><h2 class="panel-title">Salvaguardas</h2><div id="bloco-sal">${blocoSal()}</div></div>
      <div class="panel"><h2 class="panel-title">Perícias</h2><div id="bloco-per">${blocoPer()}</div></div>
      <div class="panel"><h2 class="panel-title">Proficiências e idiomas</h2><div id="bloco-prof">${blocoProf()}</div>
        <div class="sub">Idiomas</div><div id="idiomas" class="anexos">${IDI().map((x, i) => `<span class="chip">${esc(x)}<button type="button" class="chip-x" data-rm-idi="${i}" aria-label="Tirar">${window.ico ? window.ico("x") : "x"}</button></span>`).join("") || '<span class="muted">Nenhum ainda.</span>'}</div>
        <div class="row" style="margin:8px 0 0"><select id="idi-sel" style="flex:1 1 160px">${opt("", "Adicionar idioma…", true)}${R.IDIOMAS.filter((x) => !IDI().includes(x)).map((x) => opt(x, x)).join("")}</select><input id="idi-txt" style="flex:1 1 160px" maxlength="40" placeholder="Outro idioma"><button type="button" class="small" id="add-idi">Adicionar</button></div>
        <div class="sub">Outras proficiências (ferramentas, veículos, jogos…)</div><textarea data-f="outrasProf" rows="2" style="width:100%">${esc(f.outrasProf || "")}</textarea></div>
      <div class="panel"><h2 class="panel-title">Ataques</h2><div id="lista-atq">${ATQ().map(linhaAtq).join("") || '<span class="muted">Nenhum ataque ainda.</span>'}</div>
        <div class="row" style="margin:8px 0 0"><select id="atq-arma" style="flex:1 1 180px">${opt("", "Adicionar arma comum…", true)}${R.ARMAS.map((a, i) => opt(i, `${a[0]} (${a[1]} ${a[2]})`)).join("")}</select><button type="button" class="small" id="add-atq-arma">Adicionar arma</button><button type="button" class="small" id="add-atq">Personalizado</button></div></div>
      ${mostraMag ? `<div class="panel" id="painel-mag"><h2 class="panel-title">Magias</h2><div id="bloco-slots">${blocoSlots()}</div>
        ${f.magiaExtra ? '<button type="button" class="small subtle" id="b-mag-fechar">Desativar fonte adicional</button>' : ""}<div class="sub">Magias conhecidas e preparadas</div><div id="lista-mag">${listaMagias()}</div>
        <div class="sub">Adicionar do catálogo (SRD)</div><div class="row" style="margin:0 0 6px"><input id="mag-q" style="flex:1 1 200px" placeholder="Buscar: bola de fogo, curar…" autocomplete="off"><label class="inline" style="margin:0"><input type="checkbox" id="mag-cls" style="width:auto;height:auto" ${c.habilidades.length ? "checked" : ""}> Só da minha classe</label></div><div id="mag-res" class="catalogo-lista"></div></div>` : `<div class="panel"><h2 class="panel-title">Magias</h2><span class="muted">Sem espaços de magia.</span><details><summary>Conjuração por raça, talento ou item</summary><p class="muted">Essas fontes podem conceder magias sem espaços de classe.</p><button type="button" class="small" id="b-mag-abrir">Habilitar magias de outra fonte</button></details></div>`}
      <div class="panel"><h2 class="panel-title">Inventário e equipamento</h2>
        ${cabInv}<div id="inv">${INV().map(linhaInv).join("")}</div>
        <div class="row"><button type="button" class="small" id="add-item">Adicionar item</button><select id="eq-pre" style="flex:1 1 180px">${opt("", "Adicionar equipamento comum…", true)}${presets().map((p, i) => opt(i, `${p[0]} (${p[1]} kg)`)).join("")}</select><button type="button" class="small" id="add-pre">Adicionar</button></div>
        <div id="bloco-carga">${blocoCarga()}</div>
        <div class="sub">Dinheiro</div>
        <div class="row" style="margin:0">${MOEDAS.map(([k, r]) => `<div><label>${r}</label><input class="num" type="number" min="0" step="1" data-din="${k}" value="${moeda(DIN()[k])}"><div class="inline"><button type="button" data-moeda="${k}" data-sinal="-1" aria-label="Diminuir ${r}">−</button><input class="num" type="number" min="1" step="1" id="ajuste-${k}" placeholder="1" aria-label="Quantidade de ${r}"><button type="button" data-moeda="${k}" data-sinal="1" aria-label="Somar ${r}">+</button></div></div>`).join("")}<div><label>Total em PO</label><div style="height:39px;display:flex;align-items:center;font-weight:800;color:var(--gold)" id="total-po">${totalPO().toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div></div>
      </div>
      <div class="panel"><h2 class="panel-title">Habilidades</h2>
        <div id="lista-car">${CAR().length ? CAR().map(itemCar).join("") : '<span class="muted">Nenhuma habilidade ainda.</span>'}</div>
        <div class="sub">Adicionar do catálogo (SRD)</div>
        <input id="cat-q" placeholder="Buscar: fúria, ataque furtivo, rage…" autocomplete="off"><div id="cat-res" class="catalogo-lista" style="margin-top:6px"></div>
        <details class="item" style="margin-top:8px"><summary>Criar uma habilidade própria</summary><div>
          <input id="car-nome" maxlength="80" placeholder="Nome" style="margin-bottom:6px"><textarea id="car-desc" rows="4" placeholder="O que ela faz" style="width:100%"></textarea>
          <div class="row" style="margin:6px 0 0"><button type="button" class="small primary" id="add-car">Adicionar</button></div></div></details>
      </div>
      <div class="panel"><h2 class="panel-title">Notas</h2><textarea data-f="notas" rows="6" style="width:100%" placeholder="Anotações do personagem">${esc(f.notas || "")}</textarea></div>`;
    document.title = P.nome + " — Rastreador D&D"; profTxt(); avisoArm();
  }
  const presets = () => R.ARMADURAS.map((a) => [a[1], a[6]]).concat([["Escudo", 3], ["Mochila", 2.5], ["Saco de dormir", 3.5], ["Corda de cânhamo (15 m)", 5], ["Tocha", 0.5], ["Ração (1 dia)", 1], ["Cantil", 2.5], ["Kit de curandeiro", 1.5], ["Poção de cura", 0.25], ["Ferramentas de ladrão", 0.5], ["Foco arcano", 0.5], ["Símbolo sagrado", 0.5], ["Grimório", 1.5]]);

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
    $("#bloco-pv .big").innerHTML = `${P.pv_atual}<span class="muted" style="font-size:18px"> / ${P.pv_max}</span>`;
    $("#pv-temp-txt").innerHTML = P.pv_temp ? `+${P.pv_temp} PV temporários` : "&nbsp;";
    const b = $("#pv-barra"); b.style.width = pctPV() + "%"; b.className = "hp-fill " + (pctPV() <= 25 ? "low" : pctPV() <= 50 ? "mid" : "");
    const m = $('#bloco-pv [data-col="pv_max"]'); if (m && document.activeElement !== m) m.value = P.pv_max;
  }
  const atualizarCarga = () => { $("#bloco-carga").innerHTML = blocoCarga(); };
  /* recalcula tudo o que depende de atributos, classes, armadura */
  function refrescar() {
    aplicarAuto(true); atualizarPV();
    ATR.forEach(([k])=>{const campo=document.querySelector('[data-atr="'+k+'"]');if(campo&&document.activeElement!==campo)campo.value=num(A()[k],10);const m=$("#mod-"+k);if(m)m.textContent=fm(modA(k));});
    $("#bloco-ca").innerHTML = blocoCA(); $("#bloco-sal").innerHTML = blocoSal(); $("#bloco-per").innerHTML = blocoPer(); $("#bloco-dv").innerHTML = blocoDV(); $("#bloco-prof").innerHTML = blocoProf();
    const bm=$("#melhorias");if(bm)bm.innerHTML=blocoMelhorias();
    const lc=$("#lista-car");if(lc)lc.innerHTML=CAR().map(itemCar).join("");
    const nt = $("#nivel-total"); if (nt) nt.textContent = nivelTotal() || "—";
    const bs = $("#bloco-slots"); if (bs) bs.innerHTML = blocoSlots();
    ATQ().forEach((a, i) => { const e = $("#atk-res-" + i); if (e) e.innerHTML = `<b>${resAtq(a)}</b>`; });
    profTxt(); avisoArm(); atualizarCarga();
  }

  /* ---------- edições ---------- */
  function mudarPV(dano) {
    const n = Math.max(1, Math.floor(num($("#qtd").value, 1)));
    if (dano) { const abs = Math.min(P.pv_temp || 0, n); P.pv_temp = (P.pv_temp || 0) - abs; P.pv_atual = Math.max(0, P.pv_atual - (n - abs)); }
    else P.pv_atual = Math.min(P.pv_max, P.pv_atual + n);
    atualizarPV(); const pv = $("#bloco-pv").querySelector('[data-col="pv_temp"]'); if (pv) pv.value = P.pv_temp;
    agendar({ pv_atual: P.pv_atual, pv_temp: P.pv_temp });
  }
  function usarDado(d) {
    const dv = dadosVida(), us = F().dvUsados = F().dvUsados || {};
    if (num(us[d], 0) >= (dv[d] || 0)) return;
    const rolou = 1 + Math.floor(Math.random() * d), ganho = Math.max(0, rolou + modA("con"));
    us[d] = num(us[d], 0) + 1; P.pv_atual = Math.min(P.pv_max, P.pv_atual + ganho);
    atualizarPV(); $("#bloco-dv").innerHTML = blocoDV(); agendar({ ficha: P.ficha, pv_atual: P.pv_atual });
    aviso(`d${d}: ${rolou}${modA("con") ? " " + fm(modA("con")) : ""} = ${ganho} PV recuperados.`);
  }
  function descansoLongo() {
    if (!confirm("Descanso longo: recupera todos os PV, os espaços de magia e metade dos dados de vida. Continuar?")) return;
    const f = F(), dv = dadosVida(), us = f.dvUsados = f.dvUsados || {};
    Object.keys(dv).forEach((d) => { us[d] = Math.max(0, num(us[d], 0) - Math.max(1, Math.floor(dv[d] / 2))); });
    f.slotsUsados = []; f.pactoUsado = 0; P.pv_atual = P.pv_max; P.pv_temp = 0;
    agendar({ ficha: P.ficha, pv_atual: P.pv_atual, pv_temp: 0 }); desenhar(); aviso("Descanso longo concluído.");
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
    if (t.dataset.f) { const k = t.dataset.f; F()[k] = ["nivel", "deslocamento", "pvExtra"].includes(k) ? (t.value === "" ? (k === "pvExtra" ? 0 : null) : num(t.value, 0)) : t.value; if (k === "pvExtra") return refrescar(); agendar({ ficha: P.ficha }); return; }
    if (t.dataset.atr) { const k = t.dataset.atr; A()[k] = num(t.value, 10); $("#mod-" + k).textContent = fm(mod(A()[k])); refrescar(); return; }
    if (t.dataset.inv) { const i = +t.closest("[data-i]").dataset.i, k = t.dataset.inv; INV()[i][k] = k === "nome" ? t.value : num(t.value, 0); atualizarCarga(); agendar({ inventario: P.inventario }); return; }
    if (t.dataset.din) { DIN()[t.dataset.din] = moeda(t.value); t.value = DIN()[t.dataset.din]; $("#total-po").textContent = totalPO().toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); agendar({ dinheiro: P.dinheiro }); return; }
    if (t.dataset.cls) { const i = +t.closest("[data-ci]").dataset.ci, k = t.dataset.cls; if(!CLS()[i])CLS()[i]={c:"",n:1,sub:""}; if (k === "n") CLS()[i].n = Math.max(1, Math.min(Math.max(1,20-R.nivelTotal(CLS().filter((_,j)=>j!==i))), Math.floor(num(t.value, 1)))); else if (k === "sub") { CLS()[i].sub = t.value; } else return; refrescar(); return; }
    if (t.dataset.atq && t.tagName === "INPUT" && t.type !== "checkbox") { const i = +t.closest("[data-ai]").dataset.ai, k = t.dataset.atq; ATQ()[i][k] = ["magico", "extra"].includes(k) ? num(t.value, 0) : t.value; const r = $("#atk-res-" + i); if (r) r.innerHTML = `<b>${resAtq(ATQ()[i])}</b>`; agendar({ ficha: P.ficha }); return; }
    if (t.id === "eq-bonus") { EQ().bonus = num(t.value, 0); refrescar(); return; }
    if (t.id === "raca-txt") { F().raca = t.value; F().racaCustom = true; agendar({ ficha: P.ficha }); return; }
    if (t.id === "cat-q") return buscarCatalogo(t.value);
    if (t.id === "mag-q") return buscarMagias();
  });

  document.addEventListener("change", (e) => {
    const t = e.target; if (!P) return;
    if (t.dataset.cls === "n") { desenhar(); return; }
    if (t.dataset.cls === "c") { const i = +t.closest("[data-ci]").dataset.ci; if(CLS().some((c,j)=>j!==i && c.c===t.value && t.value)){aviso("Esta classe já foi adicionada.",true);desenhar();return;} if(!CLS()[i])CLS()[i]={c:"",n:1,sub:""}; CLS()[i].c = t.value; CLS()[i].sub = ""; F().classesEditadas=true; if(i===0){F().perClasse=[];F().especializacoes=[];} refrescar(); desenhar(); return; }
    if (t.dataset.atq && (t.tagName === "SELECT" || t.type === "checkbox")) { const i = +t.closest("[data-ai]").dataset.ai, k = t.dataset.atq; ATQ()[i][k] = t.type === "checkbox" ? t.checked : t.value; const r = $("#atk-res-" + i); if (r) r.innerHTML = `<b>${resAtq(ATQ()[i])}</b>`; agendar({ ficha: P.ficha }); return; }

    if(t.dataset.asi){const f=F();f.melhorias ||= {};f.melhorias[t.dataset.asi] ||= [];f.melhorias[t.dataset.asi][+t.dataset.i]=t.value;refrescar();desenhar();return;}
    if(t.dataset.atrRaca!==undefined){const f=F(), i=+t.dataset.atrRaca; f.atrRaca ||= []; f.atrRaca[i]=t.value; R.aplicarRaca(f,f.bonusRaca);refrescar();desenhar();return;}
    if (t.dataset.auto) { F()[t.dataset.auto] = t.checked; refrescar(); return; }
    if (t.id === "eq-arm") { EQ().armadura = t.value; refrescar(); return; }
    if (t.id === "eq-esc") { EQ().escudo = t.checked; refrescar(); return; }
    if (t.id === "raca-sel") {
      const v = t.value, f = F(), antes=f.bonusRaca; f.perRaca=[]; f.atrRaca=[];
      if (v === "__custom") { f.raca = ""; f.racaCustom = true; $("#raca-txt-box").hidden = false; $("#raca-txt").focus(); }
      else { f.raca = v; f.racaCustom = false; $("#raca-txt-box").hidden = true; const r = R.RACAS.find((x) => x[0] === v); if (r) { f.deslocamento = r[1]; const d = $('[data-f="deslocamento"]'); if (d) d.value = r[1]; } $("#info-raca").innerHTML = infoRaca(); }
      R.aplicarRaca(f,antes); refrescar(); desenhar(); agendar({ ficha: P.ficha }); return;
    }
    if (t.dataset.prep) { MAG()[+t.dataset.prep].prep = t.checked; $("#lista-mag").innerHTML = listaMagias(); agendar({ ficha: P.ficha }); return; }
    if (t.id === "mag-cls") return buscarMagias();
    if (t.id === "in-foto" && t.files[0]) { trocarFoto(t.files[0]); t.value = ""; }
  });

  document.addEventListener("click", (e) => {
    const t = e.target, c = (s) => t.closest(s); if (!P) return;
    let b;

    if ((b=c("[data-moeda]"))) { const k=b.dataset.moeda, n=Math.max(1,moeda($("#ajuste-"+k).value||1)); DIN()[k]=moeda(moeda(DIN()[k])+(+b.dataset.sinal)*n); $('[data-din="'+k+'"]').value=DIN()[k]; $("#total-po").textContent=totalPO().toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});agendar({dinheiro:P.dinheiro});return; }
    if ((b=c("[data-escolha]"))) { const f=F(), k=b.dataset.k, tipo=b.dataset.escolha, fontes=R.fontesPericias(f), r=R.racial(f.raca), d=CLS()[0]&&R.classe(CLS()[0].c);
      const multi=tipo.startsWith("multi-") ? CLS()[+tipo.slice(6)] : null;
      const arr=multi ? (multi.per ||= []) : tipo==="classe" ? (f.perClasse=fontes.classePer) : (f.perRaca=fontes.raciais);
      const lim=multi?1:tipo==="classe"?(d?d.per[0]:0):r.escolhas, i=arr.indexOf(k);
      if(i>=0)arr.splice(i,1);else if(!fontes.basicas.includes(k)&&arr.length<lim)arr.push(k);
      $("#bloco-per").innerHTML=blocoPer();agendar({ficha:P.ficha});return;
    }
    if(c("#b-mag-fechar")) { if(MAG().length){aviso("Remova as magias adicionais antes de desativar essa fonte.",true);return;}F().magiaExtra=false;agendar({ficha:P.ficha});desenhar();return; }
    if (c("#b-dano")) return mudarPV(true);
    if (c("#b-cura")) return mudarPV(false);
    if (c("#b-foto")) return $("#in-foto").click();
    if (c("#b-longo")) return descansoLongo();
    if ((b = c("[data-dv]"))) return usarDado(+b.dataset.dv);
    if ((b = c("[data-slot]"))) {
      const f = F(), d = +b.dataset.d;
      if (b.dataset.slot === "p") f.pactoUsado = Math.max(0, num(f.pactoUsado, 0) + d);
      else { f.slotsUsados = f.slotsUsados || []; const i = +b.dataset.slot; f.slotsUsados[i] = Math.max(0, num(f.slotsUsados[i], 0) + d); }
      $("#bloco-slots").innerHTML = blocoSlots(); agendar({ ficha: P.ficha }); return;
    }
    if (c("#add-cls")) { if(CLS().some(c=>!c.c)){aviso("Escolha a classe pendente antes de adicionar outra.",true);return;} if(nivelTotal()>=20){aviso("O limite é 20 níveis no total.",true);return;} CLS().push({ c: "", n: 1, sub: "" }); desenhar(); return; }
    if ((b = c("[data-rm-cls]"))) { CLS().splice(+b.dataset.rmCls, 1); F().classesEditadas=true; refrescar(); desenhar(); return; }
    if ((b = c("[data-per]"))) { const k=b.dataset.per, f=F(), fontes=R.fontesPericias(f); f.especializacoes=fontes.especializadas; const i=f.especializacoes.indexOf(k); if(i>=0)f.especializacoes.splice(i,1); else if(fontes.basicas.includes(k)&&f.especializacoes.length<R.limiteEspecializacao(CLS()))f.especializacoes.push(k); $("#bloco-per").innerHTML = blocoPer(); agendar({ ficha: P.ficha }); return; }
    if ((b = c("[data-rm-idi]"))) { IDI().splice(+b.dataset.rmIdi, 1); desenhar(); agendar({ ficha: P.ficha }); return; }
    if (c("#add-idi")) { const v = ($("#idi-txt").value.trim() || $("#idi-sel").value); if (v && !IDI().includes(v)) { IDI().push(v); desenhar(); agendar({ ficha: P.ficha }); } return; }
    if (c("#add-atq")) { ATQ().push({ nome: "Personalizado", atr: "for", dado: "1d6", tipo: "cortante", magico: 0, extra: 0, prof: true }); $("#lista-atq").innerHTML = ATQ().map(linhaAtq).join(""); agendar({ ficha: P.ficha }); return; }
    if (c("#add-atq-arma")) { const v = $("#atq-arma").value; if (v === "") return; const a = R.ARMAS[+v]; ATQ().push({ nome: a[0], atr: a[3], dado: a[1], tipo: a[2], magico: 0, extra: 0, prof: true }); $("#lista-atq").innerHTML = ATQ().map(linhaAtq).join(""); $("#atq-arma").value = ""; agendar({ ficha: P.ficha }); return; }
    if ((b = c("[data-rm-atq]"))) { ATQ().splice(+b.dataset.rmAtq, 1); $("#lista-atq").innerHTML = ATQ().map(linhaAtq).join("") || '<span class="muted">Nenhum ataque ainda.</span>'; agendar({ ficha: P.ficha }); return; }
    if (c("#b-mag-abrir")) { abrirMagias(); return; }
    if ((b = c("[data-mag]"))) { const m = achadosM[+b.dataset.mag]; if (m && !MAG().some((x) => x.en === m.en)) { MAG().push({ n: m.n, en: m.en, l: m.l, cab: m.cab, d: m.d, prep: m.l === 0 }); $("#lista-mag").innerHTML = listaMagias(); agendar({ ficha: P.ficha }); } $("#mag-q").value = ""; $("#mag-res").innerHTML = ""; return; }
    if ((b = c("[data-rm-mag]"))) { const i = +b.dataset.rmMag; if (!confirm(`Remover “${MAG()[i].n}”?`)) return; MAG().splice(i, 1); $("#lista-mag").innerHTML = listaMagias(); agendar({ ficha: P.ficha }); return; }
    if (c("#add-item")) { INV().push({ nome: "", qtd: 1, peso: 0 }); $("#inv").insertAdjacentHTML("beforeend", linhaInv(INV()[INV().length - 1], INV().length - 1)); $("#inv").lastElementChild.querySelector("input").focus(); agendar({ inventario: P.inventario }); return; }
    if (c("#add-pre")) { const v = $("#eq-pre").value; if (v === "") return; const p = presets()[+v]; INV().push({ nome: p[0], qtd: 1, peso: p[1] }); $("#inv").innerHTML = INV().map(linhaInv).join(""); atualizarCarga(); agendar({ inventario: P.inventario }); return; }
    if ((b = c("[data-rm-item]"))) { INV().splice(+b.dataset.rmItem, 1); $("#inv").innerHTML = INV().map(linhaInv).join(""); atualizarCarga(); agendar({ inventario: P.inventario }); return; }
    if ((b = c("[data-rm-car]"))) { const i = +b.dataset.rmCar; if(CAR()[i].auto)return; if (!confirm(`Remover “${CAR()[i].nome}” da ficha?`)) return; CAR().splice(i, 1); $("#lista-car").innerHTML = CAR().length ? CAR().map(itemCar).join("") : '<span class="muted">Nenhuma habilidade ainda.</span>'; agendar({ ficha: P.ficha }); return; }
    if (c("#add-car")) { const nome = $("#car-nome").value.trim(); if (!nome) return; adicionarCar({ nome, desc: $("#car-desc").value }); $("#car-nome").value = ""; $("#car-desc").value = ""; return; }
    if ((b = c("[data-cat]"))) { const r = (catalogo || {}).achados[+b.dataset.cat]; if (r) { adicionarCar({ nome: r.titulo, desc: r.desc, cf: r.chave }); $("#cat-q").value = ""; $("#cat-res").innerHTML = ""; } return; }
  });

  /* botão "adicionar magias mesmo assim" para classes sem conjuração: cria o painel de magias */
  function abrirMagias() { F().magiaExtra = true; agendar({ficha:P.ficha}); desenhar(); buscarMagias(); }

  function adicionarCar(c) {
    if (CAR().some((x) => x.nome === c.nome)) { aviso(`Você já tem “${c.nome}”.`, true); return; }
    aviso(""); CAR().push(c);
    $("#lista-car").innerHTML = CAR().map(itemCar).join("");
    agendar({ ficha: P.ficha });
  }

  /* ---------- foto ---------- */

  async function trocarFoto(file) {
    try { const foto=await window.recortarFoto(file);if(!foto)return; F().foto=foto;$("#foto-box").innerHTML=fotoHTML();agendar({ficha:P.ficha}); }
    catch(e){aviso("Não consegui usar a imagem: "+e.message,true);}
  }

  /* ---------- catálogos (dados do próprio site) ---------- */
  async function buscarMagias() {
    const box = $("#mag-res"), q = nz($("#mag-q").value.trim());

    if (!magiasCat) {
      box.innerHTML = '<span class="muted">Carregando magias…</span>';
      try { magiasCat = await fetch("dados/magias.json").then((r) => r.json()); } catch (_) { box.innerHTML = '<span class="err">Não consegui carregar as magias.</span>'; return; }
    }
    if(!document.contains(box))return;
    const meus = CLS().map((c) => c.c), so = $("#mag-cls") && $("#mag-cls").checked && meus.length, ws = q.split(/\s+/);
    achadosM = magiasCat.filter((m) => ws.every((w) => nz(m.n + " " + m.en).includes(w)) && (!so || m.c.some((x) => meus.includes(x)))).sort((a,b)=>a.l-b.l||a.n.localeCompare(b.n,"pt-BR"));
    box.innerHTML = achadosM.length ? achadosM.map((m, i) => `<div class="res" data-mag="${i}" style="cursor:pointer"><span><b>${esc(m.n)}</b> <span class="muted">· ${m.l === 0 ? "truque" : m.l + "º círculo"} · ${esc(m.c.map((x) => CLASSES[x] || x).join(", "))}</span></span><span class="small">Adicionar</span></div>`).join("") : '<span class="muted">Nada encontrado.</span>';
  }
  async function buscarCatalogo(q) {
    const box = $("#cat-res"); q = nz(q.trim());

    if (!catalogo) {
      box.innerHTML = '<span class="muted">Carregando catálogo…</span>';
      try {
        const [a, b] = await Promise.all([fetch("dados/habilidades.json").then((r) => r.json()), fetch("dados/habilidades-pt.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({}))]);
        catalogo = { itens: a.filter((f) => f.e === "2014"), pt: b, achados: [] };
      } catch (_) { box.innerHTML = '<span class="err">Não consegui carregar o catálogo.</span>'; return; }
    }
    if(!document.contains(box))return;
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
    if (!nuvem.usuario() || !id) { location.replace("conta.html"); return; }
    try { P = await carregar(); await contexto(); migrar(); try {await carregarCatalogo();} catch (_) {aviso("Catálogo indisponível. Tente novamente quando houver conexão.",true);} aplicarAuto(true); desenhar(); } catch (e) { aviso(e.message, true); return; }
    nuvem.observar(async () => {
      if (pend) return;
      const a = document.activeElement; if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;
      const r = await carregar();
      if (r.versao > P.versao) { P = r; desenhar(); $("#estado").textContent = "Atualizado"; }
    }, 5000);
  })();
})();
