const {test}=require('node:test'),assert=require('node:assert/strict');
const {ler}=require('./helpers.cjs');
test('ficha aberta ao lado: a página cede o espaço em campanha, conta e demais páginas (não fica escondida atrás do painel)',()=>{
  const c=ler('css/fichas.css');
  assert.match(c,/@media\(min-width:900px\) \{[\s\S]*html:not\(\[data-app-view\]\) body:has\(> main #dock-r\) \{ padding-right:calc\(var\(--pad-corpo,24px\) \+ var\(--painel-reserva-direita,0px\)\)/);
  assert.match(c,/@media\(max-width:899px\) \{\s*#dock-r, \.ci-resumo \{/);
  assert.match(ler('js/paineis-layout.js'),/largura>=900\?'lateral'/);assert.match(ler('js/paineis-layout.js'),/--ficha-painel/);
  assert.match(ler('css/identidade.css'),/@media\(min-width:900px\) and \(max-width:1199px\) \{\s*body\.com-ficha-lateral \.appheader/);
});
test('menu de três pontos da ficha: o popover fica sob o botão, não no meio da tela',()=>{
  assert.match(ler('css/mobile.css'),/\.compact-popover\[popover\],\.ficha-menu-opcoes\[popover\]\{position:fixed;inset:auto;margin:0;/);
});
test('aparência da campanha: o campo mostra o que está vinculado (salva, escolhida ou removida)',()=>{
  const v=ler('js/campanha-visual.js');
  assert.match(v,/Imagem salva e vinculada à campanha/);assert.match(v,/\(salva e vinculada\)/);assert.match(v,/\(prévia, ainda não salva\)/);assert.match(v,/Remoção preparada \(salve para confirmar\)/);
});
test('enquadramento do fundo: migração proposta (não aplicada) cobre coluna, RPC versionada e testes',()=>{
  const m=ler('supabase/migrations/20261112090000_enquadramento_campanhas.sql');
  assert.match(m,/PROPOSTA PARA APROVAÇÃO\. Não aplicada/);assert.match(m,/salvar_visual_campanha_enquadrada/);assert.match(m,/visual_responsavel\(p_campanha\)/);
  assert.ok(!/drop (table|policy)|delete from|truncate/i.test(m.replace(/^--.*$/gm,'')),'aditiva: sem apagar nada');
  assert.match(ler('tests/enquadramento-campanhas.test.sql'),/Jogador gravou o enquadramento/);
});

test('ajustar só o enquadramento (sem trocar arquivo) pode ser salvo, fecha a aba e não pede descarte depois',()=>{
  const v=ler('js/campanha-visual.js');
  assert.match(v,/Object\.keys\(mudancas\)\.length === 0 && !quadroMudou/);
  assert.match(v,/estado\.enquadramento=frame;editando=true;quadroMudou=true/);
  assert.match(v,/base=r\.visual;mudancas=\{\};editando=false;quadroMudou=false;/);
  assert.match(v,/campanha-visual:fechar/);
});

test('editor de enquadramento: o preview usa a proporção real da faixa (computador e celular) e a mesma película escura',()=>{
  const e=ler('js/enquadramento.js'),v=ler('js/campanha-visual.js');
  assert.match(e,/arquivo\.referencia/);assert.match(e,/cv\.height=Math\.max\(60,Math\.min\(520,Math\.round\(cv\.width\*r\.h\/r\.w\)\)\)/);assert.match(e,/createLinearGradient/);
  assert.match(v,/function referenciaFundo\(\)/);assert.equal((v.match(/arquivo\.referencia=referenciaFundo\(\)/g)||[]).length,2);
  assert.match(ler('css/mobile.css'),/\.crop-fundo \.crop-stage\{[^}]*aspect-ratio:auto/);
});

test('Subir de nível fica junto do nível do personagem, some no nível 20 e na ficha embutida',()=>{
  const j=ler('js/personagem.js');
  assert.match(j,/<span class="badge">Nível \$\{nivelTotal\(\)\}<\/span>\$\{nivelTotal\(\)<20\?`<a class="btnlike small ficha-subir-nivel" href="criar-personagem\.html\?id=\$\{encodeURIComponent\(id\)\}&modo=nivel">Subir de nível<\/a>`:""\}/);
  assert.match(ler('css/fichas.css'),/\.ficha-embutida \.ficha-subir-nivel \{ display:none; \}/);
});

test('subir de nível é guiado, tela a tela: classe, PV, novidades da classe, raça, atributos, magias e revisão',()=>{
  const j=ler('js/criador.js');
  assert.match(j,/const VISIVEIS=evolucao\?\[0,8,9,10,3,5,7\]:\[0,1,2,3,4,5,6,7\]/);
  for(const nome of ['Classe','Pontos de vida','Novidades da classe','Raça','Atributos e talentos','Magias','Revisão'])assert.ok(j.includes("'"+nome+"'"),nome);
  assert.match(j,/function pvHTML\(\)/);assert.match(j,/Dado de vida de \$\{esc\(cls\.n\)\}: <b>d\$\{cls\.dv\}<\/b>/);assert.match(j,/Valor fixo: <b>\$\{Math\.floor\(cls\.dv\/2\)\+1\}<\/b> \(média\)/);
  assert.match(j,/if\(t\.id==='nivel-classe'\)\{classeNivel=t\.value;desenhar\(\);return;\}/);assert.match(j,/if\(t\.id==='nivel-pv'\)\{pvModo=t\.value;atualizarNivelForm\(\);return;\}/);
  assert.match(j,/function racaNovidadesHTML\(\)/);assert.match(j,/Nenhuma novidade racial neste nível/);assert.match(j,/Este nível não concede melhoria de atributo nem talento/);
  assert.match(j,/Aplicar o novo nível e continuar/);assert.ok(!/Prévia do novo nível/.test(j));assert.match(j,/id="desfazer-nivel"/);
});
test('subir de nível só acrescenta: escolhas, subclasse e melhorias anteriores ficam bloqueadas (mudar é em Editar personagem)',()=>{
  const j=ler('js/criador.js');
  assert.match(j,/travada=evolucao&&!!origSel\.get\(g\.key\)\?\.has\(v\)/);assert.match(j,/Escolha anterior \(bloqueada\)\. Para mudar, use Editar personagem/);
  assert.match(j,/asiAntigos/);assert.match(j,/Subclasse já escolhida \(bloqueada\)/);assert.match(j,/data-classe="\$\{i\}" \$\{evolucao\?'disabled':''\}/);
  assert.match(j,/const RACA_NIVEIS=/);for(const raca of ['Fada','Drow','Tiefling','Draconato'])assert.ok(j.includes(raca),raca);
});
