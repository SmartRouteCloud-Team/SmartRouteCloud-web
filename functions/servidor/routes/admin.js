const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { verifyToken } = require("../middleware/auth");
const { requirePermission } = require("../middleware/permissions");
const {
  getMisChoferes,
  getRutaActualChofer,
  getHistorialChofer,
  getKpisChofer,
  getReporteEquipo,
  crearRuta,
  asignarChoferRuta,
  cambiarEstadoRuta,
} = require("../controllers/adminController");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(limiter);
router.use(verifyToken);

// GET /api/admin/mis-choferes
router.get("/mis-choferes", requirePermission("choferes:ver"), getMisChoferes);

// GET /api/admin/choferes/:id/ruta-actual
router.get("/choferes/:id/ruta-actual", requirePermission("choferes:ver"), getRutaActualChofer);

// GET /api/admin/choferes/:id/historial
router.get("/choferes/:id/historial", requirePermission("choferes:ver"), getHistorialChofer);

// GET /api/admin/choferes/:id/kpis
router.get("/choferes/:id/kpis", requirePermission("choferes:ver"), getKpisChofer);

// GET /api/admin/reportes/mi-equipo
router.get("/reportes/mi-equipo", requirePermission("reportes:ver_equipo"), getReporteEquipo);

// POST /api/admin/rutas
router.post("/rutas", requirePermission("rutas:crear"), crearRuta);

// PUT /api/admin/rutas/:id/asignar
router.put("/rutas/:id/asignar", requirePermission("rutas:asignar"), asignarChoferRuta);

// PUT /api/admin/rutas/:id/estado
router.put("/rutas/:id/estado", requirePermission("rutas:actualizar"), cambiarEstadoRuta);

module.exports = router;
