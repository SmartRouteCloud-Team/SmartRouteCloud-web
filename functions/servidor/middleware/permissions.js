const { db } = require("../config/firebaseAdmin");

/**
 * requirePermission(permission)
 *
 * Middleware RBAC: carga el perfil del usuario desde la colección `users`,
 * resuelve su rol en la colección `roles` y verifica que el permiso solicitado
 * esté en el array `permisos` del rol. Devuelve 403 si falta.
 */
function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      const userDoc = await db.collection("users").doc(req.user.uid).get();

      if (!userDoc.exists) {
        return res.status(403).json({ error: "Usuario no encontrado" });
      }

      const userData = userDoc.data();
      req.userProfile = userData;

      if (!userData.role) {
        return res.status(403).json({ error: "El usuario no tiene un rol asignado" });
      }

      const roleDoc = await db.collection("roles").doc(userData.role).get();

      if (!roleDoc.exists) {
        return res.status(403).json({ error: "Rol no encontrado" });
      }

      const permisos = roleDoc.data().permisos || [];

      if (!permisos.includes(permission)) {
        return res.status(403).json({ error: "Acceso denegado: permiso insuficiente" });
      }

      next();
    } catch (error) {
      console.error("requirePermission error:", error);
      return res.status(500).json({ error: "Error al verificar permisos" });
    }
  };
}

module.exports = { requirePermission };
