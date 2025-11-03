<!-- frontend/src/layouts/PublicLayout.vue (VERSION FINALE) -->
<template>
  <div class="d-flex flex-column" style="min-height: 100vh;">
    
    <nav class="navbar navbar-expand-sm navbar-dark bg-primary border-bottom fixed-top">
      <div class="container-fluid">
        
        <!-- Logo -->
        <router-link class="navbar-brand d-flex align-items-center" :to="isLoggedIn ? '/dashboard' : '/'">
          <img src="@/assets/logo.png" alt="Logo ikzen" height="30" class="me-2">
          <span class="fw-bold">IK Zen</span>
        </router-link>

        <!-- Bouton Hamburger -->
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#publicNavbar" aria-controls="publicNavbar" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>

        <!-- Contenu qui va s'afficher/se cacher -->
        <div class="collapse navbar-collapse" id="publicNavbar">
          <ul class="navbar-nav ms-auto mb-2 mb-sm-0 align-items-sm-center">
            
            <!-- Liens pour tous -->
            <li class="nav-item">
              <router-link class="nav-link" to="/">Accueil</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/pricing">Tarifs</router-link>
            </li>
            
            <!-- Liens pour les visiteurs -->
            <template v-if="!isLoggedIn">
              <li class="nav-item">
                <router-link class="nav-link" to="/login">Connexion</router-link>
              </li>
              <li class="nav-item mt-2 mt-sm-0 ms-sm-2">
                <router-link class="btn btn-light btn-sm w-100" to="/register">Inscription Gratuite</router-link>
              </li>
            </template>
            
            <!-- Liens pour les connectés -->
            <template v-else>
              <li class="nav-item">
                <router-link class="nav-link" to="/dashboard">Mon Tableau de Bord</router-link>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="#" @click.prevent="logout">Déconnexion</a>
              </li>
            </template>
            
            <!-- Bouton du thème (toujours visible) -->
            <li class="nav-item mt-2 mt-sm-0 ms-sm-3">
              <button @click="toggleTheme" class="btn btn-outline-light btn-sm w-100" :aria-label="isDarkMode ? 'Activer le mode clair' : 'Activer le mode sombre'">
                  <font-awesome-icon :icon="isDarkMode ? 'fa-solid fa-sun' : 'fa-solid fa-moon'" />
              </button>
            </li>
            
          </ul>
        </div>
      </div>
    </nav>
    
    <main class="flex-grow-1">
      <router-view/>
    </main>
    
    <Footer />

    <CookieBanner />
  </div>
</template>

<script setup>
// Le script que tu as déjà est parfait, aucune modification nécessaire
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import Footer from '@/components/Footer.vue';
import CookieBanner from '@/components/CookieBanner.vue';
import { supabase } from '@/supabaseClient';
import { session } from '@/store/userStore';

const router = useRouter();
const isLoggedIn = computed(() => !!session.value);

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
onMounted(() => {
  const savedTheme = localStorage.getItem('theme') || 'light';
  applyTheme(savedTheme);
});

const logout = async () => {
  await supabase.auth.signOut();
  router.push('/login');
};
</script>

<style scoped>
/* On ajuste le main pour qu'il ne soit pas poussé par flexbox */
main {
  padding-top: 56px;
}
</style>