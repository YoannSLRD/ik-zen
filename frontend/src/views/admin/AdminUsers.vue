<!-- frontend/src/views/admin/AdminUsers.vue -->
<template>
    <div>
      <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 class="h2"><font-awesome-icon icon="fa-solid fa-user-shield" /> Administration des Utilisateurs</h1>
      </div>
  
      <div v-if="isLoading" class="loading-indicator">Chargement des utilisateurs...</div>
      
      <div v-else-if="users.length > 0" class="table-responsive">
        <table class="table table-striped table-hover">
          <thead>
            <tr>
              <th>Email</th>
              <th>Nom</th>
              <th>Inscrit le</th>
              <th>Statut Abonnement</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>{{ user.email }}</td>
              <td>{{ user.first_name || '-' }} {{ user.last_name || '' }}</td>
              <td>{{ new Date(user.created_at).toLocaleDateString('fr-FR') }}</td>
              <td>
                <span :class="['badge', user.subscription_status === 'active' ? 'bg-success' : 'bg-secondary']">
                  {{ user.subscription_status || 'N/A' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
  
      <div v-else class="alert alert-info">
        Aucun utilisateur trouvé (à part vous-même).
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import api from '@/api';
  import { useToast } from 'vue-toastification';
  
  const isLoading = ref(true);
  const users = ref([]);
  const toast = useToast();
  
  const fetchUsers = async () => {
    isLoading.value = true;
    try {
      const { data } = await api.get('/admin/users');
      users.value = data;
    } catch (error) {
      toast.error("Impossible de charger la liste des utilisateurs.");
      console.error("Erreur API Admin:", error);
    } finally {
      isLoading.value = false;
    }
  };
  
  onMounted(() => {
    fetchUsers();
  });
  </script>
  
  <style scoped>
  .loading-indicator {
    padding: 40px;
    text-align: center;
    font-size: 1.2rem;
    color: var(--bs-secondary-color);
  }
  </style>