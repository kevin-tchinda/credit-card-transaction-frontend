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
    console.error("SIGNUP ERROR:", err);
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
    console.error("LOGIN ERROR:", err);
    return res.render("login", { error: "Erreur interne lors de la connexion." });
  }
});

/* ---------------------------------------------------------
   DASHBOARD
--------------------------------------------------------- */
router.get("/dashboard", ensureAuthenticated, (req, res) => {
  res.render("dashboard");
});

/* =========================================================
   UTILISATEURS - CRUD COMPLET
========================================================= */

/* ---------- LISTE AVEC PAGINATION ---------- */
router.get("/utilisateurs", ensureAuthenticated, async (req, res) => {
  const page = parseInt(req.query.page) || 1;

  try {
    const response = await fetch(`http://localhost:3000/utilisateur?page=${page}&limit=10`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${req.session.token}`
      }
    });

    const result = await response.json();

    res.render("utilisateurs/index", {
      utilisateurs: result.data || [],
      page: result.page,
      totalPages: result.totalPages,
      error: null
    });

  } catch (err) {
    console.error("ERREUR LISTE UTILISATEURS:", err);

    res.render("utilisateurs/index", {
      utilisateurs: [],
      page: 1,
      totalPages: 1,
      error: "Impossible de charger la liste des utilisateurs."
    });
  }
});

/* ---------- FORMULAIRE DE CREATION ---------- */
router.get("/utilisateurs/create", ensureAuthenticated, (req, res) => {
  res.render("utilisateurs/create", { error: null });
});

/* ---------- AJOUT UTILISATEUR ---------- */
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
        error: result.error || "Impossible de créer l’utilisateur."
      });
    }

    return res.redirect("/front/utilisateurs");

  } catch (err) {
    console.error("ERREUR CREATE USER:", err);

    return res.render("utilisateurs/create", {
      error: "Erreur interne lors de la création."
    });
  }
});

/* ---------- FORMULAIRE EDIT ---------- */
router.get("/utilisateurs/:id/edit", ensureAuthenticated, async (req, res) => {
  const id = req.params.id;

  try {
    const response = await fetch(`http://localhost:3000/utilisateur/${id}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${req.session.token}`
      }
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
    console.error("ERREUR GET EDIT UTILISATEUR :", err);

    return res.render("utilisateurs/edit", {
      utilisateur: null,
      error: "Erreur interne."
    });
  }
});

/* ---------- UPDATE UTILISATEUR ---------- */
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

    res.redirect("/front/utilisateurs");

  } catch (err) {
    console.error("ERREUR UPDATE UTILISATEUR :", err);

    res.render("utilisateurs/edit", {
      utilisateur: { idUtilisateur: id, ...req.body },
      error: "Erreur interne lors de la mise à jour."
    });
  }
});

/* =========================================================
   TRANSACTIONS - LISTE, DETAIL, CREATION
========================================================= */

/* ---------- LISTE AVEC PAGINATION ---------- */
router.get("/transactions", ensureAuthenticated, async (req, res) => {
  try {
    const page = req.query.page || 1;

    const response = await fetch(
      `http://localhost:3000/transaction?page=${page}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${req.session.token}`
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

  } catch (err) {
    console.error("ERREUR LISTE TRANSACTIONS:", err);

    res.render("transactions/index", {
      transactions: [],
      page: 1,
      totalPages: 1,
      error: "Impossible de charger les transactions."
    });
  }
});

/* ---------- FORM CREATE ---------- */
router.get("/transactions/create", ensureAuthenticated, (req, res) => {
  res.render("transactions/create", { error: null });
});

/* ---------- CREER TRANSACTION ---------- */
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
    console.error("CREATE TRANSACTION ERROR:", err);

    res.render("transactions/create", {
      error: "Erreur interne lors de la création."
    });
  }
});

/* ---------- DETAIL TRANSACTION ---------- */
router.get("/transactions/:id", ensureAuthenticated, async (req, res) => {
  try {
    const response = await fetch(
      `http://localhost:3000/transaction/${req.params.id}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${req.session.token}`
        }
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
    console.error("ERREUR DETAILS TRANSACTION:", err);

    res.render("transactions/detail", {
      transaction: null,
      error: "Impossible de charger la transaction."
    });
  }
});

/* ------------------ FORM EDIT TRANSACTION ------------------ */
router.get("/transactions/:id/edit", ensureAuthenticated, async (req, res) => {
  const id = req.params.id;

  try {
    const response = await fetch(`http://localhost:3000/transaction/${id}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${req.session.token}`
      }
    });

    const transaction = await response.json();

    if (transaction.error) {
      return res.render("transactions/edit", {
        transaction: null,
        error: transaction.error
      });
    }

    res.render("transactions/edit", {
      transaction,
      error: null
    });

  } catch (err) {
    console.error("ERREUR GET EDIT TRANSACTION :", err);

    res.render("transactions/edit", {
      transaction: null,
      error: "Erreur interne lors du chargement du formulaire."
    });
  }
});


/* ------------------ UPDATE TRANSACTION ------------------ */
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
    console.error("ERREUR UPDATE TRANSACTION :", err);

    return res.render("transactions/edit", {
      transaction: { idTransaction: id, ...req.body },
      error: "Erreur interne lors de la mise à jour."
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

/* ---------------------------------------------------------
   EXPORT ROUTER
--------------------------------------------------------- */
export default router;
