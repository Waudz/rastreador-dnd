/* Tela de abertura do Compêndio 5e (só na PWA instalada, uma vez por abertura).
   Roda no <head>, depois das folhas de estilo e antes da primeira pintura: a tela preta com o símbolo e um indicador discreto
   cobre a página enquanto ela monta o cabeçalho; ao ficar pronta (o conteúdo já vem com o esqueleto de carregamento ou com os dados),
   a tela sai de uma vez, sem atraso artificial. Não bloqueia: sai sozinha em no máximo 8 s, com ou sem erro de rede.
   A splash NATIVA do Android (ícone sobre background_color) acontece antes de qualquer página e é do sistema, não deste arquivo. */
(() => {
  "use strict";
  const raiz = document.documentElement;
  let instalada = false, guarda = null;
  try {
    instalada = ["standalone", "fullscreen", "minimal-ui"].some((m) => matchMedia("(display-mode: " + m + ")").matches) || navigator.standalone === true;
  } catch (_) {}
  const teste = /[?&]splash=1(&|$)/.test(location.search);     // permite ver a abertura fora da PWA instalada (verificação)
  if (!instalada && !teste) return;
  try {
    guarda = window.sessionStorage;                              // "já mostrei nesta abertura": sem armazenamento da sessão, não mostra (evitaria repetir a cada página)
    if (!teste && guarda.getItem("splash_vista") === "1") return;
  } catch (_) { return; }
  raiz.classList.add("splash");
  try { const l = document.createElement("link"); l.rel = "preload"; l.as = "image"; l.href = "icones/compendio-logo-192.png"; document.head.appendChild(l); } catch (_) {}
  let saiu = false;
  const sair = () => {
    if (saiu) return; saiu = true;
    raiz.classList.remove("splash");
    try { guarda.setItem("splash_vista", "1"); } catch (_) {}      // só marca quando de fato apareceu e saiu: um redirecionamento antes disso repete a abertura na página seguinte
  };
  /* a página avisa quando o cabeçalho está montado; dois quadros depois já foi pintado por baixo */
  window.SPLASH = { pronto: () => { (window.requestAnimationFrame || setTimeout)(() => (window.requestAnimationFrame || setTimeout)(sair)); } };
  setTimeout(sair, 8000);
})();
