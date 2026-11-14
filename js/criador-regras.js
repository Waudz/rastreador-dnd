
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
    const nomeSub=subclasse(c)?.nome;if(c.n>=3&&["Cavaleiro Místico","Trapaceiro Arcano"].includes(nomeSub)){const lista=[0,0,0,3,4,4,4,5,6,6,7,8,8,9,10,10,11,11,11,12,13],co={...c,sub:nomeSub},s=R.conjuracao([co]);return{classe:c.c,nome:R.classe(c.c).n,truques:2+(c.n>=10?1:0),qtd:lista[c.n],tipo:"known",escolas:nomeSub==="Cavaleiro Místico"?["Abjuração","Evocação"]:["Encantamento","Ilusão"],livres:1+[8,14,20].filter(n=>c.n>=n).length,max:s.slots.reduce((n,x,i)=>x?i+1:n,0),lista:"Wizard"};}
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
  /* As exceções pertencem à escolha recebida no nível 3/8/14/20, inclusive após substituições (errata PHB 2014). */
  function vagasMagias(f,cid,selecionadas) {
    const c=(f.classes||[]).find(c=>c.c===cid),p=c&&perfilMagias(c,f);if(!p?.escolas)return [];
    const key='magias|'+cid+'|magias',sel=selecionadas||(estado(f).selecoes[key]||[]),ant=estado(f).vagasMagias?.[key]||[],vagas=[];
    for(let n=3;n<=c.n;n++){const antes=n>3?perfilMagias({...c,n:n-1},f).qtd:0,ate=perfilMagias({...c,n},f).qtd;
      for(let i=antes;i<ate;i++)vagas.push({id:cid+':'+n+':'+i,nivel:n,livre:n===3?i===2:[8,14,20].includes(n),magia:null,confirmada:false});}
    const usados=new Set();
    for(const v of vagas){const a=ant.find(a=>a.id===v.id);if(a&&sel.includes(a.magia)&&!usados.has(a.magia)){v.magia=a.magia;v.confirmada=!!a.confirmada;v.nivelEscolha=a.nivelEscolha||v.nivel;usados.add(a.magia);}}
    const fora=id=>!p.escolas.includes(String(magiaPorId(id)?.cab||'').split(' · ')[0]);
    for(const id of sel.filter(id=>!usados.has(id)).sort((a,b)=>Number(fora(b))-Number(fora(a)))){
      const v=vagas.find(v=>!v.magia&&!v.livre&&!fora(id))||vagas.find(v=>!v.magia&&v.livre);if(!v)continue;
      v.magia=id;v.confirmada=!v.livre||fora(id);v.nivelEscolha=v.nivel;usados.add(id);
    }
    return vagas;
  }
  function registrarVagas(f){
    const st=estado(f);st.vagasMagias ||= {};
    for(const g of gruposMagias(f).filter(g=>g.escolas)){const ant=st.vagasMagias[g.key]||[],ativas=new Set(g.vagas.map(v=>v.id));st.vagasMagias[g.key]=ant.filter(v=>!ativas.has(v.id)).concat(g.vagas.filter(v=>v.magia));}
  }
  function definirVagaLivre(f,cid,id,magia){
    const g=gruposMagias(f).find(g=>g.key==='magias|'+cid+'|magias'),vs=g?.vagas||[],v=vs.find(v=>v.id===id);
    if(!v?.livre||!g.selecionadas.includes(magia))throw Error('Escolha livre inválida. Selecione uma magia conhecida da própria classe.');
    const outra=vs.find(v=>v.magia===magia),anterior=v.magia;
    if(outra&&outra.id!==v.id){if(anterior&&!outra.livre&&!g.escolas.some(e=>String(magiaPorId(anterior)?.cab||'').startsWith(e)))throw Error('A outra magia também precisa de uma escolha livre.');outra.magia=anterior;}
    v.magia=magia;v.confirmada=true;registrarVagas(f);const st=estado(f);st.vagasMagias[g.key]=(st.vagasMagias[g.key]||[]).filter(a=>!vs.some(v=>v.id===a.id)).concat(vs.filter(v=>v.magia));
    return v;
  }
  const ARCANUM=[[6,11],[7,13],[8,15],[9,17]];   // [círculo, nível de Bruxo]
  function gruposMagias(f){
    const out=[];
    for(const c of f.classes||[]){const p=perfilMagias(c,f);if(!p)continue;
      for(const tipo of ["truques","magias"]){const qtd=tipo==="truques"?p.truques:p.qtd;if(!qtd)continue;
        const concedidas=new Set([...magiasConcedidas(f).map(m=>m.id),...magiasRaciaisLista(f).filter(x=>R.nivelTotal(f.classes||[])>=x[1]).map(x=>{const m=MAGIAS.find(m=>m.en===x[0]);return m?magiaId(m):x[0];})]);const key="magias|"+c.c+"|"+tipo,opts=MAGIAS.filter(m=>!concedidas.has(magiaId(m))&&m.c.includes(p.lista||c.c)&&(tipo==="truques"?m.l===0:m.l>0&&m.l<=p.max)).map(magiaId);
        const antigos=(f.magias||[]).filter(m=>tipo==="truques"?m.l===0:m.l>0).map(magiaId);
        out.push({key,source:idClasse(c.c),titulo:p.nome+" · "+(tipo==="truques"?"truques":p.tipo==="spellbook"?"grimório":p.tipo==="prepared"?"magias preparadas":"magias conhecidas"),grants:"spell",qtd,opts,selecionadas:[...new Set(estado(f).selecoes[key]||antigos)].filter(id=>opts.includes(id)).slice(0,qtd),max:p.max,...(tipo==="magias"&&p.escolas?{escolas:p.escolas,livres:p.livres,vagas:vagasMagias(f,c.c,[...new Set(estado(f).selecoes[key]||antigos)].filter(id=>opts.includes(id)).slice(0,qtd))}:{})});
      }
    }
    for(const g of out.filter(g=>g.escolas))g.bloqueadas=g.opts.filter(id=>!g.selecionadas.includes(id)&&!g.escolas.some(e=>String(magiaPorId(id)?.cab||'').startsWith(e))&&!g.vagas.some(v=>v.livre&&!v.magia));
    /* Arcanum Místico do Bruxo (2014): uma magia de 6º, 7º, 8º e 9º círculo (níveis 11, 13, 15 e 17). Não é magia conhecida, não usa espaços de Pacto
       e não conta nos limites de conhecidas; cada uma é conjurada uma vez por descanso longo. */
    for(const c of f.classes||[]){if(c.c!=="Warlock")continue;
      for(const [circ,min] of ARCANUM){if(c.n<min)continue;
        const concedidas=new Set(magiasConcedidas(f).map(m=>m.id)),key="magias|Warlock|arcanum"+circ,opts=MAGIAS.filter(m=>!concedidas.has(magiaId(m))&&m.c.includes("Warlock")&&m.l===circ).map(magiaId);
        out.push({key,source:idClasse(c.c),titulo:"Bruxo · arcanum místico ("+circ+"º círculo)",grants:"spell",qtd:1,opts,selecionadas:[...new Set(estado(f).selecoes[key]||[])].filter(id=>opts.includes(id)).slice(0,1),max:circ,arcanum:circ});
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
  function ajustarTrocaHistorica(st,c,t,n,restaurar){
    if(!t)return;const key='magias|'+c+'|magias',lista=st.selecoes[key]||[],de=restaurar?t.de:t.para,para=restaurar?t.para:t.de,i=lista.indexOf(de);if(i<0)return;lista[i]=para;
    if(t.vaga){st.vagasMagias ||= {};const vs=st.vagasMagias[key] ||= [],j=vs.findIndex(v=>v.id===t.vaga.id),v={...copiar(t.vaga),...(restaurar?{magia:t.para,nivelEscolha:n}:{})};if(j<0)vs.push(v);else vs[j]=v;}
  }
  function reconciliarNiveis(f){
    const st=estado(f),classes=(f.classes||[]).filter(x=>x.c&&classe(x.c)),alvo={};classes.forEach(x=>{alvo[x.c]=Math.max(0,Number(x.n)||0);});
    const cont={},guardados=st.niveisInativos ||= [],removidos=[];let niveis=[];
    for(const x of st.niveis||[]){const n=cont[x.c]=(cont[x.c]||0)+1;
      if(n<=(alvo[x.c]||0))niveis.push(copiar(x));
      else{removidos.push({c:x.c,troca:x.troca,n});const registro={...copiar(x),nivelClasse:n,progressao:copiar((f.progressao||[]).find(p=>p.classe===x.c&&p.nivelClasse===n)||null)};
        const i=guardados.findIndex(g=>g.c===x.c&&g.nivelClasse===n);if(i<0)guardados.push(registro);else guardados[i]=registro;}
    }
    for(const x of removidos.reverse())ajustarTrocaHistorica(st,x.c,x.troca,x.n,false);
    for(const x of classes){let n=niveis.filter(e=>e.c===x.c).length;while(n<alvo[x.c]){n++;const i=guardados.findIndex(g=>g.c===x.c&&g.nivelClasse===n);if(i>=0){const {nivelClasse,progressao,...g}=guardados.splice(i,1)[0];niveis.push(g);ajustarTrocaHistorica(st,x.c,g.troca,n,true);}else niveis.push({c:x.c,pv:{modo:'fixo'}});}}
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
          if(tipo.startsWith("arcanum")){const min=(ARCANUM.find(a=>a[0]===+tipo.slice(7))||[])[1];if(nc===min&&g.selecionadas.length)escolhas[g.key]=[...g.selecionadas];continue;}
          const cum=n=>{const p=perfilMagias({...c,n},f);return p?(tipo==="truques"?p.truques:p.qtd):0;};
          const de=nc>1?cum(nc-1):0,ate=cum(nc),fatia=g.vagas?g.vagas.filter(v=>v.nivel===nc&&v.magia).map(v=>v.magia):g.selecionadas.slice(de,ate);if(fatia.length)escolhas[g.key]=fatia;continue;
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
    if(modo==="criacao"){if(!estado(f0()).equipAplicado&&!estado(f0()).concluido)q=aplicarEquipamento(q);pv_max=pvTotal(q.ficha);pv_atual=pv_max;}
    else if(modo==="editar"){
      const antes=derivar(iniciar(original,"criacao")).ficha,delta=pvTotal(q.ficha)-pvTotal(antes);
      pv_max=Math.max(1,Number(original.pv_max)+delta);pv_atual=Math.min(Number(original.pv_atual),pv_max);
    }
    const f=q.ficha;f.tracosRaciais=R.tracosRaciais(f.raca);f.criacao.concluido=true;
    const mudou=modo==="editar"?(pv_max!==Number(original.pv_max)||pv_atual!==Number(original.pv_atual)):false;
    return {dados:{nome:q.nome,ficha:f,pv_max,pv_atual,inventario:q.inventario,dinheiro:q.dinheiro},pv:{max:pv_max,atual:pv_atual,mudou}};
  }
  function derivar(p) {
    const q=copiar(p),f=q.ficha,st=estado(f),bg=origem(f);reconciliarNiveis(f);
    if(st.metodo==="pointbuy"||st.baseEditada){const racial={...(f.bonusRaca||{})};f.atributos={...st.base};f.bonusRaca={};f.bonusMelhorias={};if(st.metodo==="pointbuy")R.aplicarRaca(f,{});else{f.bonusRaca=racial;for(const k of ATR)f.atributos[k]=(Number(st.base[k])||0)+(racial[k]||0);}}R.aplicarMelhorias(f);
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
    registrarVagas(f);
    const escolhidas=[...gs,...gruposMagias(f)].filter(g=>g.grants==="spell").flatMap(g=>g.selecionadas.map(id=>({id,classe:g.source.split("/").pop(),arcanum:g.arcanum||0,vaga:g.vagas?.find(v=>v.magia===id)})));
    const mapa=new Map();
    for(const {id,classe:fonteClasse,arcanum,vaga} of escolhidas){const m=magiaPorId(id);if(!m)continue;const antigo=mapa.get(id);if(antigo){antigo.classes.push(fonteClasse);continue;}const cj=(f.classes||[]).find(x=>idClasse(x.c)==="srd51:class/"+fonteClasse)?.c||null,tipoC=classe(fonteClasse)?.data?.spellcasting?.preparation?.type;mapa.set(id,{...m,prep:m.l===0||tipoC==="prepared",classes:[fonteClasse],en:m.en,autoCriador:true,fonte:"classe",classeConj:cj,noGrimorio:tipoC==="spellbook"&&m.l>0,registroOrigem:{tipo:"classe",...(vaga?{vaga:vaga.id,nivel:vaga.nivel,escolaLivre:vaga.livre}:{})},...(arcanum?{arcanum,prep:true,semprePreparada:true,origem:"Arcanum Místico",registroOrigem:{tipo:"arcanum",circulo:arcanum}}:{})});}
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
      const propria=(f.classes||[]).find(c=>c.c===e.classeConj),alcance=propria?perfilMagias(propria,f)?.max||0:teto;
      e.ativa=e.arcanum?true:!(e.fonte==="classe"&&e.l>0&&alcance>0&&e.l>alcance)&&!(e.fonte==="classe"&&e.l>0&&alcance===0);if(!e.ativa)e.prep=false;}
    const substituidas=new Set((st.niveis||[]).filter(e=>e.troca).map(e=>e.troca.de));
    for(const m of p.ficha.magias||[])if(m.autoCriador&&!mapa.has(magiaId(m))&&!substituidas.has(magiaId(m)))mapa.set(magiaId(m),{...copiar(m),ativa:false,prep:false,inativaNivel:true});
    f.magias=[...mapa.values()];f.progressao=construirProgressao(f);return q;
  }
  function itemCategoria(cat){return D.items.filter(i=>{const w=i.data.weapon,g=i.data.gear;return cat==="simple-weapons"?w?.category==="simple":cat==="simple-melee-weapons"?w?.category==="simple"&&w.kind==="melee":cat==="martial-weapons"?w?.category==="martial":cat==="martial-melee-weapons"?w?.category==="martial"&&w.kind==="melee":cat==="musical-instruments"?i.data.tool?.category==="musical-instrument":g?.category===cat;});}
  /* ---------- Equipamento inicial ----------
     Cada item entregue carrega origem {tipo:"criacao", id:<chave estável>, nota}. A chave descreve DE ONDE o item veio (classe, grupo de escolha, pacote, origem),
     nunca o nome: serve para reconhecer o que já foi entregue sem depender de tradução e sem apagar nada do inventário existente. */
  const sem=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().trim();
  const slugNome=s=>sem(s).replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  const catalogo=()=>window.CAT_ITENS||null;
  const doCatalogo=id=>{try{return id&&catalogo()?.obter?.(id)||null;}catch(_){return null;}};
  /* Correspondência por nome só quando é única (ex.: "Bastão" é quarterstaff E rod no catálogo; ambíguo, não adivinhamos). */
  const idPorNomeUnico=nome=>{try{return catalogo()?.idPorNomeUnico?.(nome)||null;}catch(_){return null;}};
  const kgDe=i=>Math.round((i?.data?.weight||0)*0.453592*10)/10;
  function equipamento(p) {
    const f=p.ficha,st=estado(f),d=classe(f.classes?.[0]?.c),bg=origem(f),itens=[],pendentes=[],ausentes=[];
    if(!d)return {itens,pendentes:["Escolha uma classe."],ausentes};
    const nomeDe=i=>doCatalogo(i.id)?.nome||i.nome||i.en;
    const put=e=>{const x=itens.find(y=>y.origem.id===e.origem.id);if(x){x.qtd+=e.qtd;return;}itens.push(e);};
    /* id do catálogo + quantidade; pacotes viram os itens que os compõem, cada um com a origem "Criação — Pacote de ..." */
    const add=(id,qtd,chave,nota)=>{
      const i=D.items.find(x=>x.id===id);if(!i){ausentes.push(id);return;}
      const conteudo=i.data.gear?.contents;
      if(conteudo){const rotulo="Criação — "+nomeDe(i);conteudo.forEach(c=>add(c.item,c.quantity*qtd,chave+":"+id,rotulo));return;}
      const cat=doCatalogo(id),peso=cat&&Number.isFinite(Number(cat.peso))?Number(cat.peso):kgDe(i);
      put({id,catId:id,ref:id,nome:nomeDe(i),qtd,peso,origem:{tipo:"criacao",id:chave+":"+id,nota}});
    };
    const notaClasse="Criação — Equipamento de "+(R.classe(f.classes[0].c)?.n||"classe");
    for(const i of d.data.startingEquipment||[])add(i.item,i.quantity,"classe:fixo",notaClasse);
    (d.data.startingChoices||[]).forEach((g,i)=>{const o=g.options[Number(st.equipamento["op:"+i])];if(!o){pendentes.push("Equipamento: escolha a opção "+(i+1));return;}
      o.items.forEach((x,j)=>{if(x.item)add(x.item,x.quantity||1,"classe:g"+i,notaClasse);else for(let k=0;k<(x.count||1);k++){const key="item:"+i+":"+j+":"+k,id=st.equipamento[key];if(!itemCategoria(x.category).some(x=>x.id===id))pendentes.push("Escolha "+x.category);else add(id,1,"classe:g"+i+":c"+j,notaClasse);}});
    });
    /* Origem: usa o item do catálogo quando o nome corresponde a UM item; senão fica como item personalizado (sem peso inventado). */
    const notaOrigem="Criação — Origem "+(bg?.nome||""),bgId=bg?.id||"";
    const deOrigem=(nome,tipo)=>{const id=idPorNomeUnico(nome);
      if(id&&D.items.some(x=>x.id===id)){add(id,1,"origem:"+bgId+":"+tipo,notaOrigem);return;}
      if(id){const cat=doCatalogo(id);put({id,catId:id,ref:id,nome:cat.nome,qtd:1,peso:Number(cat.peso)||0,origem:{tipo:"criacao",id:"origem:"+bgId+":"+tipo+":"+id,nota:notaOrigem}});return;}
      put({nome,qtd:1,peso:0,origem:{tipo:"criacao",id:"origem:"+bgId+":"+tipo+":"+slugNome(nome),nota:notaOrigem}});};
    for(const n of bg?.equip||[])deOrigem(n,"equip");
    for(const n of [...(bg?.ferr||[]),...(grupos(f).find(g=>g.key==="background|ferramentas")?.selecionadas||[]).map(rotulo)].filter(n=>!/Veículos/.test(n)))if(!itens.some(i=>sem(i.nome)===sem(n)))deOrigem(n,"ferr");
    return {itens,pendentes,ausentes,ouro:bg?.ouro||0};
  }
  /* Um só caminho do catálogo para o inventário: o mesmo item sai igual do criador, do mestre ou da aba Itens. */
  function itemInventario(e){
    const C=catalogo(),cat=e.id?doCatalogo(e.id):null;
    if(cat&&C?.paraInventario&&window.INVENTARIO){const x=C.paraInventario(cat,e.qtd,e.origem);x.origem={...e.origem};if(!x.catId)x.catId=cat.id;if(!x.ref)x.ref=cat.id;return x;}
    const base={ref:e.ref||null,nome:e.nome,qtd:e.qtd,peso:e.peso||0,tipo:"equipamento",origem:e.origem,...(e.catId?{catId:e.catId}:{})};
    if(window.INVENTARIO?.novoItem)return window.INVENTARIO.novoItem(base);
    return {uid:"it_"+Date.now().toString(36)+Math.random().toString(36).slice(2,10),preco:null,equipado:false,propriedades:{},magiaVinculada:null,desc:"",...base};
  }
  const TIPO_DANO_PT={bludgeoning:"contundente",piercing:"perfurante",slashing:"cortante"};
  /* Ataque derivado dos dados da própria arma (id estável), não do nome traduzido. */
  function ataqueDaArma(id){
    const i=D.items.find(x=>x.id===id),w=i?.data.weapon;if(!w?.damage?.dice)return null;
    const props=(w.properties||[]).map(p=>p.split("/").pop());
    return {nome:doCatalogo(id)?.nome||i.nome||i.en,dado:w.damage.dice,tipo:TIPO_DANO_PT[w.damage.type]||w.damage.type,atr:props.includes("finesse")?"acuidade":w.kind==="ranged"?"des":"for",prof:true,magico:0,extra:0,distancia:w.kind==="ranged",armaId:id};
  }
  function requisitosMulti(f){
    if((f.classes||[]).filter(c=>c.c).length<2)return [];
    const atr={str:"for",dex:"des",con:"con",int:"int",wis:"sab",cha:"car"},erros=[];
    for(const c of f.classes||[]){const m=classe(c.c)?.data.multiclassing;if(!m)continue;const falha=r=>(f.atributos?.[atr[r.ability]]||0)<r.minimum;const faltam=(m.prerequisites||[]).filter(falha);if(faltam.length)erros.push(R.classe(c.c).n+": "+faltam.map(r=>R.ATR_NOME[atr[r.ability]]+" "+r.minimum).join(" e "));if(m.prerequisiteOptions&&m.prerequisiteOptions.from.every(falha))erros.push(R.classe(c.c).n+": "+m.prerequisiteOptions.from.map(r=>R.ATR_NOME[atr[r.ability]]+" "+r.minimum).join(" ou "));}return erros;
  }
  function aplicarEquipamento(p){
    const q=copiar(p),f=q.ficha,st=estado(f);if(st.equipAplicado)return q;
    const eq=equipamento(q);if(eq.pendentes.length)throw new Error(eq.pendentes.join(' · '));
    /* o que já veio da criação (mesma chave de origem) não entra de novo, mesmo que a marcação tenha se perdido; o resto do inventário não é tocado */
    const jaEntregues=new Set((q.inventario||[]).filter(i=>i?.origem?.tipo==="criacao"&&i.origem.id).map(i=>i.origem.id));
    const novos=eq.itens.filter(e=>!jaEntregues.has(e.origem.id));
    const criados=novos.map(itemInventario);
    q.inventario=[...(q.inventario||[]),...criados];
    const ouro=jaEntregues.size?0:eq.ouro;   // já houve entrega da criação: o ouro da Origem também já veio
q.dinheiro={...(q.dinheiro||{}),po:Number(q.dinheiro?.po||0)+ouro};
    f.equip ||= {armadura:'',escudo:false,bonus:0};f.ataques ||= [];
    /* o que veio da criação já nasce equipado e VINCULADO ao item do inventário (uid): todas as armas, a primeira armadura e o primeiro escudo */
    const EF=window.EQUIP_FICHA;
    novos.forEach((i,k)=>{const d=D.items.find(x=>x.id===i.id);if(!d)return;
      const escudo=d.id.endsWith('/shield'),armadura=!escudo&&!!d.data.armor;
      if((escudo&&(f.equip.escudo||f.equip.escudoUid))||(armadura&&(f.equip.armadura||f.equip.armaduraUid)))return;
      if(EF){try{EF.equipar(q,criados[k].uid);return;}catch(_){/* sem catálogo carregado: segue pelo caminho direto abaixo */}}
      if(escudo)f.equip.escudo=true;
      else if(armadura){const a=R.ARMADURAS.find(a=>a[0]===R.ARMADURA_POR_ITEM[d.id.split("/").pop()]);if(a)f.equip.armadura=a[0];}
      const atq=ataqueDaArma(i.id);if(atq&&!f.ataques.some(x=>x.armaId===atq.armaId||x.nome===atq.nome))f.ataques.push(atq);
    });
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
    for(const g of gruposMagias(f).filter(g=>g.escolas&&g.selecionadas.length===g.qtd))if(g.vagas.some(v=>v.livre&&(!v.magia||!v.confirmada)))erros.push({etapa:5,texto:"Identifique a magia de cada escolha livre de escola e confirme sua origem.",grupo:g.key});
    for(const g of gruposMagias(f).filter(g=>g.escolas))if(g.selecionadas.some(id=>!g.vagas.some(v=>v.magia===id))||g.vagas.some(v=>v.magia&&!v.livre&&!g.escolas.some(e=>String(magiaPorId(v.magia)?.cab||'').startsWith(e))))erros.push({etapa:5,texto:'Esta magia precisa de uma escolha livre disponível; as outras escolhas são restritas a '+g.escolas.join(' ou ')+'.',grupo:g.key});
    if(!evolucao){
      if(!R.RACAS.some(r=>r[0]===f.raca))erros.push({etapa:1,texto:"Escolha a raça."});
      if(f.raca==="Fada"&&!["int","sab","car"].includes(f.atrMagiaRaca))erros.push({etapa:1,texto:"Escolha o atributo da Magia de Fada."});
      if(!origem(f))erros.push({etapa:2,texto:"Escolha a Origem."});
      if((st.metodo==="pointbuy"||st.baseEditada)&&custo(st.base)!==27)erros.push({etapa:3,texto:"Distribua os 27 pontos de atributos (valores base entre 8 e 15)."});
      if((new Set((f.atrRaca||[]).filter(k=>ATR.includes(k)&&!(k in R.racial(f.raca).bonus)))).size<R.racial(f.raca).atributos)erros.push({etapa:1,texto:"Complete as escolhas de atributos da raça."});
      if(st.modo!=="editar"&&!st.equipAplicado&&!st.concluido)for(const texto of equipamento(p).pendentes)erros.push({etapa:6,texto});
    }
    if(!evolucao&&st.baseEditada&&ATR.some(k=>!Number.isInteger(st.base[k])||st.base[k]<1||st.base[k]>20||(Number(f.atributos?.[k])||0)>20))erros.push({etapa:3,texto:"Ajuste os atributos base para valores inteiros de 1 a 20, respeitando o limite 20 após os bônus."});
    for(const m of R.melhoriasDisponiveis(f.classes)){if(st.talentos?.[m.id]){if((f.melhorias?.[m.id]||[]).some(k=>ATR.includes(k)))erros.push({etapa:3,texto:"Escolha atributos ou talento, nunca ambos na mesma melhoria."});if(st.talentos[m.id].id==="srd51:feat/grappler"&&(Number(f.atributos?.for)||0)<13)erros.push({etapa:3,texto:"Imobilizador (Grappler) exige Força 13."});if(!st.talentos[m.id].nome?.trim())erros.push({etapa:3,texto:"Informe o talento escolhido no nível "+m.n});}else if((f.melhorias?.[m.id]||[]).filter(k=>ATR.includes(k)).length!==2)erros.push({etapa:3,texto:"Escolha a melhoria de atributos de "+m.classe+" no nível "+m.n+"."});}
    for(const g of [...grupos(f),...gruposMagias(f)])if(g.selecionadas.length<g.qtd)erros.push({etapa:g.source==="background"?2:g.source==="raca"?1:g.grants==="spell"?5:4,texto:g.titulo+": faltam "+(g.qtd-g.selecionadas.length)+" escolha(s).",grupo:g.key});
    return erros;
  }
  function subir(p,cid,rolagem) {
    const q=copiar(p),f=q.ficha;let c=f.classes.find(c=>c.c===cid);
    if(!c){if(!classe(cid))throw new Error("Escolha uma classe válida.");c={c:cid,n:0,sub:""};f.classes.push(c);}
    if(R.nivelTotal(f.classes)>=20)throw new Error("O limite é nível 20.");
    const dv=R.classe(cid).dv,valor=rolagem==="media"?Math.floor(dv/2)+1:Number(rolagem);
    if(!Number.isInteger(valor)||valor<1||valor>dv)throw new Error("O dado de vida deve ficar entre 1 e "+dv+".");
    registrarVagas(f);
    reconciliarNiveis(f);                                   // garante o histórico dos níveis que já existiam antes de somar o novo
    c.n++;const st=estado(f);st.niveis.push({c:cid,pv:rolagem==="media"?{modo:"fixo"}:{modo:"rolagem",valor}});
    const ganho=ganhoPV(f,st.niveis.length-1,st.niveis[st.niveis.length-1]);
    q.pv_max+=ganho;q.pv_atual=Math.min(q.pv_max,q.pv_atual+ganho);
    return q;
  }
  function diferenca(antes,depois){const a=caracteristicas(antes.ficha),b=caracteristicas(depois.ficha),ids=new Set(a.map(h=>h.id));return {nivel:[R.nivelTotal(antes.ficha.classes),R.nivelTotal(depois.ficha.classes)],pv:[antes.pv_max,depois.pv_max],prof:[R.prof(R.nivelTotal(antes.ficha.classes)),R.prof(R.nivelTotal(depois.ficha.classes))],novas:b.filter(h=>!ids.has(h.id)),espacos:R.conjuracao(depois.ficha.classes),escolhas:validar(depois,{evolucao:true})};}
  const api={vagasMagias,registrarVagas,definirVagaLivre,reconciliarNiveis,pvTotal,ganhoPV,construirProgressao,salvamento,configurar,estado,origem,requisitosMulti,classe,subclasse,nivelSub,caracteristicas,requisitos,grupos,gruposMagias,perfilMagias,rotulo,per,magiasConcedidas,magiaId,magiaPorId,custo,CUSTOS,iniciar,derivar,equipamento,aplicarEquipamento,itemInventario,ataqueDaArma,itemCategoria,validar,subir,diferenca,idiomasRaca,copiar,get dados(){return D;}};
  return api;
})();
