<!-- frontend/src/views/dashboard/DashboardReasons.vue (VERSION FINALE) -->
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

    <ReasonAddModal ref="reasonAddModal" @reason-added="onReasonAdded" />
    
    <ReasonEditModal 
      v-if="currentReason.id"
      ref="reasonEditModal"
      :reason="currentReason"
      @reason-updated="onReasonUpdated"
    />
  </div>
</template>
  
<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue';
import api from '@/api';
import { useToast } from 'vue-toastification';
import ConfirmModal from '@/components/ConfirmModal.vue';
import ReasonAddModal from '@/components/ReasonAddModal.vue';
import ReasonEditModal from '@/components/ReasonEditModal.vue';

const toast = useToast();
const isLoading = ref(true);
const reasons = ref([]);
const currentReason = ref({ id: null, name: '' });

const searchQuery = ref('');
const currentPage = ref(1);
const itemsPerPage = ref(10);

const confirmModal = ref(null);
const reasonToDelete = ref(null);
const confirmMessage = ref('');
const reasonEditModal = ref(null);
const reasonAddModal = ref(null);

const filteredReasons = computed(() => {
  if (!searchQuery.value) return reasons.value;
  const lowerCaseQuery = searchQuery.value.toLowerCase();
  return reasons.value.filter(reason =>
    reason.name.toLowerCase().includes(lowerCaseQuery)
  );
});

const totalPages = computed(() => Math.ceil(filteredReasons.value.length / itemsPerPage.value));
const paginatedReasons = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredReasons.value.slice(start, end);
});

const goToPage = (pageNumber) => { if (pageNumber >= 1 && pageNumber <= totalPages.value) currentPage.value = pageNumber; };
const prevPage = () => { if (currentPage.value > 1) currentPage.value--; };
const nextPage = () => { if (currentPage.value < totalPages.value) currentPage.value++; };

watch(searchQuery, () => { currentPage.value = 1; });

onMounted(() => {
  fetchReasons();
});

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
  reasonAddModal.value?.show();
};

const onReasonAdded = () => {
  fetchReasons();
};

const openEditModal = (reason) => {
  currentReason.value = { ...reason };
  nextTick(() => {
    reasonEditModal.value?.show();
  });
};

const onReasonUpdated = (updatedReason) => {
  const index = reasons.value.findIndex(r => r.id === updatedReason.id);
  if (index !== -1) {
    reasons.value[index] = updatedReason;
  }
};

const handleDelete = (reason) => {
  reasonToDelete.value = reason;
  confirmMessage.value = `Êtes-vous sûr de vouloir supprimer le motif "${reason.name}" ?`;
  confirmModal.value?.show();
};

const onConfirmDelete = async () => {
  if (!reasonToDelete.value) return;
  const reasonToRemove = reasonToDelete.value;
  const originalReasons = [...reasons.value];
  reasons.value = reasons.value.filter(r => r.id !== reasonToRemove.id);
  
  const toastId = toast.info(`Suppression de "${reasonToRemove.name}"...`, { timeout: false });
  
  try {
    await api.delete(`/reasons/${reasonToRemove.id}`);
    toast.update(toastId, { content: "Motif supprimé avec succès !", options: { type: 'success', timeout: 4000 } });
  } catch (error) {
    toast.update(toastId, { content: error.response?.data?.error || "Le motif n'a pas pu être supprimé.", options: { type: 'error', timeout: 6000 } });
    reasons.value = originalReasons;
  }
  
  reasonToDelete.value = null;
};
</script>

<style scoped>
  .loading-indicator { padding: 20px; text-align: center; color: #888; }
</style>