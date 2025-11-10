<!-- frontend/src/components/AppLoader.vue -->
<template>
    <div class="loader-overlay">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Chargement...</span>
      </div>
      <p class="mt-3 text-muted">Préparation de votre espace...</p>
    </div>
  </template>
  
  <style scoped>
  .loader-overlay {
    flex-direction: column; 
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: var(--ikzen-background);
    z-index: 9999;
  }
  .spinner-border {
    width: 3rem;
    height: 3rem;
  }
  </style>