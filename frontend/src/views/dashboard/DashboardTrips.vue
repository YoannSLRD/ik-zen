<!-- frontend/src/views/dashboard/DashboardTrips.vue -->
<template>
  <div>
    <!-- En-tête de la page -->
    <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
      <h1 class="h2"><font-awesome-icon icon="fa-solid fa-route" /> Mes Trajets</h1>
      <div class="btn-toolbar mb-2 mb-md-0">
        <button v-if="user.subscription_status === 'active'" class="btn btn-sm btn-outline-primary me-2" @click="openTourModal">
          <font-awesome-icon icon="fa-solid fa-map-signs" />
          <span class="d-none d-md-inline ms-1">Créer une tournée</span>
        </button>
        <button class="btn btn-sm btn-primary" @click="openAddTripModal" :disabled="isFreemiumLimitReached">
          <font-awesome-icon icon="fa-solid fa-plus" />
          <span class="d-none d-md-inline ms-1">Ajouter un trajet</span>
        </button>
      </div>
    </div>

    <!-- Alertes Freemium -->
    <div v-if="isFreemiumLimitReached" class="alert alert-danger">
      <strong>Limite atteinte :</strong> Vous avez enregistré vos 10 trajets pour ce mois.
      <router-link to="/pricing" class="alert-link">Passez à la version Pro</router-link> pour un accès illimité.
    </div>
    <div v-else-if="user.subscription_status !== 'active'" class="alert alert-warning">
      <strong>Compte gratuit :</strong> {{ monthlyTripCount }} / 10 trajets utilisés ce mois-ci.
      <router-link to="/pricing" class="alert-link">Passez à la version Pro</router-link>.
    </div>

    <!-- Filtres et Export (si des trajets existent) -->
    <template v-if="trips.length > 0">
      <div class="card mb-3">
        <div class="card-body d-flex justify-content-end align-items-center flex-wrap gap-2">
          <label for="exportYear" class="form-label mb-0">Exporter le relevé pour l'année :</label>
          <select id="exportYear" class="form-select form-select-sm w-auto" v-model="selectedYear">
            <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
          </select>

          <button class="btn btn-sm btn-outline-success" @click="downloadCSV" :disabled="isDownloadingCsv">
            <font-awesome-icon icon="fa-solid fa-file-csv" />
            <span class="d-none d-md-inline ms-1">{{ isDownloadingCsv ? 'Génération...' : 'CSV' }}</span>
          </button>

          <button class="btn btn-sm btn-outline-secondary" @click="downloadPDF" :disabled="isDownloading">
            <font-awesome-icon icon="fa-solid fa-file-pdf" />
            <span class="d-none d-md-inline ms-1">{{ isDownloading ? 'Génération...' : 'PDF' }}</span>
          </button>
        </div>
      </div>
      <div class="card mb-3">
        <div class="card-body">
          <div class="row g-2 align-items-center">
            <div class="col-md-5">
              <input type="text" class="form-control" placeholder="Rechercher (lieu, motif...)" v-model="searchQuery">
            </div>
            <div class="col-md-3">
              <select class="form-select" v-model="selectedVehicleId">
                <option value="">Tous les véhicules</option>
                <option v-for="vehicle in vehicles" :key="vehicle.id" :value="vehicle.id">{{ vehicle.name }}</option>
              </select>
            </div>
            <div class="col-md-4">
              <div class="input-group">
                <input type="date" class="form-control" v-model="startDate" title="Date de début">
                <span class="input-group-text">à</span>
                <input type="date" class="form-control" v-model="endDate" title="Date de fin">
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Affichage principal -->
    <div v-if="isLoading" class="loading-indicator">Chargement...</div>
    <div v-else>
      <div v-if="paginatedGroups.length > 0">
        <div v-for="group in paginatedGroups" :key="group.id" class="card mb-3">
          <div class="card-header d-flex justify-content-between align-items-center">
            <div>
              <h5 class="mb-0">{{ group.name }}</h5>
              <small class="text-muted">
                {{ new Date(group.date).toLocaleDateString('fr-FR') }}
                <span v-if="group.isTour"> | {{ group.trip_count }} trajets - {{ group.total_distance.toFixed(2) }} km</span>
              </small>
            </div>
            <div class="d-inline-flex">
              <template v-if="group.isTour">
                <button @click="openEditTourModal(group)" class="btn btn-warning btn-sm me-2" title="Modifier la tournée"><font-awesome-icon icon="fa-solid fa-edit" /></button>
                <button @click="handleDeleteTour(group)" class="btn btn-danger btn-sm" title="Supprimer la tournée"><font-awesome-icon icon="fa-solid fa-trash" /></button>
              </template>
              <template v-else>
                <button @click="openEditModal(group.trips[0])" class="btn btn-warning btn-sm me-2" title="Modifier"><font-awesome-icon icon="fa-solid fa-edit" /></button>
                <button @click="handleDelete(group.trips[0])" class="btn btn-danger btn-sm" title="Supprimer"><font-awesome-icon icon="fa-solid fa-trash" /></button>
              </template>
            </div>
          </div>
          <!-- LISTE DES TRAJETS -->
          <ul class="list-group list-group-flush">
            <li v-for="trip in group.trips" :key="trip.id" class="list-group-item d-flex justify-content-between align-items-center">
              <div>
                {{ trip.start_location_name }} → {{ trip.end_location_name }}
                <small class="d-block text-muted">{{ trip.vehicle_name }} | {{ trip.reason_name }}</small>
              </div>
              <span class="fw-bold">{{ trip.distance_km }} km</span>
            </li>
          </ul>
        </div>
      </div>
      <!-- MODIFICATION : La condition est maintenant plus simple -->
      <div v-else-if="trips.length > 0" class="alert alert-warning">Aucun trajet ne correspond à vos filtres.</div>
      <div v-else class="alert alert-light text-center p-4">
        <h4 class="alert-heading">Prêt à enregistrer votre premier trajet ?</h4>
        
        <!-- Cas 1 : Il manque des informations de base -->
        <div v-if="locations.length === 0 || vehicles.length === 0 || reasons.length === 0">
          <p>Pour créer un trajet, vous devez d'abord configurer les éléments suivants :</p>
          <hr>
          <div class="d-flex justify-content-center flex-wrap gap-2 mt-3">
            <router-link v-if="locations.length === 0" to="/dashboard/locations" class="btn btn-outline-primary">
              + Ajouter un Lieu
            </router-link>
            <router-link v-if="vehicles.length === 0" to="/dashboard/vehicles" class="btn btn-outline-primary">
              + Ajouter un Véhicule
            </router-link>
            <router-link v-if="reasons.length === 0" to="/dashboard/reasons" class="btn btn-outline-primary">
              + Ajouter un Motif
            </router-link>
          </div>
        </div>

        <!-- Cas 2 : Tout est prêt, on encourage à créer un trajet -->
        <div v-else>
          <p>Vous avez tout ce qu'il faut pour commencer à suivre vos kilomètres !</p>
          <hr>
          <button class="btn btn-primary mt-3" @click="openAddTripModal">
            <font-awesome-icon icon="fa-solid fa-plus" class="me-1" />
            Enregistrer mon premier trajet
          </button>
        </div>
      </div>
    </div>
      
    <!-- ***** NOUVEAU : PAGINATION POUR LES GROUPES ***** -->
    <nav v-if="totalPages > 1" aria-label="Page navigation">
      <ul class="pagination justify-content-center">
        <li class="page-item" :class="{ disabled: currentPage === 1 }">
          <a class="page-link" href="#" @click.prevent="prevPage">Précédent</a>
        </li>
        <li class="page-item" v-for="pageNumber in totalPages" :key="pageNumber" :class="{ active: currentPage === pageNumber }">
          <a class="page-link" href="#" @click.prevent="goToPage(pageNumber)">{{ pageNumber }}</a>
        </li>
        <li class="page-item" :class="{ disabled: currentPage === totalPages }">
          <a class="page-link" href="#" @click.prevent="nextPage">Suivant</a>
        </li>
      </ul>
    </nav>
      
    <!-- Modale d'ajout/modification de TRAJET SIMPLE -->
    <div class="modal fade" id="tripModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ isEditing ? 'Modifier le trajet' : 'Ajouter un trajet' }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="handleSubmit">
              <div class="mb-3">
                <label for="trip_date" class="form-label">Date</label>
                <input id="trip_date" type="date" class="form-control" v-model="currentTrip.trip_date" required />
              </div>
              
              <!-- === CHAMP DÉPART MODIFIÉ === -->
              <div class="mb-3">
                <label for="start_location" class="form-label">Départ</label>
                <div class="input-group">
                  <select id="start_location" required></select>
                  <button class="btn btn-outline-secondary" type="button" @click="openAddLocationModal('start')" title="Ajouter un nouveau lieu">
                    <font-awesome-icon icon="fa-solid fa-plus" />
                  </button>
                </div>
              </div>

              <!-- === CHAMP ARRIVÉE MODIFIÉ === -->
              <div class="mb-3">
                <label for="end_location" class="form-label">Arrivée</label>
                <div class="input-group">
                  <select id="end_location" required></select>
                  <button class="btn btn-outline-secondary" type="button" @click="openAddLocationModal('end')" title="Ajouter un nouveau lieu">
                    <font-awesome-icon icon="fa-solid fa-plus" />
                  </button>
                </div>
              </div>
              
              <!-- CHAMP VÉHICULE MODIFIÉ -->
              <div class="mb-3">
                <label for="vehicle" class="form-label">Véhicule</label>
                <div class="input-group">
                  <select id="vehicle" required></select>
                  <button class="btn btn-outline-secondary" type="button" @click="openAddVehicleModal" title="Ajouter un nouveau véhicule">
                    <font-awesome-icon icon="fa-solid fa-plus" />
                  </button>
                </div>
              </div>

              <!-- CHAMP MOTIF MODIFIÉ -->
              <div class="mb-3">
                <label for="reason" class="form-label">Motif</label>
                <div class="input-group">
                  <select id="reason" required></select>
                  <button class="btn btn-outline-secondary" type="button" @click="openAddReasonModal" title="Ajouter un nouveau motif">
                    <font-awesome-icon icon="fa-solid fa-plus" />
                  </button>
                </div>
              </div>

              <div class="mb-3">
                <label for="notes" class="form-label">Notes</label>
                <textarea id="notes" class="form-control" v-model="currentTrip.notes"></textarea>
              </div>
              <div v-if="error" class="alert alert-danger mt-3">{{ error }}</div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                <button type="submit" class="btn btn-primary" :disabled="loading">{{ loading ? '...' : 'Enregistrer' }}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <!-- Modale d'ajout/modification de TOURNEE -->
    <div class="modal fade" id="tourModal" tabindex="-1">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ isEditingTour ? 'Modifier la tournée' : 'Créer une nouvelle tournée' }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <!-- Notez le changement de @submit.prevent -->
            <form @submit.prevent="handleTourSubmit">
              <div class="row">
                <!-- v-model utilise activeTourData -->
                <div class="col-md-6 mb-3"><label class="form-label">Date</label><input type="date" class="form-control" v-model="activeTourData.tour_date" required /></div>
                <div class="col-md-6 mb-3">
                  <label class="form-label">Véhicule</label>
                  <div class="input-group">
                    <select class="form-select" v-model="activeTourData.vehicle_id" required>
                      <option disabled value="">-- Choisir --</option>
                      <option v-for="v in vehicles" :key="v.id" :value="v.id">{{ v.name }}</option>
                    </select>
                    <button class="btn btn-outline-secondary" type="button" @click="openAddVehicleModal" title="Ajouter un nouveau véhicule">
                      <font-awesome-icon icon="fa-solid fa-plus" />
                    </button>
                  </div>
                </div>
              </div>
              <div class="mb-3">
                <label for="tour_notes" class="form-label">Notes générales pour la tournée (optionnel)</label>
                <!-- v-model utilise activeTourData -->
                <textarea id="tour_notes" class="form-control" v-model="activeTourData.notes" rows="2"></textarea>
              </div>
              <hr />
              <h6>Étapes de la tournée (2 minimum)</h6>
              <!-- v-for utilise activeTourData -->
              <div v-for="(step, index) in activeTourData.steps" :key="index" class="row align-items-center mb-2">
                <!-- Champ Lieu de l'étape -->
                <div class="col-md-5">
                  <label class="form-label small">Étape {{ index + 1 }}</label>
                  <div class="input-group">
                    <select class="form-select" v-model="step.location_id" required>
                      <option disabled value="">-- Choisir un lieu --</option>
                      <option v-for="loc in locations" :key="loc.id" :value="loc.id">{{ loc.name }}</option>
                    </select>
                    <button class="btn btn-outline-secondary" type="button" @click="openAddLocationModal" title="Ajouter un nouveau lieu">
                      <font-awesome-icon icon="fa-solid fa-plus" />
                    </button>
                  </div>
                </div>
                <!-- Champ Motif de l'étape -->
                <div class="col-md-5" v-if="index < activeTourData.steps.length - 1">
                  <label class="form-label small">Motif (vers étape {{ index + 2 }})</label>
                  <div class="input-group">
                    <select class="form-select" v-model="step.reason_id" required>
                      <option disabled value="">-- Choisir un motif --</option>
                      <option v-for="r in reasons" :key="r.id" :value="r.id">{{ r.name }}</option>
                    </select>
                    <button class="btn btn-outline-secondary" type="button" @click="openAddReasonModal" title="Ajouter un nouveau motif">
                      <font-awesome-icon icon="fa-solid fa-plus" />
                    </button>
                  </div>
                </div>
                <div class="col-md-2 align-self-end">
                  <!-- v-if utilise activeTourData -->
                  <button type="button" class="btn btn-sm btn-outline-danger w-100" @click="removeStep(index)" v-if="activeTourData.steps.length > 2">Supprimer</button>
                </div>
              </div>
              <button type="button" class="btn btn-sm btn-outline-success mt-2" @click="addStep"><font-awesome-icon icon="fa-solid fa-plus" class="me-1" />Ajouter une étape</button>
              <div class="modal-footer mt-4">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                <button type="submit" class="btn btn-primary" :disabled="loading">{{ loading ? 'Enregistrement...' : 'Enregistrer' }}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Notre composant de confirmation -->
    <ConfirmModal ref="confirmModal" :message="confirmMessage" @confirm="onConfirmDelete" />

    <!-- === NOTRE NOUVEAU MODAL D'AJOUT RAPIDE === -->
    <LocationAddModal ref="locationAddModal" @location-added="onLocationAdded" @close="closeSubModal" />
    <VehicleAddModal ref="vehicleAddModal" @vehicle-added="onVehicleAdded" @close="closeSubModal" />
    <ReasonAddModal ref="reasonAddModal" @reason-added="onReasonAdded" @close="closeSubModal" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import api from '@/api';
import { user } from '@/store/userStore';
import { useToast } from 'vue-toastification';
import { Modal } from 'bootstrap';
import ConfirmModal from '@/components/ConfirmModal.vue';
import TomSelect from 'tom-select';
import 'tom-select/dist/css/tom-select.bootstrap5.css';
import LocationAddModal from '@/components/LocationAddModal.vue';
import VehicleAddModal from '@/components/VehicleAddModal.vue';
import ReasonAddModal from '@/components/ReasonAddModal.vue';

// --- INITIALISATION DES VARIABLES ---
const toast = useToast();
const trips = ref([]);
const locations = ref([]);
const vehicles = ref([]);
const reasons = ref([]);
const isLoading = ref(true);
const isEditing = ref(false);
const isEditingTour = ref(false);
const loading = ref(false);
const error = ref(null);
const tripToDelete = ref(null);
const tourToDelete = ref(null);
const monthlyTripCount = ref(0);
const selectedYear = ref(new Date().getFullYear());
const isDownloading = ref(false);
const isDownloadingCsv = ref(false);

// Refs pour les instances de modales
let tripModal = null;
let tourModal = null;
const confirmModal = ref(null);
const confirmMessage = ref('');
const locationAddModal = ref(null);
const vehicleAddModal = ref(null);
const reasonAddModal = ref(null);

// Refs pour les instances de TomSelect
let tsStartLocation, tsEndLocation, tsVehicle, tsReason;

// Données des formulaires
const currentTrip = ref({
  id: null, trip_date: new Date().toISOString().split('T')[0], start_location_id: '',
  end_location_id: '', vehicle_id: '', reason_id: '', notes: ''
});
const newTour = ref({
  tour_date: new Date().toISOString().split('T')[0], vehicle_id: '', notes: '',
  steps: [{ location_id: '', reason_id: '' }, { location_id: '', reason_id: null }]
});
const currentTour = ref({
  id: null,
  tour_date: new Date().toISOString().split('T')[0],
  vehicle_id: '',
  notes: '',
  steps: []
});

// --- GESTION DES MODALES IMBRIQUÉES ---
const isSubModalOpen = ref(false);
let activeParentModal = null; // Pour savoir quel modal est en arrière-plan
let activeFieldForQuickAdd = null;

const openSubModal = (modalRef) => {
  activeParentModal?._element.classList.add('is-superposed');
  modalRef.value?.show();
};
const closeSubModal = () => {
  activeParentModal?._element.classList.remove('is-superposed');
};
const openAddLocationModal = (targetField) => {
  activeFieldForQuickAdd = targetField; // 'start' ou 'end'
  openSubModal(locationAddModal);
};
const openAddVehicleModal = () => openSubModal(vehicleAddModal);
const openAddReasonModal = () => openSubModal(reasonAddModal);


const onLocationAdded = (newLocation) => {
  locations.value.push(newLocation);
  const opt = { value: newLocation.id, text: newLocation.name };
  tsStartLocation?.addOption(opt);
  tsEndLocation?.addOption(opt);
  
  if (activeFieldForQuickAdd === 'start') {
    tsStartLocation?.setValue(newLocation.id);
    currentTrip.value.start_location_id = newLocation.id;
    tsEndLocation?.focus();
  } else if (activeFieldForQuickAdd === 'end') {
    tsEndLocation?.setValue(newLocation.id);
    currentTrip.value.end_location_id = newLocation.id;
  }
};

const onVehicleAdded = (newVehicle) => {
  vehicles.value.push(newVehicle);
  const opt = { value: newVehicle.id, text: newVehicle.name };
  tsVehicle?.addOption(opt);

  // LA CORRECTION EST ICI : on met à jour la donnée ET l'affichage
  tsVehicle?.setValue(newVehicle.id);
  currentTrip.value.vehicle_id = newVehicle.id; // On force la mise à jour de la donnée

  if (activeParentModal === tourModal) {
    activeTourData.value.vehicle_id = newVehicle.id;
  }
  tsReason?.focus();
};

const onReasonAdded = (newReason) => {
  reasons.value.push(newReason);
  const opt = { value: newReason.id, text: newReason.name };
  tsReason?.addOption(opt);
  
  // LA CORRECTION EST ICI : on met à jour la donnée ET l'affichage
  tsReason?.setValue(newReason.id);
  currentTrip.value.reason_id = newReason.id; // On force la mise à jour de la donnée
};

// --- INITIALISATION DE TOM SELECT ---
const initializeTomSelects = () => {
    // On détruit les instances précédentes pour éviter les doublons
    if (tsStartLocation) tsStartLocation.destroy();
    if (tsEndLocation) tsEndLocation.destroy();
    if (tsVehicle) tsVehicle.destroy();
    if (tsReason) tsReason.destroy();

    // Paramètres communs pour tous les selects
    const commonSettings = {
        create: false,
        sortField: { field: "text", direction: "asc" },
        render: {
            no_results: () => '<div class="no-results">Aucun résultat trouvé</div>',
        },
        placeholder: '-- Choisir --'
    };

    // On transforme nos données pour que Tom Select les comprenne (value/text)
    const locationOptions = locations.value.map(loc => ({ value: loc.id, text: loc.name }));
    const vehicleOptions = vehicles.value.map(v => ({ value: v.id, text: v.name }));
    const reasonOptions = reasons.value.map(r => ({ value: r.id, text: r.name }));

    // Initialisation de chaque select AVEC LES BONNES OPTIONS
    tsStartLocation = new TomSelect('#start_location', {
        ...commonSettings,
        options: locationOptions, // <-- L'OPTION ÉTAIT MANQUANTE
        onChange: (value) => { currentTrip.value.start_location_id = value; }
    });
    tsEndLocation = new TomSelect('#end_location', {
        ...commonSettings,
        options: locationOptions, // <-- L'OPTION ÉTAIT MANQUANTE
        onChange: (value) => { currentTrip.value.end_location_id = value; }
    });
    tsVehicle = new TomSelect('#vehicle', {
        ...commonSettings,
        options: vehicleOptions, // <-- L'OPTION ÉTAIT MANQUANTE
        onChange: (value) => { currentTrip.value.vehicle_id = value; }
    });
    tsReason = new TomSelect('#reason', {
        ...commonSettings,
        options: reasonOptions, // <-- L'OPTION ÉTAIT MANQUANTE
        onChange: (value) => { currentTrip.value.reason_id = value; }
    });
};

// NOUVELLE COMPUTED PROPERTY POUR LA LIMITE
const isFreemiumLimitReached = computed(() => {
  return user.value && user.value.subscription_status !== 'active' && monthlyTripCount.value >= 10;
});

// ***** NOUVELLES VARIABLES POUR LES FILTRES, RECHERCHE, PAGINATION *****
const searchQuery = ref('');
const selectedVehicleId = ref(''); // ID du véhicule filtré
const startDate = ref(''); // Format YYYY-MM-DD
const endDate = ref('');   // Format YYYY-MM-DD
const currentPage = ref(1);
const itemsPerPage = ref(5); // On affiche 5 groupes (jours ou tournées) par page

// ***** NOUVELLE LOGIQUE DE FILTRAGE EN CASCADE *****

// 1. On filtre les trajets
const filteredTrips = computed(() => {
  let tempTrips = trips.value;

  // Filtre par texte de recherche
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    tempTrips = tempTrips.filter(trip =>
      trip.start_location_name.toLowerCase().includes(query) ||
      trip.end_location_name.toLowerCase().includes(query) ||
      trip.reason_name.toLowerCase().includes(query) ||
      trip.vehicle_name.toLowerCase().includes(query) ||
      (trip.notes && trip.notes.toLowerCase().includes(query))
    );
  }

  // Filtre par véhicule
  if (selectedVehicleId.value) {
    // on cherche l'ID du véhicule dans la liste des trajets
    const vehicle = vehicles.value.find(v => v.id === selectedVehicleId.value);
    if (vehicle) {
        tempTrips = tempTrips.filter(trip => trip.vehicle_name === vehicle.name);
    }
  }

  // Filtre par période (date de début ET date de fin)
  if (startDate.value && endDate.value) {
    tempTrips = tempTrips.filter(trip => {
      const tripDate = trip.trip_date;
      return tripDate >= startDate.value && tripDate <= endDate.value;
    });
  } 
  // Filtre par date de début uniquement
  else if (startDate.value) {
    tempTrips = tempTrips.filter(trip => trip.trip_date >= startDate.value);
  } 
  // Filtre par date de fin uniquement
  else if (endDate.value) {
    tempTrips = tempTrips.filter(trip => trip.trip_date <= endDate.value);
  }

  return tempTrips;
});

// 2. On regroupe les trajets FILTRÉS (votre `groupedTrips` existant, mais basé sur `filteredTrips`)
const groupedTrips = computed(() => {
  if (!filteredTrips.value.length) return [];
  const groups = new Map();
  filteredTrips.value.forEach(trip => {
    const groupId = trip.tour_id ? `tour-${trip.tour_id}` : `simple-${trip.id}`;
    if (!groups.has(groupId)) {
        groups.set(groupId, {
            id: groupId, isTour: !!trip.tour_id, date: trip.trip_date,
            name: trip.tour_name || 'Trajet simple', trips: [], trip_count: 0, total_distance: 0,
            tour_id_numeric: trip.tour_id
        });
    }
    const group = groups.get(groupId);
    group.trips.push(trip);
    group.trip_count++;
    group.total_distance += Number(trip.distance_km);
  });
  return Array.from(groups.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
});

// 3. On pagine les GROUPES
const totalPages = computed(() => {
  return Math.ceil(groupedTrips.value.length / itemsPerPage.value);
});

const paginatedGroups = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return groupedTrips.value.slice(start, end);
});

const activeTourData = computed(() => {
  return isEditingTour.value ? currentTour.value : newTour.value;
});

const availableYears = computed(() => {
  if (trips.value.length === 0) return [new Date().getFullYear()];
  const years = new Set(trips.value.map(trip => new Date(trip.trip_date).getFullYear()));
  return Array.from(years).sort((a, b) => b - a);
});

// Fonctions de pagination
const goToPage = (pageNumber) => { if (pageNumber >= 1 && pageNumber <= totalPages.value) currentPage.value = pageNumber; };
const prevPage = () => { if (currentPage.value > 1) currentPage.value--; };
const nextPage = () => { if (currentPage.value < totalPages.value) currentPage.value++; };

const fetchTrips = async () => {
  isLoading.value = true;
  try {
    const { data } = await api.get('/trips');
    trips.value = data;
  } catch (err) { toast.error("Impossible de charger les trajets."); }
  finally { isLoading.value = false; }
};

const fetchMonthlyTripCount = async () => {
  if (user.value && user.value.subscription_status !== 'active') {
    try {
      const { data } = await api.get('/trips/count/current-month');
      monthlyTripCount.value = data.count;
    } catch (error) {
      console.error("Impossible de récupérer le compteur de trajets mensuels.");
    }
  }
};

const fetchDropdownData = async () => {
  try {
    const [locationsRes, vehiclesRes, reasonsRes] = await Promise.all([
      api.get('/locations'),
      api.get('/vehicles'),
      api.get('/reasons')
    ]);
    locations.value = locationsRes.data;
    vehicles.value = vehiclesRes.data;
    reasons.value = reasonsRes.data;

    // L'initialisation se fera maintenant ici, une fois les données prêtes
    // On attend que le DOM soit à jour avant
    await nextTick();
    initializeTomSelects();

  } catch (error) {
    toast.error("Impossible de charger les données pour le formulaire.");
  }
};

const openAddTripModal = () => {
  activeParentModal = tripModal;
  isEditing.value = false;
  const defaultVehicle = vehicles.value.find(v => v.is_default);
  currentTrip.value = {
    id: null, trip_date: new Date().toISOString().split('T')[0], start_location_id: '',
    end_location_id: '', vehicle_id: defaultVehicle ? defaultVehicle.id : '', reason_id: '', notes: ''
  };
  error.value = null;
  if (tripModal) tripModal.show();
  nextTick(() => {
    tsStartLocation?.clear();
    tsEndLocation?.clear();
    const defaultVehicle = vehicles.value.find(v => v.is_default);
    tsVehicle?.setValue(defaultVehicle ? defaultVehicle.id : '');
    tsReason?.clear();
  });
};

const openTourModal = () => {
  activeParentModal = tourModal;
  isEditingTour.value = false; // On est en mode création
  const defaultVehicle = vehicles.value.find(v => v.is_default);
  // On utilise newTour pour la création
  newTour.value = {
    tour_date: new Date().toISOString().split('T')[0],
    vehicle_id: defaultVehicle ? defaultVehicle.id : '',
    notes: '',
    steps: [{ location_id: '', reason_id: '' }, { location_id: '', reason_id: null }]
  };
  if (tourModal) tourModal.show();
};

const openEditModal = (trip) => {
  activeParentModal = tripModal;
  isEditing.value = true;
  const startLocation = locations.value.find(l => l.name === trip.start_location_name);
  const endLocation = locations.value.find(l => l.name === trip.end_location_name);
  const vehicle = vehicles.value.find(v => v.name === trip.vehicle_name);
  const reason = reasons.value.find(r => r.name === trip.reason_name);
  currentTrip.value = {
    id: trip.id, trip_date: formatDateForInput(trip.trip_date),
    start_location_id: startLocation ? startLocation.id : null,
    end_location_id: endLocation ? endLocation.id : null,
    vehicle_id: vehicle ? vehicle.id : null,
    reason_id: reason ? reason.id : null,
    notes: trip.notes || ''
  };
  error.value = null;
  if (tripModal) tripModal.show();
  nextTick(() => {
    tsStartLocation?.setValue(currentTrip.value.start_location_id);
    tsEndLocation?.setValue(currentTrip.value.end_location_id);
    tsVehicle?.setValue(currentTrip.value.vehicle_id);
    tsReason?.setValue(currentTrip.value.reason_id);
  });
};

const openEditTourModal = async (group) => {
  activeParentModal = tourModal;
  isEditingTour.value = true;
  try {
    // Utiliser la nouvelle route pour obtenir les détails complets
    const { data: tourDetails } = await api.get(`/tours/${group.tour_id_numeric}`);

    // Pré-remplir les champs simples
    currentTour.value.id = tourDetails.id;
    currentTour.value.tour_date = formatDateForInput(tourDetails.tour_date);
    currentTour.value.notes = tourDetails.notes || '';
    // Le vehicle_id est le même pour tous les trajets de la tournée
    currentTour.value.vehicle_id = tourDetails.trips.length > 0 ? tourDetails.trips[0].vehicle_id : '';

    // Reconstruire le tableau "steps" à partir des trajets
    const reconstructedSteps = [];
    if (tourDetails.trips.length > 0) {
        // La première étape est le point de départ du premier trajet
        reconstructedSteps.push({
            location_id: tourDetails.trips[0].start_location_id,
            reason_id: tourDetails.trips[0].reason_id
        });
        // Les étapes suivantes sont les points d'arrivée de chaque trajet
        tourDetails.trips.forEach((trip, index) => {
            reconstructedSteps.push({
                location_id: trip.end_location_id,
                // Le motif est celui du segment suivant, sauf pour la dernière étape
                reason_id: (index < tourDetails.trips.length - 1) ? tourDetails.trips[index + 1].reason_id : null
            });
        });
    }
    currentTour.value.steps = reconstructedSteps;

    if (tourModal) tourModal.show();

  } catch (err) {
    toast.error("Impossible de charger les détails de la tournée.");
    console.error(err);
  }
};

const handleSubmit = async () => {
  if (currentTrip.value.start_location_id === currentTrip.value.end_location_id) {
    // On utilise `toast.error` pour un feedback clair au lieu d'une simple variable `error`.
    toast.error("Le lieu de départ et d'arrivée ne peuvent pas être identiques.");
    return; // On arrête l'exécution de la fonction ici.
  }
  
  loading.value = true;
  error.value = null;
  try {
    if (isEditing.value) {
      await api.put(`/trips/${currentTrip.value.id}`, currentTrip.value);
      toast.success("Trajet modifié avec succès !");
    } else {
      await api.post('/trips', currentTrip.value);
      toast.success("Trajet ajouté avec succès !");
      monthlyTripCount.value++;
    }
    if (tripModal) tripModal.hide();
    fetchTrips();
  } catch (err) {
    error.value = err.response?.data?.error || 'Une erreur est survenue.';
  } finally {
    loading.value = false;
  }
};

function formatDateForInput(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const handleDelete = (trip) => {
  tripToDelete.value = trip;
  tourToDelete.value = null;
  confirmMessage.value = `Êtes-vous sûr de vouloir supprimer ce trajet du ${new Date(trip.trip_date).toLocaleDateString()} ?`;
  if (confirmModal.value) confirmModal.value.show();
};

const addStep = () => {
   const steps = activeTourData.value.steps; // Utilise la variable calculée
   if (steps.length > 0) {
     steps[steps.length - 1].reason_id = '';
   }
   steps.push({ location_id: '', reason_id: null });
 };

 const removeStep = (index) => {
   activeTourData.value.steps.splice(index, 1); // Utilise la variable calculée
 };

const handleTourSubmit = async () => {
  loading.value = true;
  try {
    if (isEditingTour.value) {
      // Mode édition : on appelle la route PUT
      await api.put(`/tours/${currentTour.value.id}`, currentTour.value);
      toast.success("Tournée modifiée avec succès !");
    } else {
      // Mode création : on appelle la route POST
      await api.post('/tours', newTour.value);
      toast.success("Tournée enregistrée !");
    }
    if (tourModal) tourModal.hide();
    fetchTrips(); // On rafraîchit la liste dans les deux cas
  } catch (err) {
    toast.error(err.response?.data?.error || 'Une erreur est survenue.');
  } finally {
    loading.value = false;
  }
};

const handleDeleteTour = (group) => {
  tourToDelete.value = group;
  tripToDelete.value = null;
  confirmMessage.value = `Êtes-vous sûr de vouloir supprimer la "${group.name}" et tous ses trajets ?`;
  if (confirmModal.value) confirmModal.value.show();
};

const onConfirmDelete = async () => {
  let toastId; // On déclare l'ID du toast ici

  if (tourToDelete.value) {
    // Logique de suppression pour une TOURNÉE
    const tourToRemove = tourToDelete.value;
    const originalTrips = [...trips.value]; // On sauvegarde la liste complète des trajets

    // 1. Mise à jour UI : on filtre tous les trajets qui appartiennent à cette tournée
    trips.value = trips.value.filter(t => t.tour_id !== tourToRemove.tour_id_numeric);
    toastId = toast.info(`Suppression de "${tourToRemove.name}"...`, { timeout: false });

    try {
      await api.delete(`/tours/${tourToRemove.tour_id_numeric}`);
      toast.update(toastId, {
        content: "Tournée supprimée avec succès !",
        options: { type: 'success', timeout: 4000 },
      });
    } catch (err) {
      toast.update(toastId, {
        content: "Erreur lors de la suppression de la tournée.",
        options: { type: 'error', timeout: 6000 },
      });
      trips.value = originalTrips; // On restaure
    }
    tourToDelete.value = null;

  } else if (tripToDelete.value) {
    // Logique de suppression pour un TRAJET SIMPLE
    const tripToRemove = tripToDelete.value;
    const originalTrips = [...trips.value];

    // 1. Mise à jour UI
    trips.value = trips.value.filter(t => t.id !== tripToRemove.id);
    toastId = toast.info(`Suppression du trajet...`, { timeout: false });
    
    try {
      await api.delete(`/trips/${tripToRemove.id}`);
      toast.update(toastId, {
        content: "Trajet supprimé avec succès !",
        options: { type: 'success', timeout: 4000 },
      });

      // ✅ Mise à jour du compteur après suppression réussie
      if (tripToRemove && !tripToRemove.tour_id) {
        const deletedTripMonth = new Date(tripToRemove.trip_date).getMonth();
        const currentMonth = new Date().getMonth();
        if (deletedTripMonth === currentMonth) {
          monthlyTripCount.value--;
        }
      }

    } catch (err) {
      toast.update(toastId, {
        content: "Erreur lors de la suppression du trajet.",
        options: { type: 'error', timeout: 6000 },
      });
      trips.value = originalTrips; // On restaure
    }
    tripToDelete.value = null;
  }
};

// ** FONCTION FINALE ET CORRECTE POUR L'EXPORT **
const downloadPDF = async () => {
  // 1. On vérifie d'abord le statut de l'utilisateur CÔTÉ FRONTEND
  // pour une expérience utilisateur instantanée.
  if (user.value.subscription_status !== 'active') {
    toast.error("L'export PDF est une fonctionnalité Pro. Passez à la version supérieure pour en profiter !");
    return; // On arrête l'exécution ici
  }
  
  isDownloading.value = true;
  try {
    const response = await api.get(`/export/pdf/${selectedYear.value}`, {
      responseType: 'blob', // Crucial: on dit à axios d'attendre un fichier
    });
    
    // Créer un lien en mémoire pour déclencher le téléchargement
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Releve_IK-Zen_${selectedYear.value}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove(); // Nettoyer le lien après le clic
    window.URL.revokeObjectURL(url);

  } catch (error) {
    console.error("Erreur lors du téléchargement du PDF:", error);
    // 2. On garde une sécurité si le backend renvoie une autre erreur
    toast.error("Une erreur inattendue est survenue lors de la génération du PDF.");
  } finally {
    isDownloading.value = false;
  }
};

// --- NOUVELLE FONCTION POUR L'EXPORT CSV ---
const downloadCSV = async () => {
  if (user.value.subscription_status !== 'active') {
    toast.error("L'export CSV est une fonctionnalité Pro.");
    return;
  }
  isDownloadingCsv.value = true;
  try {
    const response = await api.get(`/export/csv/${selectedYear.value}`, {
      responseType: 'blob', // Important pour recevoir un fichier
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `IK-Zen_Export_${selectedYear.value}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

  } catch (error) {
    if (error.response?.status === 404) {
      toast.info("Aucun trajet à exporter pour cette année.");
    } else {
      toast.error("Erreur lors de la génération du fichier CSV.");
    }
    console.error("Erreur CSV:", error);
  } finally {
    isDownloadingCsv.value = false;
  }
};

// --- HOOKS DE CYCLE DE VIE ---
onMounted(() => {
  const tripModalElement = document.getElementById('tripModal');
  if (tripModalElement) tripModal = new Modal(tripModalElement);
  
  const tourModalElement = document.getElementById('tourModal');
  if (tourModalElement) tourModal = new Modal(tourModalElement);

  fetchDropdownData().then(() => {
    fetchTrips();
    fetchMonthlyTripCount();
  });
});

onUnmounted(() => {
  if (tripModal) tripModal.dispose();
  if (tourModal) tourModal.dispose();
  if (tsStartLocation) tsStartLocation.destroy();
  if (tsEndLocation) tsEndLocation.destroy();
  if (tsVehicle) tsVehicle.destroy();
  if (tsReason) tsReason.destroy();
});

// Watcher pour réinitialiser la page quand un filtre change
watch([searchQuery, selectedVehicleId, startDate, endDate], () => { // <-- Ajouter startDate et endDate
  currentPage.value = 1;
});
</script>

<style scoped>
  .loading-indicator { padding: 20px; text-align: center; color: #888; }
</style>