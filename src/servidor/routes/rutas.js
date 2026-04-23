const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { verifyToken } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");
const { cargarMasivo } = require("../controllers/rutasController");

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
router.use(requireRole("ADMIN", "TI"));

// POST /api/rutas/cargar-masivo
router.post("/cargar-masivo", mutationLimiter, cargarMasivo);

module.exports = router;
