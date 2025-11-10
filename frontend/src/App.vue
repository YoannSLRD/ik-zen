<template>
  <AppLoader v-if="isLoading" />

  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<script setup>
import AppLoader from './components/AppLoader.vue';
import { isLoading } from './store/loadingStore.js';
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