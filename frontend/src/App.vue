<!-- frontend/src/App.vue -->
<template>
  <!-- Si l'authentification n'est pas encore prête, on affiche notre loader -->
  <div v-if="!isAuthReady" class="loader-overlay">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Chargement...</span>
    </div>
    <p class="mt-3 text-muted">Préparation de votre espace...</p>
  </div>
  
  <!-- Une fois prête, on affiche l'application -->
  <router-view v-else v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<script setup>
import { authReadyPromise } from './store/userStore.js';
import { ref } from 'vue';

const isAuthReady = ref(false);

// On attend que la promesse soit résolue pour changer notre état local
authReadyPromise.then(() => {
  isAuthReady.value = true;
});
</script>
    
<style>
body {
  padding-top: 56px;
}

/* Styles pour la transition de page */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.navbar {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

.navbar-brand img {
  height: 40px; /* On fixe la hauteur ici, c'est plus propre */
}

.loader-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: var(--ikzen-background);
  z-index: 9999;
}
.loader-overlay .spinner-border {
  width: 3rem;
  height: 3rem;
}
</style>