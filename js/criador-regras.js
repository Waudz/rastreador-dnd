
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
  function configurar(d,magias) {D=d;window.SUBCLASSES_2014?.aplicar(D);D.subclasses.forEach(s=>{s.nome ||= SUBS[s.id.split("/").pop()]||s.id.split("/").pop();});MAGIAS=magias;return api;}
  function iniciar(p,modo) {
    const q=copiar(p),f=q.ficha ||= {},anterior=f.criacao;
    const temValores=f.atributos && Object.keys(f.atributos).length>0;
    f.criacao={versao:1,base:temValores?Object.fromEntries(ATR.map(k=>[k,(Number(f.atributos[k])||10)-(f.bonusRaca?.[k]||0)-(f.bonusMelhorias?.[k]||0)])):Object.fromEntries(ATR.map(k=>[k,8])),metodo:temValores?"preservado":"pointbuy",selecoes:{},equipamento:{},...anterior};
    f.criacao.selecoes ||= {}; f.criacao.equipamento ||= {};f.classes ||= [];
    if(!f.classes.length && !temValores)f.classes=[{c:"",n:1,sub:""}];
    f.criacao.modo=modo;return q;
  }
  function subclasse(c) {return D.subclasses.find(s=>s.parent===idClasse(c.c) && (c.sub===s.nome || c.sub===SUBS[s.id.split("/").pop()] || c.sub===s.id));}
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
      grupos.push({key,source,titulo,grants:e.grants,qtd,opts,selecionadas,unicas:e.uniqueByName===true});
    };
    (f.classes||[]).forEach((c,i)=>{const d=classe(c.c);if(!d)return;
      if(i===0){for(const e of d.effects)if(e.type==="choice")adicionar(d.id,e,R.classe(c.c).n);}
      else (d.data.multiclassing?.proficiencyChoices||[]).forEach((e,j)=>adicionar(d.id,{id:"multiclasse-"+j,choose:e.choose,grants:"proficiency",from:e.from},"Multiclasse · "+R.classe(c.c).n));
    });
    for(const h of caracteristicas(f))for(const e of h.effects||[])if(e.type==="choice")adicionar(h.id,e,e.titulo||h.nome||h.en);
    if(r.escolhas)adicionar("raca",{id:"pericias",choose:r.escolhas,grants:"proficiency",from:(r.opcoes||[]).map(k=>todas.find(x=>per(x)===k)).filter(Boolean)},"Raça · perícias");
    if(f.raca==="Elfo (Alto)")adicionar("raca",{id:"truque",choose:1,grants:"spell",from:[],spellLevel:0,spellClass:idClasse("Wizard")},"Raça · truque");
    if(bg){
      if(bg.perEscolhas)adicionar("background",{id:"pericias",choose:bg.perEscolhas,grants:"proficiency",from:todas},"Origem · perícias");
      const tipo=st.bgTreino||"idiomas",idiomas=bg.id==="personalizado"?(tipo==="misto"?1:tipo==="ferramentas"?0:2):bg.idiomas;
      const nf=bg.id==="personalizado"?(tipo==="misto"?1:tipo==="ferramentas"?2:0):bg.ferrEscolhas;
      if(idiomas)adicionar("background",{id:"idiomas",choose:idiomas,grants:"language",from:R.IDIOMAS.map(n=>"idioma:"+n)},"Origem · idiomas");
      if(nf)adicionar("background",{id:"ferramentas",choose:nf,grants:"proficiency",from:listaFerramentas(bg.ferrTipo)},"Origem · ferramentas");
      const duplicadas=(bg.per||[]).filter(k=>(r.fixas||[]).includes(k)).length;
      if(duplicadas)adicionar("background",{id:"substituicoes",choose:duplicadas,grants:"proficiency",from:todas},"Proficiência repetida · escolha substituição");
    }
    const fixas=new Set([...(r.fixas||[]),...(bg?.per||[])]),ocupadas=new Set(fixas);
    for(const h of caracteristicas(f))for(const e of h.effects||[])if(e.type==="proficiency"&&e.category==="skill"&&per(e.target))ocupadas.add(per(e.target));
    const idiomas=new Set(idiomasRaca(f.raca)),nomesUnicos=new Set();
    for(const g of grupos){
      if(g.unicas){const nome=v=>norm(feature(v)?.nome||v);g.bloqueadas=g.opts.filter(v=>nomesUnicos.has(nome(v)));g.selecionadas=g.selecionadas.filter(v=>!nomesUnicos.has(nome(v)));g.selecionadas.forEach(v=>nomesUnicos.add(nome(v)));}
      if(g.grants==="proficiency"){g.selecionadas=g.selecionadas.filter(v=>!per(v)||!ocupadas.has(per(v)));g.bloqueadas=g.opts.filter(v=>per(v)&&ocupadas.has(per(v)));g.selecionadas.forEach(v=>{if(per(v))ocupadas.add(per(v));});}
      if(g.grants==="language"){g.bloqueadas=g.opts.filter(v=>idiomas.has(v.slice(7)));g.selecionadas=g.selecionadas.filter(v=>!g.bloqueadas.includes(v));g.selecionadas.forEach(v=>idiomas.add(v.slice(7)));}
    }
    const espec=new Set();for(const g of grupos)if(g.grants==="expertise"){g.opts=g.opts.filter(v=>ocupadas.has(per(v)));g.bloqueadas=g.opts.filter(v=>espec.has(v));g.selecionadas=g.selecionadas.filter(v=>g.opts.includes(v)&&!espec.has(v));g.selecionadas.forEach(v=>espec.add(v));}
    return grupos;
  }
  const FERR=["Ferramentas de carpinteiro","Ferramentas de cartógrafo","Ferramentas de coureiro","Ferramentas de ferreiro","Ferramentas de funileiro","Ferramentas de pedreiro","Ferramentas de sapateiro","Ferramentas de tecelão","Ferramentas de ladrão","Kit de disfarce","Kit de falsificação","Kit de herbalismo","Kit de jogo de dados","Jogo de cartas","Flauta","Alaúde","Lira","Tambor","Trompa","Gaita de foles"];
  function listaFerramentas(tipo){return FERR.filter(n=>!tipo||tipo==="artesao"&&/^Ferramentas de (?!ladrão)/.test(n)||tipo==="instrumento"&&["Flauta","Alaúde","Lira","Tambor","Trompa","Gaita de foles"].includes(n)||tipo==="jogo"&&/dados|cartas/.test(n)).map(n=>"ferramenta:"+n);}
  function idiomasRaca(nome){if(!nome)return [];const n=norm(nome);return ["Comum",...(/elfo/.test(n)?["Élfico"]:/anao/.test(n)?["Anão"]:/gnomo/.test(n)?["Gnômico"]:/halfling/.test(n)?["Halfling"]:/orc/.test(n)?["Orc"]:/tiefling/.test(n)?["Infernal"]:/draconato/.test(n)?["Dracônico"]:[])];}
  function rotulo(id){const h=feature(id);if(h)return h.nome||h.en;const m=magiaPorId(id);if(m)return m.n+" · "+(m.l?m.l+"º Círculo":"Truque");if(per(id))return R.PERICIAS.find(p=>p[0]===per(id))[1];if(/^idioma:|^ferramenta:/.test(id))return id.split(":").slice(1).join(":");const i=D.items.find(i=>i.id===(id.startsWith("tool:")?"srd51:item/"+id.slice(5):id));return i?.nome||i?.en||id.replace(/^tool:/,"").replaceAll("-"," ");}
  function perfilMagias(c,f){
    const nomeSub=subclasse(c)?.nome;if(c.n>=3&&["Cavaleiro Místico","Trapaceiro Arcano"].includes(nomeSub)){const lista=[0,0,0,3,4,4,4,5,6,6,7,8,8,9,10,10,11,11,11,12,13],co={...c,sub:nomeSub},s=R.conjuracao([co]);return{classe:c.c,nome:R.classe(c.c).n,truques:2+(c.n>=10?1:0),qtd:lista[c.n],tipo:"known",max:s.slots.reduce((n,x,i)=>x?i+1:n,0),lista:"Wizard"};}
    const d=classe(c.c),l=d?.data.levels.find(l=>l.level===c.n);if(!d||!l||!d.data.spellcasting||c.n<d.data.spellcasting.startsAtLevel)return null;
    const s=R.conjuracao([c]),max=s.pact?.nivel||s.slots.reduce((n,x,i)=>x?i+1:n,0),a={str:"for",dex:"des",con:"con",int:"int",wis:"sab",cha:"car"}[d.data.spellcasting.ability],mod=R.mod(f.atributos?.[a]||10);
    const prep=d.data.spellcasting.preparation,segredos=Object.entries(l.classSpecific||{}).filter(([k])=>k.startsWith("magicalSecretsMax_")).reduce((n,[,v])=>n+v,0);
    return {classe:c.c,nome:R.classe(c.c).n,truques:l.cantripsKnown||0,qtd:prep.type==="spellbook"?prep.initial+prep.perLevel*(c.n-1):prep.type==="prepared"?Math.max(1,Math.floor(c.n/(prep.levelDivisor||1))+mod):Math.max(0,(l.spellsKnown||0)-segredos),tipo:prep.type,max};
  }
  function magiasConcedidas(f){const out=[];
    for(const c of f.classes||[]){for(const x of subclasse(c)?.data.spells||[])if(c.n>=x.classLevel)out.push({id:x.spell,classe:c.c,semprePreparada:true,origem:'Subclasse'});}
    for(const h of caracteristicas(f)){const c=(f.classes||[]).find(c=>idClasse(c.c)===h.data.class);for(const e of h.effects||[])if(e.type==='grantSpell'&&c&&c.n>=(e.minLevel||h.data.level||1))out.push({id:e.spell,classe:c.c,semprePreparada:true,origem:'Característica de classe'});}return out;
  }
  /* magias que a raça concede (nome em inglês, nível total mínimo); nunca entram em escolhas nem em trocas de classe */
  function magiasRaciaisLista(f){return f.raca==="Fada"?[["Druidcraft",1],["Faerie Fire",3],["Enlarge/Reduce",5]]:f.raca==="Gnomo (da Floresta)"?[["Minor Illusion",1]]:f.raca==="Tiefling"?[["Thaumaturgy",1],["Hellish Rebuke",3],["Darkness",5]]:f.raca==="Elfo (Drow)"?[["Dancing Lights",1],["Faerie Fire",3],["Darkness",5]]:[];}
  function gruposMagias(f){
    const out=[];
    for(const c of f.classes||[]){const p=perfilMagias(c,f);if(!p)continue;
      for(const tipo of ["truques","magias"]){const qtd=tipo==="truques"?p.truques:p.qtd;if(!qtd)continue;
        const concedidas=new Set([...magiasConcedidas(f).map(m=>m.id),...magiasRaciaisLista(f).filter(x=>R.nivelTotal(f.classes||[])>=x[1]).map(x=>{const m=MAGIAS.find(m=>m.en===x[0]);return m?magiaId(m):x[0];})]);const key="magias|"+c.c+"|"+tipo,opts=MAGIAS.filter(m=>!concedidas.has(magiaId(m))&&m.c.includes(p.lista||c.c)&&(tipo==="truques"?m.l===0:m.l>0&&m.l<=p.max)).map(magiaId);
        const antigos=(f.magias||[]).filter(m=>tipo==="truques"?m.l===0:m.l>0).map(magiaId);
        out.push({key,source:idClasse(c.c),titulo:p.nome+" · "+(tipo==="truques"?"truques":p.tipo==="spellbook"?"grimório":p.tipo==="prepared"?"magias preparadas":"magias conhecidas"),grants:"spell",qtd,opts,selecionadas:[...new Set(estado(f).selecoes[key]||antigos)].filter(id=>opts.includes(id)).slice(0,qtd),max:p.max});
      }
    }
    return out;
  }

  /* ===== Modelo v2: histórico estruturado, nível a nível =====
     DECISÕES do jogador (fonte): ficha.criacao.niveis = [{c, pv:{modo:'maximo'|'fixo'|'rolagem', valor}}] em ordem cronológica,
       mais ficha.criacao.selecoes, ficha.melhorias e ficha.criacao.talentos.
     DERIVADO (nunca editado à mão, recalculado em derivar): ficha.progressao[i] =
       {total, classe, nivelClasse, pv:{modo,dado,valor,ganho}, automaticas:[ids], escolhas:{grupo:[ids]}, melhoria}.
     PV: o total sempre sai da progressão (um só cálculo para criação, evolução e edição). */
  function reconciliarNiveis(f){
    const st=estado(f),classes=(f.classes||[]).filter(x=>x.c&&classe(x.c)),alvo={};classes.forEach(x=>{alvo[x.c]=Math.max(0,Number(x.n)||0);});
    const cont={};let niveis=(st.niveis||[]).filter(x=>alvo[x.c]!==undefined).map(x=>({c:x.c,pv:{...(x.pv||{modo:"fixo"})},...(x.troca?{troca:{...x.troca}}:{})}));
    niveis=niveis.filter(x=>{cont[x.c]=(cont[x.c]||0)+1;return cont[x.c]<=alvo[x.c];});   // níveis a menos: sai o mais recente da classe
    for(const x of classes)while((cont[x.c]||0)<alvo[x.c]){niveis.push({c:x.c,pv:{modo:"fixo"}});cont[x.c]=(cont[x.c]||0)+1;}
    if(niveis.length&&classes.length&&niveis[0].c!==classes[0].c){const ordem=Object.fromEntries(classes.map((x,i)=>[x.c,i]));niveis=niveis.map((x,i)=>({x,i})).sort((a,b)=>ordem[a.x.c]-ordem[b.x.c]||a.i-b.i).map(o=>o.x);}
    if(niveis[0])niveis[0].pv={modo:"maximo"};                                                 // 2014: o primeiro nível do personagem usa o dado no máximo
    for(let i=1;i<niveis.length;i++)if(niveis[i].pv.modo==="maximo")niveis[i].pv={modo:"fixo"};
    st.niveis=niveis;return niveis;
  }
  function ganhoPV(f,i,e){
    const dv=R.classe(e.c)?.dv||8,con=R.mod(f.atributos?.con??10),anao=f.raca==="Anão (da Colina)"?1:0,v=Number(e.pv?.valor);
    const base=i===0||e.pv?.modo==="maximo"?dv:e.pv?.modo==="rolagem"&&Number.isInteger(v)&&v>=1&&v<=dv?v:Math.floor(dv/2)+1;
    return Math.max(1,base+con+anao);
  }
  const pvTotal=f=>reconciliarNiveis(f).reduce((s,e,i)=>s+ganhoPV(f,i,e),0);
  /* em que nível de qual classe uma escolha foi feita (null = construção: raça e origem) */
  function nivelDoGrupo(g){
    const s=g.source;if(s==="raca"||s==="background")return {construcao:true};
    if(String(g.key).startsWith("magias|"))return null;
    const h=feature(s);if(h&&h.data?.class&&h.data.level)return {cid:h.data.class,n:h.data.level};
    if(D.classes.some(x=>x.id===s))return {cid:s,n:1};
    return null;
  }
  function construirProgressao(f){
    const st=estado(f),niveis=reconciliarNiveis(f),vistos={},gs=[...grupos(f),...gruposMagias(f)];
    return niveis.map((e,i)=>{
      const nc=(vistos[e.c]=(vistos[e.c]||0)+1),c=(f.classes||[]).find(x=>x.c===e.c),d=classe(e.c),sub=c?subclasse(c):null,dv=R.classe(e.c)?.dv||8;
      const automaticas=[...(d?.data.levels.find(l=>l.level===nc)?.features||[]),...(sub?.data.levels.find(l=>l.level===nc)?.features||[])];
      const escolhas={};
      for(const g of gs){
        if(String(g.key).startsWith("magias|")){
          const [,cid,tipo]=g.key.split("|");if(cid!==e.c)continue;
          const cum=n=>{const p=perfilMagias({...c,n},f);return p?(tipo==="truques"?p.truques:p.qtd):0;};
          const de=nc>1?cum(nc-1):0,ate=cum(nc),fatia=g.selecionadas.slice(de,ate);if(fatia.length)escolhas[g.key]=fatia;continue;
        }
        const nv=nivelDoGrupo(g);if(!nv)continue;
        if(nv.construcao){if(i===0&&g.selecionadas.length)escolhas[g.key]=[...g.selecionadas];continue;}
        if(idClasse(e.c)===nv.cid&&nv.n===nc&&g.selecionadas.length)escolhas[g.key]=[...g.selecionadas];
      }
      const idM=e.c+":"+nc,m=R.melhoriasDisponiveis(f.classes||[]).find(x=>x.id===idM);
      const melhoria=m?{id:idM,atributos:[...(f.melhorias?.[idM]||[])],talento:st.talentos?.[idM]?.nome||null}:null;
      return {total:i+1,classe:e.c,nivelClasse:nc,pv:{modo:e.pv.modo,dado:dv,valor:e.pv.modo==="rolagem"?Number(e.pv.valor)||null:e.pv.modo==="maximo"?dv:Math.floor(dv/2)+1,ganho:ganhoPV(f,i,e)},automaticas,escolhas,melhoria,troca:e.troca?{...e.troca}:null};
    });
  }
  /* Tudo o que é gravado ao concluir criação, evolução ou edição passa por aqui: um só lugar para PV, equipamento e marcações. */
  function salvamento(qDerivado,{modo,original}={}){
    let q=copiar(qDerivado),pv_max=q.pv_max,pv_atual=q.pv_atual;
    const f0=()=>q.ficha;
    if(modo==="criacao"){if(!estado(f0()).equipAplicado)q=aplicarEquipamento(q);pv_max=pvTotal(q.ficha);pv_atual=pv_max;}
    else if(modo==="editar"){
      const antes=derivar(iniciar(original,"criacao")).ficha,delta=pvTotal(q.ficha)-pvTotal(antes);
      pv_max=Math.max(1,Number(original.pv_max)+delta);pv_atual=Math.min(Number(original.pv_atual),pv_max);
    }
    const f=q.ficha;f.tracosRaciais=R.tracosRaciais(f.raca);f.criacao.concluido=true;
    const mudou=modo==="editar"?(pv_max!==Number(original.pv_max)||pv_atual!==Number(original.pv_atual)):false;
    return {dados:{nome:q.nome,ficha:f,pv_max,pv_atual,inventario:q.inventario,dinheiro:q.dinheiro},pv:{max:pv_max,atual:pv_atual,mudou}};
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
    f.proficienciasSubclasse=[];for(const c of f.classes){const n=subclasse(c)?.nome;if(n==="Colégio da Bravura"&&c.n>=3)f.proficienciasSubclasse.push("Armaduras médias","Escudos","Armas marciais");if(n==="Assassino"&&c.n>=3)ferr.push("Kit de Disfarce","Kit de Venenos");}
    f.outrasProf=[...new Set(ferr)].join(", ");
    f.efeitosEscolhidos=caracteristicas(f).flatMap(h=>h.effects||[]).filter(e=>e.type!=="choice");
    const manuais=(f.caracteristicas||[]).filter(h=>!h.auto);
    f.caracteristicas=manuais.concat(caracteristicas(f).map(h=>({nome:h.nome||h.en,desc:h.descricao||h.desc,cf:h.id,auto:"criador"})));
    for(const c of f.classes){const sub=subclasse(c);if(sub)c.sub=sub.nome||SUBS[sub.id.split("/").pop()]||c.sub;}
    const resumo=R.resumoClasses(f.classes);f.classe=resumo.descricao;f.nivel=resumo.nivel;f.classesEditadas=true;f.deslocamento=R.RACAS.find(r=>r[0]===f.raca)?.[1]||f.deslocamento||9;
    f.backgroundCaracteristica=bg?{nome:bg.caracteristica,desc:bg.id==="personalizado"?st.backgroundDescricao||bg.descricao:bg.descricao}:null;
    const escolhidas=[...gs,...gruposMagias(f)].filter(g=>g.grants==="spell").flatMap(g=>g.selecionadas.map(id=>({id,classe:g.source.split("/").pop()})));
    const mapa=new Map();
    for(const {id,classe:fonteClasse} of escolhidas){const m=magiaPorId(id);if(!m)continue;const antigo=mapa.get(id);if(antigo){antigo.classes.push(fonteClasse);continue;}const cj=(f.classes||[]).find(x=>idClasse(x.c)==="srd51:class/"+fonteClasse)?.c||null,tipoC=classe(fonteClasse)?.data?.spellcasting?.preparation?.type;mapa.set(id,{...m,prep:m.l===0||tipoC==="prepared",classes:[fonteClasse],en:m.en,autoCriador:true,fonte:"classe",classeConj:cj,noGrimorio:tipoC==="spellbook"&&m.l>0,registroOrigem:{tipo:"classe"}});}
    for(const x of magiasConcedidas(f)){const m=magiaPorId(x.id);if(m)mapa.set(x.id,{...m,prep:true,semprePreparada:x.semprePreparada,classes:[x.classe],origem:x.origem,autoCriador:true});}
    for(const [nome,nivel] of magiasRaciaisLista(f)){const m=MAGIAS.find(m=>m.en===nome);if(m&&R.nivelTotal(f.classes)>=nivel)mapa.set(magiaId(m),{...m,prep:true,origem:"Raça",autoCriador:true});}
    /* Grimório do Mago: cópias feitas durante a aventura (pergaminho ou outro grimório) vêm de criacao.grimorioExtra; concessões do mestre vêm de f.magiasMestre.
       Não são magias "aprendidas pelo catálogo": cada uma guarda a própria origem. */
    for(const g of st.grimorioExtra||[]){const m=MAGIAS.find(x=>x.en===g.en);if(m&&window.MAGIAS_JOGO)mapa.set(magiaId(m),{...window.MAGIAS_JOGO.entradaGrimorio(m,g.origem,f),registroOrigem:{tipo:g.origem,nivelTotal:g.nivelTotal,custoPO:g.custoPO,horas:g.horas,quando:g.quando}});}
    for(const x of f.magiasMestre||[]){const co=x.concessao||{modo:"sempre"},gr=co.modo==="grimorio";   // o mestre escolhe a forma: conhecida, grimório, sempre preparada, uso limitado ou outra
      mapa.set("mestre|"+x.en,{...x,concessao:JSON.parse(JSON.stringify(co)),prep:co.modo==="sempre"||co.modo==="uso-limitado",semprePreparada:co.modo==="sempre",fonte:"mestre",origem:"Concedida pelo mestre",classes:gr?["wizard"]:[],classeConj:gr?"Wizard":undefined,noGrimorio:gr||undefined,registroOrigem:{tipo:"mestre",nota:x.nota,modo:co.modo},autoCriador:false});}
    for(const m of f.magias||[])if(!m.autoCriador&&!m.noGrimorio&&m.fonte!=="mestre"&&!mapa.has(magiaId(m)))mapa.set(magiaId(m),{...m,fonte:m.fonte||"manual",registroOrigem:m.registroOrigem||{tipo:"manual"}});
    /* o que o jogador marcou como preparado continua preparado depois de recalcular; magia de círculo acima do que a classe permite fica inativa (guardada, sem benefício) */
    const anteriores=new Map((p.ficha.magias||[]).map(m=>[magiaId(m),m])),maxCirc=R.conjuracao(f.classes||[]);const teto=maxCirc.pact?Math.max(maxCirc.pact.nivel,maxCirc.slots.reduce((n,x,i)=>x?i+1:n,0)):maxCirc.slots.reduce((n,x,i)=>x?i+1:n,0);
    for(const [k,e] of mapa){const ant=anteriores.get(k);if(ant&&typeof ant.prep==="boolean"&&e.l>0&&!e.semprePreparada&&(e.fonte!=="mestre"||e.noGrimorio))e.prep=ant.prep;
      e.ativa=!(e.fonte==="classe"&&e.l>0&&teto>0&&e.l>teto)&&!(e.fonte==="classe"&&e.l>0&&teto===0);if(!e.ativa)e.prep=false;}
    f.magias=[...mapa.values()];f.progressao=construirProgressao(f);return q;
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
      else if(d.data.armor&&!f.equip.armadura){const ids={"padded-armor":"acolchoada","leather-armor":"couro","studded-leather-armor":"couro-batido","hide-armor":"gibao","chain-shirt":"camisao","scale-mail":"escamas","breastplate":"peitoral","half-plate-armor":"meia","ring-mail":"anel","chain-mail":"malha","splint-armor":"talas","plate-armor":"placas"};const a=R.ARMADURAS.find(a=>a[0]===ids[d.id.split("/").pop()]||a[1]===i.nome);if(a)f.equip.armadura=a[0];}
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
    for(const c of f.classes||[]){const nome=subclasse(c)?.nome;if(!["Cavaleiro Místico","Trapaceiro Arcano"].includes(nome))continue;const g=gruposMagias(f).find(g=>g.key==="magias|"+c.c+"|magias");if(!g)continue;const livres=1+[8,14,20].filter(n=>c.n>=n).length,escolas=nome==="Cavaleiro Místico"?["Abjuração","Evocação"]:["Encantamento","Ilusão"];if(g.selecionadas.filter(id=>{const m=magiaPorId(id);return !escolas.some(e=>String(m?.cab||"").startsWith(e));}).length>livres)erros.push({etapa:5,texto:nome+": escolha no máximo "+livres+" magia(s) fora de "+escolas.join(" ou ")+". As outras escolhas devem ser dessas escolas."});}
    if(!evolucao){
      if(!R.RACAS.some(r=>r[0]===f.raca))erros.push({etapa:1,texto:"Escolha a raça."});
      if(f.raca==="Fada"&&!["int","sab","car"].includes(f.atrMagiaRaca))erros.push({etapa:1,texto:"Escolha o atributo da Magia de Fada."});
      if(!origem(f))erros.push({etapa:2,texto:"Escolha a Origem."});
      if(st.metodo==="pointbuy"&&custo(st.base)!==27)erros.push({etapa:3,texto:"Distribua os 27 pontos de atributos (valores base entre 8 e 15)."});
      if((new Set((f.atrRaca||[]).filter(k=>ATR.includes(k)&&!(k in R.racial(f.raca).bonus)))).size<R.racial(f.raca).atributos)erros.push({etapa:1,texto:"Complete as escolhas de atributos da raça."});
      if(!st.equipAplicado)for(const texto of equipamento(p).pendentes)erros.push({etapa:6,texto});
    }
    for(const m of R.melhoriasDisponiveis(f.classes)){if(st.talentos?.[m.id]){if(!st.talentos[m.id].nome?.trim())erros.push({etapa:3,texto:"Informe o talento escolhido no nível "+m.n});}else if((f.melhorias?.[m.id]||[]).filter(k=>ATR.includes(k)).length!==2)erros.push({etapa:3,texto:"Escolha a melhoria de atributos de "+m.classe+" no nível "+m.n+"."});}
    for(const g of [...grupos(f),...gruposMagias(f)])if(g.selecionadas.length<g.qtd)erros.push({etapa:g.source==="background"?2:g.source==="raca"?1:g.grants==="spell"?5:4,texto:g.titulo+": faltam "+(g.qtd-g.selecionadas.length)+" escolha(s).",grupo:g.key});
    return erros;
  }
  function subir(p,cid,rolagem) {
    const q=copiar(p),f=q.ficha;let c=f.classes.find(c=>c.c===cid);
    if(!c){if(!classe(cid))throw new Error("Escolha uma classe válida.");c={c:cid,n:0,sub:""};f.classes.push(c);}
    if(R.nivelTotal(f.classes)>=20)throw new Error("O limite é nível 20.");
    const dv=R.classe(cid).dv,valor=rolagem==="media"?Math.floor(dv/2)+1:Number(rolagem);
    if(!Number.isInteger(valor)||valor<1||valor>dv)throw new Error("O dado de vida deve ficar entre 1 e "+dv+".");
    reconciliarNiveis(f);                                   // garante o histórico dos níveis que já existiam antes de somar o novo
    c.n++;const st=estado(f);st.niveis.push({c:cid,pv:rolagem==="media"?{modo:"fixo"}:{modo:"rolagem",valor}});
    const ganho=ganhoPV(f,st.niveis.length-1,st.niveis[st.niveis.length-1]);
    q.pv_max+=ganho;q.pv_atual=Math.min(q.pv_max,q.pv_atual+ganho);
    return q;
  }
  function diferenca(antes,depois){const a=caracteristicas(antes.ficha),b=caracteristicas(depois.ficha),ids=new Set(a.map(h=>h.id));return {nivel:[R.nivelTotal(antes.ficha.classes),R.nivelTotal(depois.ficha.classes)],pv:[antes.pv_max,depois.pv_max],prof:[R.prof(R.nivelTotal(antes.ficha.classes)),R.prof(R.nivelTotal(depois.ficha.classes))],novas:b.filter(h=>!ids.has(h.id)),espacos:R.conjuracao(depois.ficha.classes),escolhas:validar(depois,{evolucao:true})};}
  const api={reconciliarNiveis,pvTotal,ganhoPV,construirProgressao,salvamento,configurar,estado,origem,requisitosMulti,classe,subclasse,nivelSub,caracteristicas,requisitos,grupos,gruposMagias,perfilMagias,rotulo,per,magiasConcedidas,magiaId,magiaPorId,custo,CUSTOS,iniciar,derivar,equipamento,aplicarEquipamento,itemCategoria,validar,subir,diferenca,idiomasRaca,copiar,get dados(){return D;}};
  return api;
})();
