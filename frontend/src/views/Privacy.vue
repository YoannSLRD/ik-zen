<!-- frontend/src/views/Privacy.vue -->
<template>
  <div class="container py-5 legal-page">
    <h1>Politique de Confidentialité</h1>
    <p class="text-muted">Dernière mise à jour : 30 Septembre 2025</p>
    <hr>

    <p>La présente Politique de Confidentialité décrit la manière dont IK Zen collecte, utilise et protège les informations que vous nous fournissez lorsque vous utilisez notre service.</p>

    <h5 class="mt-4">Responsable du traitement</h5>
    <p>Le responsable du traitement des données est [Ton Nom Complet ou Nom de ta micro-entreprise], domicilié(e) à [Ton Adresse Postale Professionnelle], joignable à l'adresse e-mail [Ton Email de Contact, ex: contact@ikzen.fr].</p>

    <h5 class="mt-4">Données collectées</h5>
    <p>Dans le cadre de l'utilisation du service IK Zen, nous collectons les données suivantes :</p>
    <ul>
      <li><strong>Données d'identification :</strong> Adresse e-mail lors de l'inscription, nom et prénom si vous les fournissez.</li>
      <li><strong>Données de facturation :</strong> L'ensemble du processus de paiement est géré par notre partenaire Stripe. Nous ne stockons, ni n'avons accès à vos informations de carte de crédit. Stripe nous transmet uniquement une confirmation de paiement et un identifiant client.</li>
      <li><strong>Données d'utilisation :</strong> Les adresses, trajets, véhicules, et motifs que vous enregistrez volontairement dans l'application. Ces données sont indispensables au bon fonctionnement du service.</li>
      <li><strong>Données de connexion :</strong> Nous utilisons des cookies techniques strictement nécessaires pour maintenir votre session de connexion et mémoriser vos préférences (comme le thème sombre).</li>
    </ul>

    <h5 class="mt-4">Finalité des traitements</h5>
    <p>Vos données personnelles sont collectées dans le but exclusif de :</p>
    <ul>
      <li>Fournir, gérer et améliorer le service IK Zen.</li>
      <li>Gérer votre abonnement et la facturation via notre prestataire.</li>
      <li>Assurer la sécurité de l'application et de vos données.</li>
      <li>Vous contacter pour du support technique ou des informations importantes relatives à votre compte.</li>
    </ul>
    <p>Vos données personnelles ne seront jamais vendues, louées ou partagées à des tiers à des fins de marketing sans votre consentement explicite.</p>

    <h5 class="mt-4">Vos droits</h5>
    <p>Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants concernant vos données personnelles :</p>
    <ul>
      <li>Droit d'accès.</li>
      <li>Droit de rectification.</li>
      <li>Droit à l'effacement ("droit à l'oubli").</li>
      <li>Droit à la limitation du traitement.</li>
      <li>Droit à la portabilité des données.</li>
    </ul>
    <p>Vous pouvez exercer ces droits à tout moment en nous contactant à l'adresse e-mail mentionnée ci-dessus.</p>

    <h5 class="mt-4">Sécurité et Hébergement</h5>
    <p>Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles pour protéger vos données. Celles-ci sont hébergées sur les serveurs sécurisés de notre partenaire Supabase, situé en Union Européenne.</p>
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