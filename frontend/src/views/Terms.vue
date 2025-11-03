<!-- frontend/src/views/Terms.vue -->
<template>
    <div class="container py-5 legal-page">
        <h1>Conditions Générales de Vente et d'Utilisation</h1>
        <p class="text-muted">Dernière mise à jour : 30 Septembre 2025</p>
        <hr>

        <h5 class="mt-4">Article 1 : Objet</h5>
        <p>Les présentes Conditions Générales de Vente et d'Utilisation (CGV/CGU) régissent l'accès et l'utilisation du service en ligne "IK Zen" (ci-après "le Service"), édité par [Ton Nom Complet ou Nom de ta micro-entreprise] (ci-après "l'Éditeur").</p>

        <h5 class="mt-4">Article 2 : Accès et Inscription</h5>
        <p>L'accès au Service est subordonné à la création d'un compte utilisateur. L'utilisateur s'engage à fournir une adresse e-mail valide et à assurer la confidentialité de son mot de passe. L'utilisateur est seul responsable de toute activité effectuée depuis son compte.</p>

        <h5 class="mt-4">Article 3 : Offres et Abonnements</h5>
        <p>Le Service est proposé sous deux formes :</p>
        <ul>
          <li><strong>Une offre "Gratuit" :</strong> limitée en nombre de trajets mensuels et en fonctionnalités.</li>
          <li><strong>Une offre "Pro" :</strong> accessible via un abonnement payant, mensuel ou annuel, donnant accès à l'ensemble des fonctionnalités de manière illimitée.</li>
        </ul>
        <p>Les tarifs de l'offre "Pro" sont indiqués en euros (€) sur la page "Tarifs". Le paiement est géré par notre prestataire sécurisé Stripe. L'abonnement est à renouvellement tacite. L'utilisateur peut annuler son abonnement à tout moment depuis son espace "Paramètres & Profil", ce qui mettra fin aux prélèvements à la prochaine échéance.</p>
        
        <h5 class="mt-4">Article 4 : Responsabilité</h5>
        <p>Le Service IK Zen est un outil d'aide au calcul et au suivi des frais kilométriques. Les calculs d'indemnités sont basés sur les barèmes fiscaux officiels en vigueur. Toutefois, il incombe à l'utilisateur de vérifier l'exactitude des données saisies et la conformité des montants calculés avec sa situation fiscale personnelle avant toute déclaration officielle. La responsabilité de l'Éditeur ne saurait être engagée en cas d'erreur de saisie de la part de l'utilisateur ou d'utilisation non conforme des données générées.</p>

        <h5 class="mt-4">Article 5 : Propriété Intellectuelle</h5>
        <p>L'ensemble des éléments constituant le Service (logiciel, design, textes, logo) sont et restent la propriété intellectuelle exclusive de l'Éditeur.</p>

        <h5 class="mt-4">Article 6 : Droit applicable et Juridiction</h5>
        <p>Les présentes CGV/CGU sont soumises au droit français. En cas de litige, et après une tentative de résolution amiable, compétence exclusive est attribuée aux tribunaux de [Ville de ton tribunal de commerce, ex: Laval].</p>
    </div>
</template>

<style scoped>
.legal-page { 
  max-width: 800px; 
  text-align: left; 
}
h5 {
  color: var(--ikzen-primary);
}
html[data-theme='dark'] h5 {
  color: var(--ikzen-accent);
}
</style>