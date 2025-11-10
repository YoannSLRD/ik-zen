<!-- frontend/src/components/VehicleEditModal.vue -->
<template>
    <div class="modal fade" ref="modalElement" tabindex="-1" aria-labelledby="editVehicleModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="editVehicleModalLabel">Modifier le véhicule</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="handleSubmit">
              <div class="mb-3">
                <label for="editVehName" class="form-label">Nom du véhicule</label>
                <input id="editVehName" class="form-control" v-model="editableVehicle.name" required />
              </div>
              <div class="mb-3">
                <label for="editVehType" class="form-label">Type de véhicule</label>
                <select id="editVehType" class="form-select" v-model="editableVehicle.vehicle_type" required>
                  <option value="car">Voiture (Thermique / Hybride)</option>
                  <option value="electric_car">Voiture Électrique</option>
                  <option value="motorcycle">Deux-roues (> 50cm³)</option>
                  <option value="moped">Cyclomoteur (≤ 50cm³)</option>
                </select>
              </div>
              <div class="mb-3">
                <label for="editVehFiscal" class="form-label">Puissance Fiscale (CV)</label>
                <input id="editVehFiscal" type="number" class="form-control" v-model="editableVehicle.fiscal_power" required min="1" />
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
    vehicle: {
      type: Object,
      required: true,
    },
  });
  const emit = defineEmits(['vehicle-updated', 'close']);
  const toast = useToast();
  const modalElement = ref(null);
  let modalInstance = null;
  const loading = ref(false);
  const editableVehicle = ref({ ...props.vehicle });
  
  watch(() => props.vehicle, (newVal) => {
    editableVehicle.value = { ...newVal };
  });
  
  const handleSubmit = async () => {
    loading.value = true;
    try {
      const { data: updatedVehicle } = await api.put(`/vehicles/${editableVehicle.value.id}`, editableVehicle.value);
      toast.success("Véhicule modifié avec succès !");
      emit('vehicle-updated', updatedVehicle);
      hide();
    } catch (error) {
      toast.error(error.response?.data?.error || "Le véhicule n'a pas pu être modifié.");
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