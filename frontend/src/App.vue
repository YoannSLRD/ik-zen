<template>
  <!-- Le router-view gère tout l'affichage. On n'a plus besoin du loader ici. -->
  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<script setup>
  // Ce composant est maintenant très simple, il n'a plus besoin de script.
  // Toute la logique de démarrage est dans main.js et userStore.js.
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