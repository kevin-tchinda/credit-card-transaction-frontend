// middleware/auth.js

export function ensureAuthenticated(req, res, next) {
  if (!req.session.token) {
    return res.redirect("/front/login");
  }
  next();
}

export function redirectIfAuthenticated(req, res, next) {
  if (req.session.token) {
    return res.redirect("/front/dashboard");
  }
  next();
}
