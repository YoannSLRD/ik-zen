<template>
  <!-- Si l'état d'authentification n'est pas encore connu, on affiche le loader -->
  <AppLoader v-if="!isAuthReady" />
  
  <!-- Sinon, on affiche l'application normalement -->
  <router-view v-else v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<script setup>
import AppLoader from './components/AppLoader.vue';
import { authReadyPromise } from './store/userStore.js';
import { ref } from 'vue';

const isAuthReady = ref(false);

// On attend que la promesse soit résolue pour changer notre état
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
</style>