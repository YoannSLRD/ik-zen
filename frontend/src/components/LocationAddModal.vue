<!-- frontend/src/components/LocationAddModal.vue (VERSION FINALE) -->
<template>
  <div class="modal fade" ref="modalElement" tabindex="-1" aria-labelledby="addLocationModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="addLocationModalLabel">Ajouter un nouveau lieu</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="handleSubmit">
            <div class="mb-3">
              <label for="newLocName" class="form-label">Nom du lieu</label>
              <input id="newLocName" class="form-control" v-model="newLocation.name" required />
            </div>
            <div class="mb-3">
              <label for="newLocAddress" class="form-label">Adresse complète</label>
              <!-- L'input est maintenant un select qui sera transformé par Tom Select -->
              <select id="newLocAddress" placeholder="Commencez à taper une adresse..."></select>
            </div>
            <div class="modal-footer px-0 pt-3">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
              <button type="submit" class="btn btn-primary" :disabled="loading || !newLocation.name || !newLocation.address">
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
import TomSelect from 'tom-select';
import api from '@/api';
import { useToast } from 'vue-toastification';

const emit = defineEmits(['location-added', 'close']);
const toast = useToast();
const modalElement = ref(null);
let modalInstance = null;
let tomSelectInstance = null; // Instance pour notre select d'adresse
const loading = ref(false);
const newLocation = ref({ name: '', address: '' });

const handleSubmit = async () => {
  loading.value = true;
  try {
    const { data: savedLocation } = await api.post('/locations', newLocation.value);
    toast.success("Lieu ajouté avec succès !");
    emit('location-added', savedLocation);
    hide();
  } catch (error) {
    toast.error(error.response?.data?.error || "Le lieu n'a pas pu être ajouté.");
  } finally {
    loading.value = false;
  }
};

const show = () => {
  newLocation.value = { name: '', address: '' };
  tomSelectInstance?.clear(); // On vide le select à chaque ouverture
  modalInstance?.show();
};

const hide = () => modalInstance?.hide();

onMounted(() => {
  modalInstance = new Modal(modalElement.value);
  modalElement.value.addEventListener('hidden.bs.modal', () => emit('close'));

  const VITE_GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY;

  if (!VITE_GEOAPIFY_API_KEY) {
    console.error("La clé API Geoapify (VITE_GEOAPIFY_API_KEY) n'est pas configurée dans le fichier .env du frontend.");
  }

  tomSelectInstance = new TomSelect('#newLocAddress', {
    valueField: 'formatted',
    labelField: 'formatted',
    searchField: 'formatted',
    create: true,
    // La magie de l'auto-complétion
    load: function(query, callback) {
      if (!query.length || !VITE_GEOAPIFY_API_KEY) return callback();
      const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&apiKey=${VITE_GEOAPIFY_API_KEY}`;
      
      fetch(url)
        .then(response => response.json())
        .then(json => {
          // On renvoie les suggestions à Tom Select
          callback(json.features.map(feature => feature.properties));
        }).catch(() => {
          callback(); // En cas d'erreur, on vide la liste
        });
    },
    onChange: (value) => {
      newLocation.value.address = value;
    }
  });
});

onUnmounted(() => {
  modalInstance?.dispose();
  tomSelectInstance?.destroy();
});

defineExpose({ show, modalElement });
</script>