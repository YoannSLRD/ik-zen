<!-- frontend/src/views/FAQ.vue -->
<template>
    <div class="container py-5 legal-page">
      <div class="text-center mb-5">
        <h1 class="display-5 fw-bold">Foire Aux Questions (FAQ)</h1>
        <p class="lead text-secondary">Trouvez ici les réponses aux questions les plus courantes sur IK Zen.</p>
      </div>
  
      <div class="accordion" id="faqAccordion">
        <!-- Question 1 -->
        <div class="accordion-item">
          <h2 class="accordion-header" id="headingOne">
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne">
              Comment le calcul des indemnités kilométriques est-il effectué ?
            </button>
          </h2>
          <div id="collapseOne" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
            <div class="accordion-body">
              IK Zen utilise les barèmes kilométriques officiels publiés chaque année par l'administration fiscale française. Notre système sélectionne automatiquement le barème le plus récent applicable à l'année de vos trajets et au type de votre véhicule (thermique, électrique, deux-roues) pour un calcul précis et conforme. De plus, la majoration de 20% pour les véhicules électriques est appliquée automatiquement.
            </div>
          </div>
        </div>
  
        <!-- Question 2 -->
        <div class="accordion-item">
          <h2 class="accordion-header" id="headingTwo">
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseTwo">
              Mes données de trajets sont-elles sécurisées ?
            </button>
          </h2>
          <div id="collapseTwo" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
            <div class="accordion-body">
              Oui. La sécurité de vos données est notre priorité absolue. Toutes vos informations sont stockées dans une base de données sécurisée chez notre partenaire Supabase, et toutes les communications entre votre navigateur et nos serveurs sont chiffrées (HTTPS). Nous ne partageons ni ne vendons jamais vos données personnelles à des fins commerciales.
            </div>
          </div>
        </div>
        
        <!-- Question 3 -->
        <div class="accordion-item">
          <h2 class="accordion-header" id="headingThree">
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseThree">
              Puis-je annuler mon abonnement Pro à tout moment ?
            </button>
          </h2>
          <div id="collapseThree" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
            <div class="accordion-body">
              Oui, absolument. Vous pouvez gérer et annuler votre abonnement à tout moment depuis la page "Paramètres & Profil" en cliquant sur "Gérer mon abonnement". L'annulation prendra effet à la fin de votre période de facturation en cours (mensuelle ou annuelle) et vous ne serez plus prélevé par la suite.
            </div>
          </div>
        </div>
  
        <!-- Question 4 -->
        <div class="accordion-item">
          <h2 class="accordion-header" id="headingFour">
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseFour">
              Que se passe-t-il si je dépasse les 10 trajets du plan gratuit ?
            </button>
          </h2>
          <div id="collapseFour" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
            <div class="accordion-body">
              Le plan gratuit vous permet d'enregistrer jusqu'à 10 trajets par mois calendaire. Si vous atteignez cette limite, vous ne pourrez plus ajouter de nouveaux trajets pour le mois en cours, mais vos trajets existants resteront accessibles. Pour continuer à enregistrer des trajets sans limite, vous pouvez passer à l'offre Pro à tout moment.
            </div>
          </div>
        </div>
        
        <!-- Question 5 -->
        <div class="accordion-item">
          <h2 class="accordion-header" id="headingFive">
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseFive">
              L'import de données CSV est-il disponible avec l'offre gratuite ?
            </button>
          </h2>
          <div id="collapseFive" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
            <div class="accordion-body">
              Non, l'import de trajets depuis un fichier CSV est une fonctionnalité avancée réservée aux abonnés de l'offre Pro. Cette option, disponible dans vos paramètres, est idéale pour migrer un historique de trajets existant vers IK Zen en une seule fois.
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <style scoped>
  .legal-page { 
    max-width: 800px; 
  }
  .accordion-button:not(.collapsed) {
    color: var(--ikzen-primary);
    background-color: rgba(0, 51, 78, 0.05);
    box-shadow: none;
  }
  html[data-theme='dark'] .accordion-button:not(.collapsed) {
    color: var(--ikzen-accent);
  }
  html[data-theme='dark'] .accordion-item,
  html[data-theme='dark'] .accordion-button {
      background-color: var(--ikzen-surface);
      color: var(--ikzen-text);
      border-color: var(--ikzen-border);
  }
  html[data-theme='dark'] .accordion-button::after {
  /* 
    Cette règle magique cible la petite flèche (qui est un background-image SVG)
    et inverse sa couleur pour la rendre blanche sur fond sombre.
  */
  filter: invert(1) grayscale(100%) brightness(200%);
}
  </style>