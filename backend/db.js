// backend/db.js (version optimisée)
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  // --- AJOUTER CES PARAMÈTRES ---
  connectionTimeoutMillis: 10000, // Augmente le temps d'attente à 10s
  idleTimeoutMillis: 30000,      // Temps qu'une connexion peut rester inactive (30s)
  allowExitOnIdle: true,         // Permet au script de se terminer si le pool est inactif
  max: 10 // Limite le nombre de clients dans le pool
});

// Ajoute un gestionnaire d'événements pour le débogage
pool.on('error', (err, client) => {
  console.error('Erreur inattendue sur un client de base de données inactif', err);
});

// Ajoute un test de connexion au démarrage pour "chauffer" le pool
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Erreur de connexion initiale à la base de données:', err);
    } else {
        console.log('Connexion à la base de données réussie à:', res.rows[0].now);
    }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};