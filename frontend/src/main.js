// frontend/src/main.js

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { initializeAuth } from '@/store/userStore'

// Bootstrap
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'

import './style.css'

// Toast Notifications
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'

// Font Awesome
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { 
    faCar, faMapMarkerAlt, faPlus, faEdit, faTrash, faRoad, faSun, faMoon, faFileCsv,
    faRoute, faPlusCircle, faCog, faSignOutAlt, faTachometerAlt, faFileInvoice, faMapSigns, faFilePdf, faStar, faSearch, faEuroSign, faTableList, faUserShield
} from '@fortawesome/free-solid-svg-icons'

// Ajouter toutes les icônes nécessaires à la librairie
library.add(
    faCar, faMapMarkerAlt, faPlus, faEdit, faTrash, faRoad, faSun, faMoon, faFileCsv,
    faRoute, faPlusCircle, faCog, faSignOutAlt, faTachometerAlt, faFileInvoice, faMapSigns, faFilePdf, faStar, faSearch, faEuroSign, faTableList, faUserShield
)

// 1. On crée l'application
const app = createApp(App)

// 2. On configure les plugins qui n'ont pas besoin d'attendre (Toast, FontAwesome)
app.use(Toast, {
    transition: 'Vue-Toastification__bounce',
    maxToasts: 5,
    newestOnTop: true
})
app.component('font-awesome-icon', FontAwesomeIcon)

// 3. On attend que l'authentification soit prête
initializeAuth().then(() => {
  // 4. SEULEMENT ENSUITE, on active le routeur
  app.use(router)

  // 5. Et on monte l'application
  app.mount('#app')
})