<!-- frontend/src/components/Footer.vue -->
<template>
  <div class="container">
    <footer class="d-flex flex-wrap justify-content-between align-items-center py-3 my-4 border-top">
      <p class="col-md-4 mb-0 text-muted">© {{ new Date().getFullYear() }} IK Zen</p>
  
        <ul class="nav col-md-4 justify-content-end">
          <li class="nav-item"><router-link to="/terms" class="nav-link px-2 text-muted">Conditions</router-link></li>
          <li class="nav-item"><router-link to="/privacy" class="nav-link px-2 text-muted">Confidentialité</router-link></li>
          <li class="nav-item"><router-link to="/contact" class="nav-link px-2 text-muted">Contact</router-link></li>
          <li class="nav-item"><router-link to="/faq" class="nav-link px-2 text-muted">FAQ</router-link></li>
        </ul>
      </footer>
    </div>
</template>