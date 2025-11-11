<!-- frontend/src/components/ReasonEditModal.vue -->
<template>
    <div class="modal fade" ref="modalElement" tabindex="-1" aria-labelledby="editReasonModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="editReasonModalLabel">Modifier le motif</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="handleSubmit">
              <div class="mb-3">
                <label for="editReasonName" class="form-label">Nom du motif</label>
                <input id="editReasonName" class="form-control" v-model="editableReason.name" required />
              </div>
              <div class="modal-footer px-0 pt-3">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                <button type="submit" class="btn btn-primary" :disabled="loading">
                  {{ loading ? 'Sauvegarde...' : 'Sauvegarder les modifications' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, onUnmounted, watch } from 'vue';
  import { Modal } from 'bootstrap';
  import api from '@/api';
  import { useToast } from 'vue-toastification';
  
  const props = defineProps({
    reason: {
      type: Object,
      required: true,
    },
  });
  const emit = defineEmits(['reason-updated', 'close']);
  const toast = useToast();
  const modalElement = ref(null);
  let modalInstance = null;
  const loading = ref(false);
  const editableReason = ref({ ...props.reason });
  
  watch(() => props.reason, (newVal) => {
    editableReason.value = { ...newVal };
  });
  
  const handleSubmit = async () => {
    loading.value = true;
    try {
      const { data: updatedReason } = await api.put(`/reasons/${editableReason.value.id}`, editableReason.value);
      toast.success("Motif modifié avec succès !");
      emit('reason-updated', updatedReason);
      hide();
    } catch (error) {
      toast.error(error.response?.data?.error || "Le motif n'a pas pu être modifié.");
    } finally {
      loading.value = false;
    }
  };
  
  const show = () => {
    modalInstance?.show();
  };
  const hide = () => modalInstance?.hide();
  
  onMounted(() => {
    modalInstance = new Modal(modalElement.value);
    modalElement.value.addEventListener('hidden.bs.modal', () => emit('close'));
  });
  
  onUnmounted(() => {
    modalInstance?.dispose();
  });
  
  defineExpose({ show });
  </script>