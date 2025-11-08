<!-- frontend/src/components/LocationEditModal.vue -->
<template>
    <div class="modal fade" ref="modalElement" tabindex="-1" aria-labelledby="editLocationModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="editLocationModalLabel">Modifier le lieu</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="handleSubmit">
              <div class="mb-3">
                <label for="editLocName" class="form-label">Nom du lieu</label>
                <input id="editLocName" class="form-control" v-model="editableLocation.name" required />
              </div>
              <div class="mb-3">
                <label for="editLocAddress" class="form-label">Adresse complète</label>
                <select id="editLocAddress" placeholder="Commencez à taper une nouvelle adresse..."></select>
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
  import { ref, onMounted, onUnmounted } from 'vue';
  import { Modal } from 'bootstrap';
  import TomSelect from 'tom-select';
  import api from '@/api';
  import { useToast } from 'vue-toastification';
  
  const props = defineProps({
    location: {
      type: Object,
      required: true,
    },
  });
  const emit = defineEmits(['location-updated', 'close']);
  const toast = useToast();
  const modalElement = ref(null);
  let modalInstance = null;
  let tomSelectInstance = null;
  const loading = ref(false);
  // On utilise une copie locale pour éviter de modifier l'original avant la sauvegarde
  const editableLocation = ref({ ...props.location });
  
  const handleSubmit = async () => {
    loading.value = true;
    try {
      const { data: updatedLocation } = await api.put(`/locations/${editableLocation.value.id}`, editableLocation.value);
      toast.success("Lieu modifié avec succès !");
      emit('location-updated', updatedLocation);
      hide();
    } catch (error) {
      toast.error(error.response?.data?.error || "Le lieu n'a pas pu être modifié.");
    } finally {
      loading.value = false;
    }
  };
  
  const show = () => {
    // Met à jour la copie locale avec les nouvelles props à chaque ouverture
    editableLocation.value = { ...props.location };
    // Pré-remplit le select avec l'adresse actuelle
    if (tomSelectInstance) {
      tomSelectInstance.clear();
      tomSelectInstance.addOption({ value: editableLocation.value.address, text: editableLocation.value.address });
      tomSelectInstance.setValue(editableLocation.value.address);
    }
    modalInstance?.show();
  };
  
  const hide = () => modalInstance?.hide();
  
  onMounted(() => {
    modalInstance = new Modal(modalElement.value);
    modalElement.value.addEventListener('hidden.bs.modal', () => emit('close'));
    const VITE_GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY;
  
    tomSelectInstance = new TomSelect('#editLocAddress', {
      valueField: 'formatted',
      labelField: 'formatted',
      searchField: 'formatted',
      create: true,
      load: function(query, callback) {
        if (!query.length) return callback();
        const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&apiKey=${VITE_GEOAPIFY_API_KEY}`;
        fetch(url)
          .then(response => response.json())
          .then(json => callback(json.features.map(feature => feature.properties)))
          .catch(() => callback());
      },
      onChange: (value) => {
        editableLocation.value.address = value;
      }
    });
  });
  
  onUnmounted(() => {
    modalInstance?.dispose();
    tomSelectInstance?.destroy();
  });
  
  defineExpose({ show });
  </script>