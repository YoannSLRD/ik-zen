// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
// const bcrypt = require('bcryptjs'); // MODIFIÉ : N'est plus nécessaire, Supabase gère le hashage
// const jwt = require('jsonwebtoken'); // MODIFIÉ : N'est plus nécessaire, Supabase gère les tokens JWT
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { createClient } = require('@supabase/supabase-js');

const db = require('./db'); // On garde le pool `pg` pour les transactions et requêtes complexes
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Initialisation du client Supabase avec la clé de service pour les actions backend
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const app = express();

// --- Configuration de Multer pour l'upload de fichiers ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = 'uploads/';
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath);
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Crée un nom de fichier unique en utilisant l'UUID de l'utilisateur
        cb(null, `logo-${req.user.id}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: storage });

// --- Middlewares ---
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173', // L'origine de votre frontend
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE", // Méthodes autorisées
    allowedHeaders: "Content-Type, Authorization", // En-têtes autorisés
    credentials: true // Si vous utilisez des cookies/sessions (pas le cas ici, mais c'est une bonne pratique)
  };
  
app.use(cors(corsOptions));
// La ligne app.options est maintenant gérée par la configuration ci-dessus, mais la garder ne fait pas de mal
app.options('*', cors(corsOptions)); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Le webhook doit être défini avant express.json() pour recevoir le corps brut
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.log(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            // MODIFIÉ : On met à jour la table 'profiles' et non plus 'users'
            await db.query(
                "UPDATE public.profiles SET subscription_status = 'active', stripe_customer_id = $1 WHERE id = $2",
                [session.customer, session.client_reference_id]
            );
            console.log(`Abonnement activé pour l'utilisateur ID: ${session.client_reference_id}`);
            break;
        case 'customer.subscription.deleted':
            const subscription = event.data.object;
            // Gérer la fin d'un abonnement (par exemple, si l'utilisateur annule)
            await db.query(
                "UPDATE public.profiles SET subscription_status = 'inactive' WHERE stripe_customer_id = $1",
                [subscription.customer]
            );
            console.log(`Abonnement désactivé pour le client Stripe ID: ${subscription.customer}`);
            break;
    }
    res.json({ received: true });
});

app.use(express.json());

// --- NOUVEAU : Middleware d'authentification utilisant Supabase ---
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Accès non autorisé : token manquant.' });
    }

    // On demande à Supabase de valider le token et de nous donner l'utilisateur
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        console.error('Erreur d\'authentification Supabase:', error?.message);
        return res.status(403).json({ error: 'Accès non autorisé : token invalide ou expiré.' });
    }

    // On attache l'utilisateur (avec son UUID) à l'objet `req`
    req.user = user;
    next();
};

// --- Routes d'Authentification (entièrement refactorées pour Supabase) ---

app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email et mot de passe requis." });
    if (password.length < 6) return res.status(400).json({ error: "Le mot de passe doit faire au moins 6 caractères." });

    // NOUVEAU : On utilise la fonction d'inscription de Supabase
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
    });

    if (error) {
        console.error("Erreur d'inscription Supabase:", error.message);
        return res.status(400).json({ error: "Impossible de créer le compte. L'email est peut-être déjà utilisé." });
    }

    // Le trigger `on_auth_user_created` en SQL s'est occupé de créer le profil associé.
    res.status(201).json({ message: "Compte créé. Veuillez vérifier vos e-mails pour confirmer votre inscription.", user: data.user });
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email et mot de passe requis." });

    // NOUVEAU : On utilise la fonction de connexion de Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        console.error("Erreur de connexion Supabase:", error.message);
        return res.status(400).json({ error: "Email ou mot de passe incorrect." });
    }
    
    // NOUVEAU : On récupère les infos du profil pour les renvoyer au client
    const { rows: profileRows } = await db.query(
        'SELECT subscription_status, stripe_customer_id, company_logo_url FROM public.profiles WHERE id = $1',
        [data.user.id]
    );

    if (profileRows.length === 0) {
        return res.status(500).json({ error: "Erreur critique : profil utilisateur introuvable." });
    }

    // On combine les informations pour le client
    const responsePayload = {
        token: data.session.access_token,
        refreshToken: data.session.refresh_token,
        user: {
            id: data.user.id,
            email: data.user.email,
            ...profileRows[0]
        }
    };
    res.json(responsePayload);
});

app.post('/api/auth/reset-password-request', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "L'adresse e-mail est requise." });

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/update-password`
    });

    if (error) console.error("Erreur Supabase (reset password):", error);
    res.json({ message: "Si un compte est associé à cet e-mail, un lien de réinitialisation a été envoyé." });
});

app.post('/api/auth/update-password', async (req, res) => {
    const { password, access_token } = req.body; // Le frontend doit envoyer le token d'accès reçu dans l'URL

    if (!access_token) return res.status(401).json({ error: "Token manquant." });
    if (!password || password.length < 6) return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères." });

    // MODIFIÉ : Supabase gère tout, plus besoin de toucher à la BDD ici
    const { error } = await supabase.auth.updateUser({ password: password }, {
      access_token: access_token
    });

    if (error) {
        console.error("Erreur Supabase (update password):", error);
        return res.status(400).json({ error: "Token invalide ou expiré. Veuillez refaire une demande." });
    }

    res.json({ message: "Votre mot de passe a été mis à jour avec succès." });
});

// --- Routes Protégées de l'Utilisateur ---

app.get('/api/me', authenticateToken, async (req, res) => {
    try {
      const { rows } = await db.query(`
        SELECT 
          u.id, 
          u.email, 
          p.subscription_status, 
          p.company_logo_url, 
          p.stripe_customer_id,
          p.first_name,
          p.last_name,
          p.role
        FROM auth.users u
        JOIN public.profiles p ON u.id = p.id
        WHERE u.id = $1
      `, [req.user.id]);
      
      if (rows.length === 0) return res.status(404).json({ error: "Utilisateur non trouvé" });
      res.json(rows[0]);
    } catch (error) {
      console.error("Erreur /api/me:", error);
      res.status(500).json({ error: "Erreur serveur." });
    }
});

app.put('/api/me', authenticateToken, async (req, res) => {
    // On utilise des noms de variables clairs (camelCase)
    const { firstName, lastName } = req.body;
    
    if (!firstName || !lastName) {
      return res.status(400).json({ error: "Le nom et le prénom sont requis." });
    }
  
    try {
      // On met à jour la table profiles avec les nouvelles valeurs
      const { rows } = await db.query(
        'UPDATE public.profiles SET first_name = $1, last_name = $2 WHERE id = $3 RETURNING first_name, last_name',
        [firstName, lastName, req.user.id]
      );
      
      res.json({ message: "Profil mis à jour avec succès !", profile: rows[0] });
  
    } catch (error) {
      console.error("Erreur de mise à jour du profil:", error);
      res.status(500).json({ error: "Erreur serveur." });
    }
});

app.post('/api/upload-logo', authenticateToken, upload.single('logo'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni.' });
    try {
        const logoUrl = `/uploads/${req.file.filename}`;
        // MODIFIÉ : On met à jour la table 'profiles'
        await db.query('UPDATE public.profiles SET company_logo_url = $1 WHERE id = $2', [logoUrl, req.user.id]);
        res.json({ message: 'Logo mis à jour !', logoUrl: logoUrl });
    } catch (error) {
        console.error("Erreur d'upload de logo:", error);
        res.status(500).json({ error: "Erreur serveur lors de l'upload." });
    }
});

app.delete('/api/delete-logo', authenticateToken, async (req, res) => {
    try {
        // MODIFIÉ : On récupère depuis la table 'profiles'
        const { rows } = await db.query('SELECT company_logo_url FROM public.profiles WHERE id = $1', [req.user.id]);
        
        if (rows.length === 0 || !rows[0].company_logo_url) {
            return res.status(404).json({ error: 'Aucun logo à supprimer.' });
        }
        
        const logoUrl = rows[0].company_logo_url;
        const filename = path.basename(logoUrl);
        const filePath = path.join(__dirname, 'uploads', filename);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // MODIFIÉ : On met à jour la table 'profiles'
        await db.query('UPDATE public.profiles SET company_logo_url = NULL WHERE id = $1', [req.user.id]);
        
        res.json({ message: 'Logo supprimé avec succès.' });

    } catch (error) {
        console.error("Erreur lors de la suppression du logo:", error);
        res.status(500).json({ error: 'Erreur serveur lors de la suppression du logo.' });
    }
});

// --- ROUTES POUR LES STATISTIQUES (logique inchangée) ---

app.get('/api/stats/summary', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const client = await db.getClient();
        try {
            const mainStatsQuery = `
                SELECT
                    (SELECT COALESCE(SUM(distance_km), 0) FROM trips WHERE user_id = $1 AND trip_date >= NOW() - INTERVAL '30 days') as "distanceLast30Days",
                    (SELECT COUNT(id)::int FROM trips WHERE user_id = $1 AND trip_date >= NOW() - INTERVAL '30 days') as "tripsLast30Days",
                    (SELECT COALESCE(SUM(distance_km), 0) FROM trips WHERE user_id = $1 AND EXTRACT(YEAR FROM trip_date) = EXTRACT(YEAR FROM NOW())) as "distanceCurrentYear",
                    (SELECT COUNT(id)::int FROM trips WHERE user_id = $1 AND EXTRACT(YEAR FROM trip_date) = EXTRACT(YEAR FROM NOW())) as "tripsCurrentYear"
            `;
            const mainStatsRes = await client.query(mainStatsQuery, [userId]);

            const vehicleStatsQuery = `
                SELECT 
                    v.name as vehicle_name,
                    COALESCE(SUM(t.distance_km), 0) as total_distance
                FROM vehicles v
                LEFT JOIN trips t ON v.id = t.vehicle_id AND EXTRACT(YEAR FROM t.trip_date) = EXTRACT(YEAR FROM NOW())
                WHERE v.user_id = $1
                GROUP BY v.id
                ORDER BY total_distance DESC
            `;
            const vehicleStatsRes = await client.query(vehicleStatsQuery, [userId]);

            res.json({
                ...mainStatsRes.rows[0],
                vehiclesSummary: vehicleStatsRes.rows
            });

        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Erreur lors du calcul des statistiques:", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

// --- NOUVELLE ROUTE : RÉSUMÉ MENSUEL POUR LE GRAPHIQUE ---
app.get('/api/stats/monthly-summary/:year', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { year } = req.params;

    try {
        // CETTE REQUÊTE EST PLUS ROBUSTE
        const { rows } = await db.query(`
            SELECT 
                EXTRACT(MONTH FROM trip_date) AS month_number, -- Extrait juste le numéro du mois (1 pour Jan, 2 pour Fév...)
                SUM(distance_km) AS total_distance
            FROM trips
            WHERE 
                user_id = $1 AND 
                EXTRACT(YEAR FROM trip_date) = $2
            GROUP BY month_number
            ORDER BY month_number;
        `, [userId, year]);

        const monthsData = Array(12).fill(0);

        rows.forEach(row => {
            // On utilise le numéro du mois (1-12) et on soustrait 1 pour l'index du tableau (0-11)
            const monthIndex = parseInt(row.month_number, 10) - 1;
            if (monthIndex >= 0 && monthIndex < 12) {
                monthsData[monthIndex] = parseFloat(row.total_distance);
            }
        });

        res.json({
            labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'],
            data: monthsData
        });

    } catch (error) {
        console.error("Erreur lors de la création du résumé mensuel:", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

// --- NOUVELLE ROUTE : CALCUL DES INDEMNITÉS KILOMÉTRIQUES ---

async function calculateIK(db, vehicleType, fiscalPower, distance, year) {
    if (distance <= 0) return { indemnites: 0, ratesYear: null };

    // On adapte le type de véhicule pour la BDD
    let dbVehicleType = vehicleType;
    if (vehicleType === 'electric_car') dbVehicleType = 'car';
    if (vehicleType === 'electric_moped') dbVehicleType = 'moped';
    if (vehicleType === 'electric_motorcycle') dbVehicleType = 'motorcycle';

    const { rows } = await db.query(
      `SELECT rate, base_amount, year FROM public.tax_rates
       WHERE year = (SELECT MAX(year) FROM public.tax_rates WHERE year <= $1)
         AND vehicle_type = $2
         AND min_cv <= $3 AND max_cv >= $3
         AND $4 BETWEEN min_km AND max_km
      `, [year, dbVehicleType, fiscalPower, distance]
    );
    
    if (rows.length === 0) {
        console.warn(`Aucun barème trouvé pour l'année <= ${year}, Type: ${dbVehicleType}, CV: ${fiscalPower}, distance: ${distance}`);
        return { indemnites: 0, ratesYear: null };
    }
    
    const rule = rows[0];
    let indemnites = (distance * parseFloat(rule.rate)) + parseFloat(rule.base_amount);
    
    // Majoration de 20% pour TOUS les véhicules électriques
    if (vehicleType.startsWith('electric_')) {
        indemnites *= 1.20;
    }

    return { indemnites: parseFloat(indemnites.toFixed(2)), ratesYear: parseInt(rule.year) };
}

app.get('/api/stats/indemnites/:year', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { year } = req.params;
    let finalRatesYear = null;
  
    try {
      // La requête SQL est bonne, on récupère bien le vehicle_type
      const { rows: vehicleDistances } = await db.query(`
        SELECT 
          v.name as vehicle_name,
          v.fiscal_power, 
          v.vehicle_type,
          SUM(t.distance_km) as total_distance
        FROM trips t
        JOIN vehicles v ON t.vehicle_id = v.id
        WHERE t.user_id = $1 AND EXTRACT(YEAR FROM t.trip_date) = $2
        GROUP BY v.id
      `, [userId, year]);
  
      let totalIndemnites = 0;
    
      const breakdownPromises = vehicleDistances.map(async (vehicle) => {
        const distance = parseFloat(vehicle.total_distance);
        
        // --- LA CORRECTION EST ICI ---
        // On passe bien vehicle.vehicle_type en PREMIER argument
        const result = await calculateIK(db, vehicle.vehicle_type, vehicle.fiscal_power, distance, year);
        // --- FIN DE LA CORRECTION ---
        
        totalIndemnites += result.indemnites;
        if (result.ratesYear) {
          finalRatesYear = result.ratesYear;
        }

        return {
          vehicleName: vehicle.vehicle_name,
          fiscalPower: vehicle.fiscal_power,
          totalDistance: distance,
          indemnites: result.indemnites,
        };
      });

      const breakdown = await Promise.all(breakdownPromises);

      res.json({
        year: year,
        ratesYear: finalRatesYear,
        totalIndemnites: totalIndemnites,
        breakdown: breakdown
      });

    } catch (error) {
        console.error("Erreur lors du calcul des indemnités:", error);
        res.status(500).json({ error: "Erreur serveur lors du calcul des indemnités." });
    }
});

// --- CRUD pour les Lieux (Locations) ---

app.post('/api/locations', authenticateToken, async (req, res) => {
    const { name, address } = req.body;
    if (!name || !address) return res.status(400).json({ error: "Le nom et l'adresse sont requis." });
    try {
        const geoRes = await axios.get(`https://api.geoapify.com/v1/geocode/search?text=${encodeURI(address)}&apiKey=${process.env.GEOAPIFY_API_KEY}`);
        if (!geoRes.data || geoRes.data.features.length === 0) return res.status(400).json({ error: "L'adresse fournie n'a pas pu être trouvée. Veuillez être plus précis." });
        const [longitude, latitude] = geoRes.data.features[0].geometry.coordinates;
        const { rows } = await db.query(
            'INSERT INTO locations (user_id, name, address, latitude, longitude) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [req.user.id, name, address, latitude, longitude]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error("Erreur lors de l'ajout d'un lieu:", error);
        res.status(500).json({ error: "Une erreur est survenue sur le serveur." });
    }
});

app.get('/api/locations', authenticateToken, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM locations WHERE user_id = $1 ORDER BY name ASC', [req.user.id]);
        res.json(rows);
    } catch (error) {
        console.error("Erreur lors de la récupération des lieux:", error);
        res.status(500).json({ error: "Une erreur est survenue sur le serveur." });
    }
});

app.put('/api/locations/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, address } = req.body;
    if (!name || !address) return res.status(400).json({ error: "Le nom et l'adresse sont requis." });
    try {
        const { rows: oldLocationRows } = await db.query('SELECT address FROM locations WHERE id = $1 AND user_id = $2', [id, req.user.id]);
        if (oldLocationRows.length === 0) return res.status(404).json({ error: "Lieu non trouvé ou non autorisé." });
        
        if (oldLocationRows[0].address !== address) {
            const geoRes = await axios.get(`https://api.geoapify.com/v1/geocode/search?text=${encodeURI(address)}&apiKey=${process.env.GEOAPIFY_API_KEY}`);
            if (!geoRes.data || geoRes.data.features.length === 0) return res.status(400).json({ error: "La nouvelle adresse n'a pas pu être trouvée." });
            const [longitude, latitude] = geoRes.data.features[0].geometry.coordinates;
            const { rows } = await db.query(
                'UPDATE locations SET name = $1, address = $2, latitude = $3, longitude = $4 WHERE id = $5 AND user_id = $6 RETURNING *',
                [name, address, latitude, longitude, id, req.user.id]
            );
            return res.json(rows[0]);
        } else {
            const { rows } = await db.query(
                'UPDATE locations SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
                [name, id, req.user.id]
            );
            return res.json(rows[0]);
        }
    } catch (error) {
        console.error("Erreur lors de la modification du lieu:", error);
        res.status(500).json({ error: "Une erreur est survenue sur le serveur." });
    }
});

app.delete('/api/locations/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const { rows: usageCheck } = await db.query(
            'SELECT id FROM trips WHERE (start_location_id = $1 OR end_location_id = $1) AND user_id = $2 LIMIT 1', 
            [id, req.user.id]
        );
        if (usageCheck.length > 0) {
            return res.status(400).json({ error: "Ce lieu est utilisé dans au moins un trajet et ne peut pas être supprimé." });
        }
        
        const result = await db.query('DELETE FROM locations WHERE id = $1 AND user_id = $2', [id, req.user.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: "Lieu non trouvé ou non autorisé." });
        
        res.status(204).send();
    } catch (error) {
        console.error("Erreur lors de la suppression du lieu:", error);
        res.status(500).json({ error: "Une erreur est survenue sur le serveur." });
    }
});

// --- CRUD pour les Véhicules (Vehicles) ---

app.post('/api/vehicles', authenticateToken, async (req, res) => {
    const { name, fiscal_power, vehicle_type } = req.body;
    if (!name || !fiscal_power) return res.status(400).json({ error: "Le nom et la puissance fiscale sont requis." });

    try {
        const { rows: existingVehicles } = await db.query('SELECT id FROM vehicles WHERE user_id = $1', [req.user.id]);
        const isDefault = existingVehicles.length === 0;

        const { rows } = await db.query(
            'INSERT INTO vehicles (user_id, name, fiscal_power, vehicle_type, is_default) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [req.user.id, name, parseInt(fiscal_power), vehicle_type, isDefault]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error("Erreur ajout véhicule:", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

app.get('/api/vehicles', authenticateToken, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM vehicles WHERE user_id = $1 ORDER BY is_default DESC, name ASC', [req.user.id]);
        res.json(rows);
    } catch (error) {
        console.error("Erreur récupération véhicules:", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

app.put('/api/vehicles/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, fiscal_power, vehicle_type } = req.body;
    if (!name || !fiscal_power) return res.status(400).json({ error: "Le nom et la puissance fiscale sont requis." });

    try {
        const { rows } = await db.query(
            'UPDATE vehicles SET name = $1, fiscal_power = $2, vehicle_type = $3 WHERE id = $4 AND user_id = $5 RETURNING *',
            [name, parseInt(fiscal_power), vehicle_type, id, req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: "Véhicule non trouvé ou non autorisé." });
        res.json(rows[0]);
    } catch (error) {
        console.error("Erreur modification véhicule:", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

app.delete('/api/vehicles/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const { rows: usageCheck } = await db.query(
            'SELECT id FROM trips WHERE vehicle_id = $1 AND user_id = $2 LIMIT 1',
            [id, req.user.id]
        );
        if (usageCheck.length > 0) {
            return res.status(400).json({ error: "Ce véhicule est utilisé dans au moins un trajet et ne peut pas être supprimé." });
        }
        const result = await db.query('DELETE FROM vehicles WHERE id = $1 AND user_id = $2', [id, req.user.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: "Véhicule non trouvé ou non autorisé." });
        res.status(204).send();
    } catch (error) {
        console.error("Erreur suppression véhicule:", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

app.post('/api/vehicles/:id/set-default', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        await client.query('UPDATE vehicles SET is_default = false WHERE user_id = $1', [req.user.id]);
        const { rows } = await client.query(
            'UPDATE vehicles SET is_default = true WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, req.user.id]
        );
        await client.query('COMMIT');
        
        if (rows.length === 0) return res.status(404).json({ error: "Véhicule non trouvé." });
        res.json(rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Erreur définition véhicule par défaut:", error);
        res.status(500).json({ error: "Erreur serveur." });
    } finally {
        client.release();
    }
});

// --- CRUD pour les Motifs (Reasons) ---

app.post('/api/reasons', authenticateToken, async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Le nom du motif est requis." });
    try {
        const { rows } = await db.query(
            'INSERT INTO reasons (user_id, name) VALUES ($1, $2) RETURNING *',
            [req.user.id, name]
        );
        res.status(201).json(rows[0]);
    } catch (error) { res.status(500).json({ error: "Erreur serveur." }); }
});

app.get('/api/reasons', authenticateToken, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM reasons WHERE user_id = $1 ORDER BY name ASC', [req.user.id]);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: "Erreur serveur." }); }
});

app.put('/api/reasons/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Le nom du motif est requis." });
    try {
        const { rows } = await db.query(
            'UPDATE reasons SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
            [name, id, req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: "Motif non trouvé." });
        res.json(rows[0]);
    } catch (error) { res.status(500).json({ error: "Erreur serveur." }); }
});

app.delete('/api/reasons/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const { rows: usageCheck } = await db.query(
            'SELECT id FROM trips WHERE reason_id = $1 AND user_id = $2 LIMIT 1',
            [id, req.user.id]
        );
        if (usageCheck.length > 0) {
            return res.status(400).json({ error: "Ce motif est utilisé dans au moins un trajet et ne peut pas être supprimé." });
        }
        const result = await db.query('DELETE FROM reasons WHERE id = $1 AND user_id = $2', [id, req.user.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: "Motif non trouvé." });
        res.status(204).send();
    } catch (error) { res.status(500).json({ error: "Erreur serveur." }); }
});

// --- NOUVELLE ROUTE : COMPTEUR DE TRAJETS DU MOIS ---
app.get('/api/trips/count/current-month', authenticateToken, async (req, res) => {
    try {
        const { rows } = await db.query(
            "SELECT COUNT(id)::int FROM trips WHERE user_id = $1 AND date_trunc('month', trip_date) = date_trunc('month', current_date)",
            [req.user.id]
        );
        res.json({ count: rows[0].count });
    } catch (error) {
        console.error("Erreur comptage trajets:", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

// --- CRUD pour les Trajets (Trips) ---

app.get('/api/trips', authenticateToken, async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT 
                t.id, t.tour_id, t.trip_date, t.distance_km, t.notes,
                start_loc.name as start_location_name, end_loc.name as end_location_name,
                r.name as reason_name, v.name as vehicle_name, tour.name as tour_name
            FROM trips t
            LEFT JOIN locations start_loc ON t.start_location_id = start_loc.id
            LEFT JOIN locations end_loc ON t.end_location_id = end_loc.id
            LEFT JOIN reasons r ON t.reason_id = r.id
            LEFT JOIN vehicles v ON t.vehicle_id = v.id
            LEFT JOIN tours tour ON t.tour_id = tour.id
            WHERE t.user_id = $1
            ORDER BY t.trip_date DESC, t.id DESC
        `, [req.user.id]);
        res.json(rows);
    } catch (error) {
        console.error("Erreur récupération trajets:", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

app.post('/api/trips', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        // MODIFIÉ : On interroge la table 'profiles' pour le statut
        const { rows: profileRows } = await db.query('SELECT subscription_status FROM public.profiles WHERE id = $1', [userId]);
        const userStatus = profileRows[0].subscription_status;

        if (userStatus !== 'active') {
            const { rows: countRows } = await db.query(
                "SELECT COUNT(id) FROM trips WHERE user_id = $1 AND date_trunc('month', trip_date) = date_trunc('month', current_date)",
                [userId]
            );
            const tripCount = parseInt(countRows[0].count);
            if (tripCount >= 10) {
                return res.status(403).json({ error: "Limite de 10 trajets atteinte pour le compte gratuit. Passez à la version Pro pour un nombre de trajets illimité." });
            }
        }
        
        const { start_location_id, end_location_id, trip_date, reason_id, vehicle_id, notes } = req.body;
        if (!start_location_id || !end_location_id || !trip_date || !reason_id || !vehicle_id) return res.status(400).json({ error: 'Tous les champs sont requis.' });

        const { rows: startRows } = await db.query('SELECT latitude, longitude FROM locations WHERE id = $1 AND user_id = $2', [start_location_id, userId]);
        const { rows: endRows } = await db.query('SELECT latitude, longitude FROM locations WHERE id = $1 AND user_id = $2', [end_location_id, userId]);
        if (startRows.length === 0 || endRows.length === 0) return res.status(404).json({ error: 'Lieu de départ ou d\'arrivée non trouvé.' });
        
        const [lat1, lon1] = [startRows[0].latitude, startRows[0].longitude];
        const [lat2, lon2] = [endRows[0].latitude, endRows[0].longitude];
        const routeRes = await axios.get(`https://api.geoapify.com/v1/routing?waypoints=${lat1},${lon1}|${lat2},${lon2}&mode=drive&apiKey=${process.env.GEOAPIFY_API_KEY}`);
        const distanceKm = (routeRes.data.features[0].properties.distance / 1000).toFixed(2);
        
        const { rows: newTripRows } = await db.query(
            `INSERT INTO trips (user_id, start_location_id, end_location_id, trip_date, reason_id, vehicle_id, distance_km, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [userId, start_location_id, end_location_id, trip_date, reason_id, vehicle_id, distanceKm, notes]
        );
        res.status(201).json(newTripRows[0]);

    } catch (err) {
        console.error("Erreur lors de l'ajout du trajet:", err);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

app.put('/api/trips/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { start_location_id, end_location_id, trip_date, reason_id, vehicle_id, notes } = req.body;
    const userId = req.user.id;

    if (!start_location_id || !end_location_id || !trip_date || !reason_id || !vehicle_id) {
        return res.status(400).json({ error: 'Tous les champs sont requis.' });
    }

    try {
        const { rows: startRows } = await db.query('SELECT latitude, longitude FROM locations WHERE id = $1 AND user_id = $2', [start_location_id, userId]);
        const { rows: endRows } = await db.query('SELECT latitude, longitude FROM locations WHERE id = $1 AND user_id = $2', [end_location_id, userId]);

        if (startRows.length === 0 || endRows.length === 0) {
            return res.status(404).json({ error: 'Lieu de départ ou d\'arrivée non trouvé.' });
        }
        
        const [lat1, lon1] = [startRows[0].latitude, startRows[0].longitude];
        const [lat2, lon2] = [endRows[0].latitude, endRows[0].longitude];
        const routeRes = await axios.get(`https://api.geoapify.com/v1/routing?waypoints=${lat1},${lon1}|${lat2},${lon2}&mode=drive&apiKey=${process.env.GEOAPIFY_API_KEY}`);
        const distanceKm = (routeRes.data.features[0].properties.distance / 1000).toFixed(2);
        
        const { rows: updatedTripRows } = await db.query(
            `UPDATE trips SET 
                start_location_id = $1, end_location_id = $2, trip_date = $3, 
                reason_id = $4, vehicle_id = $5, distance_km = $6, notes = $7 
             WHERE id = $8 AND user_id = $9 RETURNING *`,
            [start_location_id, end_location_id, trip_date, reason_id, vehicle_id, distanceKm, notes, id, userId]
        );

        if (updatedTripRows.length === 0) {
            return res.status(404).json({ error: "Trajet non trouvé ou non autorisé." });
        }
        res.json(updatedTripRows[0]);
    } catch (err) {
        console.error("Erreur lors de la modification du trajet:", err);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

app.delete('/api/trips/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        const result = await db.query('DELETE FROM trips WHERE id = $1 AND user_id = $2', [id, userId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Trajet non trouvé ou non autorisé." });
        }
        res.status(204).send();
    } catch (error) {
        console.error("Erreur lors de la suppression du trajet:", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

// --- CRUD pour les Tournées (Tours) ---

app.get('/api/tours', authenticateToken, async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT 
                t.id, t.tour_date, t.name, t.notes,
                COUNT(tr.id)::int as trip_count,
                COALESCE(SUM(tr.distance_km), 0) as total_distance
            FROM tours t
            LEFT JOIN trips tr ON t.id = tr.tour_id
            WHERE t.user_id = $1
            GROUP BY t.id
            ORDER BY t.tour_date DESC, t.id DESC
        `, [req.user.id]);
        res.json(rows);
    } catch (error) {
        console.error("Erreur récupération tournées:", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

app.get('/api/tours/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        const tourRes = await db.query('SELECT * FROM tours WHERE id = $1 AND user_id = $2', [id, userId]);
        if (tourRes.rows.length === 0) {
            return res.status(404).json({ error: 'Tournée non trouvée.' });
        }
        
        const tripsRes = await db.query(
            'SELECT * FROM trips WHERE tour_id = $1 AND user_id = $2 ORDER BY id ASC', 
            [id, userId]
        );

        res.json({
            ...tourRes.rows[0],
            trips: tripsRes.rows
        });
    } catch (err) {
        console.error("Erreur récupération détails tournée:", err);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

app.post('/api/tours', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    
    // MODIFIÉ : On interroge la table 'profiles' pour le statut
    const { rows: profileRows } = await db.query('SELECT subscription_status FROM public.profiles WHERE id = $1', [userId]);
    if (profileRows[0].subscription_status !== 'active') {
        return res.status(403).json({ error: "La création de tournées est une fonctionnalité Pro. Veuillez vous abonner pour y accéder." });
    }
    
    const { tour_date, vehicle_id, notes, steps } = req.body;
    if (!tour_date || !vehicle_id || !steps || steps.length < 2) {
        return res.status(400).json({ error: "Les informations de la tournée sont incomplètes." });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        const tourRes = await client.query(
            'INSERT INTO tours (user_id, tour_date, name, notes) VALUES ($1, $2, $3, $4) RETURNING id',
            [userId, tour_date, `Tournée du ${new Date(tour_date).toLocaleDateString('fr-FR')}`, notes]
        );
        const tourId = tourRes.rows[0].id;
        for (let i = 0; i < steps.length - 1; i++) {
            const start_location_id = steps[i].location_id;
            const end_location_id = steps[i + 1].location_id;
            const reason_id = steps[i].reason_id;
            if (!start_location_id || !end_location_id || !reason_id || start_location_id === end_location_id) continue;
            
            const { rows: startRows } = await client.query('SELECT latitude, longitude FROM locations WHERE id = $1 AND user_id = $2', [start_location_id, userId]);
            const { rows: endRows } = await client.query('SELECT latitude, longitude FROM locations WHERE id = $1 AND user_id = $2', [end_location_id, userId]);
            if (startRows.length === 0 || endRows.length === 0) throw new Error("Un lieu est invalide.");
            
            const [lat1, lon1] = [startRows[0].latitude, startRows[0].longitude];
            const [lat2, lon2] = [endRows[0].latitude, endRows[0].longitude];
            const routeRes = await axios.get(`https://api.geoapify.com/v1/routing?waypoints=${lat1},${lon1}|${lat2},${lon2}&mode=drive&apiKey=${process.env.GEOAPIFY_API_KEY}`);
            const distanceKm = (routeRes.data.features[0].properties.distance / 1000).toFixed(2);
            
            await client.query(
                `INSERT INTO trips (user_id, trip_date, start_location_id, end_location_id, reason_id, vehicle_id, distance_km, tour_id) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [userId, tour_date, start_location_id, end_location_id, reason_id, vehicle_id, distanceKm, tourId]
            );
        }
        await client.query('COMMIT');
        res.status(201).json({ message: 'Tournée enregistrée avec succès !', tourId: tourId });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Erreur lors de l'ajout de la tournée:", err.message);
        res.status(500).json({ error: "Erreur serveur lors de la création de la tournée." });
    } finally {
        client.release();
    }
});

app.put('/api/tours/:id', authenticateToken, async (req, res) => {
    const { id: tourId } = req.params;
    const { tour_date, vehicle_id, notes, steps } = req.body;
    const userId = req.user.id;

    if (!tour_date || !vehicle_id || !steps || steps.length < 2) {
        return res.status(400).json({ error: "Les informations de la tournée sont incomplètes." });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        await client.query(
            'UPDATE tours SET tour_date = $1, name = $2, notes = $3 WHERE id = $4 AND user_id = $5',
            [tour_date, `Tournée du ${new Date(tour_date).toLocaleDateString('fr-FR')}`, notes, tourId, userId]
        );

        await client.query('DELETE FROM trips WHERE tour_id = $1 AND user_id = $2', [tourId, userId]);

        for (let i = 0; i < steps.length - 1; i++) {
            const start_location_id = steps[i].location_id;
            const end_location_id = steps[i + 1].location_id;
            const reason_id = steps[i].reason_id;
            if (!start_location_id || !end_location_id || !reason_id || start_location_id === end_location_id) continue;
            
            const { rows: startRows } = await client.query('SELECT latitude, longitude FROM locations WHERE id = $1 AND user_id = $2', [start_location_id, userId]);
            const { rows: endRows } = await client.query('SELECT latitude, longitude FROM locations WHERE id = $1 AND user_id = $2', [end_location_id, userId]);
            if (startRows.length === 0 || endRows.length === 0) throw new Error("Un lieu est invalide.");
            
            const [lat1, lon1] = [startRows[0].latitude, startRows[0].longitude];
            const [lat2, lon2] = [endRows[0].latitude, endRows[0].longitude];
            const routeRes = await axios.get(`https://api.geoapify.com/v1/routing?waypoints=${lat1},${lon1}|${lat2},${lon2}&mode=drive&apiKey=${process.env.GEOAPIFY_API_KEY}`);
            const distanceKm = (routeRes.data.features[0].properties.distance / 1000).toFixed(2);
            
            await client.query(
                `INSERT INTO trips (user_id, trip_date, start_location_id, end_location_id, reason_id, vehicle_id, distance_km, tour_id) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [userId, tour_date, start_location_id, end_location_id, reason_id, vehicle_id, distanceKm, tourId]
            );
        }

        await client.query('COMMIT');
        res.status(200).json({ message: 'Tournée modifiée avec succès !' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Erreur lors de la modification de la tournée:", err.message);
        res.status(500).json({ error: "Erreur serveur lors de la modification de la tournée." });
    } finally {
        client.release();
    }
});

app.delete('/api/tours/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        // La suppression des trajets se fait en cascade grâce à la clé étrangère ON DELETE CASCADE
        const result = await client.query('DELETE FROM tours WHERE id = $1 AND user_id = $2', [id, userId]);
        if (result.rowCount === 0) throw new Error("Tournée non trouvée ou non autorisée.");
        await client.query('COMMIT');
        res.status(204).send();
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Erreur lors de la suppression de la tournée:", err.message);
        res.status(500).json({ error: "Erreur serveur." });
    } finally {
        client.release();
    }
});

// --- ROUTE D'EXPORT PDF ---
app.get('/api/export/pdf/:year', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { year } = req.params;

    try {
        // --- 1. RÉCUPÉRATION DES DONNÉES ---
        const userRes = await db.query(`
            SELECT u.email, p.company_logo_url, p.subscription_status, p.first_name, p.last_name
            FROM auth.users u JOIN public.profiles p ON u.id = p.id 
            WHERE u.id = $1
        `, [userId]);
        
        const user = userRes.rows[0];
        if (user.subscription_status !== 'active') {
            return res.status(403).send("L'export PDF est une fonctionnalité Pro.");
        }

        const tripsRes = await db.query(`
            SELECT t.trip_date, t.distance_km, start_loc.name as start_location_name, end_loc.name as end_location_name, v.name as vehicle_name, v.fiscal_power
            FROM trips t
            LEFT JOIN locations start_loc ON t.start_location_id = start_loc.id
            LEFT JOIN locations end_loc ON t.end_location_id = end_loc.id
            LEFT JOIN vehicles v ON t.vehicle_id = v.id
            WHERE t.user_id = $1 AND EXTRACT(YEAR FROM t.trip_date) = $2
            ORDER BY t.trip_date ASC, t.id ASC
        `, [userId, year]);
        const trips = tripsRes.rows;

        const vehicleStatsRes = await db.query(`
            SELECT 
                v.name as vehicle_name, 
                v.fiscal_power, 
                v.vehicle_type, -- <-- AJOUTER CETTE LIGNE
                COALESCE(SUM(t.distance_km), 0) as total_distance
            FROM vehicles v
            LEFT JOIN trips t ON v.id = t.vehicle_id AND t.user_id = v.user_id AND EXTRACT(YEAR FROM t.trip_date) = $2
            WHERE v.user_id = $1 GROUP BY v.id ORDER BY v.name
        `, [userId, year]);
        const vehicleStats = vehicleStatsRes.rows;
        const totalDistanceYear = vehicleStats.reduce((sum, v) => sum + Number(v.total_distance), 0);
        
        const monthlySummaryRes = await db.query(`
            SELECT EXTRACT(MONTH FROM trip_date) AS month_number, SUM(distance_km) AS total_distance
            FROM trips
            WHERE user_id = $1 AND EXTRACT(YEAR FROM trip_date) = $2
            GROUP BY month_number ORDER BY month_number;
        `, [userId, year]);
        
        // --- 2. FORMATAGE DES DONNÉES ---
        let totalIndemnites = 0;
        let ratesYearUsed = null;
        const breakdownPromises = vehicleStats.map(async (vehicle) => {
            const distance = parseFloat(vehicle.total_distance);
            // On doit passer le vehicle.vehicle_type en premier argument, comme dans l'autre route
            const result = await calculateIK(db, vehicle.vehicle_type, vehicle.fiscal_power, distance, year);
            totalIndemnites += result.indemnites;
            if (result.ratesYear) ratesYearUsed = result.ratesYear;
        });
        await Promise.all(breakdownPromises);

        const frenchMonths = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        const monthlyData = monthlySummaryRes.rows.map(row => ({
            month: frenchMonths[parseInt(row.month_number, 10) - 1],
            distance: parseFloat(row.total_distance).toFixed(2)
        }));

        // --- 3. INITIALISATION ET CONFIGURATION DU PDF ---
        const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
        const filename = `IK-Zen_Releve_${year}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        doc.pipe(res);
        
        doc.registerFont('NotoSans-Regular', path.join(__dirname, 'assets', 'fonts', 'NotoSans-Regular.ttf'));
        doc.registerFont('NotoSans-Bold', path.join(__dirname, 'assets', 'fonts', 'NotoSans-Bold.ttf'));

        // REMPLACER CE BLOC DE VARIABLES
        const primaryColor = '#00334E';      // Le vrai bleu ikzen
        const successColor = '#27ae60';      // Un vert clair et lisible
        const dangerColor = '#e74a3b';       // Un rouge doux
        const secondaryColor = '#6c757d';    // Un gris pour le texte secondaire
        const tableHeaderColor = '#34495e';  // Un gris foncé pour les en-têtes de tableau
        const pageW = doc.page.width;
        const pageH = doc.page.height;
        const margin = 50;
        
        // --- 4. FONCTIONS UTILITAIRES POUR DESSINER LE PDF ---
        const drawHeader = (doc) => {
            const gradient = doc.linearGradient(0, 0, pageW, 150);
            // CORRECTION : On utilise les bonnes variables de couleur
            gradient.stop(0.3, primaryColor).stop(1, '#005a8d');
            doc.rect(0, 0, pageW, 150).fill(gradient);

            doc.fillOpacity(0.3).fillColor('black').roundedRect(margin + 3, 33, 94, 94, 12).fill();
            doc.fillOpacity(1).fillColor('white').roundedRect(margin, 30, 90, 90, 10).fill();
            
            const logoPath = user.company_logo_url ? path.join(__dirname, user.company_logo_url) : path.join(__dirname, 'assets', 'images', 'default-logo.png');
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, margin + 5, 35, { fit: [80, 80], align: 'center', valign: 'center' });
            }

            const textLeftMargin = margin + 120;
            doc.fillColor('white').font('NotoSans-Bold').fontSize(26).text('RELEVÉ KILOMÉTRIQUE', textLeftMargin, 45, { align: 'center' });
            doc.font('NotoSans-Regular').fontSize(18).text(year, textLeftMargin, 75, { align: 'center' });
            
            const fullName = (user.first_name && user.last_name) ? `${user.first_name} ${user.last_name}` : user.email;
            doc.font('NotoSans-Regular').fontSize(10).text(fullName, textLeftMargin, 100, { align: 'center' });
            if (user.first_name && user.last_name) {
                doc.font('NotoSans-Regular').fontSize(8).text(`(${user.email})`, textLeftMargin, 115, { align: 'center' });
            }
            doc.y = 150;
        };

        const drawFooterOnAllPages = (doc) => {
            const range = doc.bufferedPageRange();
            for (let i = range.start; i < range.start + range.count; i++) {
                doc.switchToPage(i);
                const bottom = doc.page.height - 40;
                doc.moveTo(margin, bottom - 10).lineTo(pageW - margin, bottom - 10).lineWidth(0.5).strokeColor('#ccc').stroke();
                doc.fontSize(8).fillColor('#6c757d').font('NotoSans-Regular').text('Généré par IK Zen', margin, bottom);
        
                // --- CORRECTION REMISE EN PLACE ---
                const pageText = "Page ";
                const pageNumText = `${i + 1}`;
                const separatorText = " sur ";
                const totalPagesText = `${range.count}`;
        
                const pageTextWidth = doc.font('NotoSans-Regular').widthOfString(pageText);
                const pageNumWidth = doc.font('NotoSans-Bold').widthOfString(pageNumText);
                const separatorWidth = doc.font('NotoSans-Regular').widthOfString(separatorText);
                const totalPagesWidth = doc.font('NotoSans-Bold').widthOfString(totalPagesText);
                
                const totalWidth = pageTextWidth + pageNumWidth + separatorWidth + totalPagesWidth;
                let startX = pageW - margin - totalWidth;
        
                doc.font('NotoSans-Regular').fontSize(8).fillColor('#333').text(pageText, startX, bottom);
                startX += pageTextWidth;
                
                doc.font('NotoSans-Bold').text(pageNumText, startX, bottom);
                startX += pageNumWidth;
        
                doc.font('NotoSans-Regular').text(separatorText, startX, bottom);
                startX += separatorWidth;
        
                doc.font('NotoSans-Bold').text(totalPagesText, startX, bottom);
                // --- FIN DE LA CORRECTION ---
            }
        };

        const drawCardContent = (doc, value, label, cardX, cardY) => {
            const cardWidth = 160;
            doc.font('NotoSans-Bold').fontSize(24).fillColor('white').text(value, cardX, cardY + 20, { width: cardWidth, align: 'center' });
            doc.font('NotoSans-Regular').fontSize(10).text(label, cardX, cardY + 45, { width: cardWidth, align: 'center' });
        };

        // --- 5. GÉNÉRATION DE LA PAGE 1 : LE RÉSUMÉ ---
        drawHeader(doc);
        let currentY = 170;

        const titleTextResume = 'RÉSUMÉ ANNUEL';
        doc.fillColor(primaryColor).font('NotoSans-Bold').fontSize(14).text(titleTextResume, margin, currentY);
        doc.moveTo(margin, currentY + 18).lineTo(margin + doc.widthOfString(titleTextResume), currentY + 18).lineWidth(1.5).stroke(primaryColor);
        currentY += 40;

        const cardY = currentY;
        const cardHeight = 70;
        doc.roundedRect(margin, cardY, 160, cardHeight, 8).fill(primaryColor);
        drawCardContent(doc, trips.length.toString(), 'TRAJETS', margin, cardY);
        doc.roundedRect(margin + 175, cardY, 160, cardHeight, 8).fill(successColor);
        drawCardContent(doc, `${totalDistanceYear.toFixed(2)} km`, 'DISTANCE TOTALE', margin + 175, cardY);
        doc.roundedRect(margin + 350, cardY, 160, cardHeight, 8).fill(dangerColor);
        drawCardContent(doc, `${totalIndemnites.toFixed(2)} €`, 'INDEMNITÉS (EST.)', margin + 350, cardY);
        currentY += cardHeight + 10;
        if (ratesYearUsed && parseInt(ratesYearUsed) < parseInt(year)) {
            doc.font('NotoSans-Regular').fontSize(8).fillColor(secondaryColor).text(`(Calculé avec le barème de ${ratesYearUsed})`, 0, currentY, { align: 'right', width: pageW - margin });
        }
        currentY += 30;

        const titleTextVehicles = 'RÉPARTITION PAR VÉHICULE';
        doc.fillColor(primaryColor).font('NotoSans-Bold').fontSize(14).text(titleTextVehicles, margin, currentY);
        doc.moveTo(margin, currentY + 18).lineTo(margin + doc.widthOfString(titleTextVehicles), currentY + 18).lineWidth(1.5).stroke(primaryColor);
        currentY += 35;
        vehicleStats.forEach(v => {
            doc.font('NotoSans-Bold').fontSize(10).fillColor('#333').text(`${v.vehicle_name} (${v.fiscal_power} CV)`, margin, currentY);
            const text = `${Number(v.total_distance).toFixed(2)} km (${(totalDistanceYear > 0 ? (Number(v.total_distance) / totalDistanceYear) * 100 : 0).toFixed(1)}%)`;
            doc.font('NotoSans-Regular').fontSize(9).fillColor(secondaryColor).text(text, 0, currentY + 1, { align: 'right', width: pageW - margin });
            currentY += 15;
        
            // La barre de fond grise
            doc.rect(margin, currentY, pageW - margin * 2, 4).fill('#e9ecef');
            
            // CORRECTION DE LA FORMULE POUR LA BARRE VERTE
            const barWidth = totalDistanceYear > 0 ? (Number(v.total_distance) / totalDistanceYear) : 0;
            doc.rect(margin, currentY, (pageW - margin * 2) * barWidth, 4).fill(successColor);
        
            currentY += 20;
        });
        currentY += 10;

        if (monthlyData.length > 0) {
            const titleTextMonthly = 'RÉSUMÉ MENSUEL';
            doc.fillColor(primaryColor).font('NotoSans-Bold').fontSize(14).text(titleTextMonthly, margin, currentY);
            doc.moveTo(margin, currentY + 18).lineTo(margin + doc.widthOfString(titleTextMonthly), currentY + 18).lineWidth(1.5).stroke(primaryColor);
            currentY += 35;
            doc.font('NotoSans-Bold').fontSize(10);
            doc.text('Mois', margin, currentY);
            doc.text('Distance', 0, currentY, { align: 'right', width: pageW - margin });
            currentY += 20;
            doc.font('NotoSans-Regular').fontSize(9);
            monthlyData.forEach(item => {
                doc.moveTo(margin, currentY - 5).lineTo(pageW - margin, currentY - 5).lineWidth(0.5).strokeColor('#dee2e6').stroke();
                doc.text(item.month, margin, currentY);
                doc.text(`${item.distance} km`, 0, currentY, { align: 'right', width: pageW - margin });
                currentY += 20;
            });
        }

        // --- 6. GÉNÉRATION DES PAGES SUIVANTES : DÉTAIL DES TRAJETS ---
        if (trips.length > 0) {
            doc.addPage();
            drawHeader(doc);
            let detailY = 170;
            const titleTextTrips = 'DÉTAIL DES TRAJETS';
            doc.font('NotoSans-Bold').fontSize(14).fillColor(primaryColor).text(titleTextTrips, margin, detailY);
            doc.moveTo(margin, detailY + 18).lineTo(margin + doc.widthOfString(titleTextTrips), detailY + 18).lineWidth(1.5).stroke(primaryColor);
            detailY += 40;
            const table = {
                headers: ['Date', 'Départ', 'Arrivée', 'Véhicule', 'CV', 'Distance'],
                columnWidths: [70, 110, 110, 110, 30, 70],
                rows: trips.map(t => [ new Date(t.trip_date).toLocaleDateString('fr-FR'), t.start_location_name, t.end_location_name, t.vehicle_name, t.fiscal_power, `${Number(t.distance_km).toFixed(2)} km`])
            };
            const drawTable = (doc, table, startY) => {
                let y = startY;
                const tableTop = y;
            
                // --- Dessin de l'en-tête (hauteur fixe) ---
                const headerHeight = 35;
                doc.font('NotoSans-Bold').fontSize(10);
                doc.rect(margin, y, pageW - margin * 2, headerHeight).fill(tableHeaderColor);
                doc.fillColor('white');
                let headerX = margin;
                table.headers.forEach((header, i) => {
                    const cellWidth = table.columnWidths[i];
                    doc.text(header, headerX, y + 12, { width: cellWidth, align: 'center' });
                    headerX += cellWidth;
                });
                y += headerHeight;
            
                // --- Dessin des lignes de données (hauteur variable) ---
                doc.font('NotoSans-Regular').fontSize(9).fillColor('#333');
                table.rows.forEach((row) => {
                    // 1. Calculer la hauteur maximale nécessaire pour cette ligne
                    let maxRowHeight = 0;
                    row.forEach((cell, i) => {
                        const cellWidth = table.columnWidths[i] - 20; // Padding
                        const textHeight = doc.heightOfString(String(cell), { width: cellWidth });
                        if (textHeight > maxRowHeight) {
                            maxRowHeight = textHeight;
                        }
                    });
                    const rowHeight = Math.max(35, maxRowHeight + 20); // Hauteur min + padding
            
                    // 2. Gestion du saut de page
                    if (y + rowHeight > pageH - margin) {
                        doc.addPage();
                        drawHeader(doc);
                        y = 170;
                        // Redessiner l'en-tête sur la nouvelle page
                        doc.font('NotoSans-Bold').fontSize(10);
                        doc.rect(margin, y, pageW - margin * 2, headerHeight).fill(tableHeaderColor);
                        doc.fillColor('white');
                        let reduxHeaderX = margin;
                        table.headers.forEach((header, i) => {
                            const cellWidth = table.columnWidths[i];
                            doc.text(header, reduxHeaderX, y + 12, { width: cellWidth, align: 'center' });
                            reduxHeaderX += cellWidth;
                        });
                        y += headerHeight;
                    }
            
                    // 3. Dessiner la ligne de séparation du HAUT
                    doc.moveTo(margin, y).lineTo(pageW - margin, y).lineWidth(0.5).strokeColor('#e0e0e0').stroke();
            
                    // 4. Dessiner le texte de chaque cellule, centré verticalement
                    let cellX = margin;
                    row.forEach((cell, i) => {
                        const cellWidth = table.columnWidths[i];
                        const cellPadding = 10;
            
                        const textHeight = doc.heightOfString(String(cell), { width: cellWidth - (cellPadding * 2) });
                        const textY = y + (rowHeight - textHeight) / 2;
                        
                        let align = 'left';
                        if (i === 4) align = 'center';
                        else if (i === 5) align = 'right';
            
                        doc.text(String(cell), cellX + cellPadding, textY, {
                            width: cellWidth - (cellPadding * 2),
                            align: align
                        });
                        cellX += cellWidth;
                    });
                    
                    y += rowHeight;
                });
            
                // 5. Ligne de séparation finale en bas du tableau
                doc.moveTo(margin, y).lineTo(pageW - margin, y).lineWidth(0.5).strokeColor('#e0e0e0').stroke();
            
                // 6. Dessin des lignes VERTICALES
                let lineX = margin;
                table.columnWidths.forEach((width, i) => {
                    if (i < table.columnWidths.length - 1) {
                        lineX += width;
                        doc.moveTo(lineX, tableTop).lineTo(lineX, y).lineWidth(0.5).strokeColor('#e0e0e0').stroke();
                    }
                });
            };
            drawTable(doc, table, detailY);
        }
        
        // --- 7. FINALISATION ---
        drawFooterOnAllPages(doc);
        doc.end();

    } catch (error) {
        console.error("Erreur PDF:", error);
        res.status(500).send("Erreur lors de la génération du PDF.");
    }
});

// --- NOUVELLE ROUTE D'EXPORT CSV ---
const { Parser } = require('json2csv');

app.get('/api/export/csv/:year', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { year } = req.params;

    try {
        // 1. Vérifier que l'utilisateur est bien un membre Pro
        const userRes = await db.query(
            'SELECT subscription_status FROM public.profiles WHERE id = $1',
            [userId]
        );
        if (userRes.rows[0].subscription_status !== 'active') {
            return res.status(403).send("L'export CSV est une fonctionnalité Pro.");
        }

        // 2. Récupérer tous les trajets pour l'année, comme pour le PDF
        const tripsRes = await db.query(`
            SELECT 
                t.trip_date AS "Date",
                start_loc.name AS "Lieu de départ",
                end_loc.name AS "Lieu d'arrivée",
                r.name AS "Motif",
                t.distance_km AS "Distance (km)",
                v.name AS "Véhicule",
                v.fiscal_power AS "Puissance Fiscale (CV)",
                t.notes AS "Notes"
            FROM trips t
            LEFT JOIN locations start_loc ON t.start_location_id = start_loc.id
            LEFT JOIN locations end_loc ON t.end_location_id = end_loc.id
            LEFT JOIN reasons r ON t.reason_id = r.id
            LEFT JOIN vehicles v ON t.vehicle_id = v.id
            WHERE t.user_id = $1 AND EXTRACT(YEAR FROM t.trip_date) = $2
            ORDER BY t.trip_date ASC, t.id ASC
        `, [userId, year]);

        if (tripsRes.rows.length === 0) {
            return res.status(404).send("Aucun trajet trouvé pour cette année.");
        }

        const formattedTrips = tripsRes.rows.map(trip => ({
            ...trip,
            Date: new Date(trip.Date).toLocaleDateString('fr-FR') // Formate en JJ/MM/AAAA
        }));

        // 3. Configurer les champs et les titres du fichier CSV
        const fields = ['Date', 'Lieu de départ', 'Lieu d\'arrivée', 'Motif', 'Distance (km)', 'Véhicule', 'Puissance Fiscale (CV)', 'Notes'];
        const json2csvParser = new Parser({ fields, withBOM: true });
        const csv = json2csvParser.parse(formattedTrips);

        // 4. Envoyer le fichier CSV en réponse
        const filename = `IK-Zen_Export_${year}.csv`;
        res.header('Content-Type', 'text/csv');
        res.attachment(filename);
        res.send(csv);

    } catch (error) {
        console.error("Erreur lors de la génération du CSV:", error);
        res.status(500).send("Erreur serveur lors de la génération du fichier.");
    }
});

// --- Routes de Paiement (Stripe) ---

app.post('/api/create-checkout-session', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { plan } = req.body; // 'monthly' ou 'yearly'

    let priceId = (plan === 'yearly') ? process.env.STRIPE_PRICE_ID_YEARLY : process.env.STRIPE_PRICE_ID_MONTHLY;
    if (!priceId) return res.status(500).json({ error: "Configuration des tarifs incorrecte." });
    
    try {
        // MODIFIÉ : Jointure pour récupérer les infos nécessaires
        const { rows } = await db.query(`
            SELECT p.stripe_customer_id, u.email
            FROM public.profiles p
            JOIN auth.users u ON p.id = u.id
            WHERE p.id = $1
        `, [userId]);
        const user = rows[0];

        const sessionParams = {
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            mode: 'subscription',
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?payment=success`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pricing`,
            client_reference_id: userId
        };

        if (user.stripe_customer_id) {
            sessionParams.customer = user.stripe_customer_id;
        } else {
            sessionParams.customer_email = user.email;
        }

        const session = await stripe.checkout.sessions.create(sessionParams);
        res.json({ url: session.url });

    } catch (error) {
        console.error("Erreur création session Stripe:", error);
        res.status(500).json({ error: "Erreur lors de la création de la session de paiement." });
    }
});

app.post('/api/create-customer-portal-session', authenticateToken, async (req, res) => {
    try {
        // MODIFIÉ : On interroge la table 'profiles'
        const { rows } = await db.query('SELECT stripe_customer_id FROM public.profiles WHERE id = $1', [req.user.id]);
        const stripeCustomerId = rows[0]?.stripe_customer_id;

        if (!stripeCustomerId) {
            return res.status(400).json({ error: "Aucun abonnement trouvé pour cet utilisateur." });
        }

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/settings`,
        });

        res.json({ url: portalSession.url });

    } catch (error) {
        console.error("Erreur création portail client:", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

// --- NOUVELLE ROUTE D'IMPORT CSV ---
app.post('/api/import/trips', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { trips } = req.body;

    if (!trips || !Array.isArray(trips) || trips.length === 0) {
        return res.status(400).json({ error: "Aucun trajet à importer." });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const [locationsRes, vehiclesRes, reasonsRes] = await Promise.all([
            client.query('SELECT id, name, latitude, longitude FROM locations WHERE user_id = $1', [userId]),
            client.query('SELECT id, name FROM vehicles WHERE user_id = $1', [userId]),
            client.query('SELECT id, name FROM reasons WHERE user_id = $1', [userId])
        ]);

        const locationsMap = new Map(locationsRes.rows.map(l => [l.name.toLowerCase(), l]));
        const vehiclesMap = new Map(vehiclesRes.rows.map(v => [v.name.toLowerCase(), v.id]));
        const reasonsMap = new Map(reasonsRes.rows.map(r => [r.name.toLowerCase(), r.id]));

        let successCount = 0;
        let errorCount = 0;

        for (const trip of trips) {
            // CORRECTION : On utilise les bonnes clés du modèle CSV
            if (!trip.Date || !trip.Depart || !trip.Arrivee || !trip.Vehicule || !trip.Motif) {
                errorCount++;
                continue;
            }

            const startLocData = locationsMap.get(trip.Depart.toLowerCase());
            const endLocData = locationsMap.get(trip.Arrivee.toLowerCase());
            const vehicleId = vehiclesMap.get(trip.Vehicule.toLowerCase());
            const reasonId = reasonsMap.get(trip.Motif.toLowerCase());

            // CORRECTION : On vérifie les bonnes données
            if (!startLocData || !endLocData || !vehicleId || !reasonId) {
                errorCount++;
                continue;
            }
            
            // Calcul de la distance
            const routeRes = await axios.get(`https://api.geoapify.com/v1/routing?waypoints=${startLocData.latitude},${startLocData.longitude}|${endLocData.latitude},${endLocData.longitude}&mode=drive&apiKey=${process.env.GEOAPIFY_API_KEY}`);
            const distanceKm = (routeRes.data.features[0].properties.distance / 1000).toFixed(2);
            
            await client.query(
                `INSERT INTO trips (user_id, trip_date, start_location_id, end_location_id, reason_id, vehicle_id, distance_km, notes) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [userId, trip.Date, startLocData.id, endLocData.id, reasonId, vehicleId, distanceKm, trip.Notes || '']
            );
            successCount++;
        }

        await client.query('COMMIT');

        res.json({ message: `${successCount} trajet(s) importé(s) avec succès. ${errorCount} ligne(s) ignorée(s).` });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Erreur lors de l'import CSV:", error);
        res.status(500).json({ error: "Une erreur est survenue sur le serveur lors de l'import." });
    } finally {
        client.release();
    }
});

// --- Démarrage du serveur ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur backend démarré sur http://localhost:${PORT}`);
});