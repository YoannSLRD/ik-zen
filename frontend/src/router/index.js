// frontend/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { useUserStore } from '@/store/userStore'; // <-- MODIFIÉ
import { isLoading } from '@/store/loadingStore';

import PublicLayout from '@/layouts/PublicLayout.vue';
import DashboardLayout from '@/views/dashboard/DashboardLayout.vue';

// ... (Garde tous tes imports de vues comme Home, Login, etc. ici) ...
import Home from '@/views/Home.vue';
import Login from '@/views/Login.vue';
import Register from '@/views/Register.vue';
import Contact from '@/views/Contact.vue';
import Terms from '@/views/Terms.vue';
import Privacy from '@/views/Privacy.vue';
import Pricing from '@/views/Pricing.vue';
import FAQ from '@/views/FAQ.vue';
import ForgotPassword from '@/views/ForgotPassword.vue';
import UpdatePassword from '@/views/UpdatePassword.vue';
import NotFound from '@/views/NotFound.vue';

import DashboardHome from '@/views/dashboard/DashboardHome.vue';
import DashboardLocations from '@/views/dashboard/DashboardLocations.vue';
import DashboardSettings from '@/views/dashboard/DashboardSettings.vue';
import DashboardVehicles from '@/views/dashboard/DashboardVehicles.vue';
import DashboardTrips from '@/views/dashboard/DashboardTrips.vue';
import DashboardReasons from '@/views/dashboard/DashboardReasons.vue';

import AdminUsers from '@/views/admin/AdminUsers.vue';

const routes = [
  {
    path: '/',
    component: PublicLayout,
    children: [
      { path: '', name: 'Home', component: Home, meta: { requiresGuest: true } },
      { path: 'login', name: 'Login', component: Login, meta: { requiresGuest: true } },
      { path: 'register', name: 'Register', component: Register, meta: { requiresGuest: true } },
      { path: 'contact', name: 'Contact', component: Contact },
      { path: 'terms', name: 'Terms', component: Terms },
      { path: 'privacy', name: 'Privacy', component: Privacy },
      { path: 'pricing', name: 'Pricing', component: Pricing },
      { path: 'faq', name: 'FAQ', component: FAQ },
      { path: 'forgot-password', name: 'ForgotPassword', component: ForgotPassword, meta: { requiresGuest: true } },
      { path: 'update-password', name: 'UpdatePassword', component: UpdatePassword }
    ]
  },
  {
    path: '/dashboard',
    component: DashboardLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'DashboardHome', component: DashboardHome },
      { path: 'locations', name: 'DashboardLocations', component: DashboardLocations },
      { path: 'vehicles',  name: 'DashboardVehicles', component: DashboardVehicles },
      { path: 'reasons', name: 'DashboardReasons', component: DashboardReasons },
      { path: 'trips', name: 'DashboardTrips', component: DashboardTrips },
      { path: 'settings', name: 'DashboardSettings', component: DashboardSettings },
    ]
  },
  {
    path: '/admin',
    component: DashboardLayout, // On réutilise le layout du dashboard !
    meta: { requiresAuth: true, requiresAdmin: true }, // Double sécurité
    children: [
      { path: '', name: 'AdminUsers', component: AdminUsers },
    ]
  },
  { 
    path: '/:pathMatch(.*)*', 
    name: 'NotFound', 
    component: NotFound 
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// --- GESTION DU SEO (Titre & Description) ---
router.afterEach((to) => {
  // On cache le loader global
  isLoading.value = false;

  // On définit les balises SEO en fonction de la page (ou des valeurs par défaut)
  const defaultTitle = 'IK Zen - Vos indemnités kilométriques, en toute sérénité';
  const defaultDesc = 'Calculez vos frais kilométriques facilement. Application idéale pour professionnels de santé (IDEL, kinés, ergothérapeutes), commerciaux et indépendants. Export PDF/CSV.';
  
  // Titres spécifiques par page
  const seoData = {
    'Home': {
      title: 'IK Zen - Logiciel de calcul des indemnités kilométriques (Barème URSSAF)',
    },
    'Pricing': {
      title: 'Tarifs - IK Zen',
    },
    'FAQ': {
      title: 'Foire Aux Questions - IK Zen',
    }
  };

  const pageData = seoData[to.name] || {};
  document.title = pageData.title || defaultTitle;

  // On cherche la balise meta description et on la met à jour
  let metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute('content', pageData.description || defaultDesc);
  }
});

router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore();

  // On attend que l'auth soit prête
  if (!userStore.isAuthReady) {
    await userStore.initAuthListener();
  }

  const isLoggedIn = !!userStore.session;
  const userRole = userStore.user?.role;

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const requiresGuest = to.matched.some(record => record.meta.requiresGuest);
  const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin);

  if (isLoggedIn) {
    if (requiresGuest) {
      return next('/dashboard');
    }
    if (requiresAdmin && userRole !== 'admin') {
      return next('/dashboard');
    }
    return next();
  } else {
    if (requiresAuth) {
      return next('/login');
    }
    return next();
  }
});

export default router;