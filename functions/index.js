const functions = require("firebase-functions/v1");
const express = require("express");
const cors = require("cors");
const { db } = require("./servidor/config/firebaseAdmin");
const { verifyToken } = require("./servidor/middleware/auth");

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

app.get("/api/me/profile", verifyToken, async (req, res) => {
  try {
    const userDoc = await db.collection("users").doc(req.user.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const userData = userDoc.data();
    return res.json({
      uid: req.user.uid,
      email: userData.email || req.user.email || null,
      nombre: userData.nombre || req.user.name || null,
      role: userData.role || null,
      estado: userData.estado || null,
    });
  } catch (error) {
    console.error("profile error:", error);
    return res.status(500).json({ error: "Error al obtener perfil de usuario" });
  }
});

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
