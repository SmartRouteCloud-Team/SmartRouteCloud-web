require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const choferRoutes = require("./servidor/routes/chofer");
const adminRoutes = require("./servidor/routes/admin");
const tiRoutes = require("./servidor/routes/ti");
const rutasRoutes = require("./servidor/routes/rutas");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/chofer", choferRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ti", tiRoutes);
app.use("/api/rutas", rutasRoutes);

// Servir archivos estáticos (frontend intacto)
app.use(express.static(path.join(__dirname, "cliente")));

// Ruta principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "cliente/index.html"));
});

// Dashboard
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "cliente/html/dashboard.html"));
});

// 404 handler for unknown API routes
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Endpoint no encontrado" });
});

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});