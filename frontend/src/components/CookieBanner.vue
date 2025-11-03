<!-- frontend/src/components/CookieBanner.vue -->
<template>
    <transition name="cookie-banner-fade">
      <div v-if="showBanner" class="cookie-banner">
        <div class="cookie-banner-content">
          <p>
            Nous utilisons des cookies essentiels pour assurer le bon fonctionnement du site.
            <router-link to="/privacy">En savoir plus</router-link>
          </p>
          <button @click="acceptCookies" class="btn btn-primary btn-sm">J'ai compris</button>
        </div>
      </div>
    </transition>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  
  const showBanner = ref(false);
  
  onMounted(() => {
    // On vérifie si l'utilisateur a déjà accepté
    if (!localStorage.getItem('ikzen_cookie_consent')) {
      showBanner.value = true;
    }
  });
  
  const acceptCookies = () => {
    // On enregistre le consentement
    localStorage.setItem('ikzen_cookie_consent', 'true');
    showBanner.value = false;
  };
  </script>
  
  <style scoped>
  .cookie-banner {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1060; /* Au-dessus de tout */
    max-width: 350px;
    background-color: var(--ikzen-surface);
    color: var(--ikzen-text);
    padding: 1rem;
    border-radius: 0.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border: 1px solid var(--ikzen-border);
  }
  .cookie-banner-content {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .cookie-banner-content p {
    margin: 0;
    font-size: 0.9rem;
    flex-grow: 1;
  }
  
  /* Transition d'apparition */
  .cookie-banner-fade-enter-active,
  .cookie-banner-fade-leave-active {
    transition: opacity 0.5s ease, transform 0.5s ease;
  }
  .cookie-banner-fade-enter-from,
  .cookie-banner-fade-leave-to {
    opacity: 0;
    transform: translateY(20px);
  }
  </style>