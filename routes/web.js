import express from "express";

const router = express.Router();

/* ---------------------- PAGE ACCUEIL ---------------------- */
router.get("/", (req, res) => {
  res.render("index");
});

/* ------------------------- SIGNUP ------------------------- */
router.get("/signup", (req, res) => {
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
    return res.render("signup", {
      error: "Erreur interne lors de l'inscription."
    });
  }
});

/* -------------------------- LOGIN -------------------------- */
router.get("/login", (req, res) => {
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
    return res.render("login", {
      error: "Erreur interne lors de la connexion."
    });
  }
});

/* ------------------------ DASHBOARD ------------------------ */
router.get("/dashboard", (req, res) => {
  res.render("dashboard");
});

/* ------------------------- LOGOUT -------------------------- */
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/front/login");
  });
});

export default router;
