<!-- frontend/src/App.vue -->
<template>
  <div v-if="!userStore.isAuthReady" class="loader-overlay">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Chargement...</span>
    </div>
    <p class="mt-3 text-muted">Préparation de votre espace...</p>
  </div>
  
  <router-view v-else v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<script setup>
import { useUserStore } from '@/store/userStore';

const userStore = useUserStore();
userStore.initAuthListener(); // On lance l'écouteur ici
</script>
    
<style>
body {
  padding-top: 56px;
}

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
  height: 40px; 
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