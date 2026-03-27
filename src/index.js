const express = require("express");
const path = require("path");

const app = express();

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, "cliente")));

// Ruta principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "cliente/index.html"));
});

// Dashboard
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "cliente/html/dashboard.html"));
});

app.listen(3000, () => {
  console.log("Servidor en http://localhost:3000");
});