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
router.get("/dashboard", ensureAuthenticated, async (req, res) => {
  try {
    let stats = { users: 0, transactions: 0, analyses: 0, fraudRate: "0%" };

    try {
      const usersRes = await fetch("http://localhost:3000/utilisateur", {
        headers: { "Authorization": `Bearer ${req.session.token}` }
      });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        stats.users = Array.isArray(usersData) ? usersData.length : usersData.data?.length || 0;
      }
    } catch {}

    try {
      const transRes = await fetch("http://localhost:3000/transaction", {
        headers: { "Authorization": `Bearer ${req.session.token}` }
      });
      if (transRes.ok) {
        const transData = await transRes.json();
        stats.transactions = Array.isArray(transData) ? transData.length : transData.data?.length || 0;
      }
    } catch {}

    try {
      const anaRes = await fetch("http://localhost:3000/analyse", {
        headers: { "Authorization": `Bearer ${req.session.token}` }
      });
      if (anaRes.ok) {
        const anaData = await anaRes.json();
        if (Array.isArray(anaData)) {
          stats.analyses = anaData.length;
          const frauds = anaData.filter(a => a.isFraude).length;
          if (anaData.length > 0) {
            stats.fraudRate = ((frauds / anaData.length) * 100).toFixed(1) + "%";
          }
        }
      }
    } catch {}

    res.render("dashboard", { stats });

  } catch (err) {
    res.render("dashboard", {
      stats: { users: "N/A", transactions: "N/A", analyses: "N/A", fraudRate: "N/A" }
    });
  }
});

/* =========================================================
   UTILISATEURS
========================================================= */

router.get("/utilisateurs", ensureAuthenticated, async (req, res) => {
  const page = parseInt(req.query.page) || 1;

  try {
    const response = await fetch(`http://localhost:3000/utilisateur?page=${page}&limit=10`, {
      headers: { "Authorization": `Bearer ${req.session.token}` }
    });

    const result = await response.json();

    res.render("utilisateurs/index", {
      utilisateurs: result.data || [],
      page: result.page || 1,
      totalPages: result.totalPages || 1,
      error: null
    });

  } catch {
    res.render("utilisateurs/index", {
      utilisateurs: [],
      page: 1,
      totalPages: 1,
      error: "Impossible de charger les utilisateurs."
    });
  }
});

/* =========================================================
   TRANSACTIONS
========================================================= */

router.get("/transactions", ensureAuthenticated, async (req, res) => {
  try {
    const page = req.query.page || 1;

    const response = await fetch(`http://localhost:3000/transaction?page=${page}`, {
      headers: { "Authorization": `Bearer ${req.session.token}` }
    });

    const result = await response.json();

    res.render("transactions/index", {
      transactions: result.data || [],
      page: result.page || 1,
      totalPages: result.totalPages || 1,
      error: null
    });

  } catch {
    res.render("transactions/index", {
      transactions: [],
      page: 1,
      totalPages: 1,
      error: "Impossible de charger les transactions."
    });
  }
});

/* =========================================================
   ✅ ANALYSES — VERSION CORRIGÉE QUI FONCTIONNE AVEC TOUS LES CAS
========================================================= */

router.get("/analyses", ensureAuthenticated, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const response = await fetch(
      `http://localhost:3000/analyse?page=${page}&limit=${limit}`,
      {
        headers: { "Authorization": `Bearer ${req.session.token}` }
      }
    );

    const result = await response.json();

    console.log("ANALYSES REÇUES:", result);

    let analyses = [];
    let totalPages = 1;

    if (Array.isArray(result)) {
      analyses = result;
      totalPages = 1;
    } else {
      analyses = result.data || [];
      totalPages = result.totalPages || 1;
    }

    res.render("analyses/index", {
      analyses,
      page,
      totalPages,
      error: null
    });

  } catch {
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

  } catch {
    res.render("analyses/detail", {
      analyse: null,
      error: "Impossible de charger l'analyse."
    });
  }
});

/* ---------------------------------------------------------
   DÉCONNEXION
--------------------------------------------------------- */
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/front/login");
  });
});

export default router;
