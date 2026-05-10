const { db } = require("../config/firebaseAdmin");

async function getMyProfile(req, res) {
  try {
    const userDoc = await db.collection("users").doc(req.user.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const userData = userDoc.data();
    return res.json({
      uid: req.user.uid,
      email: userData.email || req.user.email || null,
      nombre: userData.nombre || req.user.displayName || null,
      role: userData.role || null,
      estado: userData.estado || null,
    });
  } catch (error) {
    console.error("profile error:", error);
    return res.status(500).json({ error: "Error al obtener perfil de usuario" });
  }
}

module.exports = { getMyProfile };
