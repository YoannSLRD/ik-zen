<!-- frontend/src/views/admin/AdminUsers.vue -->
<template>
  <div>
    <!-- SECTION 1 : Le Titre -->
    <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
      <h1 class="h2"><font-awesome-icon icon="fa-solid fa-user-shield" /> Administration des Utilisateurs</h1>
    </div>

    <!-- SECTION 2 : Les Cartes de Statistiques -->
    <div v-if="isLoadingStats" class="loading-indicator">Chargement des statistiques...</div>
    <div v-else-if="stats" class="row mb-4">
        <div class="col-md-4">
            <div class="card text-center">
                <div class="card-body">
                    <h5 class="card-title h2">{{ stats.totalUsers }}</h5>
                    <p class="card-text text-muted">Utilisateurs Inscrits</p>
                </div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="card text-center">
                <div class="card-body">
                    <h5 class="card-title h2">{{ stats.proUsers }}</h5>
                    <p class="card-text text-muted">Abonnés Pro</p>
                </div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="card text-center">
                <div class="card-body">
                    <h5 class="card-title h2">{{ stats.conversionRate }}%</h5>
                    <p class="card-text text-muted">Taux de Conversion</p>
                </div>
            </div>
        </div>
    </div>

    <!-- SECTION 3 : La Table des Utilisateurs -->
    <div v-if="isLoading" class="loading-indicator">Chargement des utilisateurs...</div>
    <div v-else-if="users.length > 0" class="table-responsive">
      <table class="table table-striped table-hover">
        <thead>
          <tr>
            <th>Email</th>
            <th>Nom</th>
            <th>Inscrit le</th>
            <th>Statut Abonnement</th>
            <th>Dernière Connexion</th> 
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
            <td>{{ formatRelativeDate(user.last_sign_in_at) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="alert alert-info">
      Aucun utilisateur trouvé.
    </div>

  </div> <!-- <--- Cette div est la fermeture de la div principale -->
</template>
  
  <script setup>
    import { ref, onMounted } from 'vue';
    import api from '@/api';
    import { useToast } from 'vue-toastification';

    const isLoading = ref(true);
    const users = ref([]);
    const toast = useToast();

    // === AJOUTE CES LIGNES ===
    const stats = ref(null);
    const isLoadingStats = ref(true);

    const fetchAdminData = async () => {
      isLoading.value = true;
      isLoadingStats.value = true;
      try {
        // On lance les deux requêtes en parallèle
        const [usersResponse, statsResponse] = await Promise.all([
          api.get('/admin/users'),
          api.get('/admin/stats')
        ]);
        users.value = usersResponse.data;
        stats.value = statsResponse.data;
      } catch (error) {
        toast.error("Impossible de charger les données d'administration.");
        console.error("Erreur API Admin:", error);
      } finally {
        isLoading.value = false;
        isLoadingStats.value = false;
      }
    };

    const formatRelativeDate = (dateString) => {
      if (!dateString) return 'Jamais';
      
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.round((now - date) / 1000);
      
      const units = [
        { name: 'an', seconds: 31536000 },
        { name: 'mois', seconds: 2592000 },
        { name: 'jour', seconds: 86400 },
        { name: 'heure', seconds: 3600 },
        { name: 'minute', seconds: 60 },
      ];

      for (const unit of units) {
        const interval = diffInSeconds / unit.seconds;
        if (interval > 1) {
          const value = Math.floor(interval);
          // Gère le pluriel
          const plural = (unit.name === 'mois') ? '' : 's';
          return `il y a ${value} ${unit.name}${value > 1 ? plural : ''}`;
        }
      }
      return 'à l\'instant';
    };

    onMounted(() => {
      fetchAdminData(); // On remplace l'ancien fetchUsers par celui-ci
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