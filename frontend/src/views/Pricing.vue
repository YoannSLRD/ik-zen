<!-- frontend/src/views/Pricing.vue -->
<template>
  <div class="container py-3">
    <header>
      <div class="pricing-header p-3 pb-md-4 mx-auto text-center">
        <h1 class="display-4 fw-normal">Nos Offres</h1>
        <p class="fs-5 text-muted">Choisissez le plan qui correspond à vos besoins. Commencez gratuitement et passez à la version Pro quand vous êtes prêt.</p>
      </div>
    </header>

    <main>
      <div class="row row-cols-1 row-cols-md-2 mb-3 text-center justify-content-center">
        <!-- Carte Gratuit -->
        <div class="col">
          <div class="card mb-4 rounded-3 shadow-sm">
            <div class="card-header py-3">
              <h4 class="my-0 fw-normal">Gratuit</h4>
            </div>
            <div class="card-body d-flex flex-column">
              <h1 class="card-title pricing-card-title">0€<small class="text-muted fw-light">/mois</small></h1>
                  
              <ul class="list-unstyled mt-3 mb-4 text-start">
                <li>✅ Gestion des lieux, véhicules, motifs</li>
                <li>✅ 10 trajets par mois</li>
                <li>✅ Thème sombre inclus</li>
                <li class="text-muted">❌ Création de tournées</li>
                <li class="text-muted">❌ Statistiques avancées & Graphiques</li>
                <li class="text-muted">❌ Exports PDF & CSV</li>
                <li class="text-muted">❌ Import de données CSV</li>
              </ul>

              <!-- === CORRECTION BOUTON GRATUIT === -->
              <button v-if="isLoggedIn && !isProUser" class="w-100 btn btn-lg btn-outline-secondary mt-auto" disabled>Votre plan actuel</button>
              <router-link v-else-if="!isLoggedIn" to="/register" class="w-100 btn btn-lg btn-outline-primary mt-auto">Commencer</router-link>
            </div>
          </div>
        </div>

        <!-- Carte Pro -->
        <div class="col">
          <div class="card mb-4 rounded-3 shadow-sm border-primary">
            <div class="card-header py-3 text-white bg-primary border-primary">
              <h4 class="my-0 fw-normal">Pro</h4>
            </div>
            <div class="card-body d-flex flex-column">
              <h1 class="card-title pricing-card-title">5.99€<small class="text-muted fw-light">/mois</small></h1>
              
              <ul class="list-unstyled mt-3 mb-4 text-start">
                <li>✅ <strong>Tout du plan Gratuit, et plus :</strong></li>
                <li>✅ Trajets illimités</li>
                <li>✅ Création de tournées</li>
                <li>✅ <strong>Statistiques avancées & Graphiques</strong></li>
                <li>✅ <strong>Exports PDF & CSV</strong></li>
                <li>✅ <strong>Import de données CSV</strong></li>
              </ul>

              <!-- === CORRECTION BOUTONS PRO === -->
              <div v-if="isLoggedIn && isProUser" class="mt-auto">
                <button class="w-100 btn btn-lg btn-success" disabled>Votre plan actuel</button>
              </div>
              <div v-else class="mt-auto">
                <button @click="subscribe('yearly')" class="w-100 btn btn-lg btn-primary mb-2">Payer 59€/an (2 mois offerts)</button>
                <button @click="subscribe('monthly')" class="w-100 btn btn-lg btn-outline-primary">Payer 5.99€/mois</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
  
    
  <script setup>
  import { ref, computed } from 'vue';
  import { useRouter } from 'vue-router';
  import { useToast } from 'vue-toastification';
  import api from '@/api.js'; // Utiliser l'instance centralisée
  import { user } from '@/store/userStore.js'; // Importer l'état de l'utilisateur
  
  const router = useRouter();
  const toast = useToast();
  const loading = ref(false);
  
  // Utiliser une computed property pour savoir si l'utilisateur est connecté
  const isLoggedIn = computed(() => !!user.value);
  const isProUser = computed(() => user.value?.subscription_status === 'active');
  
  const subscribe = async (plan) => {
    if (!isLoggedIn.value) {
      // Si l'utilisateur n'est pas connecté, on le renvoie vers la connexion
      // On peut même ajouter un message pour l'informer
      toast.info("Veuillez vous connecter ou créer un compte pour vous abonner.", {
        timeout: 5000
      });
      router.push('/login');
      return;
    }
  
    // Si l'utilisateur est connecté
    loading.value = true;
    try {
      // L'instance `api` ajoutera automatiquement le bon token d'authentification
      const response = await api.post('/create-checkout-session', { plan: plan });
      const { url } = response.data;
      
      // Rediriger vers la page de paiement Stripe
      window.location.href = url;
  
    } catch (error) {
      toast.error("Impossible de démarrer le processus de paiement. Veuillez réessayer.");
      console.error(error);
    } finally {
      loading.value = false;
    }
  };
  </script>  
  
  <style scoped>
  .container {
    color: #333;
  }
  .card-body {
    text-align: left;
  }
  .card-title {
    text-align: center;
  }
  </style>