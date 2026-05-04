<!-- frontend/src/views/Home.vue -->
<template>
  <div>
    <!-- SECTION 1 : Hero -->
    <div class="bg-light">
      <div class="container col-xxl-8 px-4 py-5">
        <div class="row flex-lg-row-reverse align-items-center g-5 py-5">
          <div class="col-10 col-sm-8 col-lg-6">
            <img 
              :src="dashboardImage" 
              class="d-block mx-lg-auto img-fluid hero-image"
              alt="Application de calcul des indemnités kilométriques URSSAF IK Zen" 
              width="700" 
              height="500" 
              loading="lazy">
          </div>
          <div class="col-lg-6">
            <h1 class="display-5 fw-bold lh-1 mb-3">Le calcul de vos indemnités kilométriques, enfin automatisé.</h1>
            <p class="lead">Professionnels de santé (Infirmiers, Kinés, Ergothérapeutes...), indépendants et commerciaux : arrêtez de perdre du temps sur Excel. Calculez vos frais kilométriques selon le barème de l'URSSAF, gérez vos tournées et exportez un relevé PDF prêt pour votre comptable.</p>
            <div class="d-grid gap-2 d-md-flex justify-content-md-start">
              <router-link to="/register" class="btn btn-primary btn-lg px-4 me-md-2">Créer mon compte gratuit</router-link>
              <router-link to="/login" class="btn btn-outline-secondary btn-lg px-4">Me connecter</router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- SECTION 2 : Problème / Solution -->
    <div class="bg-light py-5">
      <div class="container px-4 py-5 text-center">
        <h2 class="display-6 fw-bold">Vous êtes professionnel en déplacement ?</h2>
        <div class="col-lg-8 mx-auto">
          <p class="lead mb-4">La gestion des notes de frais kilométriques est une corvée. Entre les carnets de bord illisibles, le calcul des distances sur Google Maps, et les mises à jour annuelles du barème fiscal, c'est une source d'erreurs et de stress lors du bilan comptable.</p>
          <p class="h4 text-primary fw-bold">IK Zen est le logiciel de suivi kilométrique conçu pour vous faire gagner des heures chaque mois.</p>
        </div>
      </div>
    </div>

    <!-- SECTION 3 : Fonctionnalités Clés -->
    <div class="container px-4 py-5">
      <h2 class="pb-2 border-bottom text-center">Les fonctionnalités de notre application</h2>
      <div class="row g-4 py-5 row-cols-1 row-cols-lg-3">
        <div class="feature col text-center">
          <div class="feature-icon d-inline-flex align-items-center justify-content-center text-bg-primary bg-gradient fs-2 mb-3">
            <font-awesome-icon icon="fa-solid fa-route" />
          </div>
          <h3 class="fs-4">Gestion des Tournées (Lieux)</h3>
          <p>Enregistrez vos patients ou clients fréquents. Créez des tournées avec plusieurs étapes, notre algorithme GPS calcule la distance exacte instantanément.</p>
        </div>
        <div class="feature col text-center">
          <div class="feature-icon d-inline-flex align-items-center justify-content-center text-bg-primary bg-gradient fs-2 mb-3">
            <font-awesome-icon icon="fa-solid fa-euro-sign" />
          </div>
          <h3 class="fs-4">Calcul Barème URSSAF</h3>
          <p>Thermique, hybride ou 100% électrique (majoration de 20% incluse) ? Renseignez vos chevaux fiscaux (CV) et laissez IK Zen calculer vos remboursements automatiquement.</p>
        </div>
        <div class="feature col text-center">
          <div class="feature-icon d-inline-flex align-items-center justify-content-center text-bg-primary bg-gradient fs-2 mb-3">
            <font-awesome-icon icon="fa-solid fa-file-pdf" />
          </div>
          <h3 class="fs-4">Exports Comptables PDF / CSV</h3>
          <p>En un clic, téléchargez un tableau récapitulatif annuel propre, prêt à être transmis à votre expert-comptable ou à l'administration fiscale.</p>
        </div>
      </div>
    </div>
    
    <!-- SECTION 4 : Comment ça marche ? -->
    <div class="bg-light py-5">
      <div class="container px-4 py-5">
        <h2 class="text-center mb-5">Comment calculer ses IK en 3 étapes ?</h2>
        <div class="row g-4">
          <div class="col-md-4">
            <div class="card h-100 text-center shadow-sm">
              <div class="card-body">
                <div class="h1 text-primary mb-3">1.</div>
                <h5 class="card-title">Paramétrez votre compte</h5>
                <p class="card-text">Ajoutez vos véhicules (voiture, moto, scooter) et vos adresses fréquentes (domicile, cabinet, clients).</p>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card h-100 text-center shadow-sm">
              <div class="card-body">
                <div class="h1 text-primary mb-3">2.</div>
                <h5 class="card-title">Saisissez vos trajets</h5>
                <p class="card-text">Depuis votre smartphone ou votre PC, sélectionnez un départ et une arrivée. La distance est trouvée toute seule.</p>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card h-100 text-center shadow-sm">
              <div class="card-body">
                <div class="h1 text-primary mb-3">3.</div>
                <h5 class="card-title">Générez vos notes de frais</h5>
                <p class="card-text">Suivez vos statistiques en temps réel et exportez vos justificatifs en fin de mois ou d'année.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- SECTION 5 : Rappel des Tarifs -->
    <div class="container py-5">
      <div class="row text-center">
        <div class="col-lg-8 mx-auto">
          <h2 class="fw-bold mb-4">Combien coûte IK Zen ?</h2>
          <p class="lead mb-4">Un tarif clair, sans engagement. Testez l'application gratuitement jusqu'à 10 trajets par mois. Passez à la version Pro pour un usage illimité.</p>
          
          <div class="d-flex justify-content-center flex-wrap">
            <div class="card m-2" style="width: 18rem;">
              <div class="card-header"><h4 class="fw-normal">Découverte</h4></div>
              <div class="card-body">
                <h1 class="card-title">0€<small class="text-muted fw-light">/mois</small></h1>
                <ul class="list-unstyled mt-3 mb-4">
                  <li>10 trajets / mois</li>
                  <li>Gestion des véhicules & lieux</li>
                  <li>Calcul GPS automatique</li>
                </ul>
              </div>
            </div>
            <div class="card m-2 border-primary shadow" style="width: 18rem;">
              <div class="card-header bg-primary text-white"><h4 class="fw-normal">Pro</h4></div>
              <div class="card-body">
                <h1 class="card-title">5.99€<small class="text-muted fw-light">/mois</small></h1>
                <ul class="list-unstyled mt-3 mb-4">
                  <li><strong>Trajets illimités</strong></li>
                  <li>Création de tournées</li>
                  <li>Exports Comptables (PDF/CSV)</li>
                  <li>Importation CSV</li>
                </ul>
              </div>
            </div>
          </div>
          <router-link to="/pricing" class="btn btn-outline-primary mt-4">
            Voir le détail des abonnements
          </router-link>
        </div>
      </div>
    </div>

    <!-- SECTION 6 : Dernier Appel à l'Action -->
    <div class="container py-5 text-center">
      <div class="p-5 mb-4 bg-light rounded-3 shadow-sm border">
        <div class="container-fluid py-5">
          <h2 class="display-5 fw-bold">Prêt à simplifier votre comptabilité ?</h2>
          <p class="col-md-8 fs-4 mx-auto text-muted">Rejoignez les professionnels libéraux et indépendants qui ont choisi d'arrêter de perdre du temps avec les calculs complexes.</p>
          <router-link to="/register" class="btn btn-primary btn-lg mt-3">Démarrer mon essai gratuit</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import dashboardImage from '@/assets/hero-image-split.png';
</script>

<style scoped>
  .feature-icon {
    width: 4rem;
    height: 4rem;
    border-radius: .75rem;
  }

  .hero-image {
    border-radius: 0.75rem; 
    box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.175); 
    transform: scale(1.05); 
    transform-origin: center;
  }

  .hero-image:hover {
    transform: scale(1.08);
    transition: transform 0.3s ease-in-out;
  }
</style>