<!-- frontend/src/components/ReasonAddModal.vue -->
<template>
    <div class="modal fade" ref="modalElement" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Ajouter un nouveau motif</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="handleSubmit">
              <div class="mb-3">
                <label class="form-label">Nom du motif</label>
                <input class="form-control" v-model="newReason.name" required />
              </div>
              <div class="modal-footer px-0">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                <button type="submit" class="btn btn-primary" :disabled="loading">
                  {{ loading ? 'Enregistrement...' : 'Enregistrer' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, onUnmounted } from 'vue';
  import { Modal } from 'bootstrap';
  import api from '@/api';
  import { useToast } from 'vue-toastification';
  
  const emit = defineEmits(['location-added', 'close']);
  const toast = useToast();
  const modalElement = ref(null);
  let modalInstance = null;
  const loading = ref(false);
  const newReason = ref({ name: '' });
  
  const handleSubmit = async () => {
    loading.value = true;
    try {
      const { data: savedReason } = await api.post('/reasons', newReason.value);
      toast.success("Motif ajouté !");
      emit('reason-added', savedReason);
      hide();
    } catch (error) {
      toast.error(error.response?.data?.error || "Le motif n'a pas pu être ajouté.");
    } finally {
      loading.value = false;
    }
  };
  
  const show = () => {
    newReason.value = { name: '' };
    modalInstance?.show();
  };
  const hide = () => modalInstance?.hide();
  
  onMounted(() => {
    modalInstance = new Modal(modalElement.value);
    modalElement.value.addEventListener('hidden.bs.modal', () => emit('close'));
  });
  onUnmounted(() => { modalInstance?.dispose(); });
  
  defineExpose({ show });
  </script>