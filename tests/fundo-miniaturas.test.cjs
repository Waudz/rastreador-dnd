const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('miniaturas com foto e sem foto compartilham o mesmo fundo',()=>{
 const css=fs.readFileSync('css/fichas.css','utf8');
 const thumb=css.match(/\.inv-thumb\{[^}]+\}/)?.[0];
 const vazio=css.match(/\.inv-thumb\.vazio\{[^}]+\}/)?.[0];
 assert.ok(thumb,'estilo base de miniatura');
 assert.ok(vazio,'estilo da miniatura sem foto');
 assert.match(thumb,/background:linear-gradient(145deg,rgba(201,167,106,.14),rgba(0,0,0,.28))/);
 assert.match(vazio,/background:linear-gradient(145deg,rgba(201,167,106,.14),rgba(0,0,0,.28))/);
 assert.doesNotMatch(thumb,/background:linear-gradient/);
 assert.match(css,/\.inv-thumb-img\{[^}]*object-fit:cover/);
});
