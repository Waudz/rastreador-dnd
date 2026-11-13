const {test}=require('node:test'),assert=require('node:assert/strict');const {vm,executar}=require('./helpers.cjs');
/* Criador de fichas no padrão do Livro dos Monstros (js/ficha-criacao.js) e importador de bloco de estatísticas (js/ficha-importar.js).
   Os textos de teste são inventados (criatura fictícia) no formato do D&D Beyond em português; nenhum texto do livro entra no repositório. */
const c=vm.createContext({window:{},console});executar('js/ficha-criacao.js',c);Object.assign(c,c.window);executar('js/ficha-importar.js',c);
const FC=c.window.FICHA_CRIACAO,FI=c.window.FICHA_IMPORTAR,J=o=>JSON.parse(JSON.stringify(o));
const base=(extra={})=>({cat:'monster',name:'Teste',challenge_rating:2,ability_scores:{strength:14,dexterity:16,constitution:16,intelligence:13,wisdom:10,charisma:8},speed:{walk:30,unit:'feet'},actions:[],raw:{},...extra});
test('só com o nome: nada obrigatório além do básico; extras em branco não criam dados',()=>{
  const m=FC.aplicarExtras(base(),{});
  assert.deepEqual(J(m.saving_throws),{});assert.deepEqual(J(m.skill_bonuses),{});assert.equal(m.resistances_and_immunities.damage_resistances.length,0);assert.equal(m.darkvision_range,null);assert.equal(m.languages,undefined);
  assert.equal(m.passive_perception,10);assert.equal(m.proficiency_bonus,2);assert.equal(m.experience_points,450,'XP e bônus de proficiência saem do ND quando não informados');assert.deepEqual(J(m.actions),[]);
});
test('extras: salvaguardas, perícias, defesas, sentidos, idiomas, deslocamentos e tipos de ação; valores informados não são corrigidos',()=>{
  const m=FC.aplicarExtras(base(),{alinhamento:'neutral evil',armadura:'armadura natural',deslocamentos:{fly:60,swim:'',climb:30},prof:'3',xp:'999',salvaguardas:{constitution:'7',strength:''},pericias:{perception:'2',stealth:'5'},resistencias:['bludgeoning','piercing','slashing'],imunidades:['poison'],vulnerabilidades:['radiant'],condicoes:['poisoned'],naoMagico:{res:true},sentidos:{darkvision:120,passiva:'15'},idiomas:'Subcomum',acoes:{reacao:'Aparar | +5 | 1d4 perfurante | reação',lendaria:'Ataque de Cauda (Custa 2 Ações) | +11 | 2d8+6 contundente',bonus:'',covil:''}});
  assert.deepEqual(J(m.speed),{walk:30,unit:'feet',fly:60,climb:30});assert.equal(m.proficiency_bonus,3);assert.equal(m.experience_points,999);assert.deepEqual(J(m.saving_throws),{constitution:7});assert.deepEqual(J(m.skill_bonuses),{perception:2,stealth:5});
  const r=m.resistances_and_immunities;assert.equal(r.damage_resistances_display,'bludgeoning, piercing, and slashing from nonmagical attacks');assert.deepEqual(J(r.damage_immunities.map(x=>x.key)),['poison']);assert.equal(r.damage_vulnerabilities_display,'radiant');assert.equal(r.condition_immunities_display,'poisoned');
  assert.equal(m.darkvision_range,120);assert.equal(m.passive_perception,15,'o valor informado vale, mesmo diferente do cálculo');assert.equal(m.languages.as_string,'Subcomum');assert.equal(m.alignment,'neutral evil');assert.equal(m.armor_detail,'armadura natural');
  const tipos=m.actions.map(a=>a.action_type);assert.deepEqual(J(tipos),['REACTION','LEGENDARY_ACTION']);assert.equal(m.actions[1].legendary_action_cost,2);assert.equal(m.actions[1].name,'Ataque de Cauda');assert.equal(m.raw.reacao,'Aparar | +5 | 1d4 perfurante | reação');
});
test('ação em linha: ataque com vários danos, salvaguarda, recarga, compatível com o formato antigo e texto do livro preservado',()=>{
  const a=FC.parseAcao('Mordida | +14 | 2d10+8 perfurante + 2d6 ígneo + 1d4 frio | descrição');assert.equal(a.attacks[0].to_hit_mod,14);assert.equal(a.attacks[0].extra_damage_die_count,2);assert.equal(a.attacks[0].more_damage.length,1);assert.equal(a.attacks[0].more_damage[0].t,'frio');
  const s=FC.parseAcao('Sopro (Recarga 5–6) | CD 15 DES | 8d6 ígneo | cone de 18 m');assert.deepEqual(J(s.save),{dc:15,ability:'dexterity'});assert.equal(s.attacks[0].to_hit_mod,null);assert.equal(s.usage_limits.type,'RECHARGE_ON_ROLL');assert.equal(s.usage_limits.param,5);assert.equal(s.name,'Sopro','o nome não repete a recarga: a ficha a mostra a partir do dado estruturado');
  const l=FC.parseAcao('Garra | +4 | 1d6+2 | cortante | só texto');assert.equal(l.attacks[0].damage_type.name,'cortante');assert.match(l.desc,/Ataque: \+4 para acertar\. Dano: 1d6\+2 cortante\. só texto/);
  const t=FC.parseAcao('Garra | +4 | 1d6+3 cortante | Acerto: 6 (1d6 + 3) de dano cortante.');assert.equal(t.desc,'Acerto: 6 (1d6 + 3) de dano cortante.','o texto original não é duplicado por um resumo');
  assert.equal(FC.parseAcao('Ataques Múltiplos | faz dois ataques').attacks.length,0);assert.equal(FC.parseAcao('Intuição | texto').desc,'texto');
});
test('editar: os extras voltam ao formulário a partir da ficha salva; ficha antiga continua funcionando',()=>{
  const m=FC.aplicarExtras(base(),{salvaguardas:{wisdom:4},resistencias:['fire'],naoMagico:{res:false},sentidos:{darkvision:60},idiomas:'Comum',acoes:{reacao:'Aparar | +5 | 1d4 perfurante | x'},deslocamentos:{fly:40}});
  const ex=FC.extrasDeMonstro(m);assert.deepEqual(J(ex.salvaguardas),{wisdom:4});assert.deepEqual(J(ex.resistencias),['fire']);assert.equal(ex.sentidos.darkvision,60);assert.equal(ex.idiomas,'Comum');assert.equal(ex.acoes.reacao,'Aparar | +5 | 1d4 perfurante | x');assert.equal(ex.deslocamentos.fly,40);assert.equal(ex.prof,'','valor automático não vira valor fixo');
  const antiga={cat:'monster',name:'Velha',challenge_rating:1,ability_scores:{wisdom:10},actions:[{name:'Bater',desc:'x',attacks:[]}],traits:[],raw:{traits:'',actions:'Bater | x'}};assert.doesNotThrow(()=>FC.extrasDeMonstro(antiga));assert.equal(FC.aplicarExtras(antiga,{}).actions.length,1);
});
/* criatura fictícia no formato do D&D Beyond em português: links, imagens, entidades HTML, nomes de atributos em inglês e linhas soltas */
const BLOCO=[
'[Gnarlfang](https://exemplo.com/monstros/1-gnarlfang)','','Fera Pequena, Neutro Maligno','','[image](https://exemplo.com/stat-block-header-bar.svg)','','Classe de Armadura 13 (couro)','','Pontos de Vida 22 (5d6 + 5)','','Velocidade 30 pés., escalada 20 pés.','',
'STR','','12 (+1)','','DEX','','14 (+2)','','COM','','12 (+1)','','INT','','6 (-2)','','WIS','','10 (+0)','','CHA','','7 (-2)','',
'Habilidades: [Furtividade](https://exemplo.com/x#Skills) +4, Percepção +2','','Imunidade a Dano veneno','','Sentidos Visão no Escuro 60 pés, Percepção Passiva de 12','','Línguas Comum','','Desafio 1/2 (100 XP)','','Bônus de Proficiência +2','',
'Características','','Faro Aguçado. A criatura tem vantagem em testes de Sabedoria ( [Percepção](https://exemplo.com/x#Skills) ) que dependem do olfato.&nbsp;Texto de apoio.','','Ações','',
'Ataque múltiplo. A criatura realiza dois ataques: um de mordida e um de garra.','',
'Mordida. Ataque com arma corpo a corpo: +4 para acertar, alcance 1,5 m, um alvo. Acerto: 5 (1d6 + 2) de dano perfurante mais 2 (1d4) de dano ígneo.','',
'Sopro Ácido (Recarga 5–6). A criatura sopra em um cone de 4,5 metros. Cada criatura na área deve ser bem-sucedida em um teste de resistência de Destreza CD 11 ou sofrerá 7 (2d6) de dano ácido.','',
'Voz Estranha. A criatura escolhe um alvo que possa ver. O alvo realiza um teste de Carisma ( [Enganação ) contra um teste de Sabedoria ( Intuição](https://exemplo.com/x#Skills) ) da criatura. Se a criatura vencer, descobre um segredo do alvo.','',
'Reações','','Esquiva Rápida. Quando é atacada, a criatura pode se afastar 3 metros sem provocar ataques.',
'Descrição','Texto de ambientação inventado para o teste.','','Habitat: Floresta','','Regras Básicas (2014), pág. 1','','[Gnarlfang](https://exemplo.com/imagem.png)'].join('\n');
test('importador: bloco no formato do D&D Beyond (links, imagens, entidades, STR/DEX/COM, linhas soltas) vira campos sem inventar valores',()=>{
  const v=J(FI.parsear(BLOCO));
  assert.equal(v.nome,'Gnarlfang');assert.equal(v.tamanho,'Small');assert.equal(v.tipo,'Beast');assert.equal(v.alinhamento,'neutral evil');assert.equal(v.ca,13);assert.equal(v.armadura,'couro');assert.equal(v.pv,22);assert.equal(v.dados,'5d6 + 5');
  assert.deepEqual(v.deslocamentos,{walk:30,climb:20});assert.deepEqual(v.atributos,{strength:12,dexterity:14,constitution:12,intelligence:6,wisdom:10,charisma:7});
  assert.deepEqual(v.pericias,{stealth:4,perception:2});assert.deepEqual(v.salvaguardas,{});assert.deepEqual(v.imunidades,['poison']);assert.deepEqual(v.sentidos,{darkvision:60,passiva:12});assert.equal(v.idiomas,'Comum');assert.equal(v.nd,0.5);assert.equal(v.xp,100);assert.equal(v.prof,2);
  assert.equal(v.caracteristicas.length,1,'Faro Aguçado é característica passiva, não ação');assert.equal(v.caracteristicas[0].nome,'Faro Aguçado');assert.match(v.caracteristicas[0].texto,/vantagem em testes de Sabedoria \( Percepção \) que dependem do olfato\. Texto de apoio\./);
  assert.deepEqual(v.acoes.acao.map(l=>l.split('|')[0].trim()),['Ataque múltiplo','Mordida','Sopro Ácido (Recarga 5-6)','Voz Estranha']);
  assert.match(v.acoes.acao[0],/^Ataque múltiplo \| A criatura realiza dois ataques/,'ataque múltiplo fica como texto');
  assert.match(v.acoes.acao[1],/^Mordida \| \+4 \| 1d6\+2 perfurante \+ 1d4 ígneo \| Ataque com arma corpo a corpo: \+4 para acertar/);
  assert.match(v.acoes.acao[2],/^Sopro Ácido \(Recarga 5-6\) \| CD 11 DES \| 2d6 ácido \| /);assert.match(v.acoes.acao[3],/^Voz Estranha \| A criatura escolhe um alvo[^|]*Enganação \) contra um teste de Sabedoria \( Intuição \)/,'teste resistido: sem dano, texto preservado');
  assert.deepEqual(v.acoes.reacao.map(l=>l.split('|')[0].trim()),['Esquiva Rápida']);
  assert.ok(v.naoReconhecido.some(l=>/Texto de ambientação/.test(l))&&v.naoReconhecido.some(l=>/Habitat/.test(l)),'o que não foi reconhecido é preservado e sinalizado');assert.match(v.fonte,/Regras Básicas/);
  assert.ok(!v.naoReconhecido.some(l=>/^Gnarlfang$/i.test(l)),'a legenda repetida do nome não vira lixo');
});
test('importador não inventa nem corrige: campos ausentes ficam em branco e valores incoerentes com os atributos são preservados',()=>{
  const v=J(FI.parsear('Criatura Simples\nMédia humanoide, sem tendência\nClasse de Armadura 11\nPontos de Vida 9 (2d8)\nFOR DES CON INT SAB CAR\n10 (+0) 10 (+0) 10 (+0) 10 (+0) 10 (+0) 10 (+0)\nDesafio 1/8 (25 XP)\nAções\nGolpe. Ataque Corpo a Corpo com Arma: +9 para atingir, alcance 1,5 m, um alvo. Acerto: 20 (1d4 + 8) de dano contundente.'));
  assert.equal(v.nome,'Criatura Simples');assert.equal(v.tamanho,'Medium');assert.equal(v.tipo,'Humanoid');assert.equal(v.alinhamento,'unaligned');assert.deepEqual(v.pericias,{});assert.deepEqual(v.sentidos,{});assert.equal(v.idiomas,'');assert.equal(v.prof,null,'bônus de proficiência não informado fica vazio');assert.equal(v.xp,25);
  assert.match(v.acoes.acao[0],/^Golpe \| \+9 \| 1d4\+8 contundente \|/,'+9 e +8 são mantidos como no texto, mesmo incoerentes com os atributos 10');
  const vazio=J(FI.parsear('Só um Nome'));assert.equal(vazio.nome,'Só um Nome');assert.equal(vazio.ca,null);assert.equal(vazio.pv,null);assert.ok(vazio.avisos.length>0,'avisa o que não encontrou');
  assert.equal(J(FI.parsear('')).avisos.length,1);
});
test('importador em inglês e dano alternativo: sinaliza o que precisa de revisão',()=>{
  const v=J(FI.parsear('Test Beast\nLarge beast, unaligned\nArmor Class 12\nHit Points 30 (4d10 + 8)\nSpeed 40 ft., swim 30 ft.\nSTR DEX CON INT WIS CHA\n16 (+3) 12 (+1) 14 (+2) 2 (-4) 10 (+0) 5 (-3)\nSaving Throws Str +5\nDamage Resistances bludgeoning, piercing, and slashing from nonmagical attacks\nCondition Immunities charmed, frightened\nSenses blindsight 30 ft., passive Perception 10\nChallenge 1 (200 XP)\nActions\nSlam. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 8 (1d10 + 3) bludgeoning damage, or 10 (2d6 + 3) bludgeoning damage if grappled.'));
  assert.equal(v.tamanho,'Large');assert.deepEqual(v.deslocamentos,{walk:40,swim:30});assert.deepEqual(v.salvaguardas,{strength:5});assert.deepEqual(v.resistencias,['bludgeoning','piercing','slashing']);assert.equal(v.naoMagico.res,true);assert.deepEqual(v.condicoes,['charmed','frightened']);assert.equal(v.sentidos.blindsight,30);
  assert.match(v.acoes.acao[0],/^Slam \| \+5 \| 1d10\+3 bludgeoning \|/);assert.ok(v.avisos.some(a=>/alternativas/.test(a)),'dano alternativo sinalizado');
});
