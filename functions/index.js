const functions = require("firebase-functions/v1");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { verifyToken } = require("./servidor/middleware/auth");
const { getMyProfile } = require("./servidor/controllers/profileController");

const choferRoutes = require("./servidor/routes/chofer");
const adminRoutes = require("./servidor/routes/admin");
const tiRoutes = require("./servidor/routes/ti");
const rutasRoutes = require("./servidor/routes/rutas");

const app = express();

// Orígenes permitidos: Firebase Hosting y desarrollo local
const allowedOrigins = [
  "https://smartroute-60190.web.app",
  "https://smartroute-60190.firebaseapp.com",
  "http://localhost:3000",
];

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir peticiones sin origen (p. ej. Postman, curl) solo en desarrollo
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  })
);
app.use(express.json());

const profileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get("/api/me/profile", profileLimiter, verifyToken, getMyProfile);

// API Routes
app.use("/api/chofer", choferRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ti", tiRoutes);
app.use("/api/rutas", rutasRoutes);

// 404 handler for unknown API routes
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Endpoint no encontrado" });
});

// Exponer Express como Cloud Function en us-central1
exports.api = functions.region("us-central1").https.onRequest(app);
