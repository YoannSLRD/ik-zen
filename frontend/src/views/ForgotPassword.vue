<!-- frontend/src/views/ForgotPassword.vue -->
<template>
    <div class="auth-container">
      <div class="auth-box">
        <h2>Mot de passe oublié</h2>
        <p class="text-muted mb-4">Entrez votre adresse e-mail et nous vous enverrons un lien pour réinitialiser votre mot de passe.</p>
        
        <div v-if="message" class="alert alert-success">
          {{ message }}
        </div>
        
        <form v-else @submit.prevent="handleRequest">
          <div class="form-group">
            <label for="email">Adresse Email</label>
            <input id="email" type="email" v-model="email" placeholder="Votre email" required class="form-control">
          </div>
          <button type="submit" class="btn btn-primary w-100" :disabled="loading">
            {{ loading ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation' }}
          </button>
        </form>
        <p class="auth-link">
          <router-link to="/login">Retour à la connexion</router-link>
        </p>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue';
  // import axios from 'axios'; // <-- On n'a plus besoin d'axios ici
  import { supabase } from '@/supabaseClient.js'; // <-- On importe le client Supabase !
  
  const email = ref('');
  const message = ref('');
  const loading = ref(false);
  
  const handleRequest = async () => {
    loading.value = true;
    message.value = ''; // Réinitialiser le message précédent
    
    try {
      // On appelle Supabase directement depuis le frontend
      const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
        // redirectTo est crucial ! Il dit à Supabase où rediriger l'utilisateur APRÈS qu'il ait cliqué sur le lien
        redirectTo: 'http://localhost:5173/update-password',
      });
  
      if (error) {
        // Même en cas d'erreur (ex: utilisateur non trouvé), on affiche un message générique
        // pour des raisons de sécurité (ne pas révéler quels emails existent).
        console.error("Erreur Supabase (reset password):", error.message);
      }
  
      // Le message est toujours le même pour la sécurité
      message.value = "Si un compte est associé à cette adresse e-mail, un lien de réinitialisation a été envoyé.";
  
    } catch (err) {
      // Erreur inattendue
      console.error("Erreur inattendue:", err);
      message.value = "Une erreur est survenue. Veuillez réessayer.";
    } finally {
      loading.value = false;
    }
  };
  </script>
  
  <style scoped>
    .auth-container { display: flex; justify-content: center; align-items: center; width: 100%; padding: 20px; flex-grow: 1; }
    .auth-box {
      width: 100%;
      max-width: 400px;
      padding: 30px;
      /* On utilise nos variables CSS */
      background-color: var(--ikzen-surface);
      border: 1px solid var(--ikzen-border);
      /* Le box-shadow n'est pas très visible en mode sombre, la bordure suffit */
      box-shadow: 0 4px 10px rgba(0,0,0,0.1); 
      border-radius: 8px;
      /* Le texte est déjà géré globalement, mais on s'assure qu'il est correct */
      color: var(--ikzen-text); 
    }
    .form-group { margin-bottom: 20px; text-align: left; }
    .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
    .auth-link { margin-top: 20px; font-size: 0.9em; text-align: center; }
  </style>