<script setup>
import CatalogoBase from './components/CatalogoBase.vue';
const exemplos = [
  { id: 'arma', nome: 'Armas', descricao: 'Catálogo de armas' },
  { id: 'magia', nome: 'Magias', descricao: 'Catálogo de magias' },
  { id: 'monstro', nome: 'Monstros', descricao: 'Bestiário' },
];
</script>
<template>
  <main class="pagina">
    <header><p class="eyebrow">Compêndio 5e · Protótipo isolado</p><h1>Base de componentes</h1></header>
    <p>Este protótipo demonstra o componente compartilhado. Não substitui nem consulta os dados do aplicativo publicado.</p>
    <CatalogoBase titulo="Exemplo de catálogo" :registros="exemplos" />
  </main>
</template>
