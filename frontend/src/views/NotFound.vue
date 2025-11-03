<!-- frontend/src/views/NotFound.vue -->
<template>
    <div class="container text-center d-flex flex-column justify-content-center" style="flex-grow: 1;">
      <h1 class="display-1">404</h1>
      <h2 class="mb-4">Oups ! Page non trouvée.</h2>
      <p class="lead text-muted">
        La page que vous recherchez n'existe pas ou a été déplacée.
      </p>
      <div class="mt-4">
        <router-link to="/" class="btn btn-primary">
          Retourner à la page d'accueil
        </router-link>
      </div>
    </div>
  </template>
  
  <style scoped>
  /* Un peu de style pour que ce soit joli */
  .display-1 {
    font-size: 8rem;
    font-weight: 700;
    color: #e9ecef;
  }
  </style>