
/* Criador 2014: escolhas derivadas dos dados SRD, atributos base separados dos bônus. */
window.CRIADOR = (() => {
  "use strict";
  const R = window.REGRAS, ATR = R.ATR;
  const CUSTOS = {8:0,9:1,10:2,11:3,12:4,13:5,14:7,15:9};
  const SK = {"acrobatics":"acrobacia","animal-handling":"adestrar","arcana":"arcanismo","athletics":"atletismo","performance":"atuacao","deception":"enganacao","stealth":"furtividade","history":"historia","intimidation":"intimidacao","insight":"intuicao","investigation":"investigacao","medicine":"medicina","nature":"natureza","perception":"percepcao","persuasion":"persuasao","sleight-of-hand":"prestidigitacao","religion":"religiao","survival":"sobrevivencia"};
  const SUBS = {berserker:"Trilha do Berserker",lore:"Colégio do Conhecimento",life:"Domínio da Vida",land:"Círculo da Terra",champion:"Campeão","open-hand":"Caminho da Mão Espalmada",devotion:"Juramento de Devoção",hunter:"Caçador",thief:"Ladrão",draconic:"Linhagem Dracônica",fiend:"O Corruptor",evocation:"Escola de Evocação"};
  let D = {classes:[],features:[],items:[],subclasses:[]}, MAGIAS = [];
  const copiar = x => JSON.parse(JSON.stringify(x));
  const norm = x => String(x||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const slug = x => norm(x).replace(/['’]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  const idClasse = c => "srd51:class/"+String(c).toLowerCase();
  const classe = c => D.classes.find(x=>x.id===idClasse(c));
  const feature = id => D.features.find(x=>x.id===id);
  const origem = f => window.ORIGENS.find(x=>x.id===f.backgroundId);
  const estado = f => (f.criacao ||= {versao:1,base:Object.fromEntries(ATR.map(k=>[k,8])),selecoes:{},equipamento:{}});
  const magiaId = m => "srd51:spell/"+slug(m.en||m.n);
  const magiaPorId = id => MAGIAS.find(m=>magiaId(m)===id);
  const per = id => SK[String(id).replace(/^skill:/,"")];
  const custo = base => ATR.reduce((n,k)=>n+(CUSTOS[base[k]]??Infinity),0);
  function configurar(d,magias) {D=d;MAGIAS=magias;return api;}
  function iniciar(p,modo) {
    const q=copiar(p),f=q.ficha ||= {},anterior=f.criacao;
    const temValores=f.atributos && Object.keys(f.atributos).length>0;
    f.criacao={versao:1,base:temValores?Object.fromEntries(ATR.map(k=>[k,(Number(f.atributos[k])||10)-(f.bonusRaca?.[k]||0)-(f.bonusMelhorias?.[k]||0)])):Object.fromEntries(ATR.map(k=>[k,8])),metodo:temValores?"preservado":"pointbuy",selecoes:{},equipamento:{},...anterior};
    f.criacao.selecoes ||= {}; f.criacao.equipamento ||= {};f.classes ||= [];
    if(!f.classes.length && !temValores)f.classes=[{c:"",n:1,sub:""}];
    f.criacao.modo=modo;return q;
  }
  function subclasse(c) {return D.subclasses.find(s=>s.parent===idClasse(c.c) && (c.sub===SUBS[s.id.split("/").pop()] || c.sub===s.id));}
  function nivelSub(c) {const ss=D.subclasses.filter(s=>s.parent===idClasse(c.c));return ss.length?Math.min(...ss.flatMap(s=>s.data.levels.map(l=>l.level))):3;}
  function caracteristicas(f) {
    const ids=[];
    for(const c of f.classes||[]){const d=classe(c.c);if(!d)continue;
      for(const l of d.data.levels.filter(l=>l.level<=c.n))ids.push(...l.features);
      const sub=subclasse(c);if(sub)for(const l of sub.data.levels.filter(l=>l.level<=c.n))ids.push(...l.features);
    }
    const vistos=new Set(),fila=[...ids],out=[];
    while(fila.length){const id=fila.shift();if(vistos.has(id))continue;vistos.add(id);const h=feature(id);if(!h)continue;out.push(h);
      for(const e of h.effects||[])if(e.type==="choice"&&e.grants==="trait")fila.push(...(estado(f).selecoes[id+"|"+e.id]||[]).filter(v=>e.from.includes(v)));
    }
    return out;
  }
  function requisitos(f,id) {
    const h=feature(id);if(!h)return [];
    const c=(f.classes||[]).find(c=>idClasse(c.c)===h.data.class),n=c?.n||0,escolhidos=new Set(Object.values(estado(f).selecoes).flat());
    const mensagens=[];
    for(const r of h.data.prerequisites||[]){
      if(r.type==="level" && n<r.level)mensagens.push("Nível "+r.level+" na classe");
      if(r.type==="feature" && !escolhidos.has(r.feature))mensagens.push(rotulo(r.feature));
      if(r.type==="spell" && !escolhidos.has(r.spell) && !(f.magias||[]).some(m=>magiaId(m)===r.spell))mensagens.push(rotulo(r.spell));
    }
    return mensagens;
  }
  function opçõesMagia(e,f) {
    const cid=e.spellClass?.split("/").pop(),lim=e.spellLevel??e.spellUpTo??9;
    return MAGIAS.filter(m=>(e.spellLevel===undefined?m.l<=lim:m.l===lim)&&(!cid||m.c.some(c=>c.toLowerCase()===cid))&&(!e.ritual||/ritual/i.test(m.cab||""))).map(magiaId);
  }
  function grupos(f) {
    const grupos=[],st=estado(f),bg=origem(f),r=R.racial(f.raca),todas=Object.keys(SK).map(k=>"skill:"+k);
    const adicionar=(source,e,titulo)=>{
      if(e.grants==="spell"&&!e.from.length)e={...e,from:opçõesMagia(e,f)};
      const c=(f.classes||[]).find(c=>idClasse(c.c)===feature(source)?.data.class);
      const linha=c&&classe(c.c)?.data.levels.find(l=>l.level===c.n);
      const qtd=e.chooseBy?linha?.classSpecific?.[e.chooseBy]||e.choose:e.choose;
      const key=source+"|"+e.id,opts=[...new Set(e.from||[])];
      let selecionadas=st.selecoes[key];
      if(!selecionadas){
        if(e.grants==="proficiency"&&source.startsWith("srd51:class/")&&source===idClasse(f.classes?.[0]?.c))selecionadas=(f.perClasse||[]).map(k=>todas.find(x=>per(x)===k)).filter(Boolean);
        else selecionadas=[];
      }
      selecionadas=[...new Set(selecionadas)].filter(v=>opts.includes(v)&&!requisitos(f,v).length).slice(0,qtd);
      grupos.push({key,source,titulo,grants:e.grants,qtd,opts,selecionadas});
    };
    (f.classes||[]).forEach((c,i)=>{const d=classe(c.c);if(!d)return;
      if(i===0){for(const e of d.effects)if(e.type==="choice")adicionar(d.id,e,R.classe(c.c).n);}
      else (d.data.multiclassing?.proficiencyChoices||[]).forEach((e,j)=>adicionar(d.id,{id:"multiclasse-"+j,choose:e.choose,grants:"proficiency",from:e.from},"Multiclasse · "+R.classe(c.c).n));
    });
    for(const h of caracteristicas(f))for(const e of h.effects||[])if(e.type==="choice")adicionar(h.id,e,h.nome||h.en);
    if(r.escolhas)adicionar("raca",{id:"pericias",choose:r.escolhas,grants:"proficiency",from:(r.opcoes||[]).map(k=>todas.find(x=>per(x)===k)).filter(Boolean)},"Raça · perícias");
    if(f.raca==="Elfo (Alto)")adicionar("raca",{id:"truque",choose:1,grants:"spell",from:[],spellLevel:0,spellClass:idClasse("Wizard")},"Raça · truque");
    if(bg){
      if(bg.perEscolhas)adicionar("background",{id:"pericias",choose:bg.perEscolhas,grants:"proficiency",from:todas},"Background · perícias");
      const tipo=st.bgTreino||"idiomas",idiomas=bg.id==="personalizado"?(tipo==="misto"?1:tipo==="ferramentas"?0:2):bg.idiomas;
      const nf=bg.id==="personalizado"?(tipo==="misto"?1:tipo==="ferramentas"?2:0):bg.ferrEscolhas;
      if(idiomas)adicionar("background",{id:"idiomas",choose:idiomas,grants:"language",from:R.IDIOMAS.map(n=>"idioma:"+n)},"Background · idiomas");
      if(nf)adicionar("background",{id:"ferramentas",choose:nf,grants:"proficiency",from:listaFerramentas(bg.ferrTipo)},"Background · ferramentas");
      const duplicadas=(bg.per||[]).filter(k=>(r.fixas||[]).includes(k)).length;
      if(duplicadas)adicionar("background",{id:"substituicoes",choose:duplicadas,grants:"proficiency",from:todas},"Proficiência repetida · escolha substituição");
    }
    const fixas=new Set([...(r.fixas||[]),...(bg?.per||[])]),ocupadas=new Set(fixas);
    for(const h of caracteristicas(f))for(const e of h.effects||[])if(e.type==="proficiency"&&e.category==="skill"&&per(e.target))ocupadas.add(per(e.target));
    const idiomas=new Set(idiomasRaca(f.raca));
    for(const g of grupos){
      if(g.grants==="proficiency"){g.selecionadas=g.selecionadas.filter(v=>!per(v)||!ocupadas.has(per(v)));g.bloqueadas=g.opts.filter(v=>per(v)&&ocupadas.has(per(v)));g.selecionadas.forEach(v=>{if(per(v))ocupadas.add(per(v));});}
      if(g.grants==="language"){g.bloqueadas=g.opts.filter(v=>idiomas.has(v.slice(7)));g.selecionadas=g.selecionadas.filter(v=>!g.bloqueadas.includes(v));g.selecionadas.forEach(v=>idiomas.add(v.slice(7)));}
    }
    const espec=new Set();for(const g of grupos)if(g.grants==="expertise"){g.opts=g.opts.filter(v=>ocupadas.has(per(v)));g.bloqueadas=g.opts.filter(v=>espec.has(v));g.selecionadas=g.selecionadas.filter(v=>g.opts.includes(v)&&!espec.has(v));g.selecionadas.forEach(v=>espec.add(v));}
    return grupos;
  }
  const FERR=["Ferramentas de carpinteiro","Ferramentas de cartógrafo","Ferramentas de coureiro","Ferramentas de ferreiro","Ferramentas de funileiro","Ferramentas de pedreiro","Ferramentas de sapateiro","Ferramentas de tecelão","Ferramentas de ladrão","Kit de disfarce","Kit de falsificação","Kit de herbalismo","Kit de jogo de dados","Jogo de cartas","Flauta","Alaúde","Lira","Tambor","Trompa","Gaita de foles"];
  function listaFerramentas(tipo){return FERR.filter(n=>!tipo||tipo==="artesao"&&/^Ferramentas de (?!ladrão)/.test(n)||tipo==="instrumento"&&["Flauta","Alaúde","Lira","Tambor","Trompa","Gaita de foles"].includes(n)||tipo==="jogo"&&/dados|cartas/.test(n)).map(n=>"ferramenta:"+n);}
  function idiomasRaca(nome){if(!nome)return [];const n=norm(nome);return ["Comum",...(/elfo/.test(n)?["Élfico"]:/anao/.test(n)?["Anão"]:/gnomo/.test(n)?["Gnômico"]:/halfling/.test(n)?["Halfling"]:/orc/.test(n)?["Orc"]:/tiefling/.test(n)?["Infernal"]:/draconato/.test(n)?["Dracônico"]:[])];}
  function rotulo(id){const h=feature(id);if(h)return h.nome||h.en;const m=magiaPorId(id);if(m)return m.n+" · "+(m.l?m.l+"º círculo":"truque");if(per(id))return R.PERICIAS.find(p=>p[0]===per(id))[1];if(/^idioma:|^ferramenta:/.test(id))return id.split(":").slice(1).join(":");const i=D.items.find(i=>i.id===id);return i?.nome||i?.en||id.replace(/^tool:/,"").replaceAll("-"," ");}
  function perfilMagias(c,f){
    const d=classe(c.c),l=d?.data.levels.find(l=>l.level===c.n);if(!d||!l||!d.data.spellcasting||c.n<d.data.spellcasting.startsAtLevel)return null;
    const s=R.conjuracao([c]),max=s.pact?.nivel||s.slots.reduce((n,x,i)=>x?i+1:n,0),a={str:"for",dex:"des",con:"con",int:"int",wis:"sab",cha:"car"}[d.data.spellcasting.ability],mod=R.mod(f.atributos?.[a]||10);
    const prep=d.data.spellcasting.preparation,segredos=Object.entries(l.classSpecific||{}).filter(([k])=>k.startsWith("magicalSecretsMax_")).reduce((n,[,v])=>n+v,0);
    return {classe:c.c,nome:R.classe(c.c).n,truques:l.cantripsKnown||0,qtd:prep.type==="spellbook"?prep.initial+prep.perLevel*(c.n-1):prep.type==="prepared"?Math.max(1,Math.floor(c.n/(prep.levelDivisor||1))+mod):Math.max(0,(l.spellsKnown||0)-segredos),tipo:prep.type,max};
  }
  function gruposMagias(f){
    const out=[];
    for(const c of f.classes||[]){const p=perfilMagias(c,f);if(!p)continue;
      for(const tipo of ["truques","magias"]){const qtd=tipo==="truques"?p.truques:p.qtd;if(!qtd)continue;
        const key="magias|"+c.c+"|"+tipo,opts=MAGIAS.filter(m=>m.c.includes(c.c)&&(tipo==="truques"?m.l===0:m.l>0&&m.l<=p.max)).map(magiaId);
        const antigos=(f.magias||[]).filter(m=>tipo==="truques"?m.l===0:m.l>0).map(magiaId);
        out.push({key,source:idClasse(c.c),titulo:p.nome+" · "+(tipo==="truques"?"truques":p.tipo==="spellbook"?"grimório":p.tipo==="prepared"?"magias preparadas":"magias conhecidas"),grants:"spell",qtd,opts,selecionadas:[...new Set(estado(f).selecoes[key]||antigos)].filter(id=>opts.includes(id)).slice(0,qtd),max:p.max});
      }
    }
    return out;
  }
  function derivar(p) {
    const q=copiar(p),f=q.ficha,st=estado(f),bg=origem(f);
    if(st.metodo==="pointbuy"){f.atributos={...st.base};f.bonusRaca={};f.bonusMelhorias={};R.aplicarRaca(f,{});}R.aplicarMelhorias(f);
    f.background=bg?.nome||"";f.backgroundPericias=[...(bg?.per||[])];
    const gs=grupos(f),gclasse=gs.find(g=>g.source===idClasse(f.classes?.[0]?.c)&&g.opts.some(per));
    f.perClasse=(gclasse?.selecionadas||[]).map(per).filter(Boolean);
    f.perRaca=(gs.find(g=>g.key==="raca|pericias")?.selecionadas||[]).map(per).filter(Boolean);
    if(bg?.perEscolhas)f.backgroundPericias=gs.find(g=>g.key==="background|pericias")?.selecionadas.map(per).filter(Boolean)||[];
    f.perOutrasEscolhas=[];
    for(const g of gs)if(g.grants==="proficiency"&&g!==gclasse&&g.source!=="raca"&&g.key!=="background|pericias")f.perOutrasEscolhas.push(...g.selecionadas.map(per).filter(Boolean));
    f.especializacoes=[...new Set(gs.filter(g=>g.grants==="expertise").flatMap(g=>g.selecionadas.map(per).filter(Boolean)))];
    f.idiomas=[...new Set([...idiomasRaca(f.raca),...gs.filter(g=>g.grants==="language").flatMap(g=>g.selecionadas.map(s=>s.slice(7)))])];
    const ferr=[...(bg?.ferr||[]),...gs.filter(g=>g.grants==="proficiency").flatMap(g=>g.selecionadas.filter(v=>!per(v)).map(rotulo))];
    f.outrasProf=[...new Set(ferr)].join(", ");
    f.efeitosEscolhidos=caracteristicas(f).flatMap(h=>h.effects||[]).filter(e=>e.type!=="choice");
    const manuais=(f.caracteristicas||[]).filter(h=>!h.auto);
    f.caracteristicas=manuais.concat(caracteristicas(f).map(h=>({nome:h.nome||h.en,desc:h.descricao||h.desc,cf:h.id,auto:"criador"})));
    for(const c of f.classes){const sub=subclasse(c);if(sub)c.sub=SUBS[sub.id.split("/").pop()]||c.sub;}
    const resumo=R.resumoClasses(f.classes);f.classe=resumo.descricao;f.nivel=resumo.nivel;f.classesEditadas=true;f.deslocamento=R.RACAS.find(r=>r[0]===f.raca)?.[1]||f.deslocamento||9;
    f.backgroundCaracteristica=bg?{nome:bg.caracteristica,desc:bg.id==="personalizado"?st.backgroundDescricao||bg.descricao:bg.descricao}:null;
    const escolhidas=[...gs,...gruposMagias(f)].filter(g=>g.grants==="spell").flatMap(g=>g.selecionadas.map(id=>({id,classe:g.source.split("/").pop()})));
    const mapa=new Map();
    for(const {id,classe:fonteClasse} of escolhidas){const m=magiaPorId(id);if(!m)continue;const antigo=mapa.get(id);if(antigo){antigo.classes.push(fonteClasse);continue;}mapa.set(id,{...m,prep:m.l===0||classe(fonteClasse)?.data?.spellcasting?.preparation?.type==="prepared",classes:[fonteClasse],en:m.en,autoCriador:true});}
    for(const [nome,nivel] of (f.raca==="Gnomo (da Floresta)"?[["Minor Illusion",1]]:f.raca==="Tiefling"?[["Thaumaturgy",1],["Hellish Rebuke",3],["Darkness",5]]:f.raca==="Elfo (Drow)"?[["Dancing Lights",1],["Faerie Fire",3],["Darkness",5]]:[])){const m=MAGIAS.find(m=>m.en===nome);if(m&&R.nivelTotal(f.classes)>=nivel)mapa.set(magiaId(m),{...m,prep:true,origem:"Raça",autoCriador:true});}
    for(const m of f.magias||[])if(!m.autoCriador&&!mapa.has(magiaId(m)))mapa.set(magiaId(m),m);f.magias=[...mapa.values()];return q;
  }
  function itemCategoria(cat){return D.items.filter(i=>{const w=i.data.weapon,g=i.data.gear;return cat==="simple-weapons"?w?.category==="simple":cat==="simple-melee-weapons"?w?.category==="simple"&&w.kind==="melee":cat==="martial-weapons"?w?.category==="martial":cat==="martial-melee-weapons"?w?.category==="martial"&&w.kind==="melee":cat==="musical-instruments"?i.data.tool?.category==="musical-instrument":g?.category===cat;});}
  function equipamento(p) {
    const f=p.ficha,st=estado(f),d=classe(f.classes?.[0]?.c),bg=origem(f),itens=[],pendentes=[];
    if(!d)return {itens,pendentes:["Escolha uma classe."]};
    const add=(id,qtd)=>{const i=D.items.find(x=>x.id===id);if(!i)return;const conteudo=i.data.gear?.contents;if(conteudo){conteudo.forEach(c=>add(c.item,c.quantity*qtd));return;}itens.push({id,nome:i.nome||i.en,qtd,peso:Math.round((i.data.weight||0)*0.453592*10)/10});};
    for(const i of d.data.startingEquipment||[])add(i.item,i.quantity);
    (d.data.startingChoices||[]).forEach((g,i)=>{const o=g.options[Number(st.equipamento["op:"+i])];if(!o){pendentes.push("Equipamento: escolha a opção "+(i+1));return;}
      o.items.forEach((x,j)=>{if(x.item)add(x.item,x.quantity||1);else for(let k=0;k<(x.count||1);k++){const key="item:"+i+":"+j+":"+k,id=st.equipamento[key];if(!itemCategoria(x.category).some(x=>x.id===id))pendentes.push("Escolha "+x.category);else add(id,1);}});
    });
    for(const n of bg?.equip||[])itens.push({nome:n,qtd:1,peso:0});
    for(const n of [...(bg?.ferr||[]),...(grupos(f).find(g=>g.key==="background|ferramentas")?.selecionadas||[]).map(rotulo)].filter(n=>!/Veículos/.test(n)))if(!itens.some(i=>i.nome===n))itens.push({nome:n,qtd:1,peso:0});
    return {itens,pendentes,ouro:bg?.ouro||0};
  }
  function requisitosMulti(f){
    if((f.classes||[]).filter(c=>c.c).length<2)return [];
    const atr={str:"for",dex:"des",con:"con",int:"int",wis:"sab",cha:"car"},erros=[];
    for(const c of f.classes||[]){const m=classe(c.c)?.data.multiclassing;if(!m)continue;const falha=r=>(f.atributos?.[atr[r.ability]]||0)<r.minimum;const faltam=(m.prerequisites||[]).filter(falha);if(faltam.length)erros.push(R.classe(c.c).n+": "+faltam.map(r=>R.ATR_NOME[atr[r.ability]]+" "+r.minimum).join(" e "));if(m.prerequisiteOptions&&m.prerequisiteOptions.from.every(falha))erros.push(R.classe(c.c).n+": "+m.prerequisiteOptions.from.map(r=>R.ATR_NOME[atr[r.ability]]+" "+r.minimum).join(" ou "));}return erros;
  }
  function aplicarEquipamento(p){
    const q=copiar(p),f=q.ficha,st=estado(f);if(st.equipAplicado)return q;
    const eq=equipamento(q);if(eq.pendentes.length)throw new Error(eq.pendentes.join(' · '));
    q.inventario=[...(q.inventario||[]),...eq.itens];q.dinheiro={...(q.dinheiro||{}),po:Number(q.dinheiro?.po||0)+eq.ouro};
    f.equip ||= {armadura:'',escudo:false,bonus:0};f.ataques ||= [];
    for(const i of eq.itens){const d=D.items.find(x=>x.id===i.id);if(!d)continue;
      if(d.id.endsWith('/shield'))f.equip.escudo=true;
      else if(d.data.armor&&!f.equip.armadura){const a=R.ARMADURAS.find(a=>a[1]===i.nome||a[3]===d.data.armor.base&&a[2]===({light:'leve',medium:'media',heavy:'pesada'}[d.data.armor.category]));if(a)f.equip.armadura=a[0];}
      const a=R.ARMAS.find(a=>a[0]===i.nome);if(a&&!f.ataques.some(x=>x.nome===a[0]))f.ataques.push({nome:a[0],dado:a[1],tipo:a[2],atr:a[3],prof:true,magico:0,extra:0,distancia:d.data.weapon?.kind==='ranged'});
    }
    st.equipAplicado=true;return q;
  }
  function validar(p,{evolucao=false}={}) {
    const f=p.ficha,st=estado(f),erros=[];
    for(const texto of requisitosMulti(f))erros.push({etapa:3,texto:"Pré-requisito de multiclasse: "+texto});
    if(!p.nome?.trim())erros.push({etapa:0,texto:"Informe o nome do personagem."});
    if(!f.classes?.length||f.classes.some(c=>!R.classe(c.c)))erros.push({etapa:0,texto:"Escolha a classe."});
    if((f.classes||[]).some(c=>!Number.isInteger(c.n)||c.n<1||c.n>20))erros.push({etapa:0,texto:"Use níveis inteiros entre 1 e 20."});
    if(R.nivelTotal(f.classes)>20)erros.push({etapa:0,texto:"O nível total não pode passar de 20."});
    if((f.classes||[]).some(c=>c.c&&!classe(c.c)))erros.push({etapa:0,texto:"Esta classe ainda não possui progressão no catálogo do criador."});
    if(new Set((f.classes||[]).map(c=>c.c)).size!==(f.classes||[]).length)erros.push({etapa:0,texto:"Não repita a mesma classe."});
    for(const c of f.classes||[])if(c.n>=nivelSub(c)&&!subclasse(c))erros.push({etapa:0,texto:"Escolha a subclasse de "+(R.classe(c.c)?.n||c.c)+"."});
    for(const c of f.classes||[]){if(c.c!=="Wizard")continue;const g=gruposMagias(f).find(g=>g.key==="magias|Wizard|magias");for(let circulo=2;circulo<=9;circulo++){const max=Math.max(0,(c.n-(circulo*2-1)+1)*2),quantos=(g?.selecionadas||[]).filter(id=>(magiaPorId(id)?.l||0)>=circulo).length;if(quantos>max)erros.push({etapa:5,texto:"Grimório: escolha no máximo "+max+" magias de "+circulo+"º círculo ou superior recebidas pelos níveis da classe."});}}
    if(!evolucao){
      if(!R.RACAS.some(r=>r[0]===f.raca))erros.push({etapa:1,texto:"Escolha a raça."});
      if(!origem(f))erros.push({etapa:2,texto:"Escolha o background."});
      if(st.metodo==="pointbuy"&&custo(st.base)!==27)erros.push({etapa:3,texto:"Distribua os 27 pontos de atributos (valores base entre 8 e 15)."});
      if((new Set((f.atrRaca||[]).filter(k=>ATR.includes(k)&&!(k in R.racial(f.raca).bonus)))).size<R.racial(f.raca).atributos)erros.push({etapa:1,texto:"Complete as escolhas de atributos da raça."});
      if(!st.equipAplicado)for(const texto of equipamento(p).pendentes)erros.push({etapa:6,texto});
    }
    for(const m of R.melhoriasDisponiveis(f.classes)){if(st.talentos?.[m.id]){if(!st.talentos[m.id].nome?.trim())erros.push({etapa:3,texto:"Informe o talento escolhido no nível "+m.n});}else if((f.melhorias?.[m.id]||[]).filter(k=>ATR.includes(k)).length!==2)erros.push({etapa:3,texto:"Escolha a melhoria de atributos de "+m.classe+" no nível "+m.n+"."});}
    for(const g of [...grupos(f),...gruposMagias(f)])if(g.selecionadas.length<g.qtd)erros.push({etapa:g.grants==="spell"?5:4,texto:g.titulo+": faltam "+(g.qtd-g.selecionadas.length)+" escolha(s).",grupo:g.key});
    return erros;
  }
  function subir(p,cid,rolagem) {
    const q=copiar(p),f=q.ficha;let c=f.classes.find(c=>c.c===cid);
    if(!c){if(!classe(cid))throw new Error("Escolha uma classe válida.");c={c:cid,n:0,sub:""};f.classes.push(c);}
    if(R.nivelTotal(f.classes)>=20)throw new Error("O limite é nível 20.");
    const dv=R.classe(cid).dv,valor=rolagem==="media"?Math.floor(dv/2)+1:Number(rolagem);
    if(!Number.isInteger(valor)||valor<1||valor>dv)throw new Error("O dado de vida deve ficar entre 1 e "+dv+".");
    c.n++;f.pvPorNivel ||= {};f.pvPorNivel[cid+":"+c.n]=valor;
    const ganho=Math.max(1,valor+R.mod(f.atributos?.con||10)+(f.raca==="Anão (da Colina)"?1:0));
    q.pv_max+=ganho;q.pv_atual=Math.min(q.pv_max,q.pv_atual+ganho);
    return q;
  }
  function diferenca(antes,depois){const a=caracteristicas(antes.ficha),b=caracteristicas(depois.ficha),ids=new Set(a.map(h=>h.id));return {nivel:[R.nivelTotal(antes.ficha.classes),R.nivelTotal(depois.ficha.classes)],pv:[antes.pv_max,depois.pv_max],prof:[R.prof(R.nivelTotal(antes.ficha.classes)),R.prof(R.nivelTotal(depois.ficha.classes))],novas:b.filter(h=>!ids.has(h.id)),espacos:R.conjuracao(depois.ficha.classes),escolhas:validar(depois,{evolucao:true})};}
  const api={configurar,estado,origem,requisitosMulti,classe,subclasse,nivelSub,caracteristicas,requisitos,grupos,gruposMagias,perfilMagias,rotulo,per,magiaId,magiaPorId,custo,CUSTOS,iniciar,derivar,equipamento,aplicarEquipamento,itemCategoria,validar,subir,diferenca,idiomasRaca,copiar,get dados(){return D;}};
  return api;
})();
