const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { verifyToken } = require("../middleware/auth");
const { requirePermission } = require("../middleware/permissions");
const {
  getMiRuta,
  getMisEntregas,
  getMisRutasFuturas,
  actualizarEntrega,
} = require("../controllers/choferController");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(limiter);
router.use(verifyToken);

// GET /api/chofer/mi-ruta
router.get("/mi-ruta", requirePermission("rutas:ver"), getMiRuta);

// GET /api/chofer/mi-ruta/entregas
router.get("/mi-ruta/entregas", requirePermission("entregas:ver"), getMisEntregas);

// GET /api/chofer/mis-rutas-futuras
router.get("/mis-rutas-futuras", requirePermission("rutas:ver"), getMisRutasFuturas);

// PUT /api/chofer/entregas/:id
router.put("/entregas/:id", requirePermission("entregas:actualizar"), actualizarEntrega);

module.exports = router;
