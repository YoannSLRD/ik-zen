<!-- frontend/src/views/dashboard/DashboardVehicles.vue (VERSION FINALE) -->
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
      <div v-else-if="searchQuery && vehicles.length > 0" class="alert alert-warning">
        Aucun véhicule ne correspond à votre recherche.
      </div>
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
    
    <ConfirmModal
      ref="confirmModal"
      title="Confirmer la suppression"
      :message="confirmMessage"
      @confirm="onConfirmDelete"
    />

    <VehicleAddModal ref="vehicleAddModal" @vehicle-added="onVehicleAdded" />

    <VehicleEditModal 
      v-if="currentVehicle.id"
      ref="vehicleEditModal"
      :vehicle="currentVehicle"
      @vehicle-updated="onVehicleUpdated"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue';
import api from '@/api';
import { useToast } from 'vue-toastification';
import ConfirmModal from '@/components/ConfirmModal.vue';
import VehicleEditModal from '@/components/VehicleEditModal.vue';
import VehicleAddModal from '@/components/VehicleAddModal.vue';

const toast = useToast();
const isLoading = ref(true);
const vehicles = ref([]);
const currentVehicle = ref({ id: null, name: '', fiscal_power: '', vehicle_type: 'car' });

const searchQuery = ref('');
const currentPage = ref(1);
const itemsPerPage = ref(10);

const confirmModal = ref(null);
const vehicleToDelete = ref(null);
const confirmMessage = ref('');
const vehicleEditModal = ref(null);
const vehicleAddModal = ref(null);

const filteredVehicles = computed(() => {
  if (!searchQuery.value) return vehicles.value;
  const lowerCaseQuery = searchQuery.value.toLowerCase();
  return vehicles.value.filter(vehicle =>
    vehicle.name.toLowerCase().includes(lowerCaseQuery)
  );
});

const totalPages = computed(() => Math.ceil(filteredVehicles.value.length / itemsPerPage.value));
const paginatedVehicles = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredVehicles.value.slice(start, end);
});

const goToPage = (pageNumber) => { if (pageNumber >= 1 && pageNumber <= totalPages.value) currentPage.value = pageNumber; };
const prevPage = () => { if (currentPage.value > 1) currentPage.value--; };
const nextPage = () => { if (currentPage.value < totalPages.value) currentPage.value++; };

watch(searchQuery, () => { currentPage.value = 1; });

onMounted(() => {
  fetchVehicles();
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
  vehicleAddModal.value?.show();
};

const onVehicleAdded = () => {
  fetchVehicles();
};

const openEditModal = (vehicle) => {
  currentVehicle.value = { ...vehicle };
  nextTick(() => {
    vehicleEditModal.value?.show();
  });
};

const onVehicleUpdated = (updatedVehicle) => {
  const index = vehicles.value.findIndex(v => v.id === updatedVehicle.id);
  if (index !== -1) {
    vehicles.value[index] = updatedVehicle;
  }
};

const handleDelete = (vehicle) => {
  vehicleToDelete.value = vehicle;
  confirmMessage.value = `Êtes-vous sûr de vouloir supprimer le véhicule "${vehicle.name}" ?`;
  confirmModal.value?.show();
};

const onConfirmDelete = async () => {
  if (!vehicleToDelete.value) return;
  const vehicleToRemove = vehicleToDelete.value;
  const originalVehicles = [...vehicles.value];
  vehicles.value = vehicles.value.filter(v => v.id !== vehicleToRemove.id);
  
  const toastId = toast.info(`Suppression de "${vehicleToRemove.name}"...`, { timeout: false });
  
  try {
    await api.delete(`/vehicles/${vehicleToRemove.id}`);
    toast.update(toastId, { content: "Véhicule supprimé avec succès !", options: { type: 'success', timeout: 4000 } });
  } catch (error) {
    toast.update(toastId, { content: error.response?.data?.error || "Le véhicule n'a pas pu être supprimé.", options: { type: 'error', timeout: 6000 } });
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
</script>

<style scoped>
  .loading-indicator { padding: 20px; text-align: center; color: #888; }
</style>