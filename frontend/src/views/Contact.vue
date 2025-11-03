<!-- frontend/src/views/Contact.vue (VERSION FINALE) -->
<template>
  <div class="container py-5 text-center">
    <h1 class="display-5 fw-bold mb-4">Contactez-nous</h1>
    <p class="lead text-secondary">
        Pour toute question, suggestion ou problème technique, n'hésitez pas à nous envoyer un e-mail.
    </p>
    <a href="mailto:[Ton Email de Contact]" class="btn btn-primary btn-lg mt-3">
      [Ton Email de Contact]
    </a>
    <p class="text-muted mt-4">Nous nous efforçons de répondre dans les plus brefs délais.</p>
  </div>
</template>

<script setup>
// Ce composant n'a pas besoin de script
</script>

<style scoped>
.container {
  max-width: 700px;
}

h1 {
  color: var(--ikzen-primary);
}

html[data-theme='dark'] h1 {
  color: var(--ikzen-accent);
}
</style>