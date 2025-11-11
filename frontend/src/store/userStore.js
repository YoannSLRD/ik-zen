// frontend/src/store/userStore.js

import { ref } from 'vue'
import { supabase } from '@/supabaseClient'

// On crée une promesse qui attend d'être "résolue"
let resolveAuthReady;
export const authReadyPromise = new Promise(resolve => {
  resolveAuthReady = resolve;
});

// La variable 'user' contient les informations du profil public de l'utilisateur.
// Elle est initialisée à null.
export const user = ref(null)

// La variable 'session' contient les informations de la session d'authentification.
export const session = ref(null)

/**
 * Met à jour les informations du profil de l'utilisateur.
 * C'est une requête à votre propre backend pour obtenir les données de la table 'profiles'.
 */
export const fetchUserProfile = async (userId) => {
  const token = session.value?.access_token
  if (!token) return

  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!response.ok) throw new Error("Could not fetch user profile.")
    const profile = await response.json()
    user.value = profile
  } catch (error) {
    console.error("Error fetching profile:", error)
    user.value = null // En cas d'erreur, on réinitialise.
  }
}

/**
 * Gère les changements d'état d'authentification de Supabase.
 */
supabase.auth.onAuthStateChange(async (_event, newSession) => {
  session.value = newSession

  if (newSession) {
    await fetchUserProfile(newSession.user.id)
  } else {
    user.value = null
  }

  // --- AJOUTE CETTE CONDITION ---
  // Si le "signal" existe et que l'événement est INITIAL_SESSION, on le déclenche
  if (resolveAuthReady && (_event === 'INITIAL_SESSION' || _event === 'SIGNED_IN' || _event === 'SIGNED_OUT')) {
    resolveAuthReady();
    resolveAuthReady = null; // On s'assure de ne le déclencher qu'une fois
  }
});

/**
 * Vérifie la session utilisateur au démarrage de l'application.
 */
export const initializeAuth = async () => {
  const { data } = await supabase.auth.getSession()
  session.value = data.session
  if (data.session) {
    await fetchUserProfile(data.session.user.id)
  }
}