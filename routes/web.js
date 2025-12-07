import express from "express";
import { ensureAuthenticated, redirectIfAuthenticated } from "../middleware/auth.js";

const router = express.Router();

/* ---------------------------------------------------------
   PAGE ACCUEIL
--------------------------------------------------------- */
router.get("/", (req, res) => {
  res.render("index");
});

/* ---------------------------------------------------------
   INSCRIPTION
--------------------------------------------------------- */
router.get("/signup", redirectIfAuthenticated, (req, res) => {
  res.render("signup", { error: null });
});

router.post("/signup", async (req, res) => {
  try {
    const response = await fetch("http://localhost:3000/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body)
    });

    const result = await response.json();

    if (!response.ok) {
      return res.render("signup", {
        error: result.error || "Erreur lors de l'inscription."
      });
    }

    return res.redirect("/front/login");

  } catch (err) {
    return res.render("signup", { error: "Erreur interne lors de l'inscription." });
  }
});

/* ---------------------------------------------------------
   CONNEXION
--------------------------------------------------------- */
router.get("/login", redirectIfAuthenticated, (req, res) => {
  res.render("login", { error: null });
});

router.post("/login", async (req, res) => {
  try {
    const response = await fetch("http://localhost:3000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body)
    });

    const result = await response.json();

    if (!response.ok) {
      return res.render("login", {
        error: result.error || "Email ou mot de passe incorrect."
      });
    }

    req.session.token = result.token;
    return res.redirect("/front/dashboard");

  } catch (err) {
    return res.render("login", { error: "Erreur interne lors de la connexion." });
  }
});

/* ---------------------------------------------------------
   DASHBOARD
--------------------------------------------------------- */
// router.get("/dashboard", ensureAuthenticated, (req, res) => {
//   res.render("dashboard");
// });

// AMELIORATION DE LA DASHBOARD
// ------------------------------------------------------
/* ---------------------------------------------------------
   DASHBOARD AVEC STATISTIQUES
--------------------------------------------------------- */
router.get("/dashboard", ensureAuthenticated, async (req, res) => {
  try {
    // Vérifiez d'abord si votre API a ces endpoints
    // Si non, utilisez des valeurs par défaut
    let stats = {
      users: 0,
      transactions: 0,
      analyses: 0,
      fraudRate: "0%"
    };

    try {
      // 1. Compter les utilisateurs (si endpoint existe)
      const usersRes = await fetch("http://localhost:3000/utilisateur", {
        method: "GET",
        headers: { "Authorization": `Bearer ${req.session.token}` }
      });
      
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        // Adaptez selon la structure de votre réponse
        if (Array.isArray(usersData)) {
          stats.users = usersData.length;
        } else if (usersData.data && Array.isArray(usersData.data)) {
          stats.users = usersData.data.length;
        } else if (usersData.total) {
          stats.users = usersData.total;
        }
      }
    } catch (err) {
      console.log("Erreur compte utilisateurs:", err.message);
    }

    try {
      // 2. Compter les transactions
      const transactionsRes = await fetch("http://localhost:3000/transaction", {
        method: "GET",
        headers: { "Authorization": `Bearer ${req.session.token}` }
      });
      
      if (transactionsRes.ok) {
        const transactionsData = await transactionsRes.json();
        if (Array.isArray(transactionsData)) {
          stats.transactions = transactionsData.length;
        } else if (transactionsData.data && Array.isArray(transactionsData.data)) {
          stats.transactions = transactionsData.data.length;
        }
      }
    } catch (err) {
      console.log("Erreur compte transactions:", err.message);
    }

    try {
      // 3. Compter les analyses
      const analysesRes = await fetch("http://localhost:3000/analyse", {
        method: "GET",
        headers: { "Authorization": `Bearer ${req.session.token}` }
      });
      
      if (analysesRes.ok) {
        const analysesData = await analysesRes.json();
        if (Array.isArray(analysesData)) {
          stats.analyses = analysesData.length;
          
          // Calculer taux de fraude si on a des analyses
          const fraudCount = analysesData.filter(a => a.isFraude === true || a.isFraude === 1).length;
          if (analysesData.length > 0) {
            stats.fraudRate = ((fraudCount / analysesData.length) * 100).toFixed(1) + "%";
          }
        }
      }
    } catch (err) {
      console.log("Erreur compte analyses:", err.message);
    }

    // Rendre avec les statistiques
    res.render("dashboard", {
      stats: stats,
      // Vos variables locales existantes seront toujours là
    });

  } catch (err) {
    console.error("Erreur dashboard:", err);
    // Fallback : dashboard sans stats
    res.render("dashboard", { 
      stats: {
        users: "N/A",
        transactions: "N/A", 
        analyses: "N/A",
        fraudRate: "N/A"
      }
    });
  }
});

/* =========================================================
   UTILISATEURS - CRUD COMPLET
========================================================= */

router.get("/utilisateurs", ensureAuthenticated, async (req, res) => {
  const page = parseInt(req.query.page) || 1;

  try {
    const response = await fetch(`http://localhost:3000/utilisateur?page=${page}&limit=10`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${req.session.token}` }
    });

    const result = await response.json();

    res.render("utilisateurs/index", {
      utilisateurs: result.data || [],
      page: result.page || 1,
      totalPages: result.totalPages || 1,
      error: null
    });

  } catch (err) {
    res.render("utilisateurs/index", {
      utilisateurs: [],
      page: 1,
      totalPages: 1,
      error: "Impossible de charger les utilisateurs."
    });
  }
});

router.get("/utilisateurs/create", ensureAuthenticated, (req, res) => {
  res.render("utilisateurs/create", { error: null });
});

router.post("/utilisateurs/create", ensureAuthenticated, async (req, res) => {
  try {
    const response = await fetch("http://localhost:3000/utilisateur", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${req.session.token}`
      },
      body: JSON.stringify(req.body)
    });

    const result = await response.json();

    if (!response.ok) {
      return res.render("utilisateurs/create", {
        error: result.error || "Impossible de créer l'utilisateur."
      });
    }

    return res.redirect("/front/utilisateurs");

  } catch (err) {
    res.render("utilisateurs/create", {
      error: "Erreur interne lors de la création."
    });
  }
});

router.get("/utilisateurs/:id/edit", ensureAuthenticated, async (req, res) => {
  const id = req.params.id;

  try {
    const response = await fetch(`http://localhost:3000/utilisateur/${id}`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${req.session.token}` }
    });

    const utilisateur = await response.json();

    if (!response.ok) {
      return res.render("utilisateurs/edit", {
        utilisateur: null,
        error: utilisateur.error || "Utilisateur introuvable."
      });
    }

    res.render("utilisateurs/edit", {
      utilisateur,
      error: null
    });

  } catch (err) {
    res.render("utilisateurs/edit", {
      utilisateur: null,
      error: "Erreur interne lors du chargement."
    });
  }
});

router.post("/utilisateurs/:id/edit", ensureAuthenticated, async (req, res) => {
  const id = req.params.id;

  try {
    const response = await fetch(`http://localhost:3000/utilisateur/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${req.session.token}`
      },
      body: JSON.stringify(req.body)
    });

    const result = await response.json();

    if (!response.ok) {
      return res.render("utilisateurs/edit", {
        utilisateur: { idUtilisateur: id, ...req.body },
        error: result.error || "Erreur lors de la mise à jour."
      });
    }

    return res.redirect("/front/utilisateurs");

  } catch (err) {
    res.render("utilisateurs/edit", {
      utilisateur: { idUtilisateur: id, ...req.body },
      error: "Erreur interne lors de la mise à jour."
    });
  }
});

/* =========================================================
   TRANSACTIONS - CRUD
========================================================= */

router.get("/transactions", ensureAuthenticated, async (req, res) => {
  try {
    const page = req.query.page || 1;

    const response = await fetch(
      `http://localhost:3000/transaction?page=${page}`,
      {
        method: "GET",
        headers: { "Authorization": `Bearer ${req.session.token}` }
      }
    );

    const result = await response.json();

    res.render("transactions/index", {
      transactions: result.data || [],
      page: result.page || 1,
      totalPages: result.totalPages || 1,
      error: null
    });

  } catch (err) {
    res.render("transactions/index", {
      transactions: [],
      page: 1,
      totalPages: 1,
      error: "Impossible de charger les transactions."
    });
  }
});

router.get("/transactions/create", ensureAuthenticated, (req, res) => {
  res.render("transactions/create", { error: null });
});

router.post("/transactions/create", ensureAuthenticated, async (req, res) => {
  try {
    const response = await fetch("http://localhost:3000/transaction", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${req.session.token}`
      },
      body: JSON.stringify(req.body)
    });

    const result = await response.json();

    if (!response.ok) {
      return res.render("transactions/create", {
        error: result.error || "Erreur lors de la création."
      });
    }

    return res.redirect("/front/transactions");

  } catch (err) {
    res.render("transactions/create", {
      error: "Erreur interne lors de la création."
    });
  }
});

router.get("/transactions/:id", ensureAuthenticated, async (req, res) => {
  try {
    const response = await fetch(
      `http://localhost:3000/transaction/${req.params.id}`,
      {
        method: "GET",
        headers: { "Authorization": `Bearer ${req.session.token}` }
      }
    );

    const transaction = await response.json();

    if (transaction.error) {
      return res.render("transactions/detail", {
        transaction: null,
        error: transaction.error
      });
    }

    res.render("transactions/detail", { transaction, error: null });

  } catch (err) {
    res.render("transactions/detail", {
      transaction: null,
      error: "Impossible de charger la transaction."
    });
  }
});

router.get("/transactions/:id/edit", ensureAuthenticated, async (req, res) => {
  const id = req.params.id;

  try {
    const response = await fetch(`http://localhost:3000/transaction/${id}`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${req.session.token}` }
    });

    const transaction = await response.json();

    if (transaction.error) {
      return res.render("transactions/edit", {
        transaction: null,
        error: transaction.error
      });
    }

    res.render("transactions/edit", { transaction, error: null });

  } catch (err) {
    res.render("transactions/edit", {
      transaction: null,
      error: "Erreur interne lors du chargement."
    });
  }
});

router.post("/transactions/:id/edit", ensureAuthenticated, async (req, res) => {
  const id = req.params.id;

  try {
    const response = await fetch(`http://localhost:3000/transaction/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${req.session.token}`
      },
      body: JSON.stringify(req.body)
    });

    const result = await response.json();

    if (!response.ok) {
      return res.render("transactions/edit", {
        transaction: { idTransaction: id, ...req.body },
        error: result.error || "Erreur lors de la mise à jour."
      });
    }

    return res.redirect("/front/transactions");

  } catch (err) {
    res.render("transactions/edit", {
      transaction: { idTransaction: id, ...req.body },
      error: "Erreur interne lors de la mise à jour."
    });
  }
});

/* =========================================================
   ANALYSES - LISTE + DETAIL
========================================================= */

router.get("/analyses", ensureAuthenticated, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;

    const response = await fetch(
      `http://localhost:3000/analyse`,
      {
        method: "GET",
        headers: { "Authorization": `Bearer ${req.session.token}` }
      }
    );

    const result = await response.json();
    console.log("ANALYSES REÇUES:", result);

    // Adaptation automatique si le backend renvoie juste un tableau
    const analyses = Array.isArray(result) ? result : (result.data || []);

    res.render("analyses/index", {
      analyses,
      page: 1,
      totalPages: 1,
      error: null
    });

  } catch (err) {
    res.render("analyses/index", {
      analyses: [],
      page: 1,
      totalPages: 1,
      error: "Impossible de charger les analyses."
    });
  }
});

router.get("/analyses/:id", ensureAuthenticated, async (req, res) => {
  try {
    const response = await fetch(
      `http://localhost:3000/analyse/${req.params.id}`,
      {
        method: "GET",
        headers: { "Authorization": `Bearer ${req.session.token}` }
      }
    );

    const analyse = await response.json();

    if (analyse.error) {
      return res.render("analyses/detail", {
        analyse: null,
        error: analyse.error
      });
    }

    res.render("analyses/detail", { analyse, error: null });

  } catch (err) {
    res.render("analyses/detail", {
      analyse: null,
      error: "Impossible de charger l'analyse."
    });
  }
});

/* ---------------------------------------------------------
   DECONNEXION
--------------------------------------------------------- */
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/front/login");
  });
});

export default router;
