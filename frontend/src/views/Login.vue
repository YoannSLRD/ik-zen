<!-- frontend/src/views/Login.vue -->
<template>
  <div class="auth-container">
    <div class="auth-box">
      <h2>Connexion</h2>
      <div v-if="error" class="alert alert-danger">{{ error }}</div>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="email">Adresse Email</label>
          <input id="email" type="email" class="form-control" v-model="email" placeholder="Email" required>
        </div>
        <div class="form-group">
          <label for="password">Mot de passe</label>
          <input id="password" type="password" class="form-control" v-model="password" placeholder="Mot de passe" required>
        </div>
        <div class="text-end mb-3">
          <router-link to="/forgot-password" class="small">Mot de passe oublié ?</router-link>
        </div>
        <button type="submit" class="btn btn-primary w-100">Se connecter</button>
      </form>
      <p class="auth-link">
        Pas encore de compte ? <router-link to="/register">Inscrivez-vous ici</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '@/supabaseClient';
import { isLoading } from '@/store/loadingStore';

const email = ref('');
const password = ref('');
const error = ref(null);
const router = useRouter();

const handleLogin = async () => {
  error.value = null;
  isLoading.value = true; // <--- AJOUTE CETTE LIGNE
  try {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });
    if (signInError) throw signInError;
    router.push('/dashboard');
  } catch (err) {
    isLoading.value = false; // <--- AJOUTE CETTE LIGNE (pour arrêter le loader en cas d'erreur)
    
    // ***** GESTION DE L'ERREUR SPÉCIFIQUE *****
    if (err.message && err.message.includes('Email not confirmed')) {
      error.value = "Votre compte n'a pas encore été confirmé. Veuillez vérifier vos e-mails.";
    } else {
      error.value = "Email ou mot de passe incorrect.";
    }
    console.error(err);
    // ****************************************
  }
  // On ne met PAS de 'finally' ici, car le loader doit être arrêté
  // uniquement en cas d'erreur. S'il y a succès, c'est le routeur (afterEach)
  // qui s'occupera de l'arrêter.
};
</script>

<style scoped>
/* ** NOUVEAUX STYLES ** */
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 20px;
}
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
.form-group {
  margin-bottom: 20px;
  text-align: left;
}
.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}
.alert {
  padding: 15px;
  margin-bottom: 20px;
  border-radius: 5px;
}
.alert-danger {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}
.auth-link {
  margin-top: 20px;
  font-size: 0.9em;
}
</style>