// frontend/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { session } from '@/store/userStore';

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

import DashboardHome from '@/views/dashboard/DashboardHome.vue';
import DashboardLocations from '@/views/dashboard/DashboardLocations.vue';
import DashboardSettings from '@/views/dashboard/DashboardSettings.vue';
import DashboardVehicles from '@/views/dashboard/DashboardVehicles.vue';
import DashboardTrips from '@/views/dashboard/DashboardTrips.vue';
import DashboardReasons from '@/views/dashboard/DashboardReasons.vue';

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
  
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const requiresGuest = to.matched.some(record => record.meta.requiresGuest);

  if (isLoggedIn) {
    if (requiresGuest) {
      next('/dashboard');
    } else {
      next();
    }
  } else {
    if (requiresAuth) {
      next('/login');
    } else {
      next();
    }
  }
});

export default router;