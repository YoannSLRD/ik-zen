<!-- frontend/src/views/dashboard/DashboardHome.vue -->
<template>
  <div v-if="user">
    <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
      <h1 class="h2"><font-awesome-icon icon="fa-solid fa-tachometer-alt" /> Tableau de Bord</h1>
    </div>
      
    <div v-if="user.subscription_status === 'active'" class="alert alert-success">
      Vous êtes un membre Pro. Merci pour votre soutien !
    </div>
    <p class="mb-4">Bonjour, {{ user.first_name || user.email }} !</p>

    <!-- Section Pro (Statistiques & IK) -->
    <div v-if="user.subscription_status === 'active'">
      
      <!-- Indicateur de chargement global pour toutes les stats -->
      <div v-if="isLoadingStats || isLoadingIndemnites" class="loading-indicator">
        Chargement de vos statistiques...
      </div>
      
      <!-- Conteneur pour toutes les cartes, affiché quand tout est chargé -->
      <div v-else class="row">

        <!-- Carte d'Indemnités Kilométriques -->
        <div v-if="indemnites" class="col-12 mb-4">
          <div class="card border-start-danger shadow h-100 py-2">
            <div class="card-body">
              <div class="row no-gutters align-items-center">
                <div class="col me-2">
                  <div class="text-xs fw-bold text-custom-highlight text-uppercase mb-1">
                    Indemnités Kilométriques Estimées ({{ indemnites.year }})
                    <span v-if="indemnites.ratesYear && indemnites.ratesYear < indemnites.year" class="fw-normal text-muted d-block">
                      (calculé avec le barème de {{ indemnites.ratesYear }})
                    </span>
                  </div>
                  <div class="h5 mb-0 fw-bold text-gray-800">
                    {{ indemnites.totalIndemnites.toFixed(2) }} €
                  </div>
                </div>
                <div class="col-auto">
                  <font-awesome-icon :icon="['fas', 'euro-sign']" class="fa-2x text-gray-300" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Les 4 cartes de statistiques (maintenant dans le même "row" et gérées par le même v-else) -->
        <div class="col-xl-3 col-md-6 mb-4">
          <div class="card border-start-primary shadow h-100 py-2">
            <div class="card-body">
              <div class="row no-gutters align-items-center">
                <div class="col me-2">
                  <div class="text-xs fw-bold text-primary text-uppercase mb-1">Distance (30 jours)</div>
                  <div class="h5 mb-0 fw-bold text-gray-800">{{ Number(stats.distanceLast30Days).toFixed(1) }} km</div>
                </div>
                <div class="col-auto"><font-awesome-icon :icon="['fas', 'road']" class="fa-2x text-gray-300" /></div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-xl-3 col-md-6 mb-4">
          <div class="card border-start-info shadow h-100 py-2">
            <div class="card-body">
              <div class="row no-gutters align-items-center">
                <div class="col me-2">
                  <div class="text-xs fw-bold text-info text-uppercase mb-1">Trajets (30 jours)</div>
                  <div class="h5 mb-0 fw-bold text-gray-800">{{ stats.tripsLast30Days }}</div>
                </div>
                <div class="col-auto"><font-awesome-icon :icon="['fas', 'route']" class="fa-2x text-gray-300" /></div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Année en cours -->
        <div class="col-xl-3 col-md-6 mb-4">
          <div class="card border-start-success shadow h-100 py-2">
            <div class="card-body">
              <div class="row no-gutters align-items-center">
                <div class="col me-2">
                  <div class="text-xs fw-bold text-success text-uppercase mb-1">Distance (Année)</div>
                  <div class="h5 mb-0 fw-bold text-gray-800">{{ Number(stats.distanceCurrentYear).toFixed(1) }} km</div>
                </div>
                <div class="col-auto"><font-awesome-icon :icon="['fas', 'road']" class="fa-2x text-gray-300" /></div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-xl-3 col-md-6 mb-4">
          <div class="card border-start-warning shadow h-100 py-2">
            <div class="card-body">
              <div class="row no-gutters align-items-center">
                <div class="col me-2">
                  <div class="text-xs fw-bold text-warning text-uppercase mb-1">Trajets (Année)</div>
                  <div class="h5 mb-0 fw-bold text-gray-800">{{ stats.tripsCurrentYear }}</div>
                </div>
                <div class="col-auto"><font-awesome-icon :icon="['fas', 'route']" class="fa-2x text-gray-300" /></div>
              </div>
            </div>
          </div>
        </div>

        <!-- NOUVELLE CARTE POUR LE GRAPHIQUE -->
        <div class="col-12 mb-4">
          <div class="card shadow">
            <div class="card-header py-3">
              <h6 class="m-0 fw-bold text-primary">Résumé Mensuel (Année en cours)</h6>
            </div>
            <div class="card-body">
              <div v-if="isLoadingChart" class="loading-indicator">Chargement du graphique...</div>
              <div v-else-if="chartData" style="height: 300px;">
                <MonthlyChart :chart-raw-data="chartData" />
              </div>
              <div v-else class="text-center text-muted p-4">
                Aucune donnée de trajet enregistrée cette année pour afficher un graphique.
              </div>
            </div>
          </div>
        </div>

        <!-- Résumé par véhicule -->
        <div v-if="stats.vehiclesSummary && stats.vehiclesSummary.length > 0" class="col-12">
          <div class="card shadow mb-4">
            <div class="card-header py-3">
              <h6 class="m-0 fw-bold text-primary">Distance par Véhicule (Année en cours)</h6>
            </div>
            <div class="card-body">
              <div v-for="vehicle in stats.vehiclesSummary" :key="vehicle.vehicle_name" class="mb-2">
                <h4 class="small fw-bold">{{ vehicle.vehicle_name }} <span class="float-end">{{ Number(vehicle.total_distance).toFixed(1) }} km</span></h4>
                <div class="progress">
                  <div class="progress-bar bg-info" role="progressbar" :style="{ width: calculatePercentage(vehicle.total_distance) + '%' }"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Dans DashboardHome.vue -->
    <div v-else class="alert alert-info text-center p-4">
      <h4 class="alert-heading">
        <font-awesome-icon icon="fa-solid fa-star" class="me-2" />
        Passez à la version Pro
      </h4>
      <p>Débloquez tout le potentiel de IK Zen !</p>
      <hr>
      <p class="mb-0">
        Abonnez-vous pour accéder au <strong>calcul automatique de vos indemnités kilométriques, aux statistiques avancées, à l'export PDF et à la création de tournées illimitées</strong>.
      </p>
      <router-link to="/pricing" class="btn btn-primary mt-3">
        Voir les offres Pro
      </router-link>
    </div>

    <!-- Carte d'Accès Rapide -->
    <div class="row mt-3">
      <div class="col-12">
        <div class="card">
          <div class="card-header"><h5 class="mb-0">Accès Rapide</h5></div>
          <div class="card-body">
            <p>Commencez par ajouter vos informations pour pouvoir enregistrer vos trajets.</p>
            <router-link to="/dashboard/trips" class="btn btn-outline-primary me-2">
              <font-awesome-icon icon="fa-solid fa-plus-circle" class="me-1" />
              Ajouter un trajet
            </router-link>
            <router-link to="/dashboard/locations" class="btn btn-outline-secondary me-2">Gérer mes lieux</router-link>
            <router-link to="/dashboard/vehicles" class="btn btn-outline-secondary">Gérer mes véhicules</router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
  
      
<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '@/api'; // <-- On utilise notre instance centralisée
import { useToast } from 'vue-toastification';
import { user } from '@/store/userStore'; // <-- On importe l'utilisateur depuis le store
import MonthlyChart from '@/components/MonthlyChart.vue'; 

const toast = useToast();
const loading = ref(false);
const isLoadingStats = ref(true);
const isLoadingIndemnites = ref(true);
const isLoadingChart = ref(true);
const chartData = ref(null);
const route = useRoute();
const router = useRouter();

const stats = ref({
  distanceLast30Days: 0,
  tripsLast30Days: 0,
  distanceCurrentYear: 0,
  tripsCurrentYear: 0,
  vehiclesSummary: [],
});

// ***** NOUVELLES VARIABLES POUR LES INDEMNITÉS *****
const indemnites = ref(null); // Sera null ou un objet { totalIndemnites: ..., breakdown: ... }

// ***** NOUVELLE FONCTION POUR RÉCUPÉRER LES INDEMNITÉS *****
const fetchIndemnites = async () => {
  // On ne lance le calcul que si l'utilisateur est un membre Pro
  if (user.value?.subscription_status !== 'active') {
    isLoadingIndemnites.value = false;
    return;
  }
  isLoadingIndemnites.value = true;
  try {
    const currentYear = new Date().getFullYear();
    const { data } = await api.get(`/stats/indemnites/${currentYear}`);
    indemnites.value = data;
  } catch (error) {
    toast.error("Impossible de calculer les indemnités kilométriques.");
    console.error("Erreur fetchIndemnites:", error);
  } finally {
    isLoadingIndemnites.value = false;
  }
};

const fetchStats = async () => {
  // On ne charge les stats que si l'utilisateur est Pro
  if (user.value?.subscription_status !== 'active') {
    isLoadingStats.value = false;
    return;
  }
  
  isLoadingStats.value = true;
  try {
    const { data } = await api.get('/stats/summary');
    stats.value = data;
  } catch (error) {
    toast.error("Impossible de charger les statistiques.");
  } finally {
    isLoadingStats.value = false;
  }
};

// Logique pour recalculer les barres de progression
const totalDistanceForVehicles = computed(() => {
  if (!stats.value.vehiclesSummary || stats.value.vehiclesSummary.length === 0) return 0;
  // On calcule la somme de toutes les distances
  return stats.value.vehiclesSummary.reduce((sum, vehicle) => sum + Number(vehicle.total_distance), 0);
});

const calculatePercentage = (distance) => {
  if (totalDistanceForVehicles.value === 0) return 0;
  // On divise par le total, pas par le max
  return (Number(distance) / totalDistanceForVehicles.value) * 100;
};

const fetchChartData = async () => {
  if (user.value?.subscription_status !== 'active') {
    isLoadingChart.value = false;
    console.log("[DEBUG] L'utilisateur n'est pas Pro, on ne charge pas le graphique.");
    return;
  }
  isLoadingChart.value = true;
  console.log("[DEBUG] Tentative de chargement des données du graphique...");
  try {
    const currentYear = new Date().getFullYear();
    const { data } = await api.get(`/stats/monthly-summary/${currentYear}`);
    
    console.log('[DEBUG] Données du graphique reçues par le frontend :', data);
    
    if (data && data.data && data.data.some(d => d > 0)) {
      chartData.value = data;
    } else {
      console.log('[DEBUG] Aucune donnée de trajet trouvée, le graphique ne sera pas affiché.');
    }
  } catch (error) {
    toast.error("Impossible de charger les données du graphique.");
    console.error("Erreur fetchChartData:", error);
  } finally {
    isLoadingChart.value = false;
  }
};

onMounted(async () => {
  // Le user est déjà chargé par le store.
  // On gère uniquement le cas d'une redirection après paiement.
  if (route.query.payment === 'success') {
    toast.success("Paiement réussi ! Bienvenue dans la version Pro.", { timeout: 7000 });
    // On nettoie l'URL pour éviter que le message ne réapparaisse au rechargement
    router.replace({ query: {} }); 
    // Le store mettra à jour le statut de l'utilisateur automatiquement via le webhook,
    // donc pas besoin de fetch manuel ici, c'est plus robuste.
  }
});

watch(user, (currentUser) => {
  // Cette fonction se déclenchera dès que 'user' aura une valeur
  if (currentUser) {
    console.log("[DEBUG] Utilisateur détecté, lancement des fetches de données.");
    // On lance tous les chargements de données en parallèle
    Promise.all([
      fetchStats(),
      fetchIndemnites(),
      fetchChartData() // <-- L'appel manquant est maintenant ici !
    ]);
  }
}, { 
  immediate: true // Tente de s'exécuter immédiatement avec la valeur actuelle de 'user'
});
</script>
  
<style scoped>
/* Styles inspirés de dashboards populaires pour les cartes */
.border-start-primary { border-left: 0.25rem solid var(--bs-primary) !important; }
.border-start-success { border-left: 0.25rem solid var(--bs-success) !important; }
.border-start-info { border-left: 0.25rem solid #36b9cc !important; }
.border-start-warning { border-left: 0.25rem solid var(--bs-warning) !important; }
.border-start-danger { border-left: 0.25rem solid var(--bs-danger) !important; }

/* On s'assure que les textes colorés utilisent aussi nos variables */
.text-primary { color: var(--bs-primary) !important; }
.text-success { color: var(--bs-success) !important; }
.text-warning { color: var(--bs-warning) !important; }
.text-custom-highlight { color: var(--bs-danger) !important; }

.card { height: 100%; }

.text-xs { font-size: 0.7rem; }
.text-gray-300 { color: #dddfeb !important; }
.text-gray-800 { color: #5a5c69 !important; }
.shadow { box-shadow: 0 .15rem 1.75rem 0 rgba(58,59,69,.15)!important; }
.loading-indicator {
  padding: 20px;
  text-align: center;
  color: #888;
}
.border-start-danger { 
  border-left: 0.25rem solid #e74a3b !important; /* On garde un rouge doux pour la bordure */
}

/* On définit notre nouvelle couleur de texte ici */
.text-custom-highlight {
  color: #e74a3b !important; /* Le même rouge doux que la bordure */
}
</style>