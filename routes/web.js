import express from "express";
import { ensureAuthenticated, redirectIfAuthenticated } from "../middleware/auth.js";

const router = express.Router();

/* =========================
   PAGE ACCUEIL
========================= */
router.get("/", (req, res) => {
  res.render("index");
});

/* =========================
   AUTH
========================= */
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
    if (!response.ok) return res.render("signup", { error: result.error });

    res.redirect("/front/login");
  } catch {
    res.render("signup", { error: "Erreur interne." });
  }
});

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
    if (!response.ok) return res.render("login", { error: result.error });

    req.session.token = result.token;
    res.redirect("/front/dashboard");
  } catch {
    res.render("login", { error: "Erreur interne." });
  }
});

/* =========================
   DASHBOARD
========================= */
router.get("/dashboard", ensureAuthenticated, async (req, res) => {
  try {
    let stats = { users: 0, transactions: 0, analyses: 0, alertes: 0, fraudRate: "0%" };
    const headers = { Authorization: `Bearer ${req.session.token}` };

    const users = await fetch("http://localhost:3000/utilisateur", { headers }).then(r => r.json());
    const transactions = await fetch("http://localhost:3000/transaction", { headers }).then(r => r.json());
    const analyses = await fetch("http://localhost:3000/analyse", { headers }).then(r => r.json());
    const alertes = await fetch("http://localhost:3000/alerte", { headers }).then(r => r.json());

    if (Array.isArray(users)) stats.users = users.length;
    if (Array.isArray(transactions)) stats.transactions = transactions.length;
    if (Array.isArray(analyses)) {
      stats.analyses = analyses.length;
      const frauds = analyses.filter(a => a.isFraude).length;
      stats.fraudRate = analyses.length ? ((frauds / analyses.length) * 100).toFixed(1) + "%" : "0%";
    }
    if (Array.isArray(alertes)) stats.alertes = alertes.length;

    res.render("dashboard", { stats });
  } catch {
    res.render("dashboard", { stats: { users: "--", transactions: "--", analyses: "--", alertes: "--", fraudRate: "--" } });
  }
});

/* =========================
   UTILISATEURS
========================= */
router.get("/utilisateurs", ensureAuthenticated, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const response = await fetch(
      `http://localhost:3000/utilisateur?page=${page}&limit=${limit}`,
      {
        headers: { Authorization: `Bearer ${req.session.token}` }
      }
    );

    const result = await response.json();

    res.render("utilisateurs/index", {
      utilisateurs: result.data || [],
      page: result.page || 1,
      totalPages: result.totalPages || 1,
      error: null
    });

  } catch (error) {
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
        Authorization: `Bearer ${req.session.token}`
      },
      body: JSON.stringify(req.body)
    });

    const result = await response.json();

    if (!response.ok) {
      return res.render("utilisateurs/create", {
        error: result.error || "Erreur lors de la création."
      });
    }

    res.redirect("/front/utilisateurs");

  } catch {
    res.render("utilisateurs/create", { error: "Erreur interne." });
  }
});

router.get("/utilisateurs/:id/edit", ensureAuthenticated, async (req, res) => {
  const response = await fetch(`http://localhost:3000/utilisateur/${req.params.id}`, {
    headers: { Authorization: `Bearer ${req.session.token}` }
  });
  const utilisateur = await response.json();
  res.render("utilisateurs/edit", { utilisateur, error: null });
});

router.post("/utilisateurs/:id/edit", ensureAuthenticated, async (req, res) => {
  try {
    const response = await fetch(`http://localhost:3000/utilisateur/${req.params.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.session.token}`
      },
      body: JSON.stringify(req.body)   //
    });

    const result = await response.json();

    if (!response.ok) {
      return res.render("utilisateurs/edit", {
        utilisateur: { idUtilisateur: req.params.id, ...req.body },
        error: result.error || "Erreur lors de la mise à jour."
      });
    }

    res.redirect("/front/utilisateurs");

  } catch (error) {
    res.render("utilisateurs/edit", {
      utilisateur: { idUtilisateur: req.params.id, ...req.body },
      error: "Erreur interne."
    });
  }
});


router.get("/utilisateurs/:id", ensureAuthenticated, async (req, res) => {
  const response = await fetch(`http://localhost:3000/utilisateur/${req.params.id}`, {
    headers: { Authorization: `Bearer ${req.session.token}` }
  });
  const utilisateur = await response.json();
  res.render("utilisateurs/detail", { utilisateur, error: null });
});

/* =========================
   TRANSACTIONS
========================= */
/* =========================
   TRANSACTIONS AVEC PAGINATION
========================= */
router.get("/transactions", ensureAuthenticated, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;

  try {
    const response = await fetch(
      `http://localhost:3000/transaction?page=${page}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${req.session.token}`
        }
      }
    );

    const result = await response.json();

    res.render("transactions/index", {
      transactions: result.data || [],
      page: result.page || 1,
      totalPages: result.totalPages || 1,
      error: null
    });

  } catch (error) {
    console.error("Erreur chargement transactions :", error);

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
        Authorization: `Bearer ${req.session.token}`
      },
      body: JSON.stringify(req.body)
    });

    const result = await response.json();

    if (!response.ok) {
      return res.render("transactions/create", {
        error: result.error || "Erreur lors de la création."
      });
    }

    res.redirect("/front/transactions");

  } catch {
    res.render("transactions/create", { error: "Erreur interne." });
  }
});

router.get("/transactions/:id/edit", ensureAuthenticated, async (req, res) => {
  const response = await fetch(`http://localhost:3000/transaction/${req.params.id}`, {
    headers: { Authorization: `Bearer ${req.session.token}` }
  });
  const transaction = await response.json();
  res.render("transactions/edit", { transaction, error: null });
});

router.post("/transactions/:id/edit", ensureAuthenticated, async (req, res) => {
  const response = await fetch(`http://localhost:3000/transaction/${req.params.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${req.session.token}`
    },
    body: JSON.stringify(req.body)
  });
  if (!response.ok) {
    return res.render("transactions/edit", {
      transaction: { idTransaction: req.params.id, ...req.body },
      error: "Erreur mise à jour."
    });
  }
  res.redirect("/front/transactions");
});

router.get("/transactions/:id", ensureAuthenticated, async (req, res) => {
  const response = await fetch(`http://localhost:3000/transaction/${req.params.id}`, {
    headers: { Authorization: `Bearer ${req.session.token}` }
  });
  const transaction = await response.json();
  res.render("transactions/detail", { transaction, error: null });
});


/* =========================
   ANALYSES (CORRECTION)
========================= */
router.get("/analyses", ensureAuthenticated, async (req, res) => {
  try {
    const response = await fetch("http://localhost:3000/analyse", {
      headers: { Authorization: `Bearer ${req.session.token}` }
    });

    const result = await response.json();

    const analyses = Array.isArray(result) ? result : result.data || [];

    res.render("analyses/index", {
      analyses,
      page: 1,
      totalPages: 1,
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
      { headers: { Authorization: `Bearer ${req.session.token}` } }
    );

    const analyse = await response.json();

    res.render("analyses/detail", {
      analyse,
      error: null
    });

  } catch {
    res.render("analyses/detail", {
      analyse: null,
      error: "Impossible de charger l’analyse."
    });
  }
});



/* =========================
   ALERTES
========================= */
router.get("/alertes", ensureAuthenticated, async (req, res) => {
  const response = await fetch("http://localhost:3000/alerte", {
    headers: { Authorization: `Bearer ${req.session.token}` }
  });
  const alertes = await response.json();
  res.render("alertes/index", { alertes, error: null });
});

router.get("/alertes/:id", ensureAuthenticated, async (req, res) => {
  const response = await fetch(`http://localhost:3000/alerte/${req.params.id}`, {
    headers: { Authorization: `Bearer ${req.session.token}` }
  });
  const alerte = await response.json();
  res.render("alertes/detail", { alerte, error: null });
});

/* =========================
   ROLES
========================= */
router.get("/roles", ensureAuthenticated, async (req, res) => {
  const response = await fetch("http://localhost:3000/role", {
    headers: { Authorization: `Bearer ${req.session.token}` }
  });
  const roles = await response.json();
  res.render("roles/index", { roles, error: null });
});

router.get("/roles/create", ensureAuthenticated, (req, res) => {
  res.render("roles/create", { error: null });
});

router.post("/roles/create", ensureAuthenticated, async (req, res) => {
  const response = await fetch("http://localhost:3000/role", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${req.session.token}`
    },
    body: JSON.stringify(req.body)
  });

  const result = await response.json();
  if (!response.ok) return res.render("roles/create", { error: result.error });

  res.redirect("/front/roles");
});

router.get("/roles/:id/edit", ensureAuthenticated, async (req, res) => {
  const response = await fetch(`http://localhost:3000/role/${req.params.id}`, {
    headers: { Authorization: `Bearer ${req.session.token}` }
  });
  const role = await response.json();
  res.render("roles/edit", { role, error: null });
});

router.post("/roles/:id/edit", ensureAuthenticated, async (req, res) => {
  await fetch(`http://localhost:3000/role/${req.params.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${req.session.token}`
    },
    body: JSON.stringify(req.body)
  });

  res.redirect("/front/roles");
});

router.get("/roles/:id", ensureAuthenticated, async (req, res) => {
  const response = await fetch(`http://localhost:3000/role/${req.params.id}`, {
    headers: { Authorization: `Bearer ${req.session.token}` }
  });
  const role = await response.json();
  res.render("roles/detail", { role, error: null });
});

router.post("/roles/:id/delete", ensureAuthenticated, async (req, res) => {
  await fetch(`http://localhost:3000/role/${req.params.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${req.session.token}` }
  });
  res.redirect("/front/roles");
});

/* =========================
   LOGOUT
========================= */
router.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/front/login"));
});

export default router;
