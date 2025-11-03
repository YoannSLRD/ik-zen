// backend/db.js (version améliorée)
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  // --- AJOUTER CES PARAMÈTRES ---
  connectionTimeoutMillis: 5000, // Temps d'attente pour une connexion avant erreur (5s)
  idleTimeoutMillis: 30000,      // Temps qu'une connexion peut rester inactive avant d'être fermée (30s)
  allowExitOnIdle: true          // Permet au script de se terminer si le pool est inactif
});

// Ajouter un gestionnaire d'événements pour voir ce qui se passe
pool.on('error', (err, client) => {
  console.error('Erreur inattendue sur un client de base de données inactif', err);
  // Pas besoin de faire process.exit(-1), le pool gère la reconnexion
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};