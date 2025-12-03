import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createProxyMiddleware } from "http-proxy-middleware";
import session from "express-session";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* -------------------- CONFIG EJS --------------------- */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* -------------------- MIDDLEWARES -------------------- */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
  secret: "La_Vie_Est_Belle",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 3600000 }
}));


// `decodeJwtPayload` 

function decodeJwtPayload(token) {
  try {
    const payloadPart = token.split(".")[1];
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(base64, "base64").toString("utf8");
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

app.use((req, res, next) => {
  const token = req.session.token;

  if (token) {
    const payload = decodeJwtPayload(token);
    res.locals.isAuthenticated = true;
    res.locals.user = payload; // { id, email, iat, exp }
  } else {
    res.locals.isAuthenticated = false;
    res.locals.user = null;
  }

  next();
});

/* -------------------- ROUTE RACINE -------------------- */
app.get("/", (req, res) => {
  res.redirect("/front");
});

/* ----------------- ROUTES FRONTEND ------------------- */
import webRoutes from "./routes/web.js";
app.use("/front", webRoutes);

/* ------------- NE PAS PROXY LES ROUTES FRONT --------- */
app.use((req, res, next) => {
  if (req.path.startsWith("/front")) return next();
  next();
});

/* ---------------------- PROXY ------------------------ */
app.use(
  "/",
  createProxyMiddleware({
    target: "http://localhost:3000",
    changeOrigin: true,
    secure: false,
    cookieDomainRewrite: "",
    selfHandleResponse: false,
    onProxyReq: (proxyReq, req, res) => {
      if (req.method === "POST" && req.body) {
        const bodyData = JSON.stringify(req.body);

        proxyReq.setHeader("Content-Type", "application/json");
        proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    }
  })
);


/* --------------------- LANCEMENT ---------------------- */
app.listen(4000, () => {
  console.log("Frontend EJS running on http://localhost:4000/front");
});
