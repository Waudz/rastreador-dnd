/* Esqueletos de carregamento (skeleton screens): um único sistema para o site e para a PWA.
   Cada tipo reproduz a estrutura real da tela que ele antecede, usando as mesmas classes (.panel, .card, .cards, .tabs...),
   então ocupa as mesmas posições e a troca pelo conteúdo definitivo não desloca nada. Só deve existir onde há espera REAL por dados
   (rede); conteúdo que já está no aparelho não usa esqueleto. As páginas com carregamento de rede trazem o esqueleto no próprio HTML
   (marcadores <!--esq:tipo-->) para aparecer na primeira pintura; tests/esqueleto.test.cjs garante que o HTML e este arquivo não divergem. */
(() => {
  "use strict";
  const e = (c) => `<span class="esq ${c}"></span>`;
  const repetir = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join("");

  const TIPOS = {
    /* abas (dentro de #abas) e cartões de personagens (campanha.html) */
    abas: () => repetir(4, () => e("esq-aba")),
    campanha: () => `<div class="bar esq-ferramentas" aria-hidden="true"><span class="grow"></span>${e("esq-botao esq-botao-solto")}${e("esq-botao esq-botao-solto")}</div><div class="cards" aria-hidden="true">${repetir(3, () => TIPOS.cartaoPersonagem())}</div>`,
    seletor: () => `<span class="esq esq-seletor" aria-hidden="true"></span>`,
    cartaoPersonagem: () => `<div class="card personagem-card esq-cartao">${e("esq-linha curta")}${e("esq-linha media")}${e("esq-linha")}${e("esq-barra")}<div class="esq-acoes">${e("esq-botao")}${e("esq-botao")}</div></div>`,
    /* lista de campanhas (cartões curtos) */
    campanhas: (n) => `<div class="cards" aria-hidden="true">${repetir(n || 2, () => `<div class="card esq-cartao esq-uma">${e("esq-linha media")}</div>`)}</div>`,
    /* biblioteca de personagens (cartões com retrato) */
    personagens: (n) => `<div class="cards" aria-hidden="true">${repetir(n || 3, () => `<div class="card esq-cartao esq-biblioteca"><div class="esq-identidade">${e("esq-retrato")}<div>${e("esq-linha media")}${e("esq-linha curta")}</div></div>${e("esq-linha media")}${e("esq-barra")}</div>`)}</div>`,
    /* ficha de personagem (personagem.html): resumo, três números, pontos de vida, abas e atributos */
    ficha: () => `<div class="esq-ficha" aria-hidden="true"><div class="esq-identidade esq-resumo">${e("esq-retrato esq-retrato-grande")}<div>${e("esq-eyebrow")}${e("esq-titulo")}${e("esq-linha media")}</div></div>`
      + `<div class="esq-trio">${repetir(3, () => `<div class="panel esq-caixa">${e("esq-linha curta")}${e("esq-numero")}</div>`)}</div>`
      + `<div class="panel esq-pv">${e("esq-linha curta")}${e("esq-barra")}<div class="esq-acoes">${e("esq-botao")}${e("esq-botao")}${e("esq-botao")}</div></div>`
      + `<div class="esq-pilulas">${repetir(5, () => e("esq-pilula"))}</div>`
      + `<div class="esq-trio">${repetir(6, () => `<div class="panel esq-caixa esq-atributo">${e("esq-linha curta")}${e("esq-numero")}</div>`)}</div></div>`,
    /* criador de personagem (criar-personagem.html): conteúdo da etapa */
    criador: () => `<div aria-hidden="true">${e("esq-titulo")}${repetir(4, (i) => e("esq-linha" + (i % 2 ? " media" : "")))}<div class="esq-trio">${repetir(3, () => `<div class="card esq-cartao esq-curto">${e("esq-linha media")}${e("esq-linha curta")}</div>`)}</div></div>`,
    /* lista curta com retrato (personagens da campanha na iniciativa, seletor de campanha) */
    lista: (n) => `<div class="esq-lista" aria-hidden="true">${repetir(n || 3, () => `<div class="esq-item">${e("esq-retrato esq-retrato-pequeno")}<div>${e("esq-linha media")}${e("esq-linha curta")}</div></div>`)}</div>`,
    linhas: (n) => `<div aria-hidden="true">${repetir(n || 3, (i) => e("esq-linha" + (i % 2 ? " media" : "")))}</div>`
  };

  const html = (tipo, n) => (TIPOS[tipo] || TIPOS.linhas)(n);
  const aviso = (rotulo) => `<span class="sr-only" role="status">${rotulo || "Carregando…"}</span>`;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* troca o conteúdo de um elemento por um esqueleto e o marca como ocupado para leitores de tela */
  function mostrar(el, tipo, rotulo, n) { if (!el) return; el.setAttribute("aria-busy", "true"); el.innerHTML = aviso(rotulo) + html(tipo, n); }
  function pronto(el) { if (el && el.removeAttribute) el.removeAttribute("aria-busy"); }
  /* falha ou lentidão: o esqueleto sai (nunca fica indefinidamente), aparece uma mensagem clara e a opção de tentar de novo.
     Nada é apagado e ninguém é desconectado: só esta área mostra o aviso. */
  const CONTA = " Sua conta continua conectada e nada foi apagado.";
  function erro(el, texto, tentar, rodape) {
    if (!el) return; pronto(el);
    el.innerHTML = `<p class="err esq-erro" role="alert">${esc(texto)}${rodape !== undefined ? rodape : /conectada|continuam salvos/.test(texto) ? "" : CONTA} <button type="button" class="small" data-esq-tentar>Tentar novamente</button></p>`;
    const b = el.querySelector && el.querySelector("[data-esq-tentar]"); if (b && tentar) b.onclick = () => tentar();
  }
  /* se os dados demoram mais que o limite, troca o esqueleto pelo aviso de lentidão; devolve a função que cancela a vigia */
  function vigiar(el, tentar, limite, texto) {
    const t = setTimeout(() => erro(el, texto || "A conexão está lenta e os dados ainda não chegaram.", tentar), limite || 20000);
    return () => clearTimeout(t);
  }
  window.ESQ = { html, mostrar, pronto, erro, vigiar, TIPOS: Object.keys(TIPOS) };
})();
