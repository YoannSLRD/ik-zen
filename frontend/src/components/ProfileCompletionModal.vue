<!-- frontend/src/components/ProfileCompletionModal.vue -->
<template>
    <div class="modal fade show" style="display: block; background-color: rgba(0,0,0,0.5);" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Finalisez votre profil</h5>
          </div>
          <div class="modal-body">
            <p>Bienvenue ! Veuillez renseigner votre nom et prénom pour continuer.</p>
            <form @submit.prevent="handleSubmit">
              <div class="mb-3">
                <label for="modal-firstName" class="form-label">Prénom</label>
                <input id="modal-firstName" type="text" class="form-control" v-model="profile.firstName" required>
              </div>
              <div class="mb-3">
                <label for="modal-lastName" class="form-label">Nom</label>
                <input id="modal-lastName" type="text" class="form-control" v-model="profile.lastName" required>
              </div>
              <button type="submit" class="btn btn-primary w-100" :disabled="loading">
                {{ loading ? "Sauvegarde..." : "Commencer à utiliser l'application" }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue';
  import api from '@/api.js';
  import { useToast } from 'vue-toastification';
  
  const emit = defineEmits(['completed']);
  const toast = useToast();
  const loading = ref(false);
  const profile = ref({ firstName: '', lastName: '' });
  
  const handleSubmit = async () => {
    loading.value = true;
    try {
      const { data } = await api.put('/me', profile.value);
      toast.success("Profil sauvegardé avec succès !");
      // On émet un événement pour dire au parent que c'est fini,
      // en envoyant les nouvelles données du profil.
      emit('completed', data.profile);
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde du profil.");
    } finally {
      loading.value = false;
    }
  };
  </script>