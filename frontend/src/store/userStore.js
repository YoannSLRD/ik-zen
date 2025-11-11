// frontend/src/store/userStore.js

import { ref } from 'vue'
import { supabase } from '@/supabaseClient'

export const user = ref(null)
export const session = ref(null)

// On crée une fonction "porte d'entrée" qui sera appelée une seule fois
let appInitialized = false;

export const onAuthReady = (callback) => {
  // Si l'app est déjà prête, on exécute le callback immédiatement
  if (appInitialized) {
    callback();
    return;
  }

  // C'est le listener officiel de Supabase qui nous donnera le signal de départ
  supabase.auth.onAuthStateChange(async (_event, newSession) => {
    session.value = newSession
    if (newSession) {
      // Si une session existe, on récupère le profil utilisateur
      await fetchUserProfile(newSession.user.id)
    } else {
      user.value = null
    }

    // Le plus important : au premier signal reçu, on démarre l'application
    if (!appInitialized) {
      appInitialized = true;
      callback(); // C'est ici qu'on lancera app.mount() depuis main.js
    }
  });
};

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
    user.value = null
  }
}