<!-- frontend/src/views/UpdatePassword.vue -->
<template>
  <div class="auth-container">
    <div class="auth-box">
      <h2>Nouveau mot de passe</h2>
      
      <!-- CORRECTION : Le message s'affiche maintenant indépendamment du formulaire -->
      <div v-if="message" :class="['alert', messageType === 'success' ? 'alert-success' : 'alert-danger']">
        {{ message }}
        <router-link v-if="messageType === 'success'" to="/login" class="d-block mt-2">Aller à la page de connexion</router-link>
      </div>
      
      <!-- Le formulaire est caché uniquement en cas de SUCCÈS -->
      <form v-if="messageType !== 'success'" @submit.prevent="handleUpdate">
        <div class="form-group">
          <label for="password">Nouveau mot de passe</label>
          <input id="password" type="password" v-model="password" required class="form-control" placeholder="6 caractères minimum">
        </div>
        <button type="submit" class="btn btn-primary w-100" :disabled="loading">
          {{ loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe' }}
        </button>
      </form>

    </div>
  </div>
</template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import { useRoute } from 'vue-router';
  import { supabase } from '@/supabaseClient';
  
  const password = ref('');
  const message = ref('');
  const messageType = ref('error');
  const loading = ref(false);
  const route = useRoute();
  
  const handleUpdate = async () => {
    loading.value = true;
    try {
      const { error } = await supabase.auth.updateUser({ 
        password: password.value 
      });
      if (error) throw error;
      
      messageType.value = 'success';
      message.value = "Votre mot de passe a été mis à jour avec succès.";

    } catch (err) {
      messageType.value = 'error';
      // --- LA CORRECTION EST ICI ---
      if (err.message && err.message.includes("New password should be different from the old password")) {
        message.value = "Le nouveau mot de passe doit être différent de l'ancien.";
      } else {
        message.value = err.message || 'Une erreur est survenue.';
      }
      // --- FIN DE LA CORRECTION ---
    } finally {
      loading.value = false;
    }
  };
  
  onMounted(() => {
    // Le listener onAuthStateChange de Supabase gère le token automatiquement.
    // Si on arrive sur cette page après avoir cliqué sur le lien, la session est déjà établie.
    // On vérifie juste si c'est bien le cas.
    if (!supabase.auth.getSession()) {
      message.value = "Token invalide ou expiré. Veuillez refaire une demande de réinitialisation.";
    }
  });
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
    .alert { padding: 15px; margin-bottom: 20px; border-radius: 5px; }
    .alert-danger { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    .alert-success { background-color: #d1e7dd; color: #0f5132; border: 1px solid #badbcc; }
  </style>