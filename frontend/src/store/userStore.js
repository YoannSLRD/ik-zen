// frontend/src/store/userStore.js

import { ref } from 'vue'
import { supabase } from '@/supabaseClient'

// On crée une promesse qui sera résolue une seule fois, au démarrage
let resolveAuthReady;
export const authReadyPromise = new Promise(resolve => {
  resolveAuthReady = resolve;
});

export const user = ref(null)
export const session = ref(null)

export const fetchUserProfile = async (userId) => {
  const token = session.value?.access_token;
  if (!token) return;

  // --- NOUVELLE LOGIQUE DE RÉESSAI ---
  const maxRetries = 3;
  const retryDelay = 3000; // 3 secondes

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 503) { // 503 Service Unavailable, le serveur se réveille
        throw new Error("Server is waking up");
      }
      
      if (!response.ok) {
        throw new Error("Could not fetch user profile.");
      }

      const profile = await response.json();
      user.value = profile;
      return; // Succès, on sort de la fonction

    } catch (error) {
      console.warn(`Attempt ${i + 1} to fetch profile failed:`, error.message);
      if (i < maxRetries - 1) {
        // On attend avant de réessayer
        await new Promise(res => setTimeout(res, retryDelay));
      } else {
        // C'est le dernier essai, on affiche l'erreur finale
        console.error("Error fetching profile after multiple retries:", error);
        user.value = null; // En cas d'échec final, on réinitialise.
      }
    }
  }
};

// C'est le listener de Supabase qui est notre unique source de vérité.
// Il est appelé automatiquement au démarrage de l'app.
supabase.auth.onAuthStateChange(async (_event, newSession) => {
  session.value = newSession
  if (newSession) {
    await fetchUserProfile(newSession.user.id)
  } else {
    user.value = null
  }
  
  // Au premier événement reçu, on résout la promesse pour débloquer l'app.
  if (resolveAuthReady) {
    resolveAuthReady();
    resolveAuthReady = null; // Pour ne pas la résoudre à nouveau
  }
});