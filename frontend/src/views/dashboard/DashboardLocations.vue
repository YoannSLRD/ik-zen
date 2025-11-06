<!-- frontend/src/views/dashboard/DashboardLocations.vue -->
<template>
  <div>
    <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
      <h1 class="h2"><font-awesome-icon icon="fa-solid fa-map-marker-alt" /> Mes Lieux</h1>
      <div class="btn-toolbar mb-2 mb-md-0">
        <button class="btn btn-sm btn-primary" @click="openAddLocationQuickModal">
          <font-awesome-icon icon="fa-solid fa-plus" />
          <span class="d-none d-md-inline ms-1">Ajouter un lieu</span>
        </button>
      </div>
    </div>

    <div v-if="locations.length > 0" class="mb-3">
      <div class="input-group">
        <span class="input-group-text">
          <font-awesome-icon icon="fa-solid fa-search" />
        </span>
        <input type="text" class="form-control" placeholder="Rechercher par nom ou adresse..." v-model="searchQuery">
      </div>
    </div>

    <div v-if="isLoading" class="loading-indicator">Chargement...</div>
    <div v-else>
      <div v-if="filteredLocations.length > 0" class="table-responsive">
        <table class="table table-striped table-hover">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Adresse</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="location in paginatedLocations" :key="location.id">
              <td>{{ location.name }}</td>
              <td>{{ location.address }}</td>
              <td class="text-end">
                <!-- ** LA CORRECTION EST ICI ** -->
                <div class="d-inline-flex">
                  <button @click="openEditModal(location)" class="btn btn-warning btn-sm me-2" title="Modifier">
                    <font-awesome-icon icon="fa-solid fa-edit" />
                  </button>
                  <button @click="handleDelete(location)" class="btn btn-danger btn-sm" title="Supprimer">
                    <font-awesome-icon icon="fa-solid fa-trash" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else-if="searchQuery && locations.length > 0" class="alert alert-warning">
        Aucun lieu ne correspond à votre recherche.
      </div>
      <div v-else class="alert alert-light text-center p-4">
        <h4 class="alert-heading">Commencez par ajouter vos lieux fréquents !</h4>
        <p>Enregistrez votre domicile, votre lieu de travail, ou les adresses de vos clients pour pouvoir créer des trajets en un clin d'œil.</p>
        <hr>
        <button class="btn btn-primary" @click="openAddModal">
          <font-awesome-icon icon="fa-solid fa-plus" class="me-1" />
          Ajouter votre premier lieu
        </button>
      </div>
    </div>

    <!-- ***** NOUVEAU : COMPOSANT DE PAGINATION ***** -->
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
    

    <!-- Notre nouveau composant de confirmation -->
    <ConfirmModal
      ref="confirmModal"
      title="Confirmer la suppression"
      :message="confirmMessage"
      @confirm="onConfirmDelete"
    />

    <LocationAddModal ref="locationAddModal" @location-added="onLocationAddedQuick" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import api from '@/api'; // <-- MODIFICATION 1: Importer l'instance centralisée
import { useToast } from 'vue-toastification';
import { Modal } from 'bootstrap';
import ConfirmModal from '@/components/ConfirmModal.vue';
import LocationAddModal from '@/components/LocationAddModal.vue';

const loadingForm = ref(false);
const toast = useToast();
const isLoading = ref(true);
const locations = ref([]);
const isEditing = ref(false);
const currentLocation = ref({ id: null, name: '', address: '' });

const searchQuery = ref('');
const currentPage = ref(1);
const itemsPerPage = ref(15);

let locationModal = null;
const confirmModal = ref(null);
const confirmMessage = ref('');
const locationToDelete = ref(null);
const locationAddModal = ref(null);

const openAddLocationQuickModal = () => {
  locationAddModal.value?.show();
};

const onLocationAddedQuick = (newLocation) => {
  // Quand le modal a ajouté un lieu, on rafraîchit simplement toute la liste
  fetchLocations(); 
};

// ***** NOUVEAU : COMPUTED PROPERTY POUR LA RECHERCHE *****
const filteredLocations = computed(() => {
  if (!searchQuery.value) {
    return locations.value;
  }
  const lowerCaseQuery = searchQuery.value.toLowerCase();
  return locations.value.filter(location =>
    location.name.toLowerCase().includes(lowerCaseQuery) ||
    location.address.toLowerCase().includes(lowerCaseQuery)
  );
});

// ***** NOUVEAU : COMPUTED PROPERTY POUR LE TOTAL DE PAGES *****
const totalPages = computed(() => {
  return Math.ceil(filteredLocations.value.length / itemsPerPage.value);
});

// ***** NOUVEAU : COMPUTED PROPERTY POUR LA PAGINATION *****
const paginatedLocations = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredLocations.value.slice(start, end);
});

// ***** NOUVELLES FONCTIONS POUR CONTRÔLER LA PAGINATION *****
const goToPage = (pageNumber) => {
  if (pageNumber >= 1 && pageNumber <= totalPages.value) {
    currentPage.value = pageNumber;
  }
};
const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};
const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

// ***** AJOUTER CE WATCHER *****
watch(searchQuery, () => {
  // Chaque fois que la recherche change, on retourne à la première page.
  currentPage.value = 1;
});

onMounted(() => {
  const modalElement = document.getElementById('locationModal');
  if (modalElement) {
    locationModal = new Modal(modalElement);
  }
  fetchLocations();
});

onUnmounted(() => {
  if (locationModal) {
    locationModal.dispose();
  }
});

// MODIFICATION 2: Supprimer la création d'instance axios locale
// const api = axios.create({ ... }); // <-- SUPPRIMER CETTE LIGNE

const fetchLocations = async () => {
  isLoading.value = true;
  try {
    const { data } = await api.get('/locations');
    locations.value = data;
  } catch (error) {
    console.error("Erreur lors de la récupération des lieux:", error);
    toast.error("Impossible de charger les lieux.");
  } finally {
    isLoading.value = false;
  }
};

const openAddModal = () => {
  isEditing.value = false;
  currentLocation.value = { id: null, name: '', address: '' };
  locationAddModal.value?.show();
};

const openEditModal = (location) => {
  isEditing.value = true;
  currentLocation.value = { ...location };
  // Pour l'instant, on ne peut pas éditer avec l'autocomplétion,
  // on utilisera donc le modal d'ajout pour "remplacer" le lieu.
  // C'est une simplification pour l'instant.
  toast.info("Pour modifier, veuillez supprimer l'ancien lieu et en créer un nouveau.");
};

const handleSubmit = async () => {
    // Cette fonction est maintenant gérée par LocationAddModal
    // On rafraîchit simplement les données quand il a fini.
    await fetchLocations();
};

const handleDelete = (location) => {
  locationToDelete.value = location;
  confirmMessage.value = `Êtes-vous sûr de vouloir supprimer le lieu "${location.name}" ?`;
  if (confirmModal.value) {
    confirmModal.value.show();
  }
};

const onConfirmDelete = async () => {
  if (!locationToDelete.value) return;

  const locationToRemove = locationToDelete.value;
  const originalLocations = [...locations.value];

  // 1. Mettre à jour l'UI immédiatement
  locations.value = locations.value.filter(loc => loc.id !== locationToRemove.id);
  
  // 2. Créer un toast "en attente" et récupérer son ID
  const toastId = toast.info(
    `Suppression de "${locationToRemove.name}"...`,
    { timeout: false } // Le toast ne disparaîtra pas tout seul
  );
  
  try {
    // 3. Envoyer la requête à l'API
    await api.delete(`/locations/${locationToRemove.id}`);
    
    // 4. Mettre à jour le toast existant en "succès"
    toast.update(toastId, {
      content: "Lieu supprimé avec succès !",
      options: {
        type: 'success',
        timeout: 4000, // Le toast de succès disparaîtra après 4 secondes
      },
    });

  } catch (error) {
    // 5. En cas d'erreur, mettre à jour le toast en "échec"
    toast.update(toastId, {
      content: error.response?.data?.error || "Le lieu n'a pas pu être supprimé.",
      options: {
        type: 'error',
        timeout: 6000, // On laisse le message d'erreur plus longtemps
      },
    });
    // Et on restaure la liste
    locations.value = originalLocations;
  }
  
  locationToDelete.value = null;
};
</script>

<style scoped>
  .loading-indicator { padding: 20px; text-align: center; color: #888; }
</style>