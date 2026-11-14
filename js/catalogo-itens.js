/* Catálogo de itens do Compêndio (SRD 5.1, regras de 2014): dados em dados/itens-srd2014.json (gerado por tools/gerar-itens.cjs), rótulos em português,
   busca/filtros, ficha de leitura compartilhada (aba Itens e janela de Detalhes do inventário) e conversão para o inventário.
   Regras de uso dos dados: nada é inventado; o SRD deste conjunto de dados não traz descrição textual dos itens, então a ficha mostra a lacuna em vez de texto.
   Itens personalizados ficam neste aparelho (localStorage, por conta) e só carregam campos narrativos: efeitos, raridade, sintonia, consumo e cargas continuam
   sendo configurados pelo mestre no inventário, porque o servidor só aceita essas propriedades vindas do mestre ou do catálogo aprovado. */
(() => {
  "use strict";
  const CATEGORIAS = [["arma", "Armas"], ["armadura", "Armaduras"], ["escudo", "Escudos"], ["equipamento", "Equipamento de aventura"], ["municao", "Munição"], ["foco", "Focos e símbolos"], ["kit", "Kits (item único)"], ["pacote", "Pacotes (conjuntos)"], ["ferramenta", "Ferramentas e instrumentos"], ["montaria-veiculo", "Montarias e veículos"], ["pocao", "Poções e óleos"], ["pergaminho", "Pergaminhos"], ["magico", "Itens mágicos"], ["personalizado", "Personalizados"]];
  const SUBTIPOS = { "simple-melee": "Arma simples corpo a corpo", "simple-ranged": "Arma simples à distância", "martial-melee": "Arma marcial corpo a corpo", "martial-ranged": "Arma marcial à distância", light: "Leve", medium: "Média", heavy: "Pesada", shield: "Escudo",
    "standard-gear": "Equipamento comum", ammunition: "Munição", "holy-symbols": "Símbolo sagrado", "arcane-foci": "Foco arcano", "druidic-foci": "Foco druídico", kits: "Kit", "equipment-packs": "Pacote de equipamento",
    "artisans-tools": "Ferramentas de artesão", "gaming-sets": "Jogos", "musical-instrument": "Instrumento musical", "other-tools": "Outras ferramentas",
    "mounts-and-other-animals": "Montarias e outros animais", "tack-harness-and-drawn-vehicles": "Arreios e veículos puxados", "waterborne-vehicles": "Veículos aquáticos" };
  const ESPACOS = { body: "Corpo", neck: "Pescoço", shield: "Escudo", waist: "Cintura", oneHand: "Uma mão", feet: "Pés", arms: "Braços", shoulders: "Ombros", head: "Cabeça", hands: "Mãos", twoHands: "Duas mãos", ring: "Anel" };
  const RARIDADES = { common: "Comum", uncommon: "Incomum", rare: "Rara", "very-rare": "Muito rara", legendary: "Lendária", artifact: "Artefato" };
  const PROPRIEDADES = { ammunition: "Munição", finesse: "Acuidade", heavy: "Pesada", light: "Leve", loading: "Recarga", reach: "Alcance", special: "Especial", thrown: "Arremesso", "two-handed": "Duas mãos", versatile: "Versátil", monk: "Arma de monge" };
  const DANOS = { slashing: "cortante", piercing: "perfurante", bludgeoning: "contundente" };
  const MOEDAS = { gp: "PO", sp: "PP", cp: "PC" }, EM_PO = { gp: 1, sp: 0.1, cp: 0.01 };
  const ICONE = { arma: "swords", armadura: "bag", escudo: "bag", equipamento: "bag", municao: "swords", foco: "sparkles", kit: "bag", pacote: "bag", ferramenta: "clip", "montaria-veiculo": "users", pocao: "flask", pergaminho: "book", magico: "sparkles", personalizado: "plus" };
  const sem = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const kg = (n) => (Math.round(num(n) * 100) / 100).toLocaleString("pt-BR");
  const rotuloCat = (c) => (CATEGORIAS.find((x) => x[0] === c) || [c, c])[1];

  /* ---------- carga dos dados e índices ---------- */
  let lista = null, porId = new Map(), esperando = null;
  function indexar(itens) { lista = itens; porId = new Map(); for (const i of itens) { porId.set(i.id, i); for (const a of i.alias || []) porId.set(a, i); } }
  function carregar() {
    if (lista) return Promise.resolve(lista);
    if (!esperando) esperando = fetch("dados/itens-srd2014.json").then((r) => { if (!r.ok) throw new Error("catálogo de itens indisponível"); return r.json(); }).then((j) => { indexar(j.itens); return lista; }).catch((e) => { esperando = null; throw e; });
    return esperando;
  }
  const todos = () => {const m=new Map((lista||[]).concat(personalizados.listar().map(deCustom)).map(i=>[i.id,i]));for(const r of window.CATALOGO?.registros('item')||[]){if(r.excluido)m.delete(r.chave);else if(r.dados)m.set(r.chave,{...r.dados,global:true,imagem:window.CATALOGO.imagem('item',r.chave)||null});}return [...m.values()];};
  const obter = id => {const base=porId.get(id),chave=base?.id||id;return todos().find(x=>x.id===chave||(x.alias||[]).includes(id))||null;};
  /* o item do inventário aponta para o catálogo por `catId` ou, nos antigos, pelo `ref` (srd51:item/...) */
  const doInventario = (it) => (it ? (obter(it.catId) || obter(it.ref) || null) : null);

  /* ---------- itens personalizados (neste aparelho, por conta) ---------- */
  const chaveCustom = () => "dnd5e_itens_custom_v1:" + ((window.nuvem && nuvem.usuario && nuvem.usuario() && nuvem.usuario().id) || "publico");
  const personalizados = {
    listar() { try { const v = JSON.parse(localStorage.getItem(chaveCustom()) || "[]"); return Array.isArray(v) ? v.filter((x) => x && typeof x.id === "string" && typeof x.nome === "string") : []; } catch (_) { return []; } },
    gravar(l) { try { localStorage.setItem(chaveCustom(), JSON.stringify(l)); return true; } catch (_) { return false; } },
    salvar(d) {
      const nome = String(d.nome || "").trim().slice(0, 120); if (!nome) return { ok: false, erro: "Informe o nome do item." };
      const img = d.imagem ? String(d.imagem) : ""; if (img && !(/^data:image\/(jpeg|png|webp);base64,/.test(img) && img.length <= 30000) && !/^https:\/\/[^\s]{1,480}$/.test(img)) return { ok: false, erro: "Imagem inválida: use um arquivo de imagem ou uma URL https://." };
      const l = this.listar(), id = d.id && l.some((x) => x.id === d.id) ? d.id : "custom_item_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const reg = { id, nome, categoria: CATEGORIAS.some((c) => c[0] === d.categoria && c[0] !== "personalizado") ? d.categoria : "equipamento", desc: String(d.desc || "").slice(0, 1500), peso: Math.max(0, num(d.peso, 0)), custo: num(d.custoV, 0) > 0 ? { v: num(d.custoV), u: MOEDAS[d.custoU] ? d.custoU : "gp" } : null, imagem: img || null, atualizado: Date.now() };
      const k = l.findIndex((x) => x.id === id); if (k >= 0) l[k] = reg; else l.push(reg);
      return this.gravar(l) ? { ok: true, id } : { ok: false, erro: "Não foi possível guardar (armazenamento do navegador indisponível)." };
    },
    excluir(id) { return this.gravar(this.listar().filter((x) => x.id !== id)); },
  };
  function deCustom(c) { return { id: c.id, nome: c.nome, en: "", categoria: "personalizado", subtipo: c.categoria, custom: true, desc: c.desc, peso: c.peso, custo: c.custo || undefined, imagem: c.imagem || null }; }

  /* ---------- textos ---------- */
  const custoTexto = (it) => (it && it.custo ? `${num(it.custo.v).toLocaleString("pt-BR")} ${MOEDAS[it.custo.u] || it.custo.u}` : null);
  const custoEmPO = (it) => (it && it.custo ? num(it.custo.v) * (EM_PO[it.custo.u] || 1) : null);
  const danoTexto = (d) => (d ? `${d.dado} ${DANOS[d.tipo] || d.tipo}` : null);
  const mTexto = (n) => `${num(n).toLocaleString("pt-BR")} m`;
  function pesoPacote(it) { return (it.pacote || []).reduce((s, c) => s + num(c.qtd) * num((obter(c.id) || {}).peso, 0), 0); }
  const pesoDe = (it) => (it.pacote ? pesoPacote(it) : it.peso);
  function componentes(it) { return (it.pacote || []).map((c) => { const x = obter(c.id) || {}; return { id: c.id, nome: x.nome || c.id, qtd: c.qtd, peso: num(x.peso, 0) }; }); }
  /* linhas factuais da ficha, tiradas só dos campos do catálogo */
  function linhas(it) {
    const L = [], p = it.arma, a = it.armadura;
    L.push(["Categoria", it.custom ? "Personalizado · " + rotuloCat(it.subtipo) : rotuloCat(it.categoria) + (it.subtipo && SUBTIPOS[it.subtipo] && !["arma", "armadura", "escudo", "pocao", "pergaminho", "magico"].includes(it.categoria) ? " · " + SUBTIPOS[it.subtipo] : "")]);
    if (p) { L.push(["Tipo de arma", SUBTIPOS[p.categoria + "-" + p.alcance] || ""]); if (p.dano) L.push(["Dano", danoTexto(p.dano)]); if (p.danoDuasMaos) L.push(["Dano com duas mãos", danoTexto(p.danoDuasMaos)]); if (p.propriedades.length) L.push(["Propriedades", p.propriedades.map((k) => PROPRIEDADES[k] || k).join(", ")]);
      if (p.alcanceM && p.alcance === "ranged") L.push(["Alcance", mTexto(p.alcanceM.normal) + (p.alcanceM.longo ? " / " + mTexto(p.alcanceM.longo) : "")]); else if (p.propriedades.includes("reach")) L.push(["Alcance", "3 m"]);
      if (p.arremessoM) L.push(["Arremesso", mTexto(p.arremessoM.normal) + " / " + mTexto(p.arremessoM.longo)]); }
    if (a) { L.push(["Classe de Armadura", a.categoria === "shield" ? "+" + a.ca : a.ca + (a.somaDes ? " + modificador de Destreza" + (a.maxDes != null ? " (máx. +" + a.maxDes + ")" : "") : "")]); if (a.forMin) L.push(["Força mínima", String(a.forMin)]); L.push(["Furtividade", a.furtividade ? "Desvantagem" : "Sem desvantagem"]); }
    if (it.cura) L.push(["Cura ao usar", it.cura]);
    if (it.lote) L.push(["Vendido em lotes de", String(it.lote)]);
    if (it.velocidade) L.push(["Velocidade", it.velocidade.v.toLocaleString("pt-BR") + " " + it.velocidade.u]);
    if (it.raridade) L.push(["Raridade", RARIDADES[it.raridade] || it.raridade]);
    if (it.sintonia != null && it.categoria !== "arma") L.push(["Sintonia", it.sintonia ? "Exige sintonia" : "Não exige sintonia"]);
    if (it.espaco) L.push(["Espaço do corpo", ESPACOS[it.espaco] || it.espaco]);
    const c = custoTexto(it); L.push(["Preço", c || "Não informado nas fontes"]);
    const ps = pesoDe(it); L.push(["Peso", ps != null && (ps > 0 || it.pacote) ? kg(ps) + " kg" : "Não informado nas fontes"]);
    return L;
  }
  /* ficha de leitura única: o catálogo e o inventário montam o mesmo `v` e chamam esta função */
  function fichaHTML(v) {
    const comp = v.componentes && v.componentes.length ? `<h4 class="sub">Conteúdo do conjunto</h4><ul class="inv-det-conjunto">${v.componentes.map((c, i) => `<li><span>${esc(c.nome)} <b>×${c.qtd}</b>${c.peso ? ` <span class="muted">${kg(c.qtd * c.peso)} kg</span>` : ""}</span>${v.acoesComponente ? `<span class="inv-comp-acoes"><button type="button" class="small" data-comp-retirar="${i}" title="Passa uma unidade para um item separado do inventário">Retirar 1</button><button type="button" class="small subtle" data-comp-consumir="${i}" title="Gasta uma unidade e registra o uso">Consumir 1</button></span>` : ""}</li>`).join("")}</ul>${v.notaConjunto ? `<p class="muted inv-nota">${esc(v.notaConjunto)}</p>` : ""}` : "";
    return `<div class="inv-det"><div class="inv-det-topo">${v.imagem ? `<img class="inv-det-img" src="${esc(v.imagem)}" alt="Imagem de ${esc(v.nome)}" referrerpolicy="no-referrer" data-titulo="${esc(v.nome)}">` : `<span class="inv-det-img vazio" aria-hidden="true">${window.ico ? window.ico(ICONE[v.categoria] || "bag") : ""}</span>`}
        <div><h3>${esc(v.nome)}</h3><p class="muted">${esc(v.subtitulo || "")}</p>${v.selo ? `<span class="inv-selo">${esc(v.selo)}</span>` : ""}</div></div>
      ${v.desc ? `<h4 class="sub">Descrição</h4><p class="descricao-regra inv-det-desc">${esc(v.desc)}</p>` : (v.lacunaDesc ? '<p class="muted inv-nota">O SRD 5.1 não traz descrição textual para este item nos dados do Compêndio. Você pode registrar a sua própria descrição ao editar o item no inventário.</p>' : "")}
      ${v.efeitos && v.efeitos.length ? `<h4 class="sub">Efeitos</h4><ul class="inv-det-efeitos">${v.efeitos.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>` : ""}
      ${comp}
      <dl class="inv-det-dados">${(v.dados || []).map(([k, x]) => `<div><dt>${esc(k)}</dt><dd>${esc(x)}</dd></div>`).join("")}</dl>${v.extraHTML || ""}${v.rodape ? `<p class="muted inv-nota">${esc(v.rodape)}</p>` : ""}</div>`;
  }
  const subtituloDe = (it) => [it.custom ? rotuloCat(it.subtipo) : rotuloCat(it.categoria), it.raridade ? RARIDADES[it.raridade] : null, it.custom ? "Personalizado" : null].filter(Boolean).join(" · ");
  const rodapeFonte = (it) => (it.custom ? "Item personalizado, guardado neste aparelho." : "Fonte: SRD 5.1 (CC BY 4.0). Pesos em kg e distâncias em metros (conversão do Compêndio); o nome em português é tradução do projeto" + (it.en ? ` (original: ${it.en}).` : "."));
  function viewDoCatalogo(it, imagem) {
    return { nome: it.nome, categoria: it.categoria, imagem, subtitulo: subtituloDe(it), desc: it.desc || null, lacunaDesc: !it.custom && !it.desc, dados: linhas(it), componentes: it.pacote ? componentes(it) : null, notaConjunto: it.pacote ? "Pacote de equipamentos: ao adicionar ao inventário, cada componente entra como item individual (com ID, peso e imagem próprios), identificado como parte deste pacote." : (it.categoria === "kit" ? "Kit: é um item único (as ferramentas e os suprimentos que o compõem não são itens separados)." : null), rodape: rodapeFonte(it) };
  }

  /* ---------- busca e filtros ---------- */
  function filtrar(itens, f = {}) {
    const q = sem(f.q || "").trim(), partes = q ? q.split(/\s+/) : [];
    return itens.filter((i) => {
      if (f.cat && i.categoria !== f.cat) return false;
      if (f.sub && i.subtipo !== f.sub) return false;
      if (f.raridade && i.raridade !== f.raridade) return false;
      if (f.sintonia === "sim" && !i.sintonia) return false; if (f.sintonia === "nao" && (i.sintonia || !i.raridade)) return false;
      if (f.prop && !(i.arma && i.arma.propriedades.includes(f.prop))) return false;
      if (partes.length) { const palheiro = sem([i.nome, i.en, i.desc, rotuloCat(i.categoria), i.subtipo && SUBTIPOS[i.subtipo]].filter(Boolean).join(" ")); if (!partes.every((p) => palheiro.includes(p))) return false; }
      return true;
    }).sort((a, b) => sem(a.nome).localeCompare(sem(b.nome), "pt-BR"));
  }
  const contagemPorCategoria = () => { const c = {}; for (const i of lista || []) c[i.categoria] = (c[i.categoria] || 0) + 1; return c; };

  /* ---------- conversão para o inventário ---------- */
  const tipoInventario = (it) => ({ pocao: "consumivel", magico: "magico", pergaminho: "outro" }[it.categoria] || "equipamento");
  /* Devolve o item de inventário já pronto (sem gravar). Itens com efeitos automatizados passam por ITENS_EFEITOS (aprovados também no servidor);
     os demais levam só dados básicos, e a raridade, a sintonia e o resto são lidos do catálogo na hora de mostrar. */
  function paraInventario(it, qtd, origem) {
    const IV = window.INVENTARIO, IE = window.ITENS_EFEITOS, n = Math.max(1, Math.floor(num(qtd, 1))), po = custoEmPO(it);
    if (it.efeitos && IE && IE.CATALOGO[it.efeitos]) { const x = IE.itemDoCatalogo(it.efeitos, origem); x.qtd = n; x.catId = it.id; x.nome = it.nome; if (it.peso != null) x.peso = it.peso; if (po != null) x.preco = po; return x; }
    const x = IV.novoItem({ nome: it.nome, qtd: n, peso: pesoDe(it) || 0, tipo: it.custom ? "equipamento" : tipoInventario(it), ref: it.custom&&!it.global ? null : it.id, catId: it.custom&&!it.global ? null : it.id, origem: origem || { tipo: "jogo" }, preco: po, desc: it.custom ? it.desc || "" : "" });
    if (it.pacote) x.conjunto = componentes(it).map((c) => ({ ref: c.id, nome: c.nome, qtd: c.qtd, peso: c.peso }));
    return x;
  }
  /* Pacote de equipamentos -> lista de itens INDIVIDUAIS (um por componente, quantidade já multiplicada), cada um com origem {id:"pacote:<id>", nota:<nome do pacote>, pacote:{id,nome}}
     e os dados do próprio item (ID, peso, tipo). Só pacotes: kits de ferramentas e demais itens devolvem null e continuam sendo um item único. */
  function paraInventarioPacote(it, qtd, origem) {
    if (!it || it.categoria !== "pacote" || !it.pacote) return null;
    const n = Math.max(1, Math.floor(num(qtd, 1))), IV = window.INVENTARIO, orig = { ...(origem || { tipo: "jogo" }), id: "pacote:" + it.id, nota: it.nome, pacote: { id: it.id, nome: it.nome } };
    return it.pacote.map((c) => { const x = obter(c.id); return x ? paraInventario(x, num(c.qtd, 1) * n, orig) : IV.novoItem({ nome: c.id, qtd: num(c.qtd, 1) * n, peso: 0, ref: c.id, catId: c.id, origem: orig }); });
  }
  /* ---------- Item mágico e raridade: duas informações separadas ----------
     MÁGICO é classificação do catálogo (categoria magico, pocao ou pergaminho: no SRD todos têm raridade e nenhum item mundano tem) ou, para itens sem catálogo, o tipo do item
     (magico; pergaminho com magia) ou uma raridade escrita pelo mestre. RARIDADE é só o rótulo (Comum…Artefato) e a chave de cor do indicador; não define se o item é mágico. */
  const CATEGORIAS_MAGICAS = ["magico", "pocao", "pergaminho"];
  const RAR_CHAVE = { common: "comum", uncommon: "incomum", rare: "rara", "very-rare": "muito-rara", legendary: "lendaria", artifact: "artefato" };
  const RAR_ROTULO = { comum: "Comum", incomum: "Incomum", rara: "Rara", "muito-rara": "Muito rara", lendaria: "Lendária", artefato: "Artefato" };
  const RAR_TEXTO = { comum: "comum", incomum: "incomum", raro: "rara", rara: "rara", "muito-raro": "muito-rara", "muito-rara": "muito-rara", lendario: "lendaria", lendaria: "lendaria", artefato: "artefato" };
  /* chave de cor a partir da chave do catálogo ("very-rare") ou do rótulo escrito à mão ("Muito raro"); desconhecido = sem cor */
  function chaveRaridade(x) { if (!x) return null; if (RAR_CHAVE[x]) return RAR_CHAVE[x]; return RAR_TEXTO[sem(x).trim().replace(/\s+/g, "-")] || null; }
  const ehMagicoCatalogo = (cat) => !!cat && !cat.custom && CATEGORIAS_MAGICAS.includes(cat.categoria);
  /* item do inventário -> { magico, raridade: {chave, rotulo} | null } */
  const RAR_PADRAO = { chave: "comum", rotulo: "Comum" };   // raridade padrão de EXIBIÇÃO; não altera dados nem a classificação mágica
  function infoMagica(it) {
    const cat = it ? doInventario(it) : null, pr = (it && it.propriedades) || {}, doCat = ehMagicoCatalogo(cat);
    const magico = doCat || !!(it && (it.tipo === "magico" || (it.tipo === "pergaminho" && it.magiaVinculada)));   // raridade preenchida NÃO torna o item mágico: são informações independentes
    const escrita = pr.raridade ? String(pr.raridade).trim() : "", chave = chaveRaridade(escrita) || (cat && cat.raridade ? RAR_CHAVE[cat.raridade] || null : null);
    const rotulo = escrita || (cat && cat.raridade ? RARIDADES[cat.raridade] || "" : "");
    return { magico, raridade: rotulo ? { chave, rotulo: chave && !escrita ? RAR_ROTULO[chave] : rotulo } : (it ? RAR_PADRAO : null) };   // sem raridade cadastrada: "Comum" só para exibir (nada é gravado)
  }
  /* indicador da raridade: texto sempre presente (a cor nunca é a única pista) */
  const seloRaridade = (r) => (r && r.rotulo ? `<span class="inv-raridade${r.chave ? " rar-" + r.chave : ""}" data-raridade="${esc(r.chave || "")}">${esc(r.rotulo)}</span>` : "");
  /* ID do catálogo para um nome digitado, só quando existe exatamente UM item com esse nome (ex.: "Bastão" é quarterstaff e rod: ambíguo, devolve null).
     Pacotes e itens personalizados ficam de fora; quem chama decide se usa o resultado. */
  function idPorNomeUnico(nome) {
    const k = sem(nome).trim(); if (!k) return null;
    let a; try { a = todos().filter((i) => !i.custom && i.categoria !== "pacote" && sem(i.nome).trim() === k); } catch (_) { return null; }
    return a.length === 1 ? a[0].id : null;
  }
  const pesoDoConjunto = (conj) => (conj || []).reduce((s, c) => s + num(c.qtd) * num(c.peso, 0), 0);

  window.CAT_ITENS = { CATEGORIAS, SUBTIPOS, ESPACOS, RARIDADES, PROPRIEDADES, ICONE, carregar, todos, obter, doInventario, personalizados, custoTexto, custoEmPO, pesoPacote, pesoDe, componentes, linhas, fichaHTML, viewDoCatalogo, filtrar, contagemPorCategoria, paraInventario, paraInventarioPacote, idPorNomeUnico, ehMagicoCatalogo, infoMagica, chaveRaridade, seloRaridade, CATEGORIAS_MAGICAS, pesoDoConjunto, rotuloCat, sem, esc, kg, indexar, subtituloDe };
})();
