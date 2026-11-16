<script setup>
import { computed, ref } from 'vue';
const props = defineProps({
  titulo: { type: String, required: true },
  registros: { type: Array, default: () => [] },
  chaveNome: { type: String, default: 'nome' },
  chaveDescricao: { type: String, default: 'descricao' },
});
const busca = ref('');
const ordem = ref('az');
const vista = ref('lista');
const col = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
const resultados = computed(() => props.registros
  .filter(item => String(item[props.chaveNome] ?? '').toLocaleLowerCase('pt-BR').includes(busca.value.toLocaleLowerCase('pt-BR')))
  .slice()
  .sort((a,b) => (ordem.value === 'za' ? -1 : 1) * col.compare(String(a[props.chaveNome] ?? ''), String(b[props.chaveNome] ?? ''))));
</script>
<template>
  <section class="catalogo" aria-label="Catálogo">
    <h2>{{ titulo }}</h2>
    <div class="controles">
      <label class="campo">Pesquisar <input v-model="busca" type="search" placeholder="Pesquisar por nome..." /></label>
      <label class="campo">Ordenar por <select v-model="ordem"><option value="az">Nome A–Z</option><option value="za">Nome Z–A</option></select></label>
      <div class="alternador" role="group" aria-label="Modo de exibição">
        <button type="button" :aria-pressed="vista === 'lista'" @click="vista='lista'">Lista</button>
        <button type="button" :aria-pressed="vista === 'grade'" @click="vista='grade'">Grade</button>
      </div>
    </div>
    <p class="status" role="status">{{ resultados.length }} resultados</p>
    <div :class="['resultados', vista]">
      <article v-for="(item,i) in resultados" :key="item.id ?? i" class="cartao">
        <slot name="item" :item="item"><strong>{{ item[chaveNome] }}</strong><small>{{ item[chaveDescricao] }}</small></slot>
      </article>
    </div>
    <p v-if="!resultados.length">Nenhum resultado encontrado.</p>
  </section>
</template>
