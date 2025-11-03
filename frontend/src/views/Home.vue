<template>
  <div>
    <!-- SECTION 1 : Hero -->
    <div class="bg-light"> <!-- On enveloppe la section dans un fond gris clair -->
      <div class="container col-xxl-8 px-4 py-5">
        <div class="row flex-lg-row-reverse align-items-center g-5 py-5">
          <div class="col-10 col-sm-8 col-lg-6">
            <img 
              :src="dashboardImage" 
              class="d-block mx-lg-auto img-fluid hero-image"
              alt="Aperçu des modes clair et sombre de IK Zen" 
              width="700" 
              height="500" 
              loading="lazy">
          </div>
          <div class="col-lg-6">
            <h1 class="display-5 fw-bold lh-1 mb-3">Le suivi de vos frais kilométriques, enfin simple.</h1>
            <p class="lead">Arrêtez de perdre du temps avec des feuilles de calcul. Enregistrez vos trajets en quelques clics, gérez vos tournées et exportez des relevés clairs pour votre comptabilité. Conçu pour les professionnels en déplacement.</p>
            <div class="d-grid gap-2 d-md-flex justify-content-md-start">
              <!-- Les boutons utilisent maintenant automatiquement la bonne couleur grâce à style.css -->
              <router-link to="/register" class="btn btn-primary btn-lg px-4 me-md-2">Commencer Gratuitement</router-link>
              <router-link to="/login" class="btn btn-outline-secondary btn-lg px-4">Se connecter</router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- SECTION 2 : Problème / Solution -->
    <div class="bg-light py-5">
      <div class="container px-4 py-5 text-center">
        <h2 class="display-6 fw-bold">Vous perdez un temps précieux ?</h2>
        <div class="col-lg-8 mx-auto">
          <p class="lead mb-4">La gestion des notes de frais kilométriques est souvent une tâche fastidieuse et source d'erreurs. Entre les carnets de bord oubliés, les tableurs complexes et l'incertitude face au barème fiscal, vous perdez une énergie que vous pourriez consacrer à votre véritable métier.</p>
          <p class="h4 text-primary fw-bold">IK Zen est la solution conçue pour vous redonner le contrôle.</p>
        </div>
      </div>
    </div>

    <!-- SECTION 3 : Fonctionnalités Clés -->
    <div class="container px-4 py-5">
      <h2 class="pb-2 border-bottom text-center">Tout ce dont vous avez besoin, sans le superflu</h2>
      <div class="row g-4 py-5 row-cols-1 row-cols-lg-3">
        <div class="feature col text-center">
          <div class="feature-icon d-inline-flex align-items-center justify-content-center text-bg-primary bg-gradient fs-2 mb-3">
            <font-awesome-icon icon="fa-solid fa-route" />
          </div>
          <h3 class="fs-4">Enregistrement Rapide</h3>
          <p>Grâce à vos lieux et véhicules pré-enregistrés, ajoutez un trajet en moins de 30 secondes. Créez des tournées complexes en quelques clics.</p>
        </div>
        <div class="feature col text-center">
          <div class="feature-icon d-inline-flex align-items-center justify-content-center text-bg-primary bg-gradient fs-2 mb-3">
            <font-awesome-icon icon="fa-solid fa-euro-sign" />
          </div>
          <h3 class="fs-4">Calcul Automatique des IK</h3>
          <p>Plus d'incertitude. Votre tableau de bord affiche en temps réel le montant de vos indemnités, calculé avec le barème officiel le plus récent.</p>
        </div>
        <div class="feature col text-center">
          <div class="feature-icon d-inline-flex align-items-center justify-content-center text-bg-primary bg-gradient fs-2 mb-3">
            <font-awesome-icon icon="fa-solid fa-file-pdf" />
          </div>
          <h3 class="fs-4">Exports Professionnels</h3>
          <p>En fin d'année, générez un relevé PDF complet et clair, prêt à être transmis à votre service comptable ou à être joint à votre déclaration.</p>
        </div>
      </div>
    </div>
    
        
    <!-- SECTION 4 : Comment ça marche ? -->
    <div class="bg-light py-5">
      <div class="container px-4 py-5">
        <h2 class="text-center mb-5">Commencez en 3 étapes simples</h2>
        <div class="row g-4">
          <div class="col-md-4">
            <div class="card h-100 text-center">
              <div class="card-body">
                <div class="h1 text-primary mb-3">1.</div>
                <h5 class="card-title">Créez votre compte</h5>
                <p class="card-text">L'inscription est gratuite et ne prend qu'une minute. Vous n'avez besoin que d'une adresse e-mail.</p>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card h-100 text-center">
              <div class="card-body">
                <div class="h1 text-primary mb-3">2.</div>
                <h5 class="card-title">Enregistrez vos trajets</h5>
                <p class="card-text">Configurez vos véhicules et lieux, puis ajoutez vos déplacements au fur et à mesure.</p>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card h-100 text-center">
              <div class="card-body">
                <div class="h1 text-primary mb-3">3.</div>
                <h5 class="card-title">Exportez votre relevé</h5>
                <p class="card-text">Avec l'offre Pro, téléchargez votre relevé annuel au format PDF en un seul clic.</p>
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
          <h2 class="fw-bold mb-4">Une offre simple et transparente</h2>
          <p class="lead mb-4">Commencez gratuitement aussi longtemps que vous le souhaitez. Passez à l'offre Pro uniquement lorsque vous avez besoin des fonctionnalités avancées.</p>
          
          <div class="d-flex justify-content-center">
            <!-- Carte Gratuit -->
            <div class="card m-2" style="width: 18rem;">
              <div class="card-header">
                <h4 class="fw-normal">Gratuit</h4>
              </div>
              <div class="card-body">
                <h1 class="card-title">0€<small class="text-muted fw-light">/mois</small></h1>
                <ul class="list-unstyled mt-3 mb-4">
                  <li>10 trajets / mois</li>
                  <li>Gestion de base</li>
                  <li>Thème sombre inclus</li>
                </ul>
              </div>
            </div>
            <!-- Carte Pro -->
            <div class="card m-2 border-primary" style="width: 18rem;">
              <div class="card-header bg-primary text-white">
                <h4 class="fw-normal">Pro</h4>
              </div>
              <div class="card-body">
                <h1 class="card-title">5.99€<small class="text-muted fw-light">/mois</small></h1>
                <!-- === CORRECTION ICI === -->
                <ul class="list-unstyled mt-3 mb-4">
                  <li>Trajets illimités</li>
                  <li>Création de tournées</li>
                  <li>Statistiques & Exports</li>
                </ul>
              </div>
            </div>
          </div>
          <router-link to="/pricing" class="btn btn-outline-primary mt-4">
            Voir le détail des offres
          </router-link>
        </div>
      </div>
    </div>

    <!-- SECTION 6 : Dernier Appel à l'Action -->
    <div class="container py-5 text-center">
      <div class="p-5 mb-4 bg-light rounded-3">
        <div class="container-fluid py-5">
          <h1 class="display-5 fw-bold">Prêt à simplifier votre comptabilité ?</h1>
          <p class="col-md-8 fs-4 mx-auto">Rejoignez les professionnels qui ont choisi d'arrêter de perdre du temps.</p>
          <router-link to="/register" class="btn btn-primary btn-lg mt-3">Créer mon compte gratuit</router-link>
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
    border-radius: 0.75rem; /* Coins arrondis, comme pour les icônes */
    box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.175); /* Ombre portée pour donner du relief */
    transform: scale(1.05); /* On zoome légèrement dans l'image pour qu'elle prenne plus de place */
    transform-origin: center;
  }

  /* On peut même ajouter un effet au survol */
  .hero-image:hover {
    transform: scale(1.08);
    transition: transform 0.3s ease-in-out;
  }
</style>