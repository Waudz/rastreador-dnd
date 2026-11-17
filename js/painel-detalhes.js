/* Painel de detalhes único (#dock-r). Três vistas possíveis, uma por vez: a ficha do personagem da campanha
   (#ci-resumo, iframe), a ficha de bestiário (#sheet) e a magia/habilidade (#spd).
   Abrir uma magia "por cima" de uma ficha esconde a ficha sem destruí-la (iframe e campos continuam vivos) e guarda
   a rolagem; "Voltar" restaura. "Fechar" sempre fecha o painel inteiro. */
(function (raiz) {
  "use strict";
  var VISTAS = ["ci-resumo", "sheet", "spd"];
  function criar(doc, avisar) {
    var anterior = null;                                   // { id, rolagens: [[elemento, scrollTop]] }
    function el(id) { return doc.querySelector("#" + id); }
    function rolantes(vista) {
      var l = [vista], extra = vista.querySelectorAll ? vista.querySelectorAll("#sheet-body, #spd-body, #ci-resumo-corpo") : [];
      for (var i = 0; i < extra.length; i++) l.push(extra[i]);
      return l;
    }
    function visivel() { for (var i = 0; i < VISTAS.length; i++) { var e = el(VISTAS[i]); if (e && !e.hidden) return e; } return null; }
    function atualizar(mostrando) {
      var v = el("spd-voltar"); if (v) v.hidden = !anterior;
      if (avisar) avisar();
      /* em janela estreita o painel fica empilhado abaixo da página: leva a tela até ele */
      if (mostrando && doc.body && doc.body.dataset && doc.body.dataset.painel === "empilhado") { var d = el("dock-r"); if (d && d.scrollIntoView) d.scrollIntoView({ block: "start" }); }
    }
    function esconderTodas(menos) { VISTAS.forEach(function (id) { var e = el(id); if (e && id !== menos) e.hidden = true; }); }
    /* mostra uma vista sozinha e esquece o histórico */
    function mostrar(id) { var e = el(id); if (!e) return; anterior = null; esconderTodas(id); e.hidden = false; atualizar(true); }
    /* mostra uma vista por cima da atual, lembrando como voltar */
    function empilhar(id) {
      var e = el(id); if (!e) return;
      var atual = visivel();
      if (atual && atual.id !== id) { anterior = { id: atual.id, rolagens: rolantes(atual).map(function (r) { return [r, r.scrollTop]; }) }; atual.hidden = true; }
      else if (!atual) anterior = null;
      esconderTodas(id); e.hidden = false; e.scrollTop = 0; atualizar(true);
    }
    function voltar() {
      if (!anterior) return fechar();
      var a = anterior, v = el(a.id); anterior = null;
      if (!v) return fechar();
      esconderTodas(a.id); v.hidden = false; atualizar(true);
      a.rolagens.forEach(function (r) { r[0].scrollTop = r[1]; });
      if (raiz.PAINEL_ESTADO) raiz.PAINEL_ESTADO.voltar();
      return a.id;
    }
    function fechar() { anterior = null; esconderTodas(null); atualizar(); if (raiz.PAINEL_ESTADO) raiz.PAINEL_ESTADO.limpar(); }
    return { encerrar: fechar, mostrar: mostrar, empilhar: empilhar, voltar: voltar, fechar: fechar, visivel: visivel, temAnterior: function () { return !!anterior; }, VISTAS: VISTAS };
  }
  if (raiz.addEventListener) raiz.addEventListener("message", function(e) {
    if (e.origin !== raiz.location.origin || !e.data || e.data.tipo !== "comp-modal-ficha") return;
    var frame=raiz.document.getElementById("ci-ficha-frame");
    if (!frame || e.source !== frame.contentWindow) return;
    var painel=raiz.document.getElementById("ci-resumo");
    if (painel) painel.classList.toggle("comp-modal-ativo", e.data.aberto === true);
  });
  var api = { criar: criar, VISTAS: VISTAS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else {
    /* o painel lateral continua aberto, com os mesmos dados, quando se troca de página na mesma guia (cada página restaura ao carregar) */
    var CHAVE = "compendio:painel-lateral";
    raiz.PAINEL_ESTADO = {
      ler: function () { try { var v = JSON.parse(raiz.sessionStorage.getItem(CHAVE) || "null"); return v && typeof v === "object" ? v : null; } catch (_) { return null; } },
      gravar: function (o) { try { raiz.sessionStorage.setItem(CHAVE, JSON.stringify(o)); } catch (_) { /* sem armazenamento: o painel só não persiste */ } },
      salvar: function (o) { var atual = this.ler(); if (o.t === "magia" && atual && atual.t !== "magia") o.base = atual; else if (o.t === "magia" && atual && atual.base) o.base = atual.base; this.gravar(o); },
      voltar: function () { var e = this.ler(); if (e && e.base) this.gravar(e.base); else this.limpar(); },
      limpar: function () { try { raiz.sessionStorage.removeItem(CHAVE); } catch (_) { /* nada a limpar */ } }
    };
    raiz.PainelDetalhes = api; raiz.PAINEL = criar(raiz.document, function () { if (raiz.reorganizarPaineis) raiz.reorganizarPaineis(); }); }
})(typeof window !== "undefined" ? window : this);
