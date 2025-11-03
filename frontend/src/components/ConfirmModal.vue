<!-- frontend/src/components/ConfirmModal.vue -->
<template>
    <div class="modal fade" ref="modalElement" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
            <h5 class="modal-title">{{ title }}</h5>
            <button type="button" class="btn-close" @click="cancel" aria-label="Close"></button>
            </div>
            <div class="modal-body">
            <p>{{ message }}</p>
            </div>
            <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="cancel">Annuler</button>
            <button type="button" class="btn btn-danger" @click="confirm">Confirmer</button>
            </div>
        </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { Modal } from 'bootstrap';

// Propriétés pour rendre le composant configurable
const props = defineProps({
title: {
    type: String,
    default: 'Confirmation'
},
message: {
    type: String,
    required: true
}
});

// Événements que le composant peut émettre
const emit = defineEmits(['confirm', 'cancel']);

const modalElement = ref(null);
let modalInstance = null;

onMounted(() => {
if (modalElement.value) {
    modalInstance = new Modal(modalElement.value);
}
});

onUnmounted(() => {
if (modalInstance) {
    modalInstance.dispose();
}
});

const confirm = () => {
emit('confirm');
modalInstance.hide();
};

const cancel = () => {
emit('cancel');
modalInstance.hide();
};

// Fonction pour ouvrir la modale depuis l'extérieur
const show = () => {
if (modalInstance) {
    modalInstance.show();
}
};

// Exposer la fonction `show` pour qu'un composant parent puisse l'appeler
defineExpose({
show
});
</script>