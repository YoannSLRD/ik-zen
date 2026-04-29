<!-- frontend/src/components/CustomSelect.vue -->
<template>
  <select ref="selectEl">
    <option value=""></option>
  </select>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import TomSelect from 'tom-select';
import 'tom-select/dist/css/tom-select.bootstrap5.css';

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: '-- Choisir --' },
});

const emit = defineEmits(['update:modelValue']);
const selectEl = ref(null);
let tsInstance = null;

onMounted(() => {
  tsInstance = new TomSelect(selectEl.value, {
    valueField: 'value',
    labelField: 'text',
    searchField: 'text',
    options: props.options,
    placeholder: props.placeholder,
    create: false,
    render: {
      no_results: () => '<div class="no-results" style="padding: 8px;">Aucun résultat trouvé</div>',
    },
    onChange: (value) => {
      emit('update:modelValue', value);
    }
  });

  if (props.modelValue) {
    tsInstance.setValue(props.modelValue, true);
  }
});

watch(() => props.options, (newOptions) => {
  if (tsInstance) {
    tsInstance.clearOptions();
    tsInstance.addOptions(newOptions);
    tsInstance.refreshOptions(false);
  }
}, { deep: true });

watch(() => props.modelValue, (newVal) => {
  if (tsInstance && newVal !== tsInstance.getValue()) {
    if (!newVal) {
      tsInstance.clear(true);
    } else {
      tsInstance.setValue(newVal, true);
    }
  }
});

onUnmounted(() => {
  if (tsInstance) {
    tsInstance.destroy();
  }
});
</script>