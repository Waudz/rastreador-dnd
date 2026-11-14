/* Verificação ANÔNIMA e somente leitura da função catalogo_imagens_publicas() no projeto configurado em js/config-nuvem.js.
   Usa apenas a chave publicável (a mesma que qualquer visitante tem no navegador); não grava nada e não lê dados de usuários.
   Uso: node ferramentas/verificar-imagens-publicas.cjs   (código de saída 0 = tudo certo; 1 = alguma verificação falhou) */
const fs = require("node:fs"), path = require("node:path");
const cfg = fs.readFileSync(path.join(__dirname, "..", "js", "config-nuvem.js"), "utf8");
const URL = /url:\s*"([^"]+)"/.exec(cfg)[1], CHAVE = /chave:\s*"([^"]+)"/.exec(cfg)[1];
const falhas = [], ok = (c, m) => { console.log((c ? "OK   " : "FALHA ") + m); if (!c) falhas.push(m); };
(async () => {
  console.log("Projeto:", URL);
  /* 1) a função, sem autenticação */
  const r = await fetch(URL + "/rest/v1/rpc/catalogo_imagens_publicas", { method: "POST", headers: { apikey: CHAVE, "Content-Type": "application/json" }, body: "{}" });
  const txt = await r.text(); let lista = null; try { lista = JSON.parse(txt); } catch (_) { /* resposta não JSON */ }
  ok(r.status === 200, "RPC sem login responde 200 (veio " + r.status + (r.status !== 200 ? ": " + txt.slice(0, 200) : "") + ")");
  ok(Array.isArray(lista), "o retorno é um array");
  if (Array.isArray(lista)) {
    const campos = lista.every((e) => e && typeof e === "object" && Object.keys(e).sort().join(",") === "chave,imagem,tipo");
    ok(campos, "cada registro tem exatamente os campos tipo, chave e imagem (" + lista.length + " registros)");
    ok(lista.every((e) => e.tipo === "item" || e.tipo === "monstro"), "tipo só item ou monstro");
    ok(lista.every((e) => typeof e.chave === "string" && /^[A-Za-z0-9_:/.-]{1,180}$/.test(e.chave)), "chaves no formato esperado");
    ok(lista.every((e) => e.imagem === null || (typeof e.imagem === "string" && new RegExp("^" + (e.tipo === "item" ? "itens" : "monstros") + "/[0-9a-f-]{36}\\.(jpg|png|webp)$").test(e.imagem))), "imagem é null ou caminho do bucket do mesmo tipo");
    ok(!/"dados"|"nome"|"desc"|"excluido"|"versao"/.test(txt), "nenhum campo de dados do catálogo no retorno");
    const amostra = lista.find((e) => e.imagem);
    if (amostra) { const a = await fetch(URL + "/storage/v1/object/public/catalogos/" + amostra.imagem.split("/").map(encodeURIComponent).join("/"), { method: "HEAD" }); ok(a.status === 200, "um arquivo de imagem do retorno abre sem login (HEAD " + a.status + ")"); }
    else console.log("INFO  nenhuma imagem cadastrada ainda: nada para abrir");
  }
  /* 2) a tabela continua fechada para visitantes */
  const t = await fetch(URL + "/rest/v1/catalogo_publicado?select=atualizado_em&id=eq.2014", { headers: { apikey: CHAVE } });
  const tt = await t.text();
  ok(t.status === 401 && /42501/.test(tt), "leitura direta de catalogo_publicado continua negada (HTTP " + t.status + ")");
  const t2 = await fetch(URL + "/rest/v1/catalogo_publicado?select=*", { headers: { apikey: CHAVE } });
  ok(t2.status === 401, "select * na tabela também negado (HTTP " + t2.status + ")");
  console.log(falhas.length ? "\nRESULTADO: " + falhas.length + " verificação(ões) falharam" : "\nRESULTADO: tudo certo");
  process.exit(falhas.length ? 1 : 0);
})().catch((e) => { console.error("erro:", e.message); process.exit(1); });
