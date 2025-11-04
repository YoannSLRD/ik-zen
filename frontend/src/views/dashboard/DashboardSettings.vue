<!-- frontend/src/views/dashboard/DashboardSettings.vue -->
<template>
  <div>
    <div class="d-flex justify-content-between align-items-center pt-3 pb-2 mb-3 border-bottom">
      <h1 class="h2"><font-awesome-icon icon="fa-solid fa-cog" /> Paramètres & Profil</h1>
    </div>

    <div v-if="isLoading" class="loading-indicator">Chargement du profil...</div>
    
    <div v-else>
      <div class="row">
        <!-- ***** NOUVELLE CARTE : INFORMATIONS PERSONNELLES ***** -->
        <div class="col-12 mb-4">
          <div class="card">
            <div class="card-header"><h5 class="mb-0">Informations Personnelles</h5></div>
            <div class="card-body">
              <form @submit.prevent="handleUpdateProfile">
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label for="first-name" class="form-label">Prénom</label>
                    <input id="first-name" type="text" class="form-control" v-model="profile.firstName" placeholder="Votre prénom">
                  </div>
                  <div class="col-md-6 mb-3">
                    <label for="last-name" class="form-label">Nom</label>
                    <input id="last-name" type="text" class="form-control" v-model="profile.lastName" placeholder="Votre nom">
                  </div>
                </div>
                <button type="submit" class="btn btn-primary btn-sm" :disabled="loadingProfile">
                  <span v-if="loadingProfile" class="spinner-border spinner-border-sm me-1"></span>
                  {{ loadingProfile ? 'Sauvegarde...' : 'Sauvegarder les informations' }}
                </button>
              </form>
            </div>
          </div>
        </div>

        <!-- Section Logo -->
        <div class="col-lg-6 mb-4">
          <div class="card h-100">
            <div class="card-header">
              <h5 class="mb-0">Logo de l'entreprise</h5>
            </div>
            <div class="card-body">
              <p class="card-text text-muted small">Ce logo apparaîtra sur vos exports PDF.</p>
              
              <div v-if="user.company_logo_url" class="logo-container mb-3">
                <img :src="`http://localhost:3000${user.company_logo_url}`" alt="Logo de l'entreprise" class="company-logo-preview">
              </div>
              <div v-else class="logo-placeholder mb-3">
                <p>Aucun logo défini</p>
              </div>
              
              <div class="d-flex align-items-center">
                <label for="logo-upload" class="btn btn-primary btn-sm me-2">
                  <font-awesome-icon :icon="['fas', user.company_logo_url ? 'edit' : 'plus']" />
                  <span class="d-none d-md-inline ms-1">{{ user.company_logo_url ? 'Changer' : 'Choisir un logo' }}</span>
                </label>
                <input id="logo-upload" type="file" @change="onFileSelected" accept="image/png, image/jpeg" class="d-none">
                <button v-if="user.company_logo_url" @click="handleDeleteLogo" class="btn btn-danger btn-sm">
                  <font-awesome-icon icon="fa-solid fa-trash" />
                  <span class="d-none d-md-inline ms-1">Supprimer</span>
                </button>
              </div>
              <div v-if="selectedFile" class="mt-2 d-flex align-items-center">
                <span class="file-name me-2">{{ selectedFile.name }}</span>
                <button @click="uploadLogo" class="btn btn-primary btn-sm">Uploader</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Section Abonnement (CORRIGÉE) -->
        <div class="col-lg-6 mb-4">
          <div class="card h-100">
            <div class="card-header"><h5 class="mb-0">Abonnement</h5></div>
            <div class="card-body">
              <p>
                Statut actuel : 
                <span :class="['badge', user.subscription_status === 'active' ? 'bg-success' : 'bg-secondary']">
                  {{ user.subscription_status === 'active' ? 'Actif (Pro)' : 'Inactif' }}
                </span>
              </p>
              <template v-if="user.subscription_status === 'active'">
                <button @click="manageSubscription" :disabled="loading" class="btn btn-outline-primary btn-sm mt-2">
                  {{ loading ? 'Chargement...' : 'Gérer mon abonnement' }}
                </button>
              </template>
              <template v-else>
                <!-- ** CORRECTION : Ceci est maintenant un <router-link> ** -->
                <router-link to="/pricing" class="btn btn-primary mt-2">
                  <font-awesome-icon icon="fa-solid fa-star" class="me-1" />
                  Passer à la version Pro
                </router-link>
              </template>
            </div>
          </div>
        </div>

        <!-- ***** NOUVELLE CARTE : CHANGER L'EMAIL ***** -->
        <div class="col-lg-6 mb-4">
          <div class="card">
            <div class="card-header"><h5 class="mb-0">Changer l'adresse e-mail</h5></div>
            <div class="card-body">
              <p class="card-text text-muted small">Connecté en tant que : <strong>{{ user.email }}</strong></p>
              <form @submit.prevent="handleChangeEmail">
                <div class="mb-3">
                  <label for="new-email" class="form-label">Nouvelle adresse e-mail</label>
                  <input id="new-email" type="email" class="form-control" v-model="newEmail" required autocomplete="email">
                </div>
                <button type="submit" class="btn btn-primary btn-sm" :disabled="loadingEmail">
                  {{ loadingEmail ? 'Mise à jour...' : "Mettre à jour l'e-mail" }}
                </button>
              </form>
            </div>
          </div>
        </div>

        <!-- ***** NOUVELLE CARTE : CHANGER LE MOT DE PASSE ***** -->
        <div class="col-lg-6 mb-4">
          <div class="card">
            <div class="card-header"><h5 class="mb-0">Changer le mot de passe</h5></div>
            <div class="card-body">
              <form @submit.prevent="handleChangePassword">
                <div class="mb-3">
                  <label for="new-password" class="form-label">Nouveau mot de passe</label>
                  <input id="new-password" type="password" class="form-control" v-model="newPassword" required minlength="6" autocomplete="new-password">
                  <div class="form-text">6 caractères minimum.</div>
                </div>
                <button type="submit" class="btn btn-primary btn-sm" :disabled="loadingPassword">
                  {{ loadingPassword ? 'Mise à jour...' : 'Mettre à jour le mot de passe' }}
                </button>
              </form>
            </div>
          </div>
        </div>
        <!-- NOUVELLE CARTE D'IMPORT, CONDITIONNELLE -->
        <div v-if="user && user.subscription_status === 'active'" class="col-12 mb-4">
          <div class="card">
            <div class="card-header">
              <h5 class="mb-0">Importer des Trajets depuis un fichier CSV</h5>
            </div>
            <div class="card-body">
              <p class="card-text text-muted small">
                Le fichier doit contenir les colonnes : Date, Depart, Arrivee, Vehicule, Motif, Notes.
                <a href="/modele.csv" download>Télécharger le modèle</a>
              </p>
              <div class="input-group">
                <input class="form-control" type="file" id="csvFile" @change="handleFileSelect" accept=".csv">
                <button class="btn btn-primary" type="button" @click="uploadFile" :disabled="!selectedFile || isUploading">
                  <span v-if="isUploading" class="spinner-border spinner-border-sm me-1"></span>
                  {{ isUploading ? 'Import en cours...' : 'Importer le fichier' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Notre composant de confirmation -->
    <ConfirmModal
      ref="confirmModal"
      title="Confirmer la suppression"
      message="Êtes-vous sûr de vouloir supprimer votre logo ?"
      @confirm="onConfirmDeleteLogo"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import api from '@/api'; // <-- MODIFICATION 1: Importer l'instance centralisée
import { supabase } from '@/supabaseClient.js';
import { user } from '@/store/userStore'; // <-- MODIFICATION 2: Importer l'utilisateur du store
import { useToast } from 'vue-toastification';
import ConfirmModal from '@/components/ConfirmModal.vue';
import Papa from 'papaparse';

const toast = useToast();
const isLoading = ref(false); // Pas besoin de isLoading, le user est déjà dans le store
const selectedFile = ref(null);
const confirmModal = ref(null);
const loading = ref(false); // Gardé pour les actions (paiement, etc.)
const newEmail = ref('');
const newPassword = ref('');
const loadingEmail = ref(false);
const loadingPassword = ref(false);
const isUploading = ref(false);

// ***** NOUVELLES VARIABLES POUR LE PROFIL *****
const profile = ref({ firstName: '', lastName: '' });
const loadingProfile = ref(false);

// Ce "watcher" est très important. Il s'assure que si les données de l'utilisateur
// sont mises à jour dans le store, le formulaire local se met à jour aussi.
watch(user, (newUser) => {
  if (newUser) {
    // On utilise les noms de colonnes de la BDD (snake_case)
    profile.value.firstName = newUser.first_name || '';
    profile.value.lastName = newUser.last_name || '';
  }
}, { 
  immediate: true, // "immediate: true" exécute le watcher dès le chargement du composant
  deep: true       // "deep: true" surveille les changements à l'intérieur de l'objet user
});

// ***** NOUVELLE FONCTION POUR LA MISE À JOUR *****
const handleUpdateProfile = async () => {
  if (!profile.value.firstName || !profile.value.lastName) {
    toast.error("Veuillez renseigner votre nom et votre prénom.");
    return;
  }
  loadingProfile.value = true;
  try {
    // On envoie les données au backend
    await api.put('/me', profile.value);
    
    // On met à jour le store localement pour un feedback instantané
    // sans avoir à recharger toute la page
    user.value.first_name = profile.value.firstName;
    user.value.last_name = profile.value.lastName;
    
    toast.success("Profil mis à jour avec succès !");
  } catch (error) {
    toast.error("Erreur lors de la mise à jour du profil.");
  } finally {
    loadingProfile.value = false;
  }
};

const onFileSelected = (event) => {
  selectedFile.value = event.target.files[0];
};

const uploadLogo = async () => {
  if (!selectedFile.value) return;
  
  const formData = new FormData();
  formData.append('logo', selectedFile.value);
  const toastId = toast.info("Envoi du logo en cours...", { timeout: false });

  try {
    const { data } = await api.post('/upload-logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    toast.update(toastId, { content: data.message, options: { type: 'success', timeout: 5000 } });
    user.value.company_logo_url = data.logoUrl; // Met à jour le store
    selectedFile.value = null;
  } catch (error) {
    const errorMessage = error.response?.data?.error || 'Erreur lors de l\'upload.';
    toast.update(toastId, { content: errorMessage, options: { type: 'error', timeout: 5000 } });
  }
};

const handleDeleteLogo = () => {
  if (confirmModal.value) {
    confirmModal.value.show();
  }
};

const onConfirmDeleteLogo = async () => {
  const toastId = toast.info("Suppression du logo...", { timeout: false });
  try {
    const { data } = await api.delete('/delete-logo');
    toast.update(toastId, { content: data.message, options: { type: 'success', timeout: 5000 } });
    user.value.company_logo_url = null; // Met à jour le store
  } catch (error) {
    const errorMessage = error.response?.data?.error || 'Erreur lors de la suppression.';
    toast.update(toastId, { content: errorMessage, options: { type: 'error', timeout: 5000 } });
  }
};

const manageSubscription = async () => {
  loading.value = true;
  try {
    const { data } = await api.post('/create-customer-portal-session');
    window.location.href = data.url;
  } catch (error) {
    toast.error("Impossible d'ouvrir le portail de gestion.");
  } finally {
    loading.value = false;
  }
};

// ***** NOUVELLE FONCTION : CHANGER L'EMAIL *****
const handleChangeEmail = async () => {
  if (!newEmail.value) {
    toast.error("Veuillez entrer une nouvelle adresse e-mail.");
    return;
  }

  loadingEmail.value = true;
  try {
    const { error } = await supabase.auth.updateUser(
      { email: newEmail.value },
      { emailRedirectTo: 'http://localhost:5173/login' } // Rediriger vers login après confirmation
    );
    if (error) throw error;
    
    // ***** MESSAGE DE SUCCÈS AMÉLIORÉ *****
    toast.success(
      "Vérifiez vos e-mails ! Un lien a été envoyé à votre ancienne ET à votre nouvelle adresse pour confirmer le changement.",
      { timeout: 10000 } // On laisse le message plus longtemps
    );
    newEmail.value = '';
  } catch (error) {
    toast.error(error.message || "Erreur lors de la mise à jour de l'e-mail.");
  } finally {
    loadingEmail.value = false;
  }
};

// ***** NOUVELLE FONCTION : CHANGER LE MOT DE PASSE *****
const handleChangePassword = async () => {
  if (!newPassword.value || newPassword.value.length < 6) {
    toast.error("Le nouveau mot de passe doit contenir au moins 6 caractères.");
    return;
  }

  loadingPassword.value = true;
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword.value,
    });
    if (error) throw error;

    toast.success("Votre mot de passe a été mis à jour avec succès !");
    newPassword.value = ''; // Vider le champ
  } catch (error) {
    toast.error(error.message || "Erreur lors de la mise à jour du mot de passe.");
  } finally {
    loadingPassword.value = false;
  }
};

// Se déclenche quand l'utilisateur choisit un fichier
const handleFileSelect = (event) => {
  selectedFile.value = event.target.files[0];
};

// Se déclenche quand l'utilisateur clique sur "Importer"
const uploadFile = () => {
  if (!selectedFile.value) {
    toast.error("Veuillez sélectionner un fichier CSV.");
    return;
  }

  isUploading.value = true;
  
  // On utilise Papaparse pour lire le fichier
  Papa.parse(selectedFile.value, {
    header: true, // Très important : utilise la première ligne comme clés d'objet
    skipEmptyLines: true,
    complete: async (results) => {
      try {
        // 'results.data' contient notre tableau d'objets JSON
        const response = await api.post('/import/trips', {
          trips: results.data
        });
        
        // Afficher le message de succès du backend
        toast.success(response.data.message);

      } catch (error) {
        // Afficher le message d'erreur du backend
        toast.error(error.response?.data?.error || "Une erreur est survenue lors de l'import.");
      } finally {
        isUploading.value = false;
        // Réinitialiser le champ de fichier
        document.getElementById('csvFile').value = '';
        selectedFile.value = null;
      }
    },
    error: (err) => {
      toast.error("Erreur lors de la lecture du fichier CSV.");
      isUploading.value = false;
    }
  });
};
</script>

<style scoped>
.card-header h5 {
  font-size: 1.1rem;
}
.company-logo-preview {
  max-width: 100%;
  height: 120px;
  border: 1px solid #ddd;
  padding: 5px;
  border-radius: 5px;
  object-fit: contain;
}
.logo-placeholder {
  width: 100%;
  height: 120px;
  border: 2px dashed var(--ikzen-border); /* Utilise la variable pour la bordure */
  border-radius: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--bs-secondary-color); /* Utilise la variable pour le texte grisé */
  background-color: var(--ikzen-background); /* Utilise la variable pour le fond */
}
.file-name {
  font-style: italic;
  color: #666;
}
.loading-indicator {
  padding: 20px;
  text-align: center;
  color: #888;
}
</style>