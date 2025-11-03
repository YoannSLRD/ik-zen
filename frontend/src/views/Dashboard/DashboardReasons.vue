<!-- frontend/src/views/dashboard/DashboardReasons.vue -->
<template>
  <div>
    <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
      <h1 class="h2"><font-awesome-icon icon="fa-solid fa-file-invoice" /> Mes Motifs</h1>
      <div class="btn-toolbar mb-2 mb-md-0">
        <button class="btn btn-sm btn-primary" @click="openAddModal">
          <font-awesome-icon icon="fa-solid fa-plus" />
          <span class="d-none d-md-inline ms-1">Ajouter un motif</span>
        </button>
      </div>
    </div>

    <!-- Champ de recherche -->
    <div v-if="reasons.length > 0" class="mb-3">
      <div class="input-group">
        <span class="input-group-text">
          <font-awesome-icon icon="fa-solid fa-search" />
        </span>
        <input type="text" class="form-control" placeholder="Rechercher par nom..." v-model="searchQuery">
      </div>
    </div>

    <div v-if="isLoading" class="loading-indicator">Chargement...</div>
    <div v-else>
      <div v-if="filteredReasons.length > 0" class="table-responsive">
        <table class="table table-striped table-hover">
          <thead>
            <tr>
              <th>Nom du Motif</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="reason in paginatedReasons" :key="reason.id">
              <td>{{ reason.name }}</td>
              <td class="text-end">
                <div class="d-inline-flex">
                  <button @click="openEditModal(reason)" class="btn btn-warning btn-sm me-2" title="Modifier">
                    <font-awesome-icon icon="fa-solid fa-edit" />
                  </button>
                  <button @click="handleDelete(reason)" class="btn btn-danger btn-sm" title="Supprimer">
                    <font-awesome-icon icon="fa-solid fa-trash" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else-if="searchQuery && reasons.length > 0" class="alert alert-warning">
        Aucun motif ne correspond à votre recherche.
      </div>
      <div v-else class="alert alert-light text-center p-4">
        <h4 class="alert-heading">Créez vos propres motifs de déplacement</h4>
        <p>Personnalisez vos trajets en ajoutant des motifs comme "Visite client", "Rendez-vous médical" ou "Trajet Domicile-Travail".</p>
        <hr>
        <button class="btn btn-primary" @click="openAddModal">
          <font-awesome-icon icon="fa-solid fa-plus" class="me-1" />
          Ajouter votre premier motif
        </button>
      </div>
    </div>
    
    <!-- Pagination -->
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
    <div class="modal fade" id="reasonModal" tabindex="-1" aria-labelledby="reasonModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="reasonModalLabel">{{ isEditing ? 'Modifier le motif' : 'Ajouter un motif' }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="handleSubmit">
              <div class="mb-3">
                <label for="reasonName" class="form-label">Nom du motif</label>
                <input id="reasonName" class="form-control" v-model="currentReason.name" required />
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                
                <!-- ***** BOUTON MIS À JOUR ***** -->
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
const reasons = ref([]);
const isEditing = ref(false);
const currentReason = ref({ id: null, name: '' });
const loadingForm = ref(false);

// --- LOGIQUE DE RECHERCHE ET PAGINATION ---
const searchQuery = ref('');
const currentPage = ref(1);
const itemsPerPage = ref(10);

const filteredReasons = computed(() => {
  if (!searchQuery.value) {
    return reasons.value;
  }
  const lowerCaseQuery = searchQuery.value.toLowerCase();
  return reasons.value.filter(reason =>
    reason.name.toLowerCase().includes(lowerCaseQuery)
  );
});

const totalPages = computed(() => {
  return Math.ceil(filteredReasons.value.length / itemsPerPage.value);
});

const paginatedReasons = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredReasons.value.slice(start, end);
});

const goToPage = (pageNumber) => {
  if (pageNumber >= 1 && pageNumber <= totalPages.value) currentPage.value = pageNumber;
};
const prevPage = () => { if (currentPage.value > 1) currentPage.value--; };
const nextPage = () => { if (currentPage.value < totalPages.value) currentPage.value++; };

watch(searchQuery, () => {
  currentPage.value = 1;
});
// --- FIN DE LA LOGIQUE ---

let reasonModal = null;
const confirmModal = ref(null);
const confirmMessage = ref('');
const reasonToDelete = ref(null);

onMounted(() => {
  const modalElement = document.getElementById('reasonModal');
  if (modalElement) {
    reasonModal = new Modal(modalElement);
  }
  fetchReasons();
});

onUnmounted(() => {
  if (reasonModal) {
    reasonModal.dispose();
  }
});

// MODIFICATION 2: Supprimer la création d'instance axios locale
// const api = axios.create({ ... }); // <-- SUPPRIMER CETTE LIGNE

const fetchReasons = async () => {
  isLoading.value = true;
  try {
    const { data } = await api.get('/reasons');
    reasons.value = data;
  } catch (error) {
    toast.error("Impossible de charger les motifs.");
  } finally {
    isLoading.value = false;
  }
};

const openAddModal = () => {
  isEditing.value = false;
  currentReason.value = { id: null, name: '' };
  if (reasonModal) reasonModal.show();
};

const openEditModal = (reason) => {
  isEditing.value = true;
  currentReason.value = { ...reason };
  if (reasonModal) reasonModal.show();
};

const handleDelete = (reason) => {
  reasonToDelete.value = reason;
  confirmMessage.value = `Êtes-vous sûr de vouloir supprimer le motif "${reason.name}" ?`;
  if (confirmModal.value) {
    confirmModal.value.show();
  }
};

const onConfirmDelete = async () => {
  if (!reasonToDelete.value) return;

  const reasonToRemove = reasonToDelete.value;
  const originalReasons = [...reasons.value];

  // 1. Mettre à jour l'UI immédiatement
  reasons.value = reasons.value.filter(r => r.id !== reasonToRemove.id);
  
  // 2. Créer un toast "en attente" et récupérer son ID
  const toastId = toast.info(
    `Suppression de "${reasonToRemove.name}"...`,
    { timeout: false } // Le toast ne disparaîtra pas tout seul
  );
  
  try {
    // 3. Envoyer la requête à l'API
    await api.delete(`/reasons/${reasonToRemove.id}`);
    
    // 4. Mettre à jour le toast existant en "succès"
    toast.update(toastId, {
      content: "Motif supprimé avec succès !",
      options: {
        type: 'success',
        timeout: 4000, // Disparaît après 4 secondes
      },
    });

  } catch (error) {
    // 5. En cas d'erreur, mettre à jour le toast en "échec"
    toast.update(toastId, {
      content: error.response?.data?.error || "Le motif n'a pas pu être supprimé.",
      options: {
        type: 'error',
        timeout: 6000, // On laisse le message d'erreur plus longtemps
      },
    });
    // Et on restaure la liste
    reasons.value = originalReasons;
  }
  
  reasonToDelete.value = null;
};

const handleSubmit = async () => {
  loadingForm.value = true;
  if (isEditing.value) {
    try {
      await api.put(`/reasons/${currentReason.value.id}`, currentReason.value);
      toast.success("Motif modifié avec succès !");
      if (reasonModal) reasonModal.hide();
      fetchReasons(); // On rafraîchit la liste complète après modification
    } catch (error) {
      toast.error(error.response?.data?.error || "Erreur lors de la modification.");
    } finally {
      loadingForm.value = false;
    }
  } else {
    // Logique optimistic pour l'ajout
    const newReason = { id: Date.now(), ...currentReason.value };
    reasons.value.unshift(newReason);
    if (reasonModal) reasonModal.hide();

    try {
      const { data: savedReason } = await api.post('/reasons', currentReason.value);
      const index = reasons.value.findIndex(r => r.id === newReason.id);
      if (index !== -1) {
        reasons.value[index] = savedReason;
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Le motif n'a pas pu être ajouté.");
      reasons.value = reasons.value.filter(r => r.id !== newReason.id);
    }
    loadingForm.value = false;
  }
};
</script>

<style scoped>
  .loading-indicator { padding: 20px; text-align: center; color: #888; }
</style>