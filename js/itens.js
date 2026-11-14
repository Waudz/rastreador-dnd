/* Aba Itens: catálogo de itens do SRD 5.1 (2014) com busca, filtros, lista/grade, detalhes e itens personalizados. Dados e ficha em js/catalogo-itens.js. */
(() => {
  "use strict";
  const C = window.CAT_ITENS, II = window.INV_IMG, $ = (s) => document.querySelector(s), esc = C.esc;
  const PAGINA = 48, VISTA = "dnd5e_itens_vista";
  const estado = { q: "", cat: "", sub: "", raridade: "", prop: "", sintonia: "", mostrar: PAGINA, vista: "lista" };
  try { estado.vista = localStorage.getItem(VISTA) === "grade" ? "grade" : "lista"; } catch (_) { /* sem armazenamento */ }
  let atual = [];
  const ico = (n) => (window.ico ? window.ico(n) : "");
  /* imagem do item: a do aparelho (biblioteca por referência do catálogo) ou a do item personalizado; sem ela, o ícone da categoria */
  const imagemDe=it=>window.CATALOGO?.imagem('item',it.id)??(it.custom?it.imagem:null)??null;
  const miniatura = (it) => { const src = imagemDe(it); return src ? `<img class="inv-thumb-img" src="${esc(src)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ico(C.ICONE[it.categoria] || "bag"); };
  /* linha secundária do cartão (HTML): categoria, tag Mágico, raridade (indicador com cor própria), preço e peso; mágico e raridade são informações separadas */
  const meta = (it) => { const p = C.pesoDe(it), c = C.custoTexto(it), mg = C.ehMagicoCatalogo(it), rar = it.raridade ? C.RARIDADES[it.raridade] : "Comum";   // sem raridade cadastrada: "Comum" só na exibição
    return [esc(C.rotuloCat(it.categoria)), mg ? '<span class="inv-magico-tag">Mágico</span>' : null, rar ? C.seloRaridade({ chave: C.chaveRaridade(it.raridade) || (it.raridade ? null : "comum"), rotulo: rar }) : null, c ? esc(c) : null, p != null && p > 0 ? esc(C.kg(p) + " kg") : null].filter(Boolean).join(" · "); };

  /* linha mecânica do cartão: a mesma do inventário (INV_RESUMO.mecanico: dano, tipo de dano, propriedades, alcance, CA, cura) mais o que o catálogo já registra (furtividade, sintonia, espaço do corpo, lote, velocidade).
     Só dados existentes: sem dado, não mostra nada e nunca inventa descrição. Itens personalizados mostram a descrição que o próprio usuário escreveu. */
  const limpa = (s) => String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  function mecanicaDe(it) {
    if (it.custom) return limpa(it.desc);
    const RS = window.INV_RESUMO, rows = C.linhas(it), L = (k) => { const r = rows.find((x) => x[0] === k); return r ? limpa(r[1]) : ""; };
    const base = RS ? RS.mecanico({}, it, []) : "", extra = [];
    if (it.armadura && L("Furtividade") === "Desvantagem") extra.push("Desvantagem em Furtividade");
    if (it.sintonia === true) extra.push("Exige sintonia");
    if (L("Espaço do corpo")) extra.push("Espaço: " + L("Espaço do corpo"));
    if (it.lote) extra.push("Lote de " + it.lote);
    if (it.velocidade) extra.push("Velocidade " + L("Velocidade"));
    return [base, ...extra].filter(Boolean).join(" · ");
  }
  function cartao(it) {
    const id = esc(it.id), mec = mecanicaDe(it);
    return `<div class="item-inv inv-card itens-card${C.ehMagicoCatalogo(it) ? " item-magico" : ""}" data-it="${id}"><button type="button" class="inv-thumb${imagemDe(it) ? "" : " vazio"}" data-it-det="${id}" aria-label="Abrir os detalhes de ${esc(it.nome)}" title="Ver detalhes">${miniatura(it)}</button>
      <div class="inv-corpo"><div class="inv-titulo"><button type="button" class="inv-nome-btn" data-it-det="${id}" title="Ver detalhes"><b class="inv-nome-txt">${esc(it.nome)}</b></button>${mec ? `<span class="inv-mec">${esc(mec)}</span>` : ""}</div>
      <div class="inv-meta muted">${meta(it)}</div>${it.pacote ? '<div class="inv-meta muted">Conjunto de ' + it.pacote.length + " componentes</div>" : ""}</div></div>`;
  }
  function desenhar() {
    const lista = C.filtrar(C.todos(), estado); atual = lista;
    const mostra = lista.slice(0, estado.mostrar), el = $("#it-lista");
    el.className = "itens-lista" + (estado.vista === "grade" ? " inv-grade" : "");
    el.innerHTML = mostra.length ? mostra.map(cartao).join("") : '<p class="muted">Nenhum item encontrado. Ajuste a busca ou limpe os filtros.</p>';
    $("#it-status").textContent = `${lista.length} ${lista.length === 1 ? "item" : "itens"}${mostra.length < lista.length ? ` · mostrando ${mostra.length}` : ""}`;
    $("#it-mais").hidden = mostra.length >= lista.length;
    renderItensExcluidos();
    document.querySelectorAll("[data-it-vista]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.itVista === estado.vista)));
    document.querySelectorAll("[data-it-vista]").forEach((b) => b.classList.toggle("ativo", b.dataset.itVista === estado.vista));
  }
  function renderItensExcluidos() {
    let box = document.getElementById('itens-globais-excluidos');
    if (!box) {
      box = document.createElement('section'); box.id = 'itens-globais-excluidos';
      box.style.marginTop = '16px';
      $('#it-lista').insertAdjacentElement('afterend', box);
    }
    if (!window.CATALOGO?.admin()) { box.hidden = true; box.innerHTML = ''; return; }
    const lista = (window.CATALOGO.registros('item') || []).filter(r => r.excluido);
    box.hidden = !lista.length;
    box.innerHTML = lista.length ? `<details><summary>Itens excluídos do catálogo global (${lista.length})</summary><p class="muted">Restaurar torna o item visível novamente para todos os usuários.</p>${lista.map(r => `<div class="res"><span>${esc(r.dados?.nome || r.chave)}</span><button type="button" class="small" data-it-restaurar="${esc(r.chave)}">Restaurar</button></div>`).join('')}</details>` : '';
  }
  function montarFiltros() {
    const cont = C.contagemPorCategoria(), cust = C.personalizados.listar().length;
    $("#it-cat").innerHTML = '<option value="">Todas as categorias</option>' + C.CATEGORIAS.filter((c) => c[0] !== "personalizado").map(([k, n]) => `<option value="${k}">${esc(n)} (${cont[k] || 0})</option>`).join("") + `<option value="personalizado">Personalizados (${cust})</option>`;
    $("#it-rar").innerHTML = '<option value="">Raridade: qualquer</option>' + Object.entries(C.RARIDADES).map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join("");
    $("#it-prop").innerHTML = '<option value="">Propriedade de arma: qualquer</option>' + Object.entries(C.PROPRIEDADES).map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join("");
    subtipos();
  }
  function subtipos() {
    const s = $("#it-sub"), tipos = [...new Set((C.todos() || []).filter((i) => i.categoria === estado.cat && i.subtipo && C.SUBTIPOS[i.subtipo]).map((i) => i.subtipo))];
    s.hidden = !tipos.length; s.innerHTML = '<option value="">Tipo: qualquer</option>' + tipos.map((k) => `<option value="${k}">${esc(C.SUBTIPOS[k])}</option>`).join(""); s.value = estado.sub;
  }

  /* ---------- janelas ---------- */
  function modal(html, rotulo) {
    document.getElementById("it-modal")?.remove();
    const ov = document.createElement("div"); ov.id = "it-modal"; ov.className = "inv-ov"; ov.innerHTML = `<div class="crop-box inv-modal-box itens-modal" role="dialog" aria-modal="true" aria-label="${esc(rotulo)}">${html}</div>`;
    const fim = () => { document.removeEventListener("keydown", tecla, true); ov.remove(); };
    const tecla = (e) => { if (e.key === "Escape" && !document.querySelector(".vi-ov")) { e.stopPropagation(); fim(); } };
    ov.addEventListener("click", (e) => { if (e.target === ov || e.target.closest("[data-modal-fechar]")) fim(); });
    document.body.appendChild(ov); document.addEventListener("keydown", tecla, true);
    return { ov, fim };
  }
  function detalhes(id) {
    const it = C.obter(id); if (!it) return;
    const img = imagemDe(it), v = C.viewDoCatalogo(it, img), pers = it.custom;
    const acoes = !window.CATALOGO?.admin()?'' : pers ? `<button type="button" class="small" data-it-editar>Editar</button><button type="button" class="small danger" data-it-excluir>Excluir</button>`
      : `<button type="button" class="small" data-it-editar>Editar informações</button><button type="button" class="small danger" data-it-excluir>Excluir</button><button type="button" class="small" data-it-img>${img ? "Trocar a imagem" : "Adicionar imagem"}</button>${img ? '<button type="button" class="small subtle" data-it-img-rm>Remover imagem</button>' : ""}`;
    const { ov, fim } = modal(C.fichaHTML(v) + `<div class="row inv-det-acoes">${acoes}<button type="button" class="small subtle" data-modal-fechar>Fechar</button></div><p class="muted inv-nota itens-dica">Para levar este item à ficha, use <b>+ Adicionar item</b> na aba Inventário do personagem.</p><div class="err" role="alert" id="it-erro"></div>`, "Detalhes do item");
    const erro = (m) => { const e = ov.querySelector("#it-erro"); if (e) e.textContent = m || ""; };
    ov.addEventListener("click", async (e) => {
      const b = e.target.closest("button"); if (!b) return;try{
      if (b.hasAttribute("data-it-editar")) { fim(); formulario(it); }
      else if (b.hasAttribute("data-it-excluir")) { fim(); confirmarExcluir(it); }
      else if (b.hasAttribute("data-it-img-rm")) { await CATALOGO.salvar('item',it.id,null,{imagem:null}); fim(); desenhar(); detalhes(id); }
      else if(b.hasAttribute('data-it-img'))escolherImagem(async src=>{await CATALOGO.salvar('item',it.id,null,{imagem:src});fim();desenhar();detalhes(id);},erro);
      } catch (ex) { erro(ex.message || 'Não foi possível alterar a imagem.'); }
    });
  }
  /* upload do aparelho (com recorte) ou URL https; devolve a imagem pronta */
  function escolherImagem(aoEscolher, erro) {
    const f = document.createElement("input"); f.type = "file"; f.accept = "image/*";
    f.onchange = async () => { const file = f.files && f.files[0]; if (!file) return; try { const rec = await window.recortarFoto(file,1024); if (!rec) return; await aoEscolher(rec); } catch (_) { erro("Não foi possível ler essa imagem."); } };
    f.click();
  }
  function formulario(it) {
    if(!window.CATALOGO?.admin())return;
    const ed = it ? { nome: it.nome, categoria: it.custom?it.subtipo:it.categoria, desc: it.desc, peso: it.peso, custo: it.custo, imagem: it.imagem } : { custo: null };
    let imagem = imagemDe(it||{})||"",imagemAlterada=false;
    const cats = C.CATEGORIAS.filter((c) => c[0] !== "personalizado");
    const { ov, fim } = modal(`<h3>${it ? "Editar item personalizado" : "Criar item personalizado"}</h3>
      <label>Nome<input id="cf-nome" maxlength="120" value="${esc(ed.nome || "")}"></label>
      <label>Categoria<select id="cf-cat">${cats.map(([k, n]) => `<option value="${k}"${(ed.categoria || "equipamento") === k ? " selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
      <label>Descrição (aparência, história, funcionamento conhecido)<textarea id="cf-desc" rows="4" maxlength="1500">${esc(ed.desc || "")}</textarea></label>
      <div class="row"><label>Peso (kg)<input id="cf-peso" class="num" type="number" min="0" step="0.1" value="${ed.peso != null ? ed.peso : 0}"></label><label>Preço<input id="cf-preco" class="num" type="number" min="0" step="any" value="${ed.custo ? ed.custo.v : ""}"></label><label>Moeda<select id="cf-moeda"><option value="gp"${!ed.custo || ed.custo.u === "gp" ? " selected" : ""}>PO</option><option value="sp"${ed.custo && ed.custo.u === "sp" ? " selected" : ""}>PP</option><option value="cp"${ed.custo && ed.custo.u === "cp" ? " selected" : ""}>PC</option></select></label></div>
      <div class="row inv-img-url"><span class="inv-thumb${imagem ? "" : " vazio"}" id="cf-prev" style="width:56px;height:56px;cursor:default">${imagem ? `<img class="inv-thumb-img" src="${esc(imagem)}" alt="">` : ico("bag")}</span><button type="button" class="small" id="cf-arq">Enviar imagem</button><input id="cf-url" type="url" maxlength="480" placeholder="ou endereço https://…" style="flex:1 1 160px;min-width:0"><button type="button" class="small" id="cf-usar-url">Usar endereço</button><button type="button" class="small subtle" id="cf-rm">Sem imagem</button></div>
      <p class="muted inv-nota">Alterações deste catálogo são globais e aparecem para todos os usuários. Efeitos, raridade, sintonia, consumo e cargas são configurados pelo mestre no inventário do personagem (o servidor só aceita essas propriedades vindas do mestre).</p>
      <div class="err" role="alert" id="cf-erro"></div>
      <div class="row" style="justify-content:flex-end"><button type="button" class="small primary" id="cf-salvar">Salvar</button><button type="button" class="small subtle" data-modal-fechar>Cancelar</button></div>`, "Item personalizado");
    const erro = (m) => { ov.querySelector("#cf-erro").textContent = m || ""; }, prev = () => { ov.querySelector("#cf-prev").className = "inv-thumb" + (imagem ? "" : " vazio"); ov.querySelector("#cf-prev").innerHTML = imagem ? `<img class="inv-thumb-img" src="${esc(imagem)}" alt="">` : ico("bag"); };
    ov.querySelector("#cf-arq").onclick = () => escolherImagem((src) => { imagem = src;imagemAlterada=true; prev(); }, erro);
    ov.querySelector('#cf-usar-url').onclick=()=>erro('Envie um arquivo para guardá-lo no catálogo global.');
    ov.querySelector("#cf-rm").onclick = () => { imagem = "";imagemAlterada=true; prev(); };
    ov.querySelector("#cf-salvar").onclick = async () => {
      const botao=ov.querySelector("#cf-salvar");botao.disabled=true;try{
      const nome=ov.querySelector('#cf-nome').value.trim();if(!nome)throw Error('Informe o nome.');
      const id=it?.id||'custom_item_'+crypto.randomUUID(),categoria=ov.querySelector('#cf-cat').value;
      const valor={...(it||{}),id,nome,categoria:it&&!it.custom?categoria:'personalizado',subtipo:it&&!it.custom?it.subtipo:categoria,custom:it?!!it.custom:true,desc:ov.querySelector('#cf-desc').value.slice(0,1500),peso:Math.max(0,Number(ov.querySelector('#cf-peso').value)||0),custo:Number(ov.querySelector('#cf-preco').value)>0?{v:Number(ov.querySelector('#cf-preco').value),u:ov.querySelector('#cf-moeda').value}:null};
      await CATALOGO.salvar('item',id,valor,imagemAlterada?{imagem:imagem||null}:{});fim();montarFiltros();sincronizarSelects();desenhar();detalhes(id);
      }catch(e){erro(e.message);}finally{botao.disabled=false;}
    };
    ov.querySelector("#cf-nome").focus();
  }
  function confirmarExcluir(it) {
    const { ov, fim } = modal(`<h3>Excluir: ${esc(it.nome)}</h3><p>Remove este item do catálogo global. Itens que já estão em inventários de personagens não são alterados.</p><div class="row"><button type="button" class="danger" id="ex-ok">Excluir item</button><button type="button" class="small subtle" data-modal-fechar>Cancelar</button></div>`, "Excluir item");
    ov.querySelector("#ex-ok").onclick = async () => { const botao=ov.querySelector("#ex-ok");botao.disabled=true;try{await CATALOGO.salvar('item',it.id,null,{excluido:true}); fim(); montarFiltros(); sincronizarSelects(); desenhar();}catch(e){window.FEEDBACK?.mostrar(e.message,{erro:true});}finally{botao.disabled=false;} };
  }
  function sincronizarSelects() { $("#it-cat").value = estado.cat; $("#it-rar").value = estado.raridade; $("#it-prop").value = estado.prop; $("#it-sint").value = estado.sintonia; subtipos(); }

  /* ---------- eventos ---------- */
  let tq = null;
  document.addEventListener("input", (e) => { if (e.target.id !== "it-q") return; clearTimeout(tq); tq = setTimeout(() => { estado.q = e.target.value; estado.mostrar = PAGINA; desenhar(); }, 120); });
  document.addEventListener("change", (e) => {
    const id = e.target.id, mapa = { "it-cat": "cat", "it-sub": "sub", "it-rar": "raridade", "it-prop": "prop", "it-sint": "sintonia" };
    if (!mapa[id]) return; estado[mapa[id]] = e.target.value; if (id === "it-cat") { estado.sub = ""; subtipos(); } estado.mostrar = PAGINA; desenhar();
  });
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.itRestaurar) {
      if (!window.CATALOGO?.admin()) return;
      const key = b.dataset.itRestaurar, r = CATALOGO.registro('item', key);
      if (!r?.excluido || !confirm(`Restaurar “${r.dados?.nome || key}” para todos os usuários?`)) return;
      b.disabled = true;
      CATALOGO.salvar('item', key, null, { excluido: false })
        .then(() => { montarFiltros(); sincronizarSelects(); desenhar(); })
        .catch(e => window.FEEDBACK?.mostrar(e.message, { erro: true }))
        .finally(() => { b.disabled = false; });
    }
    else if (b.dataset.itDet) detalhes(b.dataset.itDet);
    else if (b.id === "it-mais") { estado.mostrar += PAGINA; desenhar(); }
    else if (b.id === "it-limpar") { Object.assign(estado, { q: "", cat: "", sub: "", raridade: "", prop: "", sintonia: "", mostrar: PAGINA }); $("#it-q").value = ""; sincronizarSelects(); desenhar(); }
    else if (b.id === "it-novo") formulario(null);
    else if (b.dataset.itVista) { estado.vista = b.dataset.itVista === "grade" ? "grade" : "lista"; try { localStorage.setItem(VISTA, estado.vista); } catch (_) { /* segue */ } desenhar(); }
  });
  window.addEventListener('catalogo:atualizado',()=>{if(!atual.length)return;montarFiltros();sincronizarSelects();desenhar();const aberto=document.querySelector('#it-modal [data-it-img]');if(aberto){/* próxima abertura usa o registro atualizado */}});
  window.ACESSO?.pronto.then(()=>{$('#it-novo').hidden=!CATALOGO.admin();});
  /* imagem indisponível (arquivo removido, rede ou bloqueio): volta ao ícone padrão da categoria, na lista, na grade e nos detalhes */
  document.addEventListener("error", (e) => {
    const im = e.target; if (!im || im.tagName !== "IMG") return;
    const ico = (cat) => (window.ico ? window.ico(C.ICONE[cat] || "bag") : "");
    if (im.classList.contains("inv-thumb-img")) { const b = im.closest(".inv-thumb"), c = im.closest("[data-it]"), it = c && C.obter(c.dataset.it); if (b) { b.classList.add("vazio"); b.innerHTML = ico(it && it.categoria); } }
    else if (im.classList.contains("inv-det-img")) { const sp = document.createElement("span"); sp.className = "inv-det-img vazio"; sp.setAttribute("aria-hidden", "true"); sp.innerHTML = ico("bag"); im.replaceWith(sp); }
  }, true);
  window.CATALOGO?.iniciar();
  C.carregar().then(() => { montarFiltros(); desenhar(); const id = new URLSearchParams(location.search).get("item"); if (id && C.obter(id)) detalhes(id); }).catch(() => { $("#it-status").textContent = "Não foi possível carregar o catálogo de itens. Tente novamente."; });
})();
