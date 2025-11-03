<!-- frontend/src/components/VehicleAddModal.vue -->
<template>
    <div class="modal fade" ref="modalElement" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Ajouter un nouveau véhicule</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="handleSubmit">
              <div class="mb-3">
                <label class="form-label">Nom du véhicule</label>
                <input class="form-control" v-model="newVehicle.name" required />
              </div>
              <div class="mb-3">
                <label class="form-label">Puissance Fiscale (CV)</label>
                <input type="number" class="form-control" v-model="newVehicle.fiscal_power" required min="1" />
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
  const newVehicle = ref({ name: '', fiscal_power: '' });
  
  const handleSubmit = async () => {
    loading.value = true;
    try {
      const { data: savedVehicle } = await api.post('/vehicles', newVehicle.value);
      toast.success("Véhicule ajouté !");
      emit('vehicle-added', savedVehicle);
      hide();
    } catch (error) {
      toast.error(error.response?.data?.error || "Le véhicule n'a pas pu être ajouté.");
    } finally {
      loading.value = false;
    }
  };
  
  const show = () => {
    newVehicle.value = { name: '', fiscal_power: '' };
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