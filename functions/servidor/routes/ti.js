const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { verifyToken } = require("../middleware/auth");
const { requirePermission } = require("../middleware/permissions");
const {
  getTodosChoferes,
  getTodasRutas,
  getReportesSistema,
  crearUsuario,
  cambiarRolUsuario,
  eliminarUsuario,
  seedDatabase,
  cambiarEstadoUsuario,
  getRoles,
  crearRol,
  actualizarRol,
} = require("../controllers/tiController");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

const mutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(limiter);
router.use(verifyToken);

// GET /api/ti/todos-choferes
router.get("/todos-choferes", requirePermission("choferes:ver"), getTodosChoferes);

// GET /api/ti/todas-rutas
router.get("/todas-rutas", requirePermission("rutas:ver"), getTodasRutas);

// GET /api/ti/reportes/sistema
router.get("/reportes/sistema", requirePermission("reportes:ver_global"), getReportesSistema);

// POST /api/ti/users
router.post("/users", mutationLimiter, requirePermission("usuarios:crear"), crearUsuario);

// PUT /api/ti/users/:id/role
router.put("/users/:id/role", mutationLimiter, requirePermission("usuarios:actualizar"), cambiarRolUsuario);

// PUT /api/ti/users/:id/estado
router.put("/users/:id/estado", mutationLimiter, requirePermission("usuarios:desactivar"), cambiarEstadoUsuario);

// DELETE /api/ti/users/:id
router.delete("/users/:id", mutationLimiter, requirePermission("usuarios:eliminar"), eliminarUsuario);

// POST /api/ti/seed
router.post("/seed", mutationLimiter, requirePermission("sistema:seed"), seedDatabase);

// GET /api/ti/roles
router.get("/roles", requirePermission("roles:ver"), getRoles);

// POST /api/ti/roles
router.post("/roles", mutationLimiter, requirePermission("roles:crear"), crearRol);

// PUT /api/ti/roles/:id
router.put("/roles/:id", mutationLimiter, requirePermission("roles:actualizar"), actualizarRol);

module.exports = router;
