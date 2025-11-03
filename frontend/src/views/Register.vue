<!-- frontend/src/views/Register.vue -->
<template>
  <div class="auth-container">
    <div class="auth-box">
      <h2>Inscription</h2>

      <!-- ** NOUVEAU BLOC D'ERREUR/SUCCÈS ** -->
      <div v-if="message" :class="['alert', messageType === 'success' ? 'alert-success' : 'alert-danger']">
        {{ message }}
      </div>

      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label for="email">Adresse Email</label>
          <input id="email" type="email" v-model="email" placeholder="Email" class="form-control" required>
        </div>
        <div class="form-group">
          <label for="password">Mot de passe</label>
          <input id="password" type="password" v-model="password" placeholder="Mot de passe" class="form-control" required>
        </div>
        <button type="submit" class="btn btn-primary w-100">S'inscrire</button>
      </form>
      <p class="auth-link">
        Déjà un compte ? <router-link to="/login">Connectez-vous ici</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { supabase } from '@/supabaseClient';

const email = ref('');
const password = ref('');
const message = ref(null);
const messageType = ref('error');

const handleRegister = async () => {
  message.value = null;
  try {
    const { error } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
    });
    if (error) throw error;
    
    messageType.value = 'success';
    message.value = 'Inscription réussie ! Veuillez consulter votre boîte mail pour confirmer votre compte.';
    
  } catch (err) {
    messageType.value = 'error';
    // ***** AJOUT DE LA TRADUCTION *****
    let errorMessage = err.message || 'Une erreur est survenue.';
    if (errorMessage.includes('Password should be at least 6 characters')) {
      errorMessage = 'Le mot de passe doit contenir au moins 6 caractères.';
    } else if (errorMessage.includes('User already registered')) {
      errorMessage = 'Un compte existe déjà avec cette adresse e-mail.';
    }
    message.value = errorMessage;
    // **********************************
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
/* ** MÊMES STYLES QUE POUR LOGIN.VUE ** */
.auth-container { display: flex; justify-content: center; align-items: center; width: 100%; padding: 20px; }
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
.alert-success { background-color: #d1e7dd; color: #0f5132; border: 1px solid #badbcc; } /* On ajoute le style pour le succès */
.auth-link { margin-top: 20px; font-size: 0.9em; }
</style>