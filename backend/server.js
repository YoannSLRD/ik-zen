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

const prisma = require('./prismaClient'); // <-- AJOUT DE PRISMA
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Initialisation du client Supabase avec la clé de service pour les actions backend
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const app = express();

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Configuration de Multer pour l'upload de fichiers ---
// On configure Multer pour garder le fichier en mémoire (buffer)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB
  });

// --- Middlewares ---
const whitelist = [
    'http://localhost:5173', 
    'https://ik-zen.vercel.app',
    'http://localhost', // <-- AJOUT POUR ANDROID
    'capacitor://localhost', // <-- AJOUT POUR iOS
    /^https:\/\/ik-zen-.*-yoannslrds-projects\.vercel\.app$/ 
];
  
 const corsOptions = {
    origin: function (origin, callback) {
      // Autoriser les requêtes sans 'origin' (comme Postman ou les requêtes serveur-à-serveur comme le webhook Stripe)
      if (!origin || whitelist.some(url => typeof url === 'string' ? url === origin : url.test(origin))) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: "Content-Type, Authorization, Stripe-Signature", // IMPORTANT: On ajoute Stripe-Signature
    credentials: true
};
  
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Gère les requêtes pre-flight pour toutes les routes

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
            await prisma.profiles.update({
                where: { id: session.client_reference_id },
                data: { subscription_status: 'active', stripe_customer_id: session.customer }
            });
            console.log(`Abonnement activé pour l'utilisateur ID: ${session.client_reference_id}`);
            break;
        case 'customer.subscription.deleted':
            const subscription = event.data.object;
            // On cherche le profil via le customer_id Stripe
            const profileToDeactivate = await prisma.profiles.findFirst({
                where: { stripe_customer_id: subscription.customer }
            });
            if (profileToDeactivate) {
                await prisma.profiles.update({
                    where: { id: profileToDeactivate.id },
                    data: { subscription_status: 'inactive' }
                });
                console.log(`Abonnement désactivé pour le client Stripe ID: ${subscription.customer}`);
            }
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

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        console.error('Erreur d\'authentification Supabase:', error?.message);
        return res.status(403).json({ error: 'Accès non autorisé : token invalide ou expiré.' });
    }

    req.user = user;
    next();
};

const isAdmin = async (req, res, next) => {
    if (!req.user || !req.user.id) {
      return res.status(403).json({ error: 'Accès refusé. Utilisateur non identifié.' });
    }
  
    try {
      const userProfile = await prisma.profiles.findUnique({
        where: { id: req.user.id },
        select: { role: true }
      });
  
      if (userProfile && userProfile.role === 'admin') {
        next();
      } else {
        res.status(403).json({ error: 'Accès refusé. Droits administrateur requis.' });
      }
    } catch (error) {
      console.error("Erreur lors de la vérification du rôle admin:", error);
      res.status(500).json({ error: 'Erreur serveur.' });
    }
};

// --- Routes d'Authentification (entièrement refactorées pour Supabase) ---
app.get('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
    try {
      // On récupère l'ID, l'email, la date de création depuis la table 'users' de Supabase
      // et le statut de l'abonnement et le nom/prénom depuis notre table 'profiles'
      const { rows } = await db.query(`
        SELECT 
          u.id, 
          u.email, 
          u.created_at,
          u.last_sign_in_at,
          p.first_name,
          p.last_name,
          p.subscription_status
        FROM auth.users u
        LEFT JOIN public.profiles p ON u.id = p.id
        ORDER BY u.created_at DESC
      `);
      res.json(rows);
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs pour l'admin:", error);
      res.status(500).json({ error: 'Erreur serveur.' });
    }
});

// --- NOUVELLE ROUTE ADMIN STATS ---
app.get('/api/admin/stats', authenticateToken, isAdmin, async (req, res) => {
    try {
      const client = await db.getClient();
      try {
        // On exécute les deux requêtes en parallèle pour plus d'efficacité
        const [totalUsersRes, proUsersRes] = await Promise.all([
          client.query('SELECT COUNT(id) FROM auth.users'),
          client.query("SELECT COUNT(id) FROM public.profiles WHERE subscription_status = 'active'")
        ]);
  
        const totalUsers = parseInt(totalUsersRes.rows[0].count, 10);
        const proUsers = parseInt(proUsersRes.rows[0].count, 10);
  
        // On calcule le taux de conversion, en évitant la division par zéro
        const conversionRate = totalUsers > 0 ? (proUsers / totalUsers) * 100 : 0;
  
        res.json({
          totalUsers,
          proUsers,
          conversionRate: parseFloat(conversionRate.toFixed(1)) // On arrondit à une décimale
        });
  
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des statistiques admin:", error);
      res.status(500).json({ error: 'Erreur serveur.' });
    }
});

// --- NOUVELLE ROUTE POUR L'IMPERSONATION ---
app.post('/api/admin/impersonate/:userId', authenticateToken, isAdmin, async (req, res) => {
    const { userId } = req.params;
  
    try {
      // Étape 1 : Récupérer les informations de l'utilisateur de manière sécurisée
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
  
      if (userError || !userData?.user?.email) {
        console.error(`Utilisateur non trouvé ou email manquant pour l'ID: ${userId}`, userError);
        throw new Error('Utilisateur cible invalide.');
      }
  
      const targetEmail = userData.user.email;
  
      // Étape 2 : Générer le lien magique
      const { data, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: targetEmail,
        options: {
          redirectTo: `${process.env.FRONTEND_URL}/dashboard`
        }
      });
  
      if (linkError) throw linkError;
  
      // Étape 3 : Renvoyer le lien au frontend
      res.json({ magicLink: data.properties.action_link });
  
    } catch (error) {
      console.error(`Erreur lors de la génération du lien magique pour l'utilisateur ${userId}:`, error.message);
      res.status(500).json({ error: 'Impossible de générer le lien de connexion.' });
    }
});

// --- NOUVELLE ROUTE ADMIN POUR LE GRAPHIQUE DE CROISSANCE ---
app.get('/api/admin/stats/growth', authenticateToken, isAdmin, async (req, res) => {
    try {
      const { rows } = await db.query(`
        -- On génère une série de dates pour les 30 derniers jours
        WITH days AS (
          SELECT generate_series(
            (NOW() - INTERVAL '29 days')::date,
            NOW()::date,
            '1 day'::interval
          )::date AS day
        )
        -- On compte les utilisateurs pour chaque jour
        SELECT
          d.day,
          COUNT(u.id) AS new_users
        FROM days d
        LEFT JOIN auth.users u ON d.day = u.created_at::date
        GROUP BY d.day
        ORDER BY d.day ASC;
      `);
  
      // On formate les données pour Chart.js
      const labels = rows.map(row => new Date(row.day).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }));
      const data = rows.map(row => parseInt(row.new_users, 10));
  
      res.json({ labels, data });
  
    } catch (error) {
      console.error("Erreur lors de la récupération des données de croissance:", error);
      res.status(500).json({ error: 'Erreur serveur.' });
    }
});

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

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        return res.status(400).json({ error: "Email ou mot de passe incorrect." });
    }
    
    // Avec Prisma !
    const userProfile = await prisma.profiles.findUnique({
        where: { id: data.user.id },
        select: { subscription_status: true, stripe_customer_id: true, company_logo_url: true }
    });

    if (!userProfile) return res.status(500).json({ error: "Erreur critique : profil utilisateur introuvable." });

    const responsePayload = {
        token: data.session.access_token,
        refreshToken: data.session.refresh_token,
        user: { id: data.user.id, email: data.user.email, ...userProfile }
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
      // Prisma QueryRaw est parfait pour joindre Auth et Public (multi-schémas)
      const rows = await prisma.$queryRaw`
        SELECT 
          u.id, u.email, p.subscription_status, p.company_logo_url, 
          p.stripe_customer_id, p.first_name, p.last_name, p.role
        FROM auth.users u
        JOIN public.profiles p ON u.id = p.id
        WHERE u.id = ${req.user.id}::uuid
      `;
      
      if (rows.length === 0) return res.status(404).json({ error: "Utilisateur non trouvé" });
      res.json(rows[0]);
    } catch (error) {
      console.error("Erreur /api/me:", error);
      res.status(500).json({ error: "Erreur serveur." });
    }
});

app.put('/api/me', authenticateToken, async (req, res) => {
    const { firstName, lastName } = req.body;
    if (!firstName || !lastName) return res.status(400).json({ error: "Le nom et le prénom sont requis." });
  
    try {
      const updatedProfile = await prisma.profiles.update({
        where: { id: req.user.id },
        data: { first_name: firstName, last_name: lastName }
      });
      res.json({ message: "Profil mis à jour avec succès !", profile: updatedProfile });
    } catch (error) {
      console.error("Erreur de mise à jour du profil:", error);
      res.status(500).json({ error: "Erreur serveur." });
    }
});

app.post('/api/upload-logo', authenticateToken, upload.single('logo'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni.' });
  
    try {
      const file = req.file;
      const filePath = `${req.user.id}/${Date.now()}-${file.originalname}`;
  
      const { error: uploadError } = await supabase.storage.from('logos').upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });
      if (uploadError) throw uploadError;
  
      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(filePath);
      const logoUrl = urlData.publicUrl;
  
      await prisma.profiles.update({
        where: { id: req.user.id },
        data: { company_logo_url: logoUrl }
      });
  
      res.json({ message: 'Logo mis à jour !', logoUrl: logoUrl });
    } catch (error) {
      console.error("Erreur upload logo:", error);
      res.status(500).json({ error: "Erreur serveur lors de l'upload." });
    }
});

app.delete('/api/delete-logo', authenticateToken, async (req, res) => {
    try {
      const profile = await prisma.profiles.findUnique({ where: { id: req.user.id } });
      const logoUrl = profile?.company_logo_url;
  
      if (!logoUrl) return res.status(404).json({ error: 'Aucun logo à supprimer.' });
  
      const filePath = logoUrl.substring(logoUrl.lastIndexOf('logos/') + 'logos/'.length);
      const { error: removeError } = await supabase.storage.from('logos').remove([filePath]);
      if (removeError) console.error("Avertissement: fichier non supprimé du Storage.", removeError);
  
      await prisma.profiles.update({
        where: { id: req.user.id },
        data: { company_logo_url: null }
      });
  
      res.json({ message: 'Logo supprimé avec succès.' });
    } catch (error) {
      console.error("Erreur suppression logo:", error);
      res.status(500).json({ error: 'Erreur serveur.' });
    }
});

// ==============================================================
// --- ROUTES POUR LES STATISTIQUES ET INDEMNITÉS (PRISMA) ---
// ==============================================================

app.get('/api/stats/summary', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // On garde $queryRaw ici car c'est parfait pour les requêtes complexes de statistiques (SUM, COUNT, etc.)
        const mainStatsRes = await prisma.$queryRaw`
            SELECT
                (SELECT COALESCE(SUM(distance_km), 0) FROM trips WHERE user_id = ${userId}::uuid AND trip_date >= NOW() - INTERVAL '30 days') as "distanceLast30Days",
                (SELECT COUNT(id)::int FROM trips WHERE user_id = ${userId}::uuid AND trip_date >= NOW() - INTERVAL '30 days') as "tripsLast30Days",
                (SELECT COALESCE(SUM(distance_km), 0) FROM trips WHERE user_id = ${userId}::uuid AND EXTRACT(YEAR FROM trip_date) = EXTRACT(YEAR FROM NOW())) as "distanceCurrentYear",
                (SELECT COUNT(id)::int FROM trips WHERE user_id = ${userId}::uuid AND EXTRACT(YEAR FROM trip_date) = EXTRACT(YEAR FROM NOW())) as "tripsCurrentYear"
        `;

        const vehicleStatsRes = await prisma.$queryRaw`
            SELECT 
                v.name as vehicle_name,
                COALESCE(SUM(t.distance_km), 0) as total_distance
            FROM vehicles v
            LEFT JOIN trips t ON v.id = t.vehicle_id AND EXTRACT(YEAR FROM t.trip_date) = EXTRACT(YEAR FROM NOW())
            WHERE v.user_id = ${userId}::uuid
            GROUP BY v.id
            ORDER BY total_distance DESC
        `;

        res.json({
            ...mainStatsRes[0],
            vehiclesSummary: vehicleStatsRes
        });

    } catch (error) {
        console.error("Erreur Prisma (stats summary):", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

app.get('/api/stats/monthly-summary/:year', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { year } = req.params;

    try {
        const rows = await prisma.$queryRaw`
            SELECT 
                EXTRACT(MONTH FROM trip_date) AS month_number,
                SUM(distance_km) AS total_distance
            FROM trips
            WHERE 
                user_id = ${userId}::uuid AND 
                EXTRACT(YEAR FROM trip_date) = ${Number(year)}
            GROUP BY month_number
            ORDER BY month_number;
        `;

        const monthsData = Array(12).fill(0);

        rows.forEach(row => {
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
        console.error("Erreur Prisma (monthly summary):", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

// --- CALCUL DES INDEMNITÉS KILOMÉTRIQUES ---

async function calculateIK(vehicleType, fiscalPower, distance, year) {
    if (distance <= 0) return { indemnites: 0, ratesYear: null };

    let dbVehicleType = vehicleType;
    if (vehicleType === 'electric_car') dbVehicleType = 'car';
    if (vehicleType === 'electric_moped') dbVehicleType = 'moped';
    if (vehicleType === 'electric_motorcycle') dbVehicleType = 'motorcycle';

    // 🌟 Magnifique requête Prisma pour trouver le bon barème !
    const rule = await prisma.tax_rates.findFirst({
        where: {
            year: { lte: parseInt(year) },
            vehicle_type: dbVehicleType,
            min_cv: { lte: parseInt(fiscalPower) },
            max_cv: { gte: parseInt(fiscalPower) },
            min_km: { lte: parseFloat(distance) },
            max_km: { gte: parseFloat(distance) }
        },
        orderBy: { year: 'desc' } // On prend l'année la plus récente (qui est <= year)
    });
    
    if (!rule) {
        console.warn(`Aucun barème trouvé pour l'année <= ${year}, Type: ${dbVehicleType}, CV: ${fiscalPower}, distance: ${distance}`);
        return { indemnites: 0, ratesYear: null };
    }
    
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
      const vehicleDistances = await prisma.$queryRaw`
        SELECT 
          v.name as vehicle_name,
          v.fiscal_power, 
          v.vehicle_type,
          SUM(t.distance_km) as total_distance
        FROM trips t
        JOIN vehicles v ON t.vehicle_id = v.id
        WHERE t.user_id = ${userId}::uuid AND EXTRACT(YEAR FROM t.trip_date) = ${Number(year)}
        GROUP BY v.id
      `;
  
      let totalIndemnites = 0;
    
      const breakdownPromises = vehicleDistances.map(async (vehicle) => {
        const distance = parseFloat(vehicle.total_distance);
        
        // On utilise la nouvelle fonction qui n'a plus besoin qu'on lui passe "db"
        const result = await calculateIK(vehicle.vehicle_type, vehicle.fiscal_power, distance, year);
        
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
        console.error("Erreur Prisma (calcul des indemnités):", error);
        res.status(500).json({ error: "Erreur serveur lors du calcul des indemnités." });
    }
});

// --- CRUD pour les Lieux (Locations) ---
// --- NOUVELLE VERSION PRISMA ---
app.get('/api/locations', authenticateToken, async (req, res) => {
    try {
        // Regarde comme c'est lisible par rapport au SQL !
        const locationsList = await prisma.locations.findMany({
            where: { user_id: req.user.id },
            orderBy: { name: 'asc' }
        });
        
        res.json(locationsList);
    } catch (error) {
        console.error("Erreur Prisma (get locations):", error);
        res.status(500).json({ error: "Une erreur est survenue sur le serveur." });
    }
});

// --- CRÉER UN LIEU (POST) ---
app.post('/api/locations', authenticateToken, async (req, res) => {
    const { name, address } = req.body;
    if (!name || !address) return res.status(400).json({ error: "Le nom et l'adresse sont requis." });
    
    try {
        const geoRes = await axios.get(`https://api.geoapify.com/v1/geocode/search?text=${encodeURI(address)}&apiKey=${process.env.GEOAPIFY_API_KEY}`);
        if (!geoRes.data || geoRes.data.features.length === 0) return res.status(400).json({ error: "L'adresse fournie n'a pas pu être trouvée. Veuillez être plus précis." });
        
        const [longitude, latitude] = geoRes.data.features[0].geometry.coordinates;
        
        // Nouvelle syntaxe Prisma !
        const newLocation = await prisma.locations.create({
            data: {
                user_id: req.user.id,
                name: name,
                address: address,
                latitude: latitude,
                longitude: longitude
            }
        });
        
        res.status(201).json(newLocation);
    } catch (error) {
        console.error("Erreur Prisma (création lieu):", error);
        res.status(500).json({ error: "Une erreur est survenue sur le serveur." });
    }
});

// --- MODIFIER UN LIEU (PUT) ---
app.put('/api/locations/:id', authenticateToken, async (req, res) => {
    // 👈 CORRECTION ICI : On transforme le texte en nombre
    const locationId = Number(req.params.id); 
    const { name, address } = req.body;

    if (!name || !address) return res.status(400).json({ error: "Le nom et l'adresse sont requis." });
    
    try {
        const oldLocation = await prisma.locations.findFirst({
            where: { id: locationId, user_id: req.user.id }
        });
        
        if (!oldLocation) return res.status(404).json({ error: "Lieu non trouvé ou non autorisé." });
        
        let newLat = oldLocation.latitude;
        let newLon = oldLocation.longitude;

        if (oldLocation.address !== address) {
            const geoRes = await axios.get(`https://api.geoapify.com/v1/geocode/search?text=${encodeURI(address)}&apiKey=${process.env.GEOAPIFY_API_KEY}`);
            if (!geoRes.data || geoRes.data.features.length === 0) return res.status(400).json({ error: "La nouvelle adresse n'a pas pu être trouvée." });
            [newLon, newLat] = geoRes.data.features[0].geometry.coordinates;
        }

        const updatedLocation = await prisma.locations.update({
            where: { id: locationId },
            data: {
                name: name,
                address: address,
                latitude: newLat,
                longitude: newLon
            }
        });
        
        return res.json(updatedLocation);
    } catch (error) {
        console.error("Erreur Prisma (modification lieu):", error);
        res.status(500).json({ error: "Une erreur est survenue sur le serveur." });
    }
});

// --- SUPPRIMER UN LIEU (DELETE) ---
app.delete('/api/locations/:id', authenticateToken, async (req, res) => {
    // 👈 CORRECTION ICI : On transforme le texte en nombre
    const locationId = Number(req.params.id); 
    
    try {
        const usageCheck = await prisma.trips.findFirst({
            where: {
                user_id: req.user.id,
                OR: [
                    { start_location_id: locationId },
                    { end_location_id: locationId }
                ]
            }
        });

        if (usageCheck) {
            return res.status(400).json({ error: "Ce lieu est utilisé dans au moins un trajet et ne peut pas être supprimé." });
        }
        
        await prisma.locations.delete({
            where: { id: locationId }
        });
        
        res.status(204).send();
    } catch (error) {
        console.error("Erreur Prisma (suppression lieu):", error);
        res.status(500).json({ error: "Une erreur est survenue sur le serveur." });
    }
});

// ==========================================
// --- CRUD pour les Véhicules (Vehicles) ---
// ==========================================

app.post('/api/vehicles', authenticateToken, async (req, res) => {
    const { name, fiscal_power, vehicle_type } = req.body;
    if (!name || !fiscal_power) return res.status(400).json({ error: "Le nom et la puissance fiscale sont requis." });

    try {
        // Vérifie s'il y a déjà des véhicules
        const existingVehiclesCount = await prisma.vehicles.count({
            where: { user_id: req.user.id }
        });
        const isDefault = existingVehiclesCount === 0;

        const newVehicle = await prisma.vehicles.create({
            data: {
                user_id: req.user.id,
                name: name,
                fiscal_power: parseInt(fiscal_power),
                vehicle_type: vehicle_type,
                is_default: isDefault
            }
        });
        res.status(201).json(newVehicle);
    } catch (error) {
        console.error("Erreur Prisma (ajout véhicule):", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

app.get('/api/vehicles', authenticateToken, async (req, res) => {
    try {
        const vehicleList = await prisma.vehicles.findMany({
            where: { user_id: req.user.id },
            orderBy: [
                { is_default: 'desc' },
                { name: 'asc' }
            ]
        });
        res.json(vehicleList);
    } catch (error) {
        console.error("Erreur Prisma (récupération véhicules):", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

app.put('/api/vehicles/:id', authenticateToken, async (req, res) => {
    const vehicleId = Number(req.params.id);
    const { name, fiscal_power, vehicle_type } = req.body;
    if (!name || !fiscal_power) return res.status(400).json({ error: "Le nom et la puissance fiscale sont requis." });

    try {
        const updatedVehicle = await prisma.vehicles.update({
            where: { id: vehicleId, user_id: req.user.id },
            data: {
                name: name,
                fiscal_power: parseInt(fiscal_power),
                vehicle_type: vehicle_type
            }
        });
        res.json(updatedVehicle);
    } catch (error) {
        // Si Prisma ne trouve pas l'enregistrement à mettre à jour, il jette une erreur spécifique
        if (error.code === 'P2025') return res.status(404).json({ error: "Véhicule non trouvé ou non autorisé." });
        console.error("Erreur Prisma (modification véhicule):", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

app.delete('/api/vehicles/:id', authenticateToken, async (req, res) => {
    const vehicleId = Number(req.params.id);
    try {
        const usageCheck = await prisma.trips.findFirst({
            where: { vehicle_id: vehicleId, user_id: req.user.id }
        });
        if (usageCheck) return res.status(400).json({ error: "Ce véhicule est utilisé dans au moins un trajet et ne peut pas être supprimé." });

        await prisma.vehicles.delete({
            where: { id: vehicleId, user_id: req.user.id }
        });
        res.status(204).send();
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: "Véhicule non trouvé ou non autorisé." });
        console.error("Erreur Prisma (suppression véhicule):", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

app.post('/api/vehicles/:id/set-default', authenticateToken, async (req, res) => {
    const vehicleId = Number(req.params.id);
    try {
        // Avec Prisma, on peut utiliser des transactions super facilement
        const [resetAll, setDefault] = await prisma.$transaction([
            prisma.vehicles.updateMany({
                where: { user_id: req.user.id },
                data: { is_default: false }
            }),
            prisma.vehicles.update({
                where: { id: vehicleId, user_id: req.user.id },
                data: { is_default: true }
            })
        ]);
        
        res.json(setDefault);
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: "Véhicule non trouvé." });
        console.error("Erreur Prisma (véhicule par défaut):", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});


// ========================================
// --- CRUD pour les Motifs (Reasons) ---
// ========================================

app.post('/api/reasons', authenticateToken, async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Le nom du motif est requis." });
    try {
        const newReason = await prisma.reasons.create({
            data: { user_id: req.user.id, name: name }
        });
        res.status(201).json(newReason);
    } catch (error) { 
        console.error("Erreur Prisma (ajout motif):", error);
        res.status(500).json({ error: "Erreur serveur." }); 
    }
});

app.get('/api/reasons', authenticateToken, async (req, res) => {
    try {
        const reasonList = await prisma.reasons.findMany({
            where: { user_id: req.user.id },
            orderBy: { name: 'asc' }
        });
        res.json(reasonList);
    } catch (error) { 
        res.status(500).json({ error: "Erreur serveur." }); 
    }
});

app.put('/api/reasons/:id', authenticateToken, async (req, res) => {
    const reasonId = Number(req.params.id);
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Le nom du motif est requis." });
    try {
        const updatedReason = await prisma.reasons.update({
            where: { id: reasonId, user_id: req.user.id },
            data: { name: name }
        });
        res.json(updatedReason);
    } catch (error) { 
        if (error.code === 'P2025') return res.status(404).json({ error: "Motif non trouvé." });
        res.status(500).json({ error: "Erreur serveur." }); 
    }
});

app.delete('/api/reasons/:id', authenticateToken, async (req, res) => {
    const reasonId = Number(req.params.id);
    try {
        const usageCheck = await prisma.trips.findFirst({
            where: { reason_id: reasonId, user_id: req.user.id }
        });
        if (usageCheck) return res.status(400).json({ error: "Ce motif est utilisé dans au moins un trajet et ne peut pas être supprimé." });
        
        await prisma.reasons.delete({
            where: { id: reasonId, user_id: req.user.id }
        });
        res.status(204).send();
    } catch (error) { 
        if (error.code === 'P2025') return res.status(404).json({ error: "Motif non trouvé." });
        res.status(500).json({ error: "Erreur serveur." }); 
    }
});

// --- NOUVELLE ROUTE : COMPTEUR DE TRAJETS DU MOIS ---
app.get('/api/trips/count/current-month', authenticateToken, async (req, res) => {
    try {
        // On calcule le premier jour du mois actuel
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const count = await prisma.trips.count({
            where: {
                user_id: req.user.id,
                trip_date: { gte: startOfMonth } // "gte" = Greater Than or Equal (Plus grand ou égal)
            }
        });
        res.json({ count: count });
    } catch (error) {
        console.error("Erreur Prisma (comptage trajets):", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});


// ========================================
// --- CRUD pour les Trajets (Trips) ---
// ========================================

app.get('/api/trips', authenticateToken, async (req, res) => {
    try {
        // Pour les jointures complexes, on peut garder du SQL propre avec $queryRaw !
        const tripsList = await prisma.$queryRaw`
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
            WHERE t.user_id = ${req.user.id}::uuid
            ORDER BY t.trip_date DESC, t.id DESC
        `;
        res.json(tripsList);
    } catch (error) {
        console.error("Erreur Prisma (récupération trajets):", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

app.post('/api/trips', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        // 1. Vérification du statut Pro (Freemium)
        const userProfile = await prisma.profiles.findUnique({
            where: { id: userId }
        });

        if (userProfile.subscription_status !== 'active') {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            
            const tripCount = await prisma.trips.count({
                where: { user_id: userId, trip_date: { gte: startOfMonth } }
            });
            if (tripCount >= 10) {
                return res.status(403).json({ error: "Limite de 10 trajets atteinte pour le compte gratuit. Passez à la version Pro pour un nombre de trajets illimité." });
            }
        }
        
        const { start_location_id, end_location_id, trip_date, reason_id, vehicle_id, notes } = req.body;
        if (!start_location_id || !end_location_id || !trip_date || !reason_id || !vehicle_id) return res.status(400).json({ error: 'Tous les champs sont requis.' });

        // 2. Récupération des coordonnées GPS
        const startLoc = await prisma.locations.findFirst({ where: { id: Number(start_location_id), user_id: userId } });
        const endLoc = await prisma.locations.findFirst({ where: { id: Number(end_location_id), user_id: userId } });
        
        if (!startLoc || !endLoc) return res.status(404).json({ error: 'Lieu de départ ou d\'arrivée non trouvé.' });
        
        const routeRes = await axios.get(`https://api.geoapify.com/v1/routing?waypoints=${startLoc.latitude},${startLoc.longitude}|${endLoc.latitude},${endLoc.longitude}&mode=drive&apiKey=${process.env.GEOAPIFY_API_KEY}`);
        const distanceKm = parseFloat((routeRes.data.features[0].properties.distance / 1000).toFixed(2));
        
        // 3. Création du trajet
        const newTrip = await prisma.trips.create({
            data: {
                user_id: userId,
                start_location_id: Number(start_location_id),
                end_location_id: Number(end_location_id),
                trip_date: new Date(trip_date),
                reason_id: Number(reason_id),
                vehicle_id: Number(vehicle_id),
                distance_km: distanceKm,
                notes: notes || ''
            }
        });
        
        res.status(201).json(newTrip);
    } catch (err) {
        console.error("Erreur Prisma (ajout trajet):", err);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

app.put('/api/trips/:id', authenticateToken, async (req, res) => {
    const tripId = Number(req.params.id);
    const userId = req.user.id;
    const { start_location_id, end_location_id, trip_date, reason_id, vehicle_id, notes } = req.body;

    if (!start_location_id || !end_location_id || !trip_date || !reason_id || !vehicle_id) {
        return res.status(400).json({ error: 'Tous les champs sont requis.' });
    }

    try {
        const startLoc = await prisma.locations.findFirst({ where: { id: Number(start_location_id), user_id: userId } });
        const endLoc = await prisma.locations.findFirst({ where: { id: Number(end_location_id), user_id: userId } });

        if (!startLoc || !endLoc) return res.status(404).json({ error: 'Lieu de départ ou d\'arrivée non trouvé.' });
        
        const routeRes = await axios.get(`https://api.geoapify.com/v1/routing?waypoints=${startLoc.latitude},${startLoc.longitude}|${endLoc.latitude},${endLoc.longitude}&mode=drive&apiKey=${process.env.GEOAPIFY_API_KEY}`);
        const distanceKm = parseFloat((routeRes.data.features[0].properties.distance / 1000).toFixed(2));
        
        const updatedTrip = await prisma.trips.update({
            where: { id: tripId, user_id: userId },
            data: {
                start_location_id: Number(start_location_id),
                end_location_id: Number(end_location_id),
                trip_date: new Date(trip_date),
                reason_id: Number(reason_id),
                vehicle_id: Number(vehicle_id),
                distance_km: distanceKm,
                notes: notes || ''
            }
        });

        res.json(updatedTrip);
    } catch (err) {
        if (err.code === 'P2025') return res.status(404).json({ error: "Trajet non trouvé ou non autorisé." });
        console.error("Erreur Prisma (modification trajet):", err);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

app.delete('/api/trips/:id', authenticateToken, async (req, res) => {
    const tripId = Number(req.params.id);
    try {
        await prisma.trips.delete({
            where: { id: tripId, user_id: req.user.id }
        });
        res.status(204).send();
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: "Trajet non trouvé ou non autorisé." });
        console.error("Erreur Prisma (suppression trajet):", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

// ========================================
// --- CRUD pour les Tournées (Tours) ---
// ========================================

app.get('/api/tours', authenticateToken, async (req, res) => {
    try {
        const toursList = await prisma.$queryRaw`
            SELECT 
                t.id, t.tour_date, t.name, t.notes,
                COUNT(tr.id)::int as trip_count,
                COALESCE(SUM(tr.distance_km), 0) as total_distance
            FROM tours t
            LEFT JOIN trips tr ON t.id = tr.tour_id
            WHERE t.user_id = ${req.user.id}::uuid
            GROUP BY t.id
            ORDER BY t.tour_date DESC, t.id DESC
        `;
        res.json(toursList);
    } catch (error) {
        console.error("Erreur Prisma (récupération tournées):", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

app.get('/api/tours/:id', authenticateToken, async (req, res) => {
    const tourId = Number(req.params.id);
    const userId = req.user.id;
    try {
        // Avec Prisma, on peut récupérer la tournée ET ses trajets imbriqués en une seule ligne !
        const tourDetails = await prisma.tours.findFirst({
            where: { id: tourId, user_id: userId },
            include: {
                trips: {
                    orderBy: { id: 'asc' }
                }
            }
        });
        
        if (!tourDetails) return res.status(404).json({ error: 'Tournée non trouvée.' });
        res.json(tourDetails);
    } catch (err) {
        console.error("Erreur Prisma (détails tournée):", err);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

app.post('/api/tours', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    
    try {
        // 1. Vérification du statut Pro
        const userProfile = await prisma.profiles.findUnique({ where: { id: userId } });
        if (userProfile.subscription_status !== 'active') {
            return res.status(403).json({ error: "La création de tournées est une fonctionnalité Pro. Veuillez vous abonner pour y accéder." });
        }
        
        const { tour_date, vehicle_id, notes, steps } = req.body;
        if (!tour_date || !vehicle_id || !steps || steps.length < 2) {
            return res.status(400).json({ error: "Les informations de la tournée sont incomplètes." });
        }

        // 2. Préparation des trajets
        const tripsToCreate = [];
        for (let i = 0; i < steps.length - 1; i++) {
            const startLocId = Number(steps[i].location_id);
            const endLocId = Number(steps[i + 1].location_id);
            const reasonId = Number(steps[i].reason_id);
            
            if (!startLocId || !endLocId || !reasonId || startLocId === endLocId) continue;
            
            const startLoc = await prisma.locations.findFirst({ where: { id: startLocId, user_id: userId } });
            const endLoc = await prisma.locations.findFirst({ where: { id: endLocId, user_id: userId } });
            if (!startLoc || !endLoc) throw new Error("Un lieu est invalide.");
            
            const routeRes = await axios.get(`https://api.geoapify.com/v1/routing?waypoints=${startLoc.latitude},${startLoc.longitude}|${endLoc.latitude},${endLoc.longitude}&mode=drive&apiKey=${process.env.GEOAPIFY_API_KEY}`);
            const distanceKm = parseFloat((routeRes.data.features[0].properties.distance / 1000).toFixed(2));
            
            tripsToCreate.push({
                user_id: userId,
                trip_date: new Date(tour_date),
                start_location_id: startLocId,
                end_location_id: endLocId,
                reason_id: reasonId,
                vehicle_id: Number(vehicle_id),
                distance_km: distanceKm
            });
        }

        // 3. Exécution de la transaction Prisma
        const result = await prisma.$transaction(async (tx) => {
            // A. Créer la tournée
            const newTour = await tx.tours.create({
                data: {
                    user_id: userId,
                    tour_date: new Date(tour_date),
                    name: `Tournée du ${new Date(tour_date).toLocaleDateString('fr-FR')}`,
                    notes: notes || ''
                }
            });
            // B. Attacher l'ID de la tournée aux trajets et les créer
            const tripsData = tripsToCreate.map(t => ({ ...t, tour_id: newTour.id }));
            await tx.trips.createMany({ data: tripsData });
            
            return newTour;
        });

        res.status(201).json({ message: 'Tournée enregistrée avec succès !', tourId: result.id });
    } catch (err) {
        console.error("Erreur Prisma (création tournée):", err.message);
        res.status(500).json({ error: "Erreur serveur lors de la création de la tournée." });
    }
});

app.put('/api/tours/:id', authenticateToken, async (req, res) => {
    const tourId = Number(req.params.id);
    const userId = req.user.id;
    const { tour_date, vehicle_id, notes, steps } = req.body;

    if (!tour_date || !vehicle_id || !steps || steps.length < 2) {
        return res.status(400).json({ error: "Les informations de la tournée sont incomplètes." });
    }

    try {
        const tripsToCreate = [];
        for (let i = 0; i < steps.length - 1; i++) {
            const startLocId = Number(steps[i].location_id);
            const endLocId = Number(steps[i + 1].location_id);
            const reasonId = Number(steps[i].reason_id);
            
            if (!startLocId || !endLocId || !reasonId || startLocId === endLocId) continue;
            
            const startLoc = await prisma.locations.findFirst({ where: { id: startLocId, user_id: userId } });
            const endLoc = await prisma.locations.findFirst({ where: { id: endLocId, user_id: userId } });
            if (!startLoc || !endLoc) throw new Error("Un lieu est invalide.");
            
            const routeRes = await axios.get(`https://api.geoapify.com/v1/routing?waypoints=${startLoc.latitude},${startLoc.longitude}|${endLoc.latitude},${endLoc.longitude}&mode=drive&apiKey=${process.env.GEOAPIFY_API_KEY}`);
            const distanceKm = parseFloat((routeRes.data.features[0].properties.distance / 1000).toFixed(2));
            
            tripsToCreate.push({
                user_id: userId,
                tour_id: tourId,
                trip_date: new Date(tour_date),
                start_location_id: startLocId,
                end_location_id: endLocId,
                reason_id: reasonId,
                vehicle_id: Number(vehicle_id),
                distance_km: distanceKm
            });
        }

        await prisma.$transaction([
            prisma.tours.update({
                where: { id: tourId, user_id: userId },
                data: {
                    tour_date: new Date(tour_date),
                    name: `Tournée du ${new Date(tour_date).toLocaleDateString('fr-FR')}`,
                    notes: notes || ''
                }
            }),
            prisma.trips.deleteMany({ where: { tour_id: tourId, user_id: userId } }),
            prisma.trips.createMany({ data: tripsToCreate })
        ]);

        res.status(200).json({ message: 'Tournée modifiée avec succès !' });
    } catch (err) {
        console.error("Erreur Prisma (modification tournée):", err.message);
        res.status(500).json({ error: "Erreur serveur lors de la modification de la tournée." });
    }
});

app.delete('/api/tours/:id', authenticateToken, async (req, res) => {
    const tourId = Number(req.params.id);
    try {
        // La suppression des trajets se fait en cascade grâce à la clé étrangère ON DELETE CASCADE (si configurée dans ta BDD)
        // Mais par sécurité, on supprime explicitement les trajets d'abord dans une transaction
        await prisma.$transaction([
            prisma.trips.deleteMany({ where: { tour_id: tourId, user_id: req.user.id } }),
            prisma.tours.delete({ where: { id: tourId, user_id: req.user.id } })
        ]);
        res.status(204).send();
    } catch (err) {
        if (err.code === 'P2025') return res.status(404).json({ error: "Tournée non trouvée ou non autorisée." });
        console.error("Erreur Prisma (suppression tournée):", err.message);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

// --- ROUTE D'EXPORT PDF ---
app.get('/api/export/pdf/:year', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { year } = req.params;

    try {
        const userProfile = await prisma.$queryRaw`
            SELECT u.email, p.company_logo_url, p.subscription_status, p.first_name, p.last_name
            FROM auth.users u JOIN public.profiles p ON u.id = p.id 
            WHERE u.id = ${userId}::uuid
        `;
        
        const user = userProfile[0];
        if (user.subscription_status !== 'active') {
            return res.status(403).send("L'export PDF est une fonctionnalité Pro.");
        }

        const trips = await prisma.$queryRaw`
            SELECT t.trip_date, t.distance_km, start_loc.name as start_location_name, end_loc.name as end_location_name, v.name as vehicle_name, v.fiscal_power
            FROM trips t
            LEFT JOIN locations start_loc ON t.start_location_id = start_loc.id
            LEFT JOIN locations end_loc ON t.end_location_id = end_loc.id
            LEFT JOIN vehicles v ON t.vehicle_id = v.id
            WHERE t.user_id = ${userId}::uuid AND EXTRACT(YEAR FROM t.trip_date) = ${Number(year)}
            ORDER BY t.trip_date ASC, t.id ASC
        `;

        const vehicleStats = await prisma.$queryRaw`
            SELECT 
                v.name as vehicle_name, 
                v.fiscal_power, 
                v.vehicle_type,
                COALESCE(SUM(t.distance_km), 0) as total_distance
            FROM vehicles v
            LEFT JOIN trips t ON v.id = t.vehicle_id AND t.user_id = v.user_id AND EXTRACT(YEAR FROM t.trip_date) = ${Number(year)}
            WHERE v.user_id = ${userId}::uuid GROUP BY v.id ORDER BY v.name
        `;
        const totalDistanceYear = vehicleStats.reduce((sum, v) => sum + Number(v.total_distance), 0);
        
        const monthlySummaryRes = await prisma.$queryRaw`
            SELECT EXTRACT(MONTH FROM trip_date) AS month_number, SUM(distance_km) AS total_distance
            FROM trips
            WHERE user_id = ${userId}::uuid AND EXTRACT(YEAR FROM trip_date) = ${Number(year)}
            GROUP BY month_number ORDER BY month_number;
        `;
        
        let totalIndemnites = 0;
        let ratesYearUsed = null;
        const breakdownPromises = vehicleStats.map(async (vehicle) => {
            const distance = parseFloat(vehicle.total_distance);
            const result = await calculateIK(vehicle.vehicle_type, vehicle.fiscal_power, distance, year);
            totalIndemnites += result.indemnites;
            if (result.ratesYear) ratesYearUsed = result.ratesYear;
        });
        await Promise.all(breakdownPromises);

        const frenchMonths = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        const monthlyData = monthlySummaryRes.map(row => ({
            month: frenchMonths[parseInt(row.month_number, 10) - 1],
            distance: parseFloat(row.total_distance).toFixed(2)
        }));

        // --- GÉNÉRATION DU PDF ---
        const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
        const filename = `IK-Zen_Releve_${year}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        doc.pipe(res);
        
        doc.registerFont('NotoSans-Regular', path.join(__dirname, 'assets', 'fonts', 'NotoSans-Regular.ttf'));
        doc.registerFont('NotoSans-Bold', path.join(__dirname, 'assets', 'fonts', 'NotoSans-Bold.ttf'));

        const primaryColor = '#00334E';      
        const successColor = '#27ae60';      
        const dangerColor = '#e74a3b';       
        const secondaryColor = '#6c757d';    
        const tableHeaderColor = '#34495e';  
        const pageW = doc.page.width;
        const pageH = doc.page.height;
        const margin = 50;
        
        const drawHeader = async (doc) => {
            const gradient = doc.linearGradient(0, 0, pageW, 150);
            gradient.stop(0.3, primaryColor).stop(1, '#005a8d');
            doc.rect(0, 0, pageW, 150).fill(gradient);

            doc.fillOpacity(0.3).fillColor('black').roundedRect(margin + 3, 33, 94, 94, 12).fill();
            doc.fillOpacity(1).fillColor('white').roundedRect(margin, 30, 90, 90, 10).fill();
            
            if (user.company_logo_url) {
                try {
                    const imageResponse = await axios.get(user.company_logo_url, { responseType: 'arraybuffer' });
                    const imageBuffer = Buffer.from(imageResponse.data, 'binary');
                    doc.image(imageBuffer, margin + 5, 35, { fit: [80, 80], align: 'center', valign: 'center' });
                } catch (error) {
                    const defaultLogoPath = path.join(__dirname, 'assets', 'images', 'default-logo.png');
                    doc.image(defaultLogoPath, margin + 5, 35, { fit: [80, 80], align: 'center', valign: 'center' });
                }
            } else {
                const defaultLogoPath = path.join(__dirname, 'assets', 'images', 'default-logo.png');
                doc.image(defaultLogoPath, margin + 5, 35, { fit: [80, 80], align: 'center', valign: 'center' });
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
            }
        };

        const drawCardContent = (doc, value, label, cardX, cardY) => {
            const cardWidth = 160;
            doc.font('NotoSans-Bold').fontSize(24).fillColor('white').text(value, cardX, cardY + 20, { width: cardWidth, align: 'center' });
            doc.font('NotoSans-Regular').fontSize(10).text(label, cardX, cardY + 45, { width: cardWidth, align: 'center' });
        };

        await drawHeader(doc);
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
            doc.rect(margin, currentY, pageW - margin * 2, 4).fill('#e9ecef');
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
            doc.font('NotoSans-Bold').fontSize(10).fillColor('#333');
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

        if (trips.length > 0) {
            doc.addPage();
            
            // 1. On ne redessine PLUS le gros bandeau ici !
            // 2. On fait commencer le texte beaucoup plus haut (50 au lieu de 170)
            let detailY = 50; 
            
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
            
                doc.font('NotoSans-Regular').fontSize(9).fillColor('#333');
                table.rows.forEach((row) => {
                    let maxRowHeight = 0;
                    row.forEach((cell, i) => {
                        const cellWidth = table.columnWidths[i] - 20; 
                        const textHeight = doc.heightOfString(String(cell), { width: cellWidth });
                        if (textHeight > maxRowHeight) maxRowHeight = textHeight;
                    });
                    const rowHeight = Math.max(35, maxRowHeight + 20); 
            
                    // --- GESTION DU SAUT DE PAGE ---
                    if (y + rowHeight > pageH - margin - 40) { // -40 pour ne pas mordre sur le footer
                        doc.addPage();
                        
                        // Pas de gros bandeau ici non plus, on reprend tout en haut
                        y = 50; 
                        
                        // On redessine l'en-tête du tableau sur la nouvelle page
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
                        doc.font('NotoSans-Regular').fontSize(9).fillColor('#333');
                    }
            
                    // Ligne horizontale du haut de la cellule
                    doc.moveTo(margin, y).lineTo(pageW - margin, y).lineWidth(0.5).strokeColor('#e0e0e0').stroke();
            
                    let cellX = margin;
                    row.forEach((cell, i) => {
                        const cellWidth = table.columnWidths[i];
                        const cellPadding = 10;
                        const textHeight = doc.heightOfString(String(cell), { width: cellWidth - (cellPadding * 2) });
                        const textY = y + (rowHeight - textHeight) / 2;
                        
                        let align = 'left';
                        if (i === 4) align = 'center';
                        else if (i === 5) align = 'right';
            
                        doc.text(String(cell), cellX + cellPadding, textY, { width: cellWidth - (cellPadding * 2), align: align });
                        cellX += cellWidth;
                    });
                    y += rowHeight;
                });
            
                // Ligne horizontale finale à la fin du tableau
                doc.moveTo(margin, y).lineTo(pageW - margin, y).lineWidth(0.5).strokeColor('#e0e0e0').stroke();
            };
            
            drawTable(doc, table, detailY);
        }
        
        drawFooterOnAllPages(doc);
        doc.end();

    } catch (error) {
        console.error("Erreur PDF:", error);
        res.status(500).send("Erreur lors de la génération du PDF.");
    }
});

const { Parser } = require('json2csv');

app.get('/api/export/csv/:year', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { year } = req.params;

    try {
        const userProfile = await prisma.profiles.findUnique({ where: { id: userId } });
        if (userProfile.subscription_status !== 'active') {
            return res.status(403).send("L'export CSV est une fonctionnalité Pro.");
        }

        const tripsRes = await prisma.$queryRaw`
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
            WHERE t.user_id = ${userId}::uuid AND EXTRACT(YEAR FROM t.trip_date) = ${Number(year)}
            ORDER BY t.trip_date ASC, t.id ASC
        `;

        if (tripsRes.length === 0) {
            return res.status(404).send("Aucun trajet trouvé pour cette année.");
        }

        const formattedTrips = tripsRes.map(trip => ({
            ...trip,
            Date: new Date(trip.Date).toLocaleDateString('fr-FR')
        }));

        const fields = ['Date', 'Lieu de départ', 'Lieu d\'arrivée', 'Motif', 'Distance (km)', 'Véhicule', 'Puissance Fiscale (CV)', 'Notes'];
        const json2csvParser = new Parser({ fields, withBOM: true });
        const csv = json2csvParser.parse(formattedTrips);

        const filename = `IK-Zen_Export_${year}.csv`;
        res.header('Content-Type', 'text/csv');
        res.attachment(filename);
        res.send(csv);

    } catch (error) {
        console.error("Erreur génération CSV:", error);
        res.status(500).send("Erreur serveur lors de la génération du fichier.");
    }
});

app.post('/api/import/trips', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { trips } = req.body;

    if (!trips || !Array.isArray(trips) || trips.length === 0) {
        return res.status(400).json({ error: "Aucun trajet à importer." });
    }

    try {
        let successCount = 0;
        let errorCount = 0;

        await prisma.$transaction(async (tx) => {
            const locationsRes = await tx.locations.findMany({ where: { user_id: userId } });
            const vehiclesRes = await tx.vehicles.findMany({ where: { user_id: userId } });
            const reasonsRes = await tx.reasons.findMany({ where: { user_id: userId } });

            const locationsMap = new Map(locationsRes.map(l => [l.name.toLowerCase(), l]));
            const vehiclesMap = new Map(vehiclesRes.map(v => [v.name.toLowerCase(), v.id]));
            const reasonsMap = new Map(reasonsRes.map(r => [r.name.toLowerCase(), r.id]));

            const tripsToInsert = [];

            for (const trip of trips) {
                if (!trip.Date || !trip.Depart || !trip.Arrivee || !trip.Vehicule || !trip.Motif) {
                    errorCount++;
                    continue;
                }

                const startLocData = locationsMap.get(trip.Depart.toLowerCase());
                const endLocData = locationsMap.get(trip.Arrivee.toLowerCase());
                const vehicleId = vehiclesMap.get(trip.Vehicule.toLowerCase());
                const reasonId = reasonsMap.get(trip.Motif.toLowerCase());

                if (!startLocData || !endLocData || !vehicleId || !reasonId) {
                    errorCount++;
                    continue;
                }
                
                const routeRes = await axios.get(`https://api.geoapify.com/v1/routing?waypoints=${startLocData.latitude},${startLocData.longitude}|${endLocData.latitude},${endLocData.longitude}&mode=drive&apiKey=${process.env.GEOAPIFY_API_KEY}`);
                const distanceKm = parseFloat((routeRes.data.features[0].properties.distance / 1000).toFixed(2));
                
                tripsToInsert.push({
                    user_id: userId,
                    trip_date: new Date(trip.Date.split('/').reverse().join('-')), // Gère le format JJ/MM/AAAA
                    start_location_id: startLocData.id,
                    end_location_id: endLocData.id,
                    reason_id: reasonId,
                    vehicle_id: vehicleId,
                    distance_km: distanceKm,
                    notes: trip.Notes || ''
                });
                successCount++;
            }

            if (tripsToInsert.length > 0) {
                await tx.trips.createMany({ data: tripsToInsert });
            }
        });

        res.json({ message: `${successCount} trajet(s) importé(s) avec succès. ${errorCount} ligne(s) ignorée(s).` });

    } catch (error) {
        console.error("Erreur lors de l'import CSV:", error);
        res.status(500).json({ error: "Une erreur est survenue sur le serveur lors de l'import." });
    }
});

// --- Routes de Paiement (Stripe) ---
app.post('/api/create-checkout-session', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { plan } = req.body;

    let priceId = (plan === 'yearly') ? process.env.STRIPE_PRICE_ID_YEARLY : process.env.STRIPE_PRICE_ID_MONTHLY;
    if (!priceId) return res.status(500).json({ error: "Configuration des tarifs incorrecte." });
    
    try {
        const rows = await prisma.$queryRaw`
            SELECT p.stripe_customer_id, u.email
            FROM public.profiles p
            JOIN auth.users u ON p.id = u.id
            WHERE p.id = ${userId}::uuid
        `;
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
        const profile = await prisma.profiles.findUnique({
            where: { id: req.user.id },
            select: { stripe_customer_id: true }
        });
        const stripeCustomerId = profile?.stripe_customer_id;

        if (!stripeCustomerId) return res.status(400).json({ error: "Aucun abonnement trouvé pour cet utilisateur." });

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

// --- Démarrage du serveur ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur backend démarré sur http://localhost:${PORT}`);
});