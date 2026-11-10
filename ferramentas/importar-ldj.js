const PDFJS = "../vendor/pdfjs/"; // pdfjs-dist 4.4.168, pasta build/
const $ = (s) => document.querySelector(s);
const sem = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const POSSES = / de (bigby|tasha|otto|leomund|mordenkainen|otiluke|evard|tenser|nystul|melf|drawmij|rary)$/;
const fold = (s) => sem(s).toLowerCase().replace(/[:.,!?]/g, "").replace(/\s+/g, " ").trim().replace(POSSES, "");

const E = "(abjuração|adivinhação|conjuração|encantamento|evocação|ilusão|necromancia|transmutação)";
const RE_NIVEL = new RegExp(`^(?:(\\d)\\s*[º°ªo]?\\s*nível de ${E}|${E} de (\\d)\\s*[º°ªo]?\\s*nível|truque de ${E})\\s*(\\(ritual\\))?$`, "i");
const CAMPOS = [
  ["tempo", /^tempo de conjura[çc][ãa]o\s*:\s*/i],
  ["alcance", /^alcance\s*:\s*/i],
  ["comp", /^componentes\s*:\s*/i],
  ["dur", /^dura[çc][ãa]o\s*:\s*/i],
];
const LIXO = [/^\d{1,3}$/, /^cap[ií]tulo\s+\d+/i, /^parte\s+\d+\s*[|:]/i];
const MINUSC = new Set(["de", "da", "do", "das", "dos", "e", "a", "o", "as", "os", "em", "para", "com", "contra", "sem"]);
const titulo = (s) => s.toLowerCase().split(" ").map((p, i) => (i && MINUSC.has(p)) ? p : p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

// Vocabulário do PDF → vocabulário do rastreador (do mais específico ao mais geral)
const TROCAS = [
  [/\b(um|o|seu|no|do|desse|deste|esse|este|outro|novo) teste de resist[êe]ncia/gi, (m, a) => ({ um: "uma", o: "a", seu: "sua", no: "na", do: "da", desse: "dessa", deste: "desta", esse: "essa", este: "esta", outro: "outra", novo: "nova" })[a.toLowerCase()] + " salvaguarda"],
  [/\b(os|seus|nos|dos|esses|estes) testes de resist[êe]ncia/gi, (m, a) => ({ os: "as", seus: "suas", nos: "nas", dos: "das", esses: "essas", estes: "estas" })[a.toLowerCase()] + " salvaguardas"],
  [/\bTestes de resist[êe]ncia/g, "Salvaguardas"], [/\bTeste de resist[êe]ncia/g, "Salvaguarda"],
  [/\btestes de resist[êe]ncia/g, "salvaguardas"], [/\bteste de resist[êe]ncia/g, "salvaguarda"],
  [/salvaguarda bem-sucedido/g, "salvaguarda bem-sucedida"], [/salvaguardas bem-sucedidos/g, "salvaguardas bem-sucedidas"],
  [/salvaguarda fracassado/g, "salvaguarda fracassada"], [/salvaguardas fracassados/g, "salvaguardas fracassadas"],
  [/\bdano de fogo\b/g, "dano ígneo"], [/\bdano de frio\b/g, "dano gélido"], [/\bdano de concuss[ãa]o\b/g, "dano contundente"],
  [/\b(espaços? de magia de |magias? de )(\d+)\s*[º°]\s*nível/g, "$1$2º círculo"],
];
const normalizar = (s) => TROCAS.reduce((t, [re, por]) => t.replace(re, por), s);

let arquivo = null, resultado = null;
$("#arq").addEventListener("change", (e) => { arquivo = e.target.files[0] || null; $("#ir").disabled = !arquivo; });
$("#ir").addEventListener("click", () => importar().catch((e) => status("Erro: " + e.message, true)));
$("#baixar").addEventListener("click", () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(resultado, null, 1)], { type: "application/json" }));
  a.download = "traducao-ldj.json"; a.click();
});
function status(t, ruim) { $("#status").textContent = t; $("#status").className = ruim ? "bad" : "muted"; }

async function importar() {
  $("#ir").disabled = true; $("#res").hidden = true;
  const nome = arquivo.name.toLowerCase();
  if (nome.endsWith(".json")) {
    const d = JSON.parse(await arquivo.text());
    if (!d || !d.magias || typeof d.magias !== "object") throw new Error("este JSON não parece uma tradução exportada por esta ferramenta");
    salvar(d, []); return;
  }
  status("Lendo o arquivo…");
  const linhas = nome.endsWith(".pdf") ? await linhasDoPdf(arquivo) : (await arquivo.text()).split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  status("Separando as magias…");
  const { magias, avisos } = separar(linhas, $("#norm").checked);
  salvar({ v: 1, fonte: arquivo.name, importadoEm: Date.now(), normalizado: $("#norm").checked, magias }, avisos);
}

function salvar(dados, avisos) {
  const n = Object.keys(dados.magias).length;
  if (n < 300) avisos.unshift(`Só ${n} magias encontradas (o esperado é cerca de 360). Confira a amostra antes de usar.`);
  try { localStorage.setItem("ini_ldj", JSON.stringify(dados)); }
  catch (e) { throw new Error("não consegui salvar no navegador (espaço cheio?): " + e.message); }
  resultado = dados;
  status("Pronto. O rastreador já pode usar a tradução.");
  $("#resumo").textContent = `${n} magias salvas. Baixe o JSON e guarde-o: ele restaura a tradução sem precisar do PDF.`;
  $("#amostra").textContent = Object.values(dados.magias).slice(0, 3).map((m) =>
    `${m.n} — ${m.nivel ? m.nivel + "º círculo" : "Truque"} de ${m.escola}${m.ritual ? " (ritual)" : ""}\n` +
    `Tempo: ${m.tempo}\nAlcance: ${m.alcance}\nComponentes: ${m.comp}${m.mat ? " (" + m.mat + ")" : ""}\nDuração: ${m.dur}\n\n${m.d}`
  ).join("\n\n────────\n\n");
  $("#avisos").textContent = avisos.join("\n") || "Nenhum.";
  $("#res").hidden = false; $("#ir").disabled = false;
}

async function linhasDoPdf(arq) {
  const pdfjs = await import(PDFJS + "pdf.min.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.mjs";
  const pdf = await pdfjs.getDocument({ data: await arq.arrayBuffer() }).promise;
  const linhas = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const pg = await pdf.getPage(p), w = pg.getViewport({ scale: 1 }).width;
    const { items } = await pg.getTextContent();
    const cols = [[], []]; // o livro tem duas colunas: lê a esquerda inteira, depois a direita
    for (const it of items) {
      if (!it.str || !it.str.trim()) continue;
      const x = it.transform[4], y = it.transform[5];
      cols[x < w / 2 ? 0 : 1].push({ x, y, w: it.width || 0, s: it.str });
    }
    for (const col of cols) {
      col.sort((a, b) => b.y - a.y || a.x - b.x);
      let atual = null;
      for (const it of col) {
        if (atual && Math.abs(atual.y - it.y) < 3) atual.partes.push(it);
        else { if (atual) linhas.push(fecharLinha(atual.partes)); atual = { y: it.y, partes: [it] }; }
      }
      if (atual) linhas.push(fecharLinha(atual.partes));
    }
    if (p % 10 === 0) status(`Lendo o PDF… página ${p} de ${pdf.numPages}`);
    pg.cleanup();
  }
  return linhas.filter(Boolean);
}
function fecharLinha(partes) {
  partes.sort((a, b) => a.x - b.x);
  let t = "", fim = null;
  for (const p of partes) {
    if (fim !== null && p.x - fim > 1 && !t.endsWith(" ") && !p.s.startsWith(" ")) t += " ";
    t += p.s; fim = p.x + p.w;
  }
  return t.replace(/\s+/g, " ").trim();
}

function separar(todas, norm) {
  const avisos = [];
  let ini = todas.findIndex((l) => /as magias apresentadas abaixo/i.test(l));
  if (ini < 0) { avisos.push('Não achei "As magias apresentadas abaixo"; li o arquivo inteiro.'); ini = 0; }
  let fim = todas.findIndex((l, i) => i > ini && /^ap[êe]ndice\s+[a-e]\b/i.test(l));
  if (fim < 0) fim = todas.length;
  const ls = todas.slice(ini, fim).filter((l) => !LIXO.some((re) => re.test(l)));

  const inicios = [];
  for (let i = 0; i < ls.length - 1; i++) {
    if (RE_NIVEL.test(ls[i + 1]) && ls[i].length <= 50 && !/[.:;]$/.test(ls[i])) inicios.push(i);
  }
  const magias = {};
  inicios.forEach((i, k) => {
    let nomeBruto = ls[i];
    const ant = ls[i - 1];
    // nome quebrado em duas linhas (tudo em maiúsculas)
    if (ant && ant.length <= 40 && ant === ant.toUpperCase() && /[A-ZÀ-Ý]{3}/.test(ant) && !inicios.includes(i - 1) && nomeBruto === nomeBruto.toUpperCase()) nomeBruto = ant + " " + nomeBruto;
    const m = ls[i + 1].match(RE_NIVEL);
    const nivel = m[5] ? 0 : +(m[1] || m[4]);
    const escola = cap(m[2] || m[3] || m[5]);
    const ritual = !!m[6];
    const corpo = ls.slice(i + 2, k + 1 < inicios.length ? inicios[k + 1] : ls.length);
    const campos = { tempo: "", alcance: "", comp: "", dur: "" };
    let atual = null, j = 0;
    for (; j < corpo.length; j++) {
      const l = corpo[j], c = CAMPOS.find(([, re]) => re.test(l));
      if (c) { atual = c[0]; campos[atual] = l.replace(c[1], ""); continue; }
      if (atual === "dur" || !atual) break;           // depois da Duração começa a descrição
      campos[atual] += (campos[atual].endsWith("-") ? "" : " ") + l;
    }
    let d = juntar(corpo.slice(j));
    let mat = "";
    const mm = campos.comp.match(/\bM\s*\((.+)\)\s*$/);
    if (mm) { mat = mm[1].trim(); campos.comp = campos.comp.replace(/\s*\(.+\)\s*$/, "").trim(); }
    if (norm) { d = normalizar(d); mat = normalizar(mat); }
    const n = titulo(nomeBruto);
    const chave = fold(n);
    if (!campos.tempo || !campos.alcance || !campos.dur) avisos.push(`${n}: campo faltando (tempo/alcance/duração).`);
    if (!d) avisos.push(`${n}: sem descrição.`);
    if (magias[chave]) avisos.push(`${n}: nome repetido; mantive a primeira.`);
    else magias[chave] = { n, nivel, escola, ritual, tempo: campos.tempo.trim(), alcance: campos.alcance.trim(), comp: campos.comp.trim(), mat, dur: campos.dur.trim(), d };
  });
  return { magias, avisos };
}

function juntar(ls) {
  if (!ls.length) return "";
  const tam = ls.map((l) => l.length).sort((a, b) => a - b), med = tam[Math.floor(tam.length / 2)] || 60;
  let out = ls[0];
  for (let k = 1; k < ls.length; k++) {
    const l = ls[k], ant = ls[k - 1];
    const novoPar = /^em n[ií]veis superiores/i.test(l) || (/[.:!?]$/.test(ant) && ant.length < med * 0.75);
    if (novoPar) out += "\n\n" + l;
    else if (/[A-Za-zÀ-ÿ]-$/.test(out)) out = out.slice(0, -1) + l; // palavra hifenizada no fim da linha
    else out += " " + l;
  }
  return out;
}
