import express from "express";
import { ensureAuthenticated, redirectIfAuthenticated } from "../middleware/auth.js";

const router = express.Router();

/* ---------------------- PAGE ACCUEIL ---------------------- */
router.get("/", (req, res) => {
  res.render("index");
});

/* ------------------------- SIGNUP ------------------------- */
router.get("/signup", redirectIfAuthenticated, (req, res) => {
  res.render("signup", { error: null });
});

router.post("/signup", async (req, res) => {
  console.log("FRONT SIGNUP BODY:", req.body);

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

/* -------------------------- LOGIN -------------------------- */
router.get("/login", redirectIfAuthenticated, (req, res) => {
  res.render("login", { error: null });
});

router.post("/login", async (req, res) => {
  console.log("FRONT LOGIN BODY:", req.body);

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
    console.log("TOKEN SESSION:", req.session.token);

    return res.redirect("/front/dashboard");

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.render("login", { error: "Erreur interne lors de la connexion." });
  }
});

/* ------------------------ DASHBOARD ------------------------ */
router.get("/dashboard", ensureAuthenticated, (req, res) => {
  res.render("dashboard");
});

/* ---------------------- LISTE UTILISATEURS ---------------------- */
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

    console.log("UTILISATEURS REÇUS:", result);

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


/* ----------------------- CREATE USER (FORM) ----------------------- */
router.get("/utilisateurs/create", ensureAuthenticated, (req, res) => {
  res.render("utilisateurs/create", { error: null });
});


/* ---------------------- CREATE USER (SUBMIT) ---------------------- */
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


/* ---------------------- FORMULAIRE EDIT UTILISATEUR ---------------------- */
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

    // Redirection après succès
    res.redirect("/front/utilisateurs");

  } catch (err) {
    console.error("ERREUR UPDATE UTILISATEUR :", err);

    res.render("utilisateurs/edit", {
      utilisateur: { idUtilisateur: id, ...req.body },
      error: "Erreur interne lors de la mise à jour."
    });
  }
});





/* ------------------------- LOGOUT -------------------------- */
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/front/login");
  });
});

/* --------------------- EXPORT FINAL ---------------------- */
export default router;
