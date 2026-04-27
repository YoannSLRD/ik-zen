// frontend/src/store/userStore.js
import { defineStore } from 'pinia'
import { supabase } from '@/supabaseClient'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    session: null,
    isAuthReady: false,
  }),

  actions: {
    async fetchUserProfile(userId) {
      const token = this.session?.access_token;
      if (!token) return;

      const maxRetries = 3;
      const retryDelay = 3000;

      for (let i = 0; i < maxRetries; i++) {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (response.status === 503) {
            throw new Error("Server is waking up");
          }
          
          if (!response.ok) {
            throw new Error("Could not fetch user profile.");
          }

          const profile = await response.json();
          this.user = profile;
          return;

        } catch (error) {
          console.warn(`Attempt ${i + 1} to fetch profile failed:`, error.message);
          if (i < maxRetries - 1) {
            await new Promise(res => setTimeout(res, retryDelay));
          } else {
            console.error("Error fetching profile after multiple retries:", error);
            this.user = null;
          }
        }
      }
    },

    initAuthListener() {
      return new Promise((resolve) => {
        supabase.auth.onAuthStateChange(async (_event, newSession) => {
          this.session = newSession;
          
          if (newSession) {
            await this.fetchUserProfile(newSession.user.id);
          } else {
            this.user = null;
          }
          
          this.isAuthReady = true;
          resolve(); 
        });
      });
    },

    async logout() {
      await supabase.auth.signOut();
      this.user = null;
      this.session = null;
    }
  }
})