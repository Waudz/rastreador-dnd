/* Roda no <head>, antes da primeira pintura, e só decide o ESTADO da página (qual vista, visitante ou não, altura do cabeçalho).
   Assim o CSS já mostra a vista certa desde o primeiro quadro: nada de conteúdo de outra aba piscando, título trocando
   depois ou o cabeçalho empurrando a página quando os scripts adiados terminam. Só lê o endereço e o armazenamento local. */
(() => {
  const el = document.documentElement, q = new URLSearchParams(location.search), aba = q.get("aba");
  const pagina = location.pathname.split("/").pop();
  if (pagina === "iniciativa.html") el.dataset.appView = ["monstros", "magias"].includes(aba) ? aba : aba === "consulta" ? "monstros" : "iniciativa";
  if (pagina === "conta.html" || pagina === "index.html" || pagina === "") el.dataset.contaAba = ["conta", "personagens"].includes(aba) ? aba : "campanhas";
  let logado = false, h = "", uid = "";
  try {
    const bruta = localStorage.getItem("nuvem_sessao_sdk") || localStorage.getItem("nuvem_sessao");
    logado = !!bruta;
    try { const s = JSON.parse(bruta || "null"); uid = String((s && (s.user && s.user.id || s.usuario && s.usuario.id)) || ""); } catch (_) {}
    h = localStorage.getItem("cab_h_" + (innerWidth < 760 ? "m" : "d")) || "";
  } catch (_) {}
  el.classList.toggle("visitante", !logado);
  /* Sem sessão guardada, páginas que só existem para quem tem conta nem chegam a montar: vão direto para o destino certo
     (antes, a página aparecia vazia por um instante e só depois os scripts redirecionavam). Links de e-mail (código, token, erro) seguem o fluxo normal. */
  const retornoDeLink = /(^|[?&#])(code|access_token|refresh_token|error|error_code|type|token_hash)=/.test(location.search + location.hash);
  if (!logado && !retornoDeLink && (pagina === "index.html" || pagina === "")) { location.replace("iniciativa.html"); return; }
  if (!logado && !retornoDeLink && pagina === "conta.html" && /^(\?[\w=&%.-]*)?$/.test(location.search)) { location.replace("entrar.html?voltar=" + encodeURIComponent("conta.html" + location.search)); return; }
  if (/^\d{2,3}$/.test(h)) el.style.setProperty("--cab-h-est", h + "px");
  /* Quem já tem sessão e abre a página inicial ("./", o endereço da PWA instalada) vai direto para a campanha ativa deste aparelho,
     sem passar pela tela de campanhas (decisão local, igual a CAMPANHAS_UI.entradaRapida; a página da campanha confere o acesso no servidor).
     Sem preferência local, a tela fica "verificando" (o conteúdo só aparece quando se sabe qual é o destino), em vez de mostrar a lista e depois pular. */
  if (logado && !retornoDeLink && (pagina === "index.html" || pagina === "" || pagina === "conta.html")) {
    const q2 = new URLSearchParams(location.search);
    const gerenciando = q2.get("gerenciar") === "1" || q2.get("acao") || ["conta", "personagens"].includes(q2.get("aba"));
    let id = "";
    try { const propria = uid ? localStorage.getItem("ini_campanha:" + uid) : null; id = propria !== null ? propria : (localStorage.getItem("ini_campanha") || ""); } catch (_) {}
    if (!gerenciando && uid && /^[\w-]{1,64}$/.test(id)) { location.replace("campanha.html?id=" + encodeURIComponent(id)); return; }
    el.classList.add("conta-verificando");
  }
})();
