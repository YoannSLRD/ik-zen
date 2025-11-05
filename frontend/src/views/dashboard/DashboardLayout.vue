<!-- frontend/src/views/dashboard/DashboardLayout.vue (FICHIER COMPLET CORRIGÉ) -->
<template>
  <div>
    <!-- Le modal de complétion de profil -->
    <ProfileCompletionModal v-if="showProfileModal" @completed="onProfileCompleted" />

    <!-- Navbar pour les utilisateurs connectés -->
    <nav class="navbar navbar-dark bg-primary border-bottom fixed-top">
      <div class="container-fluid">
        <!-- Le bouton burger pour le mobile -->
        <button class="navbar-toggler d-md-none me-2" type="button" data-bs-toggle="offcanvas" data-bs-target="#sidebarMenu">
          <span class="navbar-toggler-icon"></span>
        </button>
        
        <!-- Le logo -->
        <router-link class="navbar-brand d-flex align-items-center" to="/dashboard">
          <img src="@/assets/logo.png" alt="Logo ikzen" class="me-2">
          <span class="d-none d-sm-inline fw-bold">IK Zen</span>
        </router-link>

        <!-- Conteneur qui pousse tout ce qui suit vers la droite -->
        <div class="ms-auto d-none d-md-flex align-items-center">
            
            <!-- Le lien de déconnexion -->
            <a class="nav-link text-white" href="#" @click.prevent="logout">
              <font-awesome-icon icon="fa-solid fa-sign-out-alt" class="me-1" />
              <span class="d-none d-md-inline">Déconnexion</span>
            </a>

            <!-- Le bouton du thème, avec une marge à gauche pour l'espacer -->
            <button @click="toggleTheme" class="btn btn-outline-light ms-3" :aria-label="isDarkMode ? 'Activer le mode clair' : 'Activer le mode sombre'">
              <font-awesome-icon :icon="isDarkMode ? 'fa-solid fa-sun' : 'fa-solid fa-moon'" />
            </button>
        </div>
      </div>
    </nav>

    <div class="container-fluid">
      <div class="row">
        <!-- Colonne de la Sidebar -->
        <aside class="col-md-3 col-lg-2 d-md-block bg-light sidebar offcanvas-md offcanvas-start" id="sidebarMenu">
          <div class="offcanvas-header d-md-none">
            <h5 class="offcanvas-title">Menu</h5>
            <button type="button" class="btn-close" data-bs-dismiss="offcanvas" data-bs-target="#sidebarMenu" aria-label="Close"></button>
          </div>
          <div class="position-sticky pt-3 sidebar-sticky">
            <h6 class="sidebar-heading px-3 mt-4 mb-1 text-muted text-uppercase">Menu Principal</h6>
            <ul class="nav flex-column">
              <li class="nav-item">
                <router-link class="nav-link" to="/dashboard" @click="closeOffcanvas">
                  <font-awesome-icon icon="fa-solid fa-tachometer-alt" class="me-2" /> Tableau de bord
                </router-link>
              </li>
              <li class="nav-item">
                <router-link class="nav-link" to="/dashboard/trips" @click="closeOffcanvas">
                  <font-awesome-icon icon="fa-solid fa-route" class="me-2" /> Mes Trajets
                </router-link>
              </li>
            </ul>

            <h6 class="sidebar-heading px-3 mt-4 mb-1 text-muted text-uppercase">Gestion</h6>
            <ul class="nav flex-column">
              <li class="nav-item">
                <router-link class="nav-link" to="/dashboard/locations" @click="closeOffcanvas">
                  <font-awesome-icon icon="fa-solid fa-map-marker-alt" class="me-2" /> Mes Lieux
                </router-link>
              </li>
              <li class="nav-item">
                <router-link class="nav-link" to="/dashboard/vehicles" @click="closeOffcanvas">
                  <font-awesome-icon icon="fa-solid fa-car" class="me-2" /> Mes Véhicules
                </router-link>
              </li>
              <li class="nav-item">
                <router-link class="nav-link" to="/dashboard/reasons" @click="closeOffcanvas">
                  <font-awesome-icon icon="fa-solid fa-file-invoice" class="me-2" /> Mes Motifs
                </router-link>
              </li>
            </ul>

            <h6 class="sidebar-heading px-3 mt-4 mb-1 text-muted text-uppercase">Compte</h6>
            <ul class="nav flex-column mb-2">
              <li class="nav-item">
                <router-link class="nav-link" to="/dashboard/settings" @click="closeOffcanvas">
                  <font-awesome-icon icon="fa-solid fa-cog" class="me-2" /> Paramètres & Profil
                </router-link>
              </li>
              <li v-if="user && user.subscription_status !== 'active'" class="nav-item">
                <router-link class="nav-link" to="/pricing">
                  <font-awesome-icon icon="fa-solid fa-star" class="me-2" /> Passer Pro
                </router-link>
              </li>
              <li class="nav-item d-md-none">
                <a class="nav-link" href="#" @click.prevent="logoutAndClose">
                  <font-awesome-icon icon="fa-solid fa-sign-out-alt" class="me-2" /> Déconnexion
                </a>
              </li>
            </ul>

            <!-- ***** NOUVELLE SECTION : ADMINISTRATION (conditionnelle) ***** -->
            <div v-if="user && user.role === 'admin'" class="admin-section">
              <h6 class="sidebar-heading px-3 mt-4 mb-1 text-muted text-uppercase">
                Administration
              </h6>
              <ul class="nav flex-column mb-2">
                <li class="nav-item">
                  <!-- Remplacez le href par l'URL de VOTRE table tax_rates -->
                  <a class="nav-link" href="https://supabase.com/dashboard/project/zlfrkwleglxrfglfqsnz/editor/49153?schema=public" target="_blank">
                    <font-awesome-icon icon="fa-solid fa-table-list" class="me-2" /> <!-- Pensez à ajouter l'icône -->
                    Gérer les Barèmes IK
                  </a>
                </li>
              </ul>
            </div>

            <div class="mt-4 pt-2 border-top border-secondary d-md-none">
              <h6 class="sidebar-heading px-3 mt-4 mb-1 text-muted text-uppercase">Options</h6>
              <ul class="nav flex-column">
                <li class="nav-item">
                  <a class="nav-link" href="#" @click.prevent="toggleTheme">
                    <font-awesome-icon :icon="isDarkMode ? 'fa-solid fa-sun' : 'fa-solid fa-moon'" class="me-2" />
                    {{ isDarkMode ? 'Mode Clair' : 'Mode Sombre' }}
                  </a>
                </li>
              </ul>
            </div>

            <h6 class="sidebar-heading px-3 mt-4 mb-1 text-muted text-uppercase">
              Support & Légal
            </h6>
            <ul class="nav flex-column mb-2">
              <li class="nav-item">
                <router-link class="nav-link" to="/contact" target="_blank">Contact</router-link>
              </li>
              <li class="nav-item">
                <router-link class="nav-link" to="/terms" target="_blank">Conditions Générales</router-link>
              </li>
              <li class="nav-item">
                <router-link class="nav-link" to="/privacy" target="_blank">Confidentialité</router-link>
              </li>
              <li class="nav-item">
                <router-link class="nav-link" to="/faq" target="_blank">FAQ</router-link>
              </li>
            </ul>
          </div>
        </aside>

            
        <!-- Colonne du Contenu Principal -->
        <main v-if="user" class="col-md-9 ms-sm-auto col-lg-10 px-md-4">
          <router-view :key="$route.fullPath" />
        </main>
      </div>
    </div>
  </div>
</template>
        
<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Offcanvas } from 'bootstrap';
import { supabase } from '@/supabaseClient.js';
import { user } from '@/store/userStore.js';
import ProfileCompletionModal from '@/components/ProfileCompletionModal.vue';

const router = useRouter();
let sidebarOffcanvas = null;
const showProfileModal = ref(false);

const isDarkMode = ref(localStorage.getItem('theme') === 'dark');

const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  isDarkMode.value = (theme === 'dark');
};

const toggleTheme = () => {
  const newTheme = isDarkMode.value ? 'light' : 'dark';
  applyTheme(newTheme);
};

watch(user, (newUser) => {
  if (newUser && (!newUser.first_name || !newUser.last_name)) {
    showProfileModal.value = true;
  } else {
    showProfileModal.value = false; // Cacher le modal si le profil est complété
  }
}, { immediate: true });

onMounted(() => {
  const sidebarElement = document.getElementById('sidebarMenu');
  if (sidebarElement) {
    sidebarOffcanvas = new Offcanvas(sidebarElement);
  }

  // Appliquer le thème sauvegardé au chargement de l'application
  const savedTheme = localStorage.getItem('theme') || 'light';
  applyTheme(savedTheme);
});

onUnmounted(() => {
  if (sidebarOffcanvas) {
    sidebarOffcanvas.dispose();
  }
});

const onProfileCompleted = (updatedProfile) => {
  if (user.value) {
    user.value.first_name = updatedProfile.first_name;
    user.value.last_name = updatedProfile.last_name;
  }
  showProfileModal.value = false;
};

const closeOffcanvas = () => {
  if (window.innerWidth < 768 && sidebarOffcanvas) {
    sidebarOffcanvas.hide();
  }
};

const logout = async () => {
  await supabase.auth.signOut();
  router.push('/login');
};

const logoutAndClose = async () => {
  closeOffcanvas();
  await logout();
};
</script>

<style scoped>
@media (min-width: 768px) {
  .sidebar {
    position: sticky;
    top: 56px;
    height: calc(100vh - 56px);
  }
}
.sidebar-sticky {
  height: 100%;
  overflow-y: auto;
}
main {
  padding-top: 24px;
}

.sidebar-custom {
  background-color: var(--ikzen-primary) !important;
}

.sidebar-custom .nav-link {
  color: rgba(255, 255, 255, 0.7);
}

.sidebar-custom .nav-link:hover,
.sidebar-custom .nav-link.router-link-active {
  color: #FFFFFF;
  background-color: rgba(255, 255, 255, 0.1);
}

.sidebar-custom .sidebar-heading {
  color: rgba(255, 255, 255, 0.4);
}
</style>