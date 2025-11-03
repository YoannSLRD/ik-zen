<!-- frontend/src/views/dashboard/DashboardVehicles.vue -->
<template>
  <div>
    <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
      <h1 class="h2"><font-awesome-icon icon="fa-solid fa-car" /> Mes Véhicules</h1>
      <div class="btn-toolbar mb-2 mb-md-0">
        <button class="btn btn-sm btn-primary" @click="openAddModal">
          <font-awesome-icon icon="fa-solid fa-plus" />
          <span class="d-none d-md-inline ms-1">Ajouter un véhicule</span>
        </button>
      </div>
    </div>

    <!-- Champ de recherche (s'affiche s'il y a des véhicules) -->
    <div v-if="vehicles.length > 0" class="mb-3">
      <div class="input-group">
        <span class="input-group-text">
          <font-awesome-icon icon="fa-solid fa-search" />
        </span>
        <input type="text" class="form-control" placeholder="Rechercher par nom..." v-model="searchQuery">
      </div>
    </div>

    <div v-if="isLoading" class="loading-indicator">Chargement...</div>
    <div v-else>
      <!-- On affiche la table si la liste FILTRÉE a des résultats -->
      <div v-if="filteredVehicles.length > 0" class="table-responsive">
        <table class="table table-striped table-hover">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Puissance Fiscale</th>
              <th>Par Défaut</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <!-- On itère sur la liste PAGINÉE -->
            <tr v-for="vehicle in paginatedVehicles" :key="vehicle.id">
              <td>{{ vehicle.name }}</td>
              <td>{{ vehicle.fiscal_power }} CV</td>
              <td>
                <span v-if="vehicle.is_default" class="badge bg-success">Oui</span>
                <button v-else @click="setDefault(vehicle.id)" class="btn btn-outline-secondary btn-sm">Définir</button>
              </td>
              <td class="text-end">
                <div class="d-inline-flex">
                  <button @click="openEditModal(vehicle)" class="btn btn-warning btn-sm me-2" title="Modifier">
                    <font-awesome-icon icon="fa-solid fa-edit" />
                  </button>
                  <button @click="handleDelete(vehicle)" class="btn btn-danger btn-sm" title="Supprimer">
                    <font-awesome-icon icon="fa-solid fa-trash" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Message si la recherche ne donne aucun résultat -->
      <div v-else-if="searchQuery && vehicles.length > 0" class="alert alert-warning">
        Aucun véhicule ne correspond à votre recherche.
      </div>
      <!-- Message s'il n'y a aucun véhicule du tout -->
      <div v-else class="alert alert-light text-center p-4">
        <h4 class="alert-heading">Enregistrez votre véhicule</h4>
        <p>Ajoutez le ou les véhicules que vous utilisez pour vos déplacements professionnels. Le premier véhicule ajouté sera défini par défaut.</p>
        <hr>
        <button class="btn btn-primary" @click="openAddModal">
          <font-awesome-icon icon="fa-solid fa-plus" class="me-1" />
          Ajouter votre premier véhicule
        </button>
      </div>
    </div>
    
    <!-- Pagination (s'affiche si plus d'une page) -->
    <nav v-if="totalPages > 1" aria-label="Page navigation">
      <ul class="pagination justify-content-center">
        <li class="page-item" :class="{ disabled: currentPage === 1 }">
          <a class="page-link" href="#" @click.prevent="prevPage">Précédent</a>
        </li>
        <li class="page-item" v-for="pageNumber in totalPages" :key="pageNumber" :class="{ active: currentPage === pageNumber }">
          <a class="page-link" href="#" @click.prevent="goToPage(pageNumber)">{{ pageNumber }}</a>
        </li>
        <li class="page-item" :class="{ disabled: currentPage === totalPages }">
          <a class="page-link" href="#" @click.prevent="nextPage">Suivant</a>
        </li>
      </ul>
    </nav>
    
    <!-- Modale d'ajout/modification -->
    <div class="modal fade" id="vehicleModal" tabindex="-1" aria-labelledby="vehicleModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="vehicleModalLabel">{{ isEditing ? 'Modifier le véhicule' : 'Ajouter un véhicule' }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="handleSubmit">
              <div class="mb-3">
                <label for="vehName" class="form-label">Nom du véhicule</label>
                <input id="vehName" class="form-control" v-model="currentVehicle.name" required />
              </div>
              <div class="mb-3">
                <label for="vehType" class="form-label">Type de véhicule</label>
                <select id="vehType" class="form-select" v-model="currentVehicle.vehicle_type" required>
                  <option value="car">Voiture (Thermique / Hybride)</option>
                  <option value="electric_car">Voiture Électrique</option>
                  <option value="motorcycle">Deux-roues (> 50cm³)</option>
                  <option value="moped">Cyclomoteur (≤ 50cm³)</option> <!-- NOUVELLE OPTION -->
                </select>
              </div>
              <div class="mb-3">
                <label for="vehFiscal" class="form-label">Puissance Fiscale (CV)</label>
                <input id="vehFiscal" type="number" class="form-control" v-model="currentVehicle.fiscal_power" required min="1" />
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                <button type="submit" class="btn btn-primary" :disabled="loadingForm">
                  <span v-if="loadingForm" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  {{ loadingForm ? 'Enregistrement...' : 'Enregistrer' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <!-- Notre composant de confirmation -->
    <ConfirmModal
      ref="confirmModal"
      title="Confirmer la suppression"
      :message="confirmMessage"
      @confirm="onConfirmDelete"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import api from '@/api'; // <-- MODIFICATION 1: Importer l'instance centralisée
import { useToast } from 'vue-toastification';
import { Modal } from 'bootstrap';
import ConfirmModal from '@/components/ConfirmModal.vue';

const toast = useToast();
const isLoading = ref(true);
const vehicles = ref([]);
const isEditing = ref(false);
const currentVehicle = ref({ id: null, name: '', fiscal_power: '', vehicle_type: 'car' });
const loadingForm = ref(false);

const searchQuery = ref('');
const currentPage = ref(1);
const itemsPerPage = ref(10);

const filteredVehicles = computed(() => {
  if (!searchQuery.value) {
    return vehicles.value;
  }
  const lowerCaseQuery = searchQuery.value.toLowerCase();
  return vehicles.value.filter(vehicle =>
    vehicle.name.toLowerCase().includes(lowerCaseQuery)
  );
});

const totalPages = computed(() => {
  return Math.ceil(filteredVehicles.value.length / itemsPerPage.value);
});

const paginatedVehicles = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredVehicles.value.slice(start, end);
});

const goToPage = (pageNumber) => {
  if (pageNumber >= 1 && pageNumber <= totalPages.value) currentPage.value = pageNumber;
};
const prevPage = () => { if (currentPage.value > 1) currentPage.value--; };
const nextPage = () => { if (currentPage.value < totalPages.value) currentPage.value++; };

watch(searchQuery, () => {
  currentPage.value = 1;
});

let vehicleModal = null;
const confirmModal = ref(null);
const confirmMessage = ref('');
const vehicleToDelete = ref(null);

onMounted(() => {
  const modalElement = document.getElementById('vehicleModal');
  if (modalElement) {
    vehicleModal = new Modal(modalElement);
  }
  fetchVehicles();
});

onUnmounted(() => {
  if (vehicleModal) {
    vehicleModal.dispose();
  }
});

const fetchVehicles = async () => {
  isLoading.value = true;
  try {
    const { data } = await api.get('/vehicles');
    vehicles.value = data;
  } catch (error) {
    toast.error("Impossible de charger les véhicules.");
  } finally {
    isLoading.value = false;
  }
};

const openAddModal = () => {
  isEditing.value = false;
  currentVehicle.value = { id: null, name: '', fiscal_power: '', vehicle_type: 'car' };
  if (vehicleModal) vehicleModal.show();
};

const openEditModal = (vehicle) => {
  isEditing.value = true;
  currentVehicle.value = { ...vehicle };
  if (vehicleModal) vehicleModal.show();
};

const handleDelete = (vehicle) => {
  vehicleToDelete.value = vehicle;
  confirmMessage.value = `Êtes-vous sûr de vouloir supprimer le véhicule "${vehicle.name}" ?`;
  if (confirmModal.value) {
    confirmModal.value.show();
  }
};

const onConfirmDelete = async () => {
  if (!vehicleToDelete.value) return;

  const vehicleToRemove = vehicleToDelete.value;
  const originalVehicles = [...vehicles.value];

  // 1. Mettre à jour l'UI immédiatement
  vehicles.value = vehicles.value.filter(v => v.id !== vehicleToRemove.id);
  
  // 2. Créer un toast "en attente" et récupérer son ID
  const toastId = toast.info(
    `Suppression de "${vehicleToRemove.name}"...`,
    { timeout: false } // Le toast ne disparaîtra pas tout seul
  );
  
  try {
    // 3. Envoyer la requête à l'API
    await api.delete(`/vehicles/${vehicleToRemove.id}`);
    
    // 4. Mettre à jour le toast existant en "succès"
    toast.update(toastId, {
      content: "Véhicule supprimé avec succès !",
      options: {
        type: 'success',
        timeout: 4000, // Disparaît après 4 secondes
      },
    });

  } catch (error) {
    // 5. En cas d'erreur, mettre à jour le toast en "échec"
    toast.update(toastId, {
      content: error.response?.data?.error || "Le véhicule n'a pas pu être supprimé.",
      options: {
        type: 'error',
        timeout: 6000, // On laisse le message d'erreur plus longtemps
      },
    });
    // Et on restaure la liste
    vehicles.value = originalVehicles;
  }
  
  vehicleToDelete.value = null;
};

const setDefault = async (id) => {
  try {
    await api.post(`/vehicles/${id}/set-default`);
    toast.success("Véhicule par défaut mis à jour.");
    fetchVehicles();
  } catch (error) {
    toast.error("Erreur lors de la mise à jour.");
  }
};

const handleSubmit = async () => {
  loadingForm.value = true;
  if (isEditing.value) {
    // Logique classique pour la modification
    try {
      await api.put(`/vehicles/${currentVehicle.value.id}`, currentVehicle.value);
      toast.success("Véhicule modifié avec succès !");
      if (vehicleModal) vehicleModal.hide();
      fetchVehicles();
    } catch (error) {
      toast.error(error.response?.data?.error || "Erreur lors de la modification.");
    } finally {
      loadingForm.value = false;
    }
  } else {
    // Logique optimistic pour l'ajout
    const newVehicle = { id: Date.now(), ...currentVehicle.value };
    vehicles.value.unshift(newVehicle);
    if (vehicleModal) vehicleModal.hide();

    try {
      const { data: savedVehicle } = await api.post('/vehicles', currentVehicle.value);
      const index = vehicles.value.findIndex(v => v.id === newVehicle.id);
      if (index !== -1) {
        vehicles.value[index] = savedVehicle;
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Le véhicule n'a pas pu être ajouté.");
      vehicles.value = vehicles.value.filter(v => v.id !== newVehicle.id);
    }
    loadingForm.value = false; // Mettre à false après l'opération
  }
};
</script>

<style scoped>
  .loading-indicator { padding: 20px; text-align: center; color: #888; }
</style>