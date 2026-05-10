const { db } = require("../config/firebaseAdmin");

function isTIUser(req) {
  return req.userProfile?.role === "TI";
}

// GET /api/admin/mis-choferes - Ver choferes asignados al admin
async function getMisChoferes(req, res) {
  try {
    const adminUid = req.user.uid;
    const tiUser = isTIUser(req);

    let choferesQuery = db
      .collection("users")
      .where("role", "==", "CHOFER");
    if (!tiUser) {
      choferesQuery = choferesQuery.where("adminAsignado", "==", adminUid);
    }
    const choferesSnapshot = await choferesQuery.get();

    const choferes = choferesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ choferes });
  } catch (error) {
    console.error("admin error:", error);
    res.status(500).json({ error: "Error al obtener los choferes" });
  }
}

// GET /api/admin/choferes/:id/ruta-actual - Ver ruta actual de un chofer
async function getRutaActualChofer(req, res) {
  try {
    const adminUid = req.user.uid;
    const choferUid = req.params.id;
    const tiUser = isTIUser(req);

    const choferDoc = await db.collection("users").doc(choferUid).get();
    if (!choferDoc.exists || (!tiUser && choferDoc.data().adminAsignado !== adminUid)) {
      return res.status(403).json({ error: "No tienes acceso a este chofer" });
    }

    const routesSnapshot = await db
      .collection("routes")
      .where("choferAsignado", "==", choferUid)
      .where("estado", "==", "activa")
      .orderBy("fechaProgramada", "desc")
      .limit(1)
      .get();

    if (routesSnapshot.empty) {
      return res.status(404).json({ error: "El chofer no tiene una ruta activa" });
    }

    const ruta = { id: routesSnapshot.docs[0].id, ...routesSnapshot.docs[0].data() };
    res.json(ruta);
  } catch (error) {
    console.error("admin error:", error);
    res.status(500).json({ error: "Error al obtener la ruta actual del chofer" });
  }
}

// GET /api/admin/choferes/:id/historial - Ver historial de rutas del chofer
async function getHistorialChofer(req, res) {
  try {
    const adminUid = req.user.uid;
    const choferUid = req.params.id;
    const tiUser = isTIUser(req);

    const choferDoc = await db.collection("users").doc(choferUid).get();
    if (!choferDoc.exists || (!tiUser && choferDoc.data().adminAsignado !== adminUid)) {
      return res.status(403).json({ error: "No tienes acceso a este chofer" });
    }

    const routesSnapshot = await db
      .collection("routes")
      .where("choferAsignado", "==", choferUid)
      .orderBy("fechaProgramada", "desc")
      .get();

    const rutas = routesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ rutas });
  } catch (error) {
    console.error("admin error:", error);
    res.status(500).json({ error: "Error al obtener el historial del chofer" });
  }
}

// GET /api/admin/choferes/:id/kpis - KPIs del chofer
async function getKpisChofer(req, res) {
  try {
    const adminUid = req.user.uid;
    const choferUid = req.params.id;
    const tiUser = isTIUser(req);

    const choferDoc = await db.collection("users").doc(choferUid).get();
    if (!choferDoc.exists || (!tiUser && choferDoc.data().adminAsignado !== adminUid)) {
      return res.status(403).json({ error: "No tienes acceso a este chofer" });
    }

    const routesSnapshot = await db
      .collection("routes")
      .where("choferAsignado", "==", choferUid)
      .get();

    let totalRutas = 0;
    let totalEntregas = 0;
    let entregasCompletadas = 0;
    let entregasFallidas = 0;

    routesSnapshot.docs.forEach((doc) => {
      const ruta = doc.data();
      totalRutas++;
      if (ruta.entregas && Array.isArray(ruta.entregas)) {
        ruta.entregas.forEach((entrega) => {
          totalEntregas++;
          if (entrega.estado === "completada") entregasCompletadas++;
          if (entrega.estado === "fallida") entregasFallidas++;
        });
      }
    });

    const tasaExito =
      totalEntregas > 0 ? Math.round((entregasCompletadas / totalEntregas) * 100) : 0;

    res.json({
      choferUid,
      totalRutas,
      totalEntregas,
      entregasCompletadas,
      entregasFallidas,
      tasaExito,
    });
  } catch (error) {
    console.error("admin error:", error);
    res.status(500).json({ error: "Error al calcular KPIs del chofer" });
  }
}

// GET /api/admin/reportes/mi-equipo - Consolidado del equipo
async function getReporteEquipo(req, res) {
  try {
    const adminUid = req.user.uid;
    const tiUser = isTIUser(req);

    let choferesQuery = db
      .collection("users")
      .where("role", "==", "CHOFER");
    if (!tiUser) {
      choferesQuery = choferesQuery.where("adminAsignado", "==", adminUid);
    }
    const choferesSnapshot = await choferesQuery.get();

    const choferIds = choferesSnapshot.docs.map((doc) => doc.id);

    let totalRutas = 0;
    let totalEntregas = 0;
    let entregasCompletadas = 0;
    let entregasFallidas = 0;

    const routesSnapshots = await Promise.all(
      choferIds.map((choferUid) =>
        db.collection("routes").where("choferAsignado", "==", choferUid).get()
      )
    );

    routesSnapshots.forEach((routesSnapshot) => {
      routesSnapshot.docs.forEach((doc) => {
        const ruta = doc.data();
        totalRutas++;
        if (ruta.entregas && Array.isArray(ruta.entregas)) {
          ruta.entregas.forEach((entrega) => {
            totalEntregas++;
            if (entrega.estado === "completada") entregasCompletadas++;
            if (entrega.estado === "fallida") entregasFallidas++;
          });
        }
      });
    });

    res.json({
      totalChoferes: choferIds.length,
      totalRutas,
      totalEntregas,
      entregasCompletadas,
      entregasFallidas,
      tasaExito:
        totalEntregas > 0 ? Math.round((entregasCompletadas / totalEntregas) * 100) : 0,
    });
  } catch (error) {
    console.error("admin error:", error);
    res.status(500).json({ error: "Error al obtener reporte del equipo" });
  }
}

// POST /api/admin/rutas - Crear ruta
async function crearRuta(req, res) {
  try {
    const adminUid = req.user.uid;
    const { codigo, fechaProgramada, entregas, riesgos } = req.body;

    if (!codigo || !fechaProgramada) {
      return res.status(400).json({ error: "Código y fecha programada son requeridos" });
    }

    const nuevaRuta = {
      codigo,
      fechaProgramada: new Date(fechaProgramada),
      estado: "pendiente",
      entregas: entregas || [],
      riesgos: riesgos || [],
      choferAsignado: null,
      ubicacionActual: null,
      creadoPor: adminUid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection("routes").add(nuevaRuta);
    res.status(201).json({ id: docRef.id, ...nuevaRuta });
  } catch (error) {
    console.error("admin error:", error);
    res.status(500).json({ error: "Error al crear la ruta" });
  }
}

// PUT /api/admin/rutas/:id/asignar - Asignar chofer a ruta
async function asignarChoferRuta(req, res) {
  try {
    const adminUid = req.user.uid;
    const rutaId = req.params.id;
    const { choferUid } = req.body;
    const tiUser = isTIUser(req);

    if (!choferUid) {
      return res.status(400).json({ error: "choferUid es requerido" });
    }

    const choferDoc = await db.collection("users").doc(choferUid).get();
    if (!choferDoc.exists || (!tiUser && choferDoc.data().adminAsignado !== adminUid)) {
      return res.status(403).json({ error: "No tienes acceso a este chofer" });
    }

    const rutaDoc = await db.collection("routes").doc(rutaId).get();
    if (!rutaDoc.exists) {
      return res.status(404).json({ error: "Ruta no encontrada" });
    }

    await rutaDoc.ref.update({ choferAsignado: choferUid, updatedAt: new Date() });
    res.json({ message: "Chofer asignado correctamente" });
  } catch (error) {
    console.error("admin error:", error);
    res.status(500).json({ error: "Error al asignar chofer a la ruta" });
  }
}

// PUT /api/admin/rutas/:id/estado - Cambiar estado de ruta
async function cambiarEstadoRuta(req, res) {
  try {
    const rutaId = req.params.id;
    const { estado } = req.body;

    const estadosValidos = ["pendiente", "activa", "completada", "cancelada"];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: "Estado inválido" });
    }

    const rutaDoc = await db.collection("routes").doc(rutaId).get();
    if (!rutaDoc.exists) {
      return res.status(404).json({ error: "Ruta no encontrada" });
    }

    await rutaDoc.ref.update({ estado, updatedAt: new Date() });
    res.json({ message: "Estado de ruta actualizado correctamente" });
  } catch (error) {
    console.error("admin error:", error);
    res.status(500).json({ error: "Error al cambiar el estado de la ruta" });
  }
}

module.exports = {
  getMisChoferes,
  getRutaActualChofer,
  getHistorialChofer,
  getKpisChofer,
  getReporteEquipo,
  crearRuta,
  asignarChoferRuta,
  cambiarEstadoRuta,
};
