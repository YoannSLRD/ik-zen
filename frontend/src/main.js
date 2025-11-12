// frontend/src/main.js

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

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
    faRoute, faPlusCircle, faCog, faSignOutAlt, faTachometerAlt, faFileInvoice, faMapSigns, faFilePdf, faStar, faSearch, faEuroSign, faTableList, faUserShield, faSort, faSortUp, faSortDown
} from '@fortawesome/free-solid-svg-icons'

library.add(
    faCar, faMapMarkerAlt, faPlus, faEdit, faTrash, faRoad, faSun, faMoon, faFileCsv,
    faRoute, faPlusCircle, faCog, faSignOutAlt, faTachometerAlt, faFileInvoice, faMapSigns, faFilePdf, faStar, faSearch, faEuroSign, faTableList, faUserShield, faSort, faSortUp, faSortDown
)

const app = createApp(App)
  
app.use(router) // On active le routeur tout de suite
app.use(Toast, {
    transition: 'Vue-Toastification__bounce',
    maxToasts: 5,
    newestOnTop: true
})
app.component('font-awesome-icon', FontAwesomeIcon)
    
// On monte l'application immédiatement SANS attendre.
// Le loader dans App.vue gérera l'attente visuelle.
app.mount('#app');