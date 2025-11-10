// frontend/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { session, user } from '@/store/userStore';

import PublicLayout from '@/layouts/PublicLayout.vue';
import DashboardLayout from '@/views/dashboard/DashboardLayout.vue';

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
import { isLoading } from '@/store/loadingStore';

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

router.beforeEach((to, from, next) => {
  const isLoggedIn = !!session.value;
  const userRole = user.value?.role;

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const requiresGuest = to.matched.some(record => record.meta.requiresGuest);
  const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin);

  if (isLoggedIn) {
    if (requiresGuest) {
      return next('/dashboard');
    }
    // NOUVELLE VÉRIFICATION : Si la route demande un admin mais que l'utilisateur n'en est pas un
    if (requiresAdmin && userRole !== 'admin') {
      return next('/dashboard'); // On le redirige vers son tableau de bord
    }
    return next();
  } else {
    if (requiresAuth) {
      return next('/login');
    }
    return next();
  }
});

router.afterEach(() => {
  // Cache le loader global après chaque navigation réussie
  isLoading.value = false;
});

export default router;
