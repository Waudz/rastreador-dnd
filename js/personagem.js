/* Ficha do personagem (automática): raça, classes e multiclasse, vida e dados de vida, CA, salvaguardas, perícias,
   ataques, idiomas, magias e espaços, inventário com peso, dinheiro, habilidades e notas.
   O dono e o mestre da campanha podem editar; o banco de dados garante isso (regras de acesso). */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s), esc = nuvem.esc, R = window.REGRAS, C = window.FICHA_COMPONENTES;
  const id = new URLSearchParams(location.search).get("id");
  const emPainel = new URLSearchParams(location.search).get("modo") === "painel";
  if (emPainel) document.body.classList.add('ficha-embutida');
  const notificar = tipo => { if(emPainel && window.parent !== window) window.parent.postMessage({tipo,id},location.origin); };
  const filtrosMagia={nivel:"",escola:"",tipo:""};
  let editandoFicha = false, P = null, camp = null, souMestre = false, donoNome = "", pend = null, salvando = false, timer = null, catalogo = null, magiasCat = null, achadosM = [];
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
  document.addEventListener("focusin",e=>{if(!P)return;if(e.target.id==="cat-q")buscarCatalogo(e.target.value);if(e.target.id==="mag-q")buscarMagias();});

  /* ---------- salvar (agrupa as alterações por 0,6 s) ---------- */
  function agendar(campos) { pend = { ...(pend || {}), ...campos }; notificar('ficha-salvando'); $("#estado").textContent = "Salvando…"; clearTimeout(timer); timer = setTimeout(enviar, 600); }
  async function enviar() {
    if (!pend || salvando) return;
    const corpo = JSON.parse(JSON.stringify(pend)); pend = null; salvando = true; let falhou = false;
    try {
      if(emPainel && await nuvem.rpc('eh_mestre',{c:P.campanha_id}) !== true) throw new Error('Este painel é exclusivo do mestre da campanha.');
      const r = await nuvem.patch(`personagens?id=eq.${encodeURIComponent(id)}`, corpo);
      if (!r || !r[0]) throw new Error("O personagem não foi atualizado. Confira se você ainda tem acesso.");
      P.versao = r[0].versao;
      $("#estado").textContent = "Salvo";
      if(!pend) notificar('ficha-salva');
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
    if(emPainel && await nuvem.rpc('eh_mestre',{c:P.campanha_id}) !== true) throw new Error('Este painel é exclusivo do mestre da campanha.');
    souMestre = !!(m[0] && m[0].papel === "mestre") || !!(window.ACESSO && await ACESSO.pronto);
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
    if(f.criacao?.concluido&&!f.criacao.revisaoEquipamento){const couro=INV().some(i=>i.id==="srd51:item/leather-armor"),acolchoada=INV().some(i=>i.id==="srd51:item/padded-armor");if(couro&&!acolchoada&&EQ().armadura==="acolchoada"){EQ().armadura="couro";mudou=true;}f.criacao.revisaoEquipamento=true;mudou=true;}
    for(const x of R.preparacao(f)){let contagem=0;for(const m of MAG()){if(m.prep&&m.l>0&&!m.semprePreparada&&m.origem!=="Raça"&&x.pertence(m)){contagem++;if(contagem>x.limite){m.prep=false;mudou=true;}}}}
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
  const pctPV = () => (P.pv_max > 0 ? Math.max(0, Math.min(100, (P.pv_atual / P.pv_max) * 100)) : 0);
  const pesoTotal = () => INV().reduce((s, i) => s + num(i.qtd, 0) * num(i.peso, 0), 0);
  const capacidade = () => num(A()["for"], 10) * 7;
  const totalPO = () => { const d = DIN(); return num(d.pc, 0) / 100 + num(d.pp, 0) / 10 + num(d.po, 0); };
  const opt = (v, t, sel) => `<option value="${esc(v)}"${sel ? " selected" : ""}>${esc(t)}</option>`;

  const blocoPV = () => `<div class="vida-cabecalho"><h2 class="panel-title">Pontos de vida</h2><div class="big" id="pv-num">${P.pv_atual}<span class="muted"> / ${P.pv_max} PV</span></div></div>
    <div class="hp-track" role="progressbar" aria-label="Pontos de vida" aria-valuemin="0" aria-valuemax="${P.pv_max}" aria-valuenow="${P.pv_atual}"><div class="hp-fill ${pctPV()<=25?'low':pctPV()<=50?'mid':''}" id="pv-barra" style="width:${pctPV()}%"></div></div>
    <div class="vida-controles"><div class="inline"><button type="button" class="danger" id="b-dano">− Dano</button><input class="num" id="qtd" type="number" min="1" value="1" aria-label="Quantidade de dano ou cura"><button type="button" id="b-cura">+ Cura</button></div><span class="muted" id="pv-temp-txt">${P.pv_temp ? '+'+P.pv_temp+' PV temporários' : 'PV temporários: 0'}</span></div>
    <details class="vida-config"><summary>Ajustes de vida</summary><div class="row" style="margin:0"><div><label>PV máximo</label><input class="num" type="number" min="0" data-col="pv_max" value="${P.pv_max}"></div><div><label>PV temporário</label><input class="num" type="number" min="0" data-col="pv_temp" value="${P.pv_temp}"></div></div>
    <div class="row" style="margin:8px 0 0"><label class="inline" style="margin:0"><input type="checkbox" style="width:auto;height:auto" data-auto="pvAuto" ${autoOn("pvAuto") ? "checked" : ""}> PV máximo automático (dado de vida médio + Constituição)</label><div class="inline"><label style="margin:0">PV extra por nível</label><input class="num" type="number" step="1" data-f="pvExtra" value="${num(F().pvExtra, 0)}" title="Ex.: anão da colina +1, talento Robusto +2"></div></div></details>`;

  const linhaInv = (it, i) => `<div class="row" style="margin:0 0 6px" data-i="${i}"><input style="flex:1 1 160px" data-inv="nome" value="${esc(it.nome || "")}" placeholder="Item"><input class="num" type="number" min="0" step="1" data-inv="qtd" value="${num(it.qtd, 1)}" aria-label="Quantidade"><input class="num" type="number" min="0" step="0.1" data-inv="peso" value="${num(it.peso, 0)}" aria-label="Peso de cada unidade em kg"><button type="button" class="small subtle" data-rm-item="${i}" aria-label="Remover item">${window.ico ? window.ico("x") : "x"}</button></div>`;
  const cabInv = '<div class="row inv-h" style="margin:0 0 4px"><span style="flex:1 1 160px">Item</span><span class="num-h">Qtd.</span><span class="num-h">Peso cada (kg)</span><span style="width:34px"></span></div>';
  const blocoCarga = () => { const c = capacidade(), p = pesoTotal(), pc = Math.min(100, c > 0 ? (p / c) * 100 : 0); return `<div class="hp-top"><span>Carga total (qtd. × peso)</span><strong id="carga-txt" ${p > c ? 'class="err"' : ""}>${kg(p)} / ${kg(c)} kg</strong></div><div class="hp-track"><div class="hp-fill ${p > c ? "low" : pc > 66 ? "mid" : ""}" id="carga-barra" style="width:${pc}%"></div></div>`; };

  const blocoAtr = () => '<div class="attrs">'+ATR.map(([k,r])=>C.atributo({sigla:r,valor:num(A()[k],10),modificador:fm(modA(k)),id:'mod-'+k,controle:`<input id="atributo-${k}" aria-label="${R.ATR_NOME[k]}" type="number" min="1" max="30" data-atr="${k}" value="${num(A()[k],10)}">`,rolagem:`<button type="button" class="rolar-atributo" data-rolar-atr="${k}" aria-label="Rolar teste de ${R.ATR_NOME[k]}">Rolar d20</button>`})).join('')+'</div><div class="muted" id="prof-txt"></div>';

  const itemCar = (c, i) => `<details class="item"><summary>${esc(c.nome)}</summary><div><div class="pre">${TEXTO_REGRAS.html(c.desc || "")}</div>${!c.auto?`<div class="row" style="margin:8px 0 0"><button type="button" class="small danger" data-rm-car="${i}">Remover</button></div>`:""}</div></details>`;
  const recursosCombate = () => CAR().map(c=>`<details class="item"><summary>${esc(c.nome)}</summary><div class="pre">${TEXTO_REGRAS.html(c.desc||'')}</div></details>`).join('') || '<p class="muted">As habilidades e recursos cadastrados em Personagem aparecem aqui para consulta durante o combate.</p>';
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
    return `<div class="grade2">${ATR.map(([k, r]) => { const p = ps.includes(k), v = modA(k) + (p ? pb : 0); return `<div class="lin"><span class="pbol${p ? " on" : ""}"></span><b>${fm(v)}</b><button type="button" class="rolar-pericia" data-rolar-sal="${k}" aria-label="Rolar salvaguarda de ${R.ATR_NOME[k]}">${R.ATR_NOME[k]}</button></div>`; }).join("")}</div>`;
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
    h='<details class="config-pericias" '+(editandoFicha?'open':'')+'><summary>Escolhas e especializações</summary>'+h+'</details><div class="grade2">'+R.PERICIAS.map(([k,n,a])=>{
      const e=pr[k]||0,v=R.valorPericia(f,k);
      return `<div class="lin"><span class="pbol${e?' on':''}${e===2?' dup':''}"></span><b>${fm(v)}</b><button type="button" class="rolar-pericia" data-rolar-per="${k}" aria-label="Rolar ${n}">${n}</button>${lim&&e?`<button type="button" class="small" data-per="${k}" aria-pressed="${e===2}">${e===2?'Especializada':'Especializar'}</button>`:''}</div>`;
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
    return ks.map((d) => { const tot = dv[d], us = Math.min(tot, num(usados[d], 0)); return `<div class="res"><span><b>d${d}</b> <span class="muted">· restam ${tot - us} de ${tot}</span></span><div class="dv-acoes"><button type="button" class="small" data-dv="${d}" ${tot-us<=0?"disabled":""}>Rolar no App</button><input type="number" min="1" max="${d}" data-rolagem-fisica="${d}" aria-label="Rolagem Física de d${d}, sem Constituição" placeholder="Dado Físico"><button type="button" class="small" data-dv-manual="${d}" ${tot-us<=0?"disabled":""}>Usar Rolagem Física</button><button type="button" class="small" data-dv-marcar="${d}" ${tot-us<=0?"disabled":""}>Só Marcar Uso</button></div></div>`; }).join("");
  }

  /* ataques */
  function resAtq(a) {
    const valores=R.valoresAtaque(F(),a),hit=valores.ataque,dm=valores.dano;
    return `Ataque ${fm(hit)} · Dano ${esc(a.dado || "—")}${dm ? fm(dm) : ""} ${esc(a.tipo || "")}`;
  }
  const linhaAtq = (a, i) => `<article class="panel2 ataque-ficha" data-ai="${i}"><h3>${esc(a.nome||"Ataque personalizado")}</h3><details class="ataque-editor"><summary>Ajustar arma e bônus</summary><div class="row" style="margin:0 0 6px"><input style="flex:1 1 160px" data-atq="nome" value="${esc(a.nome || "")}" placeholder="Nome do ataque" maxlength="60"><button type="button" class="small subtle" data-rm-atq="${i}" aria-label="Remover ataque">${window.ico ? window.ico("x") : "x"}</button></div>
      <div class="row" style="margin:0 0 6px"><div><label>Atributo</label><select data-atq="atr">${opt("for", "Força", (a.atr || "for") === "for")}${opt("des", "Destreza", a.atr === "des")}${opt("acuidade", "Acuidade (maior)", a.atr === "acuidade")}${opt("int", "Inteligência", a.atr === "int")}${opt("sab", "Sabedoria", a.atr === "sab")}${opt("car", "Carisma", a.atr === "car")}</select></div>
      <div><label>Dano</label><input class="num" data-atq="dado" value="${esc(a.dado || "1d6")}" maxlength="12"></div><div><label>Tipo de dano</label><select data-atq="tipo">${R.TIPOS_DANO.map((t) => opt(t, t, t === a.tipo)).join("")}</select></div>
      <div><label>Bônus mágico</label><input class="num" type="number" data-atq="magico" value="${num(a.magico, 0)}"></div><div><label>Dano extra</label><input class="num" type="number" data-atq="extra" value="${num(a.extra, 0)}" title="Somado ao dano (ex.: fúria, estilo de luta)"></div>
      <label class="inline" style="margin:14px 0 0"><input type="checkbox" style="width:auto;height:auto" data-atq="prof" ${a.prof === false ? "" : "checked"}> Proficiente</label></div>
      </details><div class="atk-res" id="atk-res-${i}"><b>${resAtq(a)}</b></div><div class="row"><button type="button" class="small" data-rolar-atq="${i}">Rolar ataque</button><button type="button" class="small" data-rolar-dano="${i}">Rolar dano</button></div></article>`;

  /* magias */
  function blocoSlots() {
    const c = conj(), f = F(), us = f.slotsUsados || [], partes = [];
    if (c.slots.length) partes.push(c.slots.map((tot, i) => { const g = Math.min(tot, num(us[i], 0)); return `<div class="res"><span><b>${i + 1}º círculo</b> ${C.espacos(tot,g)} <span class="muted">· restam ${tot - g} de ${tot}</span></span><span class="inline"><button type="button" class="small" data-slot="${i}" data-d="1" ${tot - g <= 0 ? "disabled" : ""}>Gastar</button><button type="button" class="small" data-slot="${i}" data-d="-1" ${g <= 0 ? "disabled" : ""}>Recuperar</button></span></div>`; }).join(""));
    if (c.pact) { const g = Math.min(c.pact.qtd, num(f.pactoUsado, 0)); partes.push(`<div class="res"><span><b>Pacto</b> ${C.espacos(c.pact.qtd,g)} <span class="muted">· ${c.pact.qtd} espaço(s) de ${c.pact.nivel}º círculo · restam ${c.pact.qtd - g}</span></span><span class="inline"><button type="button" class="small" data-slot="p" data-d="1" ${c.pact.qtd - g <= 0 ? "disabled" : ""}>Gastar</button><button type="button" class="small" data-slot="p" data-d="-1" ${g <= 0 ? "disabled" : ""}>Recuperar</button></span></div>`); }
    const pb = bonusProf(), niv = (id) => (CLS().find((x) => x.c === id) || {}).n || 0;
    const info = c.habilidades.map((h) => { const m = modA(h.atr), prep = h.id === "Cleric" || h.id === "Druid" ? niv(h.id) + m : h.id === "Wizard" ? niv(h.id) + m : h.id === "Paladin" ? Math.floor(niv(h.id) / 2) + m : h.id === "Artificer" ? Math.floor(niv(h.id) / 2) + m : null; return `<div class="muted">${esc(h.classe)}: atributo ${R.ATR_NOME[h.atr]} · CD ${8 + pb + m} · ataque ${fm(pb + m)}${prep != null ? ` · preparar até ${Math.max(1, prep)} magias` : ""}</div>`; }).join("");
    return '<div class="conjuracao-info">'+info+'</div><h3 class="sub">Espaços de magia</h3>' + (partes.join("") || '<span class="muted">Sem espaços de magia para esta combinação de classes.</span>');
  }
  const linhaMag = (m, i) => `<details class="item"><summary>${esc(m.n)} <span class="muted" style="font-weight:400">· ${m.l === 0 ? "Truque" : m.l + "º círculo"}</span>${m.l===0?' <span class="badge">Truque</span>':m.semprePreparada?' <span class="badge">Sempre Preparada</span>':m.origem==='Raça'?' <span class="badge">Magia Racial</span>':R.preparacao(F()).some(x=>x.pertence(m))?(m.prep?' <span class="badge">Preparada</span>':' <span class="muted">Não Preparada</span>'):' <span class="badge">Conhecida</span>'}</summary><div>${m.conc ? '<span class="badge">Concentração</span>' : ""}${m.ritual ? '<span class="badge">Ritual</span>' : ""}${m.cab ? `<div class="muted" style="margin-bottom:6px">${esc(m.cab)}</div>` : ""}<div class="pre">${esc(m.d || "")}</div><div class="row" style="margin:8px 0 0">${m.l > 0 && !m.semprePreparada && m.origem!=="Raça" && R.preparacao(F()).some(x=>x.pertence(m)) ? `<label class="inline" style="margin:0"><input type="checkbox" style="width:auto;height:auto" data-prep="${i}" ${m.prep ? "checked" : ""}> Preparada</label>` : ""}<span class="grow"></span><button type="button" class="small danger" data-rm-mag="${i}">Remover</button></div></div></details>`;
  function listaMagias() {
    const l = MAG().map((m, i) => ({ m, i })).sort((a, b) => a.m.l - b.m.l || a.m.n.localeCompare(b.m.n));
    return l.length ? R.preparacao(F()).map(x=>`<p class="muted">${esc(x.nome)}: ${x.usadas} de ${x.limite} magias preparadas. Truques e magias sempre preparadas não contam nesse limite.</p>`).join("")+l.map((x,i) => (i===0 || l[i-1].m.l!==x.m.l ? '<h3 class="circulo-titulo">'+(x.m.l?x.m.l+"º círculo":"Truques")+'</h3>':'')+linhaMag(x.m,x.i)).join("") : '<div class="estado-vazio"><strong>Seu repertório começa aqui</strong><p>Busque no catálogo abaixo para adicionar as magias conhecidas e preparar as disponíveis para sua classe.</p><button type="button" class="small" id="focar-catalogo-magias">Buscar uma magia</button></div>';
  }

  const fotoHTML = () => { const f = F().foto; return f && /^data:image\//.test(f) ? `<img class="av" style="width:72px;height:72px;margin:0" src="${esc(f)}" alt="Foto">` : `<span class="av av0" style="width:72px;height:72px;font-size:30px;margin:0">${esc((P.nome || "?").charAt(0).toUpperCase())}</span>`; };

  function desenhar() {
    const f = F(), outro = souMestre && P.dono_id !== nuvem.usuario().id, rs = racaSel(), c = conj();
    const mostraMag = c.habilidades.length || MAG().length || f.magiaExtra || magiaRacial();
    $("#ficha").innerHTML = `
      <header class="panel ficha-resumo"><div class="ficha-identidade">${fotoHTML()}<div><p class="eyebrow">Ficha de personagem · D&D 2014</p><h1>${esc(P.nome)}</h1><p>${esc(f.raca||"Raça não definida")} · ${esc(R.resumoClasses(CLS()).descricao||"Classe não definida")}</p><p>${esc(CLS().map(c=>c.sub).filter(Boolean).join(" · "))}</p><p class="ficha-meta"><span class="badge">Nível ${nivelTotal()}</span> Proficiência ${fm(bonusProf())} · ${esc(f.background||"Origem não definida")}</p></div></div><div class="ficha-destaques">${C.estatistica({rotulo:"CA",valor:P.ca,id:"resumo-ca"})}${C.estatistica({rotulo:"Iniciativa",valor:fm(modA("des")+R.bonusSemProf(F())),id:"resumo-iniciativa",tipo:"iniciativa"})}${C.estatistica({rotulo:"Desloc.",valor:String(f.deslocamento ?? 9).replace(".",",")+" m",id:"resumo-deslocamento",tipo:"deslocamento"})}</div><div class="ficha-acoes"><div class="ficha-acoes-jogo"><a class="btnlike" href="criar-personagem.html?id=${encodeURIComponent(id)}&modo=nivel">Subir de Nível</a><a class="btnlike" href="iniciativa.html?aba=iniciativa&campanha=${encodeURIComponent(P.campanha_id)}&personagem=${encodeURIComponent(id)}">Usar na Iniciativa</a></div><div class="ficha-acoes-gestao"><button type="button" id="editar-ficha">${editandoFicha?"Concluir Edição":"Editar Personagem"}</button><button type="button" class="danger" id="excluir-personagem">Excluir Personagem</button></div></div></header>
      <div class="panel identidade-editor" style="${editandoFicha?"":"display:none"}">
        <div class="row" style="margin:0 0 8px;flex-wrap:nowrap;gap:12px"><span id="foto-box">${fotoHTML()}</span><div style="flex:1 1 auto;min-width:0">
          <input id="nome" data-col="nome" value="${esc(P.nome)}" maxlength="80" style="font-family:Georgia,serif;font-size:22px;height:46px;font-weight:700" aria-label="Nome">
          <div class="muted" style="margin-top:4px"><button type="button" class="small" id="b-foto">Trocar foto</button><input type="file" id="in-foto" accept="image/*" hidden> ${esc(camp.nome)}${donoNome ? " · responsável: " + esc(donoNome) : ""}${outro ? ' · <span class="badge">editando como mestre</span>' : ""}</div></div></div>
        <div class="row" style="margin:0">
          <div style="flex:1 1 200px"><label>Raça</label><select id="raca-sel">${opt("", "Escolha…", !rs)}${R.RACAS.filter(r=>R.RACAS_BASE.includes(r[0])||r[0]===f.raca).map((r) => opt(r[0], r[0], rs === r[0])).join("")}${opt("__custom", "Outra (personalizada)…", rs === "__custom")}</select></div>
          <div style="flex:1 1 200px" id="raca-txt-box" ${rs === "__custom" ? "" : "hidden"}><label>Nome da raça personalizada</label><input id="raca-txt" value="${esc(R.RACAS.some((x) => x[0] === f.raca) ? "" : f.raca || "")}" maxlength="60" placeholder="Ex.: Fada, Sereia…"></div>
          <div><label>Deslocamento (m)</label><input class="num" type="number" min="0" step="1.5" data-f="deslocamento" value="${f.deslocamento != null ? f.deslocamento : 9}"></div>
          <div><label>Nível total</label><div style="height:39px;display:flex;align-items:center;font-weight:800;color:var(--gold)" id="nivel-total">${nivelTotal() || "—"}</div></div>
        </div>
        <div id="info-raca">${infoRaca()}${escolhasAtributosRaca()}</div>
        <div class="sub">Classes</div>
        <div id="classes">${blocoClasses()}</div>
        <div class="row" style="margin:0"><button type="button" class="small" id="add-cls">${CLS().length ? "Adicionar classe (multiclasse)" : "Escolher classe"}</button></div>
      </div>
      <div class="panel vida-ficha"><div id="bloco-pv">${blocoPV()}</div><details class="vida-descanso"><summary>Dados de vida e descanso</summary><div id="bloco-dv">${blocoDV()}</div>
        <div class="row" style="margin:8px 0 0"><button type="button" class="small" id="b-curto">Registrar Descanso Curto</button><button type="button" class="small" id="b-longo">Descanso Longo</button><span class="muted">Recupera todos os PV, os espaços de magia e metade dos dados de vida.</span></div></details></div>
<nav class="ficha-abas" aria-label="Seções da ficha" role="tablist"><button type="button" role="tab" id="aba-principal" aria-controls="secao-principal" data-ficha-aba="principal">Principal</button><button type="button" role="tab" id="aba-combate" aria-controls="secao-combate" data-ficha-aba="combate">Combate</button><button type="button" role="tab" id="aba-magias" aria-controls="secao-magias" data-ficha-aba="magias">Magias</button><button type="button" role="tab" id="aba-inventario" aria-controls="secao-inventario" data-ficha-aba="inventario">Inventário</button><button type="button" role="tab" id="aba-personagem" aria-controls="secao-personagem" data-ficha-aba="personagem">Personagem</button><button type="button" role="tab" id="aba-notas" aria-controls="secao-notas" data-ficha-aba="notas">Notas</button></nav><section id="secao-principal" role="tabpanel" aria-labelledby="aba-principal" data-ficha-secao="principal" class="ficha-conteudo" tabindex="0">      <div class="panel atributos-ficha"><h2 class="panel-title">Atributos</h2>${blocoAtr()}</div>
      <div class="panel"><h2 class="panel-title">Testes de resistência</h2><div id="bloco-sal">${blocoSal()}</div></div>
      <details class="panel pericias-ficha" open><summary class="panel-title">Perícias <span class="muted">Expandir / recolher</span></summary><div id="bloco-per">${blocoPer()}</div></details>
      <div class="panel inspiracao-ficha"><label class="inline"><input type="checkbox" id="inspiracao" ${f.inspiracao?"checked":""}> Inspiração</label><span class="muted">Concedida pelo mestre · marque quando disponível.</span></div><details class="panel proficiencias-ficha"><summary class="panel-title">Proficiências e idiomas</summary><div id="bloco-prof">${blocoProf()}</div>
        <div class="sub">Idiomas</div><div id="idiomas" class="anexos">${IDI().map((x, i) => `<span class="chip">${esc(x)}<button type="button" class="chip-x" data-rm-idi="${i}" aria-label="Tirar">${window.ico ? window.ico("x") : "x"}</button></span>`).join("") || '<span class="muted">Nenhum ainda.</span>'}</div>
        <div class="row" style="margin:8px 0 0"><select id="idi-sel" style="flex:1 1 160px">${opt("", "Adicionar idioma…", true)}${R.IDIOMAS.filter((x) => !IDI().includes(x)).map((x) => opt(x, x)).join("")}</select><input id="idi-txt" style="flex:1 1 160px" maxlength="40" placeholder="Outro idioma"><button type="button" class="small" id="add-idi">Adicionar</button></div>
        <div class="sub">Outras proficiências (ferramentas, veículos, jogos…)</div><textarea data-f="outrasProf" rows="2" style="width:100%">${esc(f.outrasProf || "")}</textarea></details>
      </section><section id="secao-combate" role="tabpanel" aria-labelledby="aba-combate" data-ficha-secao="combate" class="ficha-conteudo" tabindex="0">      <div class="panel"><h2 class="panel-title">Classe de armadura</h2><div id="bloco-ca">${blocoCA()}</div>
        <div class="row" style="margin:8px 0 0"><div style="flex:1 1 200px"><label>Armadura</label><select id="eq-arm">${opt("", "Nenhuma", !EQ().armadura)}${R.ARMADURAS.map((a) => opt(a[0], `${a[1]} (${a[2]}, CA ${a[3]})`, EQ().armadura === a[0])).join("")}</select></div>
          <label class="inline" style="margin:18px 0 0"><input type="checkbox" style="width:auto;height:auto" id="eq-esc" ${EQ().escudo ? "checked" : ""}> Escudo (+2)</label>
          <div><label>Outros bônus</label><input class="num" type="number" id="eq-bonus" value="${num(EQ().bonus, 0)}" title="Armadura +1, anel de proteção, etc."></div>
          <label class="inline" style="margin:18px 0 0"><input type="checkbox" style="width:auto;height:auto" data-auto="caAuto" ${autoOn("caAuto") ? "checked" : ""}> CA automática</label></div>
        <div class="muted" id="aviso-arm"></div></div>
<div class="panel"><h2 class="panel-title">Ataques</h2><div id="lista-atq">${ATQ().map(linhaAtq).join("") || '<span class="muted">Nenhum ataque ainda.</span>'}</div>
        <div class="row" style="margin:8px 0 0"><select id="atq-arma" style="flex:1 1 180px">${opt("", "Adicionar arma comum…", true)}${R.ARMAS.map((a, i) => opt(i, `${a[0]} (${a[1]} ${a[2]})`)).join("")}</select><button type="button" class="small" id="add-atq-arma">Adicionar arma</button><button type="button" class="small" id="add-atq">Personalizado</button></div></div>
      <details class="panel recursos-combate"><summary class="panel-title">Recursos e habilidades</summary><div id="recursos-combate">${recursosCombate()}</div><p class="muted">Condições e duração dos efeitos são controladas por combatente no rastreador de iniciativa.</p></details>
      </section><section id="secao-magias" role="tabpanel" aria-labelledby="aba-magias" data-ficha-secao="magias" class="ficha-conteudo" tabindex="0">${mostraMag ? `<div class="panel" id="painel-mag"><h2 class="panel-title">Magias</h2><div id="bloco-slots">${blocoSlots()}</div>
        ${f.magiaExtra ? '<button type="button" class="small subtle" id="b-mag-fechar">Desativar fonte adicional</button>' : ""}<div class="sub">Magias conhecidas e preparadas</div><div id="lista-mag">${listaMagias()}</div>
        <div class="sub">Adicionar do catálogo (SRD)</div><div class="row" style="margin:0 0 6px"><input id="mag-q" style="flex:1 1 200px" placeholder="Buscar: bola de fogo, curar…" autocomplete="off"><label class="inline" style="margin:0"><input type="checkbox" id="mag-cls" style="width:auto;height:auto" ${c.habilidades.length ? "checked" : ""}> Só da minha classe</label></div><div class="filtros-magias"><label>Círculo<select id="mag-nivel">${opt("","Todos",true)}${Array.from({length:10},(_,i)=>opt(i,i?i+"º círculo":"Truques",false)).join("")}</select></label><label>Escola<select id="mag-escola">${opt("","Todas",true)}${["Abjuração","Conjuração","Adivinhação","Encantamento","Evocação","Ilusão","Necromancia","Transmutação"].map(x=>opt(x,x,false)).join("")}</select></label><label>Característica<select id="mag-extra">${opt("","Todas",true)}${opt("conc","Concentração",false)}${opt("ritual","Ritual",false)}</select></label></div><div id="mag-res" class="catalogo-lista"></div></div>` : `<div class="panel"><h2 class="panel-title">Magias</h2><span class="muted">Sem espaços de magia.</span><details><summary>Conjuração por raça, talento ou item</summary><p class="muted">Essas fontes podem conceder magias sem espaços de classe.</p><button type="button" class="small" id="b-mag-abrir">Habilitar magias de outra fonte</button></details></div>`}
      </section><section id="secao-inventario" role="tabpanel" aria-labelledby="aba-inventario" data-ficha-secao="inventario" class="ficha-conteudo" tabindex="0"><div class="panel"><h2 class="panel-title">Inventário e equipamento</h2>
        ${cabInv}<div id="inv">${INV().map(linhaInv).join("")}</div>
        <div class="row"><button type="button" class="small" id="add-item">Adicionar item</button><select id="eq-pre" style="flex:1 1 180px">${opt("", "Adicionar equipamento comum…", true)}${presets().map((p, i) => opt(i, `${p[0]} (${p[1]} kg)`)).join("")}</select><button type="button" class="small" id="add-pre">Adicionar</button></div>
        <div id="bloco-carga">${blocoCarga()}</div>
        <div class="sub">Dinheiro</div>
        <div class="moedas">${MOEDAS.map(([k, r]) => `<div class="moeda-controle"><label>${r}</label><input class="num" type="number" min="0" step="1" data-din="${k}" value="${moeda(DIN()[k])}"><div class="inline"><button type="button" data-moeda="${k}" data-sinal="-1" aria-label="Diminuir ${r}">−</button><input class="num" type="number" min="1" step="1" id="ajuste-${k}" placeholder="1" aria-label="Quantidade de ${r}"><button type="button" data-moeda="${k}" data-sinal="1" aria-label="Somar ${r}">+</button></div></div>`).join("")}<div><label>Total em PO</label><div style="height:39px;display:flex;align-items:center;font-weight:800;color:var(--gold)" id="total-po">${totalPO().toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div></div>
      </div>
      </section><section id="secao-personagem" role="tabpanel" aria-labelledby="aba-personagem" data-ficha-secao="personagem" class="ficha-conteudo" tabindex="0"><div class="panel"><h2 class="panel-title">Criação e evolução</h2><div class="row"><a class="btnlike" href="criar-personagem.html?id=${encodeURIComponent(id)}">Criação guiada</a><a class="btnlike" href="criar-personagem.html?id=${encodeURIComponent(id)}&modo=nivel">Subir de nível</a></div></div><details class="panel" ${editandoFicha?"open":""}><summary class="panel-title">Melhorias de atributos e talentos</summary><div id="melhorias">${blocoMelhorias()}</div></details><div class="panel"><h2 class="panel-title">Traços raciais</h2>${R.tracosDaFicha(f).map(t=>'<details class="item" open><summary>'+esc(t.nome)+'</summary><p class="muted">'+esc(t.origem)+'</p><p class="descricao-regra">'+esc(t.desc)+'</p></details>').join("")||'<p class="muted">Esta raça não concede traços adicionais.</p>'}</div>
      ${f.backgroundCaracteristica?'<div class="panel"><h2 class="panel-title">Origem · '+esc(f.background||"")+'</h2><h3>'+esc(f.backgroundCaracteristica.nome)+'</h3><p class="descricao-regra">'+esc(f.backgroundCaracteristica.desc)+'</p></div>':""}
      <div class="panel"><h2 class="panel-title">Características de classe e outras habilidades</h2>
        <div id="lista-car">${CAR().length ? CAR().map(itemCar).join("") : '<span class="muted">Nenhuma habilidade ainda.</span>'}</div>
        <div class="sub">Adicionar do catálogo (SRD)</div>
        <input id="cat-q" placeholder="Buscar: fúria, ataque furtivo, rage…" autocomplete="off"><div id="cat-res" class="catalogo-lista" style="margin-top:6px"></div>
        <details class="item" style="margin-top:8px"><summary>Criar uma habilidade própria</summary><div>
          <input id="car-nome" maxlength="80" placeholder="Nome" style="margin-bottom:6px"><textarea id="car-desc" rows="4" placeholder="O que ela faz" style="width:100%"></textarea>
          <div class="row" style="margin:6px 0 0"><button type="button" class="small primary" id="add-car">Adicionar</button></div></div></details>
      </div>
      </section><section id="secao-notas" role="tabpanel" aria-labelledby="aba-notas" data-ficha-secao="notas" class="ficha-conteudo" tabindex="0"><div class="panel"><h2 class="panel-title">Diário de aventuras</h2><p class="muted">História, objetivos, personalidade, aparência e aliados. Suas anotações permanecem reunidas neste diário.</p><textarea data-f="notas" rows="12" style="width:100%" placeholder="Anotações do personagem">${esc(f.notas || "")}</textarea></div></section>`;
    window.atualizarAbasFicha?.();
    document.querySelector("#ficha").classList?.toggle("editando-ficha",editandoFicha);
    for(const [id,chave] of [["mag-nivel","nivel"],["mag-escola","escola"],["mag-extra","tipo"]]){const el=$("#"+id);if(el)el.value=filtrosMagia[chave];}
    document.title = P.nome + " — Rastreador D&D"; profTxt(); avisoArm();
    document.querySelectorAll(".atributos-ficha input,.atributos-ficha select").forEach(el=>{el.disabled=!editandoFicha;});
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
    $("#pv-temp-txt").innerHTML = P.pv_temp ? `+${P.pv_temp} PV temporários` : "PV temporários: 0";
    const trilho = $("#bloco-pv .hp-track"); trilho?.setAttribute("aria-valuemax", P.pv_max); trilho?.setAttribute("aria-valuenow", P.pv_atual);
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
    const lc=$("#lista-car");if(lc)lc.innerHTML=CAR().map(itemCar).join("");atualizarRecursos();
    const nt = $("#nivel-total"); if (nt) nt.textContent = nivelTotal() || "—";
    const bs = $("#bloco-slots"); if (bs) bs.innerHTML = blocoSlots();
    ATQ().forEach((a, i) => { const e = $("#atk-res-" + i); if (e) e.innerHTML = `<b>${resAtq(a)}</b>`; });
    profTxt(); avisoArm(); atualizarCarga();
    if($("#resumo-pv"))$("#resumo-pv").textContent=P.pv_atual+" / "+P.pv_max;if($("#resumo-ca"))$("#resumo-ca").textContent=P.ca;
    if($("#resumo-iniciativa"))$("#resumo-iniciativa").textContent=fm(modA("des")+R.bonusSemProf(F()));
  }

  /* ---------- edições ---------- */
  function mudarPV(dano) {
    const n = Math.max(1, Math.floor(num($("#qtd").value, 1)));
    if (dano) { const abs = Math.min(P.pv_temp || 0, n); P.pv_temp = (P.pv_temp || 0) - abs; P.pv_atual = Math.max(0, P.pv_atual - (n - abs)); }
    else P.pv_atual = Math.min(P.pv_max, P.pv_atual + n);
    atualizarPV(); const pv = $("#bloco-pv").querySelector('[data-col="pv_temp"]'); if (pv) pv.value = P.pv_temp;
    agendar({ pv_atual: P.pv_atual, pv_temp: P.pv_temp });
  }
  function usarDado(d, modo="app") {
    const dv = dadosVida(), us = F().dvUsados = F().dvUsados || {};
    if (num(us[d], 0) >= (dv[d] || 0)) return;
    const fisico=modo==="fisico"?Number($('[data-rolagem-fisica="'+d+'"]').value):null;
    if(modo==="fisico"&&(!Number.isInteger(fisico)||fisico<1||fisico>d)){aviso("Informe o resultado do d"+d+", entre 1 e "+d+", sem Constituição.",true);return;}
    const rolou = modo==="marcar"?null:modo==="fisico"?fisico:1+Math.floor(Math.random()*d), ganho=rolou===null?0:Math.max(0,rolou+modA("con"));
    us[d] = num(us[d], 0) + 1; P.pv_atual = Math.min(P.pv_max, P.pv_atual + ganho);
    atualizarPV(); $("#bloco-dv").innerHTML = blocoDV(); agendar({ ficha: P.ficha, pv_atual: P.pv_atual });
    aviso(modo==="marcar"?`Uso de d${d} registrado. Ajuste a cura física nos PV.`:`d${d}: ${rolou}${modA("con")?" "+fm(modA("con")):""} = ${ganho} PV de cura, limitado ao PV máximo.`);
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
    if (t.dataset.f) { const k = t.dataset.f; F()[k] = ["nivel", "deslocamento", "pvExtra"].includes(k) ? (t.value === "" ? (k === "pvExtra" ? 0 : null) : num(t.value, 0)) : t.value; if(k === "deslocamento" && $("#resumo-deslocamento")) $("#resumo-deslocamento").textContent=(F()[k] ?? 9)+" m"; if (k === "pvExtra") return refrescar(); agendar({ ficha: P.ficha }); return; }
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
    if (t.dataset.prep) { const magia=MAG()[+t.dataset.prep],limites=R.preparacao(F()).filter(x=>x.pertence(magia)),disponivel=limites.find(x=>x.usadas<x.limite);if(t.checked&&!magia.prep&&!disponivel){t.checked=false;aviso("Limite de magias preparadas atingido. Desmarque uma magia antes de preparar outra.",true);return;}if(disponivel)magia.classePreparacao=disponivel.id; magia.prep = t.checked; $("#lista-mag").innerHTML = listaMagias(); agendar({ ficha: P.ficha }); return; }
    if(["mag-nivel","mag-escola","mag-extra"].includes(t.id)){filtrosMagia[{"mag-nivel":"nivel","mag-escola":"escola","mag-extra":"tipo"}[t.id]]=t.value;return buscarMagias();}
    if(t.id==="inspiracao"){F().inspiracao=t.checked;agendar({ficha:P.ficha});return;}
    if (t.id === "mag-cls") return buscarMagias();
    if (t.id === "in-foto" && t.files[0]) { trocarFoto(t.files[0]); t.value = ""; }
  });

  document.addEventListener("click", async (e) => {
    const t = e.target, c = (s) => t.closest(s); if (!P) return;
    if(c("#focar-catalogo-magias")){ $("#mag-q").focus();buscarMagias();return;}
    let b;
    if((b=c('[data-rolar-atr],[data-rolar-sal],[data-rolar-per],[data-rolar-atq],[data-rolar-dano]'))){
      try {
        let expressao='1d20', bonus=0, nome='Teste';
        if(b.dataset.rolarAtr){nome=R.ATR_NOME[b.dataset.rolarAtr];bonus=modA(b.dataset.rolarAtr);}
        if(b.dataset.rolarSal){const k=b.dataset.rolarSal;nome="Salvaguarda de "+R.ATR_NOME[k];bonus=modA(k)+(salvaProf().includes(k)?bonusProf():0);}
        if(b.dataset.rolarPer){const k=b.dataset.rolarPer;nome=R.PERICIAS.find(p=>p[0]===k)?.[1]||k;bonus=R.valorPericia(F(),k);}
        if(b.dataset.rolarAtq!==undefined || b.dataset.rolarDano!==undefined){
          const dano=b.dataset.rolarDano!==undefined,a=ATQ()[+(dano?b.dataset.rolarDano:b.dataset.rolarAtq)],v=R.valoresAtaque(F(),a);
          nome=(dano?'Dano: ':'Ataque: ')+(a.nome||'Personalizado');expressao=dano?a.dado:'1d20';bonus=dano?v.dano:v.ataque;
        }
        const r=window.ROLAGENS.rolar(expressao,bonus);
        $('#rolagem-ficha').textContent=nome+': '+r.total+' ('+r.dados.join(' + ')+(r.modificador?' '+fm(r.modificador):'')+')';
      }catch(e){aviso(e.message,true);}return;
    }

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
    if(c("#b-curto")){F().descansosCurtos=num(F().descansosCurtos,0)+1;F().pactoUsado=0;agendar({ficha:P.ficha});desenhar();aviso("Descanso curto registrado. Os dados de vida são gastos separadamente; os espaços de pacto foram recuperados.");return;}
    if((b=c("[data-dv-manual]")))return usarDado(+b.dataset.dvManual,"fisico");
    if((b=c("[data-dv-marcar]")))return usarDado(+b.dataset.dvMarcar,"marcar");
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
    if(c("#editar-ficha")){editandoFicha=!editandoFicha;desenhar();return;}
    if(c("#excluir-personagem")){if(!confirm("Excluir "+P.nome+" e sua ficha?"))return;try{await nuvem.apagar("personagens?id=eq."+encodeURIComponent(id));location.href="campanha.html?id="+encodeURIComponent(P.campanha_id);}catch(e){aviso(e.message,true);}return;}
    if (c("#add-atq")) { ATQ().push({ nome: "Personalizado", atr: "for", dado: "1d6", tipo: "cortante", magico: 0, extra: 0, prof: true }); $("#lista-atq").innerHTML = ATQ().map(linhaAtq).join(""); agendar({ ficha: P.ficha }); return; }
    if (c("#add-atq-arma")) { const v = $("#atq-arma").value; if (v === "") return; const a = R.ARMAS[+v]; ATQ().push({ nome: a[0], atr: a[3], dado: a[1], tipo: a[2], magico: 0, extra: 0, prof: true }); $("#lista-atq").innerHTML = ATQ().map(linhaAtq).join(""); $("#atq-arma").value = ""; agendar({ ficha: P.ficha }); return; }
    if ((b = c("[data-rm-atq]"))) { ATQ().splice(+b.dataset.rmAtq, 1); $("#lista-atq").innerHTML = ATQ().map(linhaAtq).join("") || '<span class="muted">Nenhum ataque ainda.</span>'; agendar({ ficha: P.ficha }); return; }
    if (c("#b-mag-abrir")) { abrirMagias(); return; }
    if ((b = c("[data-mag]"))) { const m = achadosM[+b.dataset.mag]; if (m && !MAG().some((x) => x.en === m.en)) { MAG().push({ n: m.n, en: m.en, l: m.l, cab: m.cab, d: m.d, conc:!!m.conc, ritual:!!m.ritual, prep: m.l === 0 }); $("#lista-mag").innerHTML = listaMagias(); agendar({ ficha: P.ficha }); } $("#mag-q").value = ""; $("#mag-res").innerHTML = ""; return; }
    if ((b = c("[data-rm-mag]"))) { const i = +b.dataset.rmMag; if (!confirm(`Remover “${MAG()[i].n}”?`)) return; MAG().splice(i, 1); $("#lista-mag").innerHTML = listaMagias(); agendar({ ficha: P.ficha }); return; }
    if (c("#add-item")) { INV().push({ nome: "", qtd: 1, peso: 0 }); $("#inv").insertAdjacentHTML("beforeend", linhaInv(INV()[INV().length - 1], INV().length - 1)); $("#inv").lastElementChild.querySelector("input").focus(); agendar({ inventario: P.inventario }); return; }
    if (c("#add-pre")) { const v = $("#eq-pre").value; if (v === "") return; const p = presets()[+v]; INV().push({ nome: p[0], qtd: 1, peso: p[1] }); $("#inv").innerHTML = INV().map(linhaInv).join(""); atualizarCarga(); agendar({ inventario: P.inventario }); return; }
    if ((b = c("[data-rm-item]"))) { INV().splice(+b.dataset.rmItem, 1); $("#inv").innerHTML = INV().map(linhaInv).join(""); atualizarCarga(); agendar({ inventario: P.inventario }); return; }
    if ((b = c("[data-rm-car]"))) { const i = +b.dataset.rmCar; if(CAR()[i].auto)return; if (!confirm(`Remover “${CAR()[i].nome}” da ficha?`)) return; CAR().splice(i, 1); $("#lista-car").innerHTML = CAR().length ? CAR().map(itemCar).join("") : '<span class="muted">Nenhuma habilidade ainda.</span>';atualizarRecursos(); agendar({ ficha: P.ficha }); return; }
    if (c("#add-car")) { const nome = $("#car-nome").value.trim(); if (!nome) return; adicionarCar({ nome, desc: $("#car-desc").value }); $("#car-nome").value = ""; $("#car-desc").value = ""; return; }
    if ((b = c("[data-cat]"))) { const r = (catalogo || {}).achados[+b.dataset.cat]; if (r) { adicionarCar({ nome: r.titulo, desc: r.desc, cf: r.chave }); $("#cat-q").value = ""; $("#cat-res").innerHTML = ""; } return; }
  });

  /* botão "adicionar magias mesmo assim" para classes sem conjuração: cria o painel de magias */
  function abrirMagias() { F().magiaExtra = true; agendar({ficha:P.ficha}); desenhar(); buscarMagias(); }

  function adicionarCar(c) {
    if (CAR().some((x) => x.nome === c.nome)) { aviso(`Você já tem “${c.nome}”.`, true); return; }
    aviso(""); CAR().push(c);
    $("#lista-car").innerHTML = CAR().map(itemCar).join("");atualizarRecursos();
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
    achadosM = magiasCat.filter((m) => ws.every((w) => nz(m.n + " " + m.en).includes(w)) && (!so || m.c.some((x) => meus.includes(x))) && (filtrosMagia.nivel==="" || +filtrosMagia.nivel===m.l) && (!filtrosMagia.escola || (m.cab||"").startsWith(filtrosMagia.escola)) && (!filtrosMagia.tipo || (filtrosMagia.tipo==="conc" ? m.conc : m.ritual || /ritual/i.test(m.cab||"")))).sort((a,b)=>a.l-b.l||a.n.localeCompare(b.n,"pt-BR"));
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
      if(emPainel && await nuvem.rpc('eh_mestre',{c:P.campanha_id}) !== true){$('#ficha').innerHTML='';aviso('Este painel é exclusivo do mestre da campanha.',true);return;}
      const a = document.activeElement; if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;
      const r = await carregar();
      if (r.versao > P.versao) { P = r; desenhar(); $("#estado").textContent = "Atualizado"; }
    }, 5000);
  })();
})();
