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

    <!-- NOUVELLE SECTION : GRAPHIQUE -->
    <div class="card mb-4">
      <div class="card-header">
        <h5 class="mb-0">Évolution des inscriptions (30 derniers jours)</h5>
      </div>
      <div class="card-body">
        <div v-if="isLoadingGrowth" class="loading-indicator">Chargement du graphique...</div>
        <div v-else-if="growthData" style="height: 300px;">
          <Line :data="growthData" :options="{ responsive: true, maintainAspectRatio: false }" />
        </div>
      </div>
    </div>

    <!-- NOUVEAU : Champ de recherche -->
    <div class="mb-3">
      <input 
        type="text" 
        class="form-control" 
        placeholder="Rechercher par e-mail ou nom..." 
        v-model="searchQuery"
      >
    </div>

    <!-- SECTION 3 : La Table des Utilisateurs -->
    <div v-if="isLoading" class="loading-indicator">Chargement des utilisateurs...</div>
    <div v-else-if="users.length > 0" class="table-responsive">
      <table class="table table-striped table-hover">
        <thead>
          <tr>
            <th @click="sortBy('email')" class="sortable">
              Email
              <font-awesome-icon v-if="sortKey === 'email'" :icon="sortOrder === 'asc' ? 'sort-up' : 'sort-down'" />
              <font-awesome-icon v-else icon="sort" class="text-muted" />
            </th>
            <th>Nom</th> <!-- On ne trie pas par nom pour l'instant -->
            <th @click="sortBy('created_at')" class="sortable">
              Inscrit le
              <font-awesome-icon v-if="sortKey === 'created_at'" :icon="sortOrder === 'asc' ? 'sort-up' : 'sort-down'" />
              <font-awesome-icon v-else icon="sort" class="text-muted" />
            </th>
            <th>Statut Abonnement</th>
            <th @click="sortBy('last_sign_in_at')" class="sortable">
              Dernière Connexion
              <font-awesome-icon v-if="sortKey === 'last_sign_in_at'" :icon="sortOrder === 'asc' ? 'sort-up' : 'sort-down'" />
              <font-awesome-icon v-else icon="sort" class="text-muted" />
            </th>
            <th class="text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in sortedUsers" :key="user.id">
            <td>{{ user.email }}</td>
            <td>{{ user.first_name || '-' }} {{ user.last_name || '' }}</td>
            <td>{{ new Date(user.created_at).toLocaleDateString('fr-FR') }}</td>
            <td>
              <span :class="['badge', user.subscription_status === 'active' ? 'bg-success' : 'bg-secondary']">
                {{ user.subscription_status || 'N/A' }}
              </span>
            </td>
            <td>{{ formatRelativeDate(user.last_sign_in_at) }}</td>
            <td class="text-center">
              <button 
                @click="impersonate(user)" 
                class="btn btn-outline-warning btn-sm" 
                title="Se connecter en tant que cet utilisateur"
                :disabled="impersonatingUserId === user.id">
                  <span v-if="impersonatingUserId === user.id" class="spinner-border spinner-border-sm"></span>
                  <font-awesome-icon v-else icon="fa-solid fa-user-secret" />
              </button>
            </td>
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
    import { ref, onMounted, computed } from 'vue';
    import api from '@/api';
    import { useToast } from 'vue-toastification';
    import { supabase } from '@/supabaseClient';
    import { Line } from 'vue-chartjs';
    import { Chart as ChartJS, Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement } from 'chart.js';

    // On enregistre les éléments nécessaires pour un graphique en lignes
    ChartJS.register(Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement);

    const isLoading = ref(true);
    const users = ref([]);
    const toast = useToast();

    // === AJOUTE CES LIGNES ===
    const stats = ref(null);
    const isLoadingStats = ref(true);
    const growthData = ref(null); 
    const isLoadingGrowth = ref(true);

    const sortKey = ref('created_at'); // Colonne de tri par défaut
    const sortOrder = ref('desc'); // Ordre de tri par défaut (descendant)

    const impersonatingUserId = ref(null);
    const searchQuery = ref('');

    const impersonate = async (targetUser) => {
      if (!confirm(`ATTENTION : Vous allez vous déconnecter de votre compte admin et vous connecter en tant que ${targetUser.email}. Voulez-vous continuer ?`)) {
        return;
      }

      impersonatingUserId.value = targetUser.id;
      try {
        const { data } = await api.post(`/admin/impersonate/${targetUser.id}`);
        
        // D'abord, on déconnecte l'admin localement
        await supabase.auth.signOut(); 
        
        // Ensuite, on redirige vers le lien magique qui va nous connecter en tant que l'utilisateur
        window.location.href = data.magicLink;

      } catch (error) {
        toast.error("Impossible de générer le lien de connexion.");
      } finally {
        impersonatingUserId.value = null;
      }
    };

    const sortedUsers = computed(() => {
      let filtered = users.value;
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        
        // On divise la recherche en plusieurs mots-clés
        const searchTerms = query.split(' ').filter(term => term.length > 0);

        filtered = users.value.filter(user => {
          const email = user.email.toLowerCase();
          const firstName = (user.first_name || '').toLowerCase();
          const lastName = (user.last_name || '').toLowerCase();

          // L'utilisateur est gardé si TOUS les mots-clés de la recherche 
          // sont trouvés quelque part dans l'e-mail, le prénom ou le nom.
          return searchTerms.every(term => 
            email.includes(term) ||
            firstName.includes(term) ||
            lastName.includes(term)
          );
        });
      }

      // Étape 2: Tri des résultats filtrés
      return [...filtered].sort((a, b) => {
        let valA = a[sortKey.value];
        let valB = b[sortKey.value];

        if (sortKey.value === 'created_at' || sortKey.value === 'last_sign_in_at') {
          valA = valA ? new Date(valA).getTime() : 0;
          valB = valB ? new Date(valB).getTime() : 0;
        }

        if (valA < valB) return sortOrder.value === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder.value === 'asc' ? 1 : -1;
        return 0;
      });
    });

    const sortBy = (key) => {
      if (sortKey.value === key) {
        // Si on clique sur la même colonne, on inverse l'ordre
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
      } else {
        // Si on clique sur une nouvelle colonne, on trie par défaut en descendant
        sortKey.value = key;
        sortOrder.value = 'desc';
      }
    };

    const fetchAdminData = async () => {
      // On met les 3 isLoading à true
      isLoading.value = true;
      isLoadingStats.value = true;
      isLoadingGrowth.value = true;
      try {
        // On lance les 3 requêtes en parallèle
        const [usersResponse, statsResponse, growthResponse] = await Promise.all([
          api.get('/admin/users'),
          api.get('/admin/stats'),
          api.get('/admin/stats/growth') // <-- NOUVEL APPEL API
        ]);
        users.value = usersResponse.data;
        stats.value = statsResponse.data;
        growthData.value = { // <-- On prépare les données pour le composant graphique
            labels: growthResponse.data.labels,
            datasets: [
                {
                    label: 'Nouveaux Utilisateurs',
                    backgroundColor: '#00334E',
                    borderColor: '#66DDAA',
                    data: growthResponse.data.data,
                    tension: 0.1
                }
            ]
        };
      } catch (error) {
        toast.error("Impossible de charger les données d'administration.");
        console.error("Erreur API Admin:", error);
      } finally {
        isLoading.value = false;
        isLoadingStats.value = false;
        isLoadingGrowth.value = false; // <-- On met à jour le nouveau isLoading
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

  .sortable {
  cursor: pointer;
}
.sortable:hover {
  background-color: rgba(0,0,0,0.05);
}

/* En mode sombre */
html[data-theme='dark'] .sortable:hover {
  background-color: rgba(255,255,255,0.05);
}
</style>