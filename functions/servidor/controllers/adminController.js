const { db } = require("../config/firebaseAdmin");

function isTIUser(req) {
  return req.userProfile?.role === "TI";
}

function getTimeValue(value) {
  if (!value) return 0;
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

async function canAccessRoute(ruta, adminUid, tiUser) {
  if (tiUser) return true;
  if (!ruta) return false;
  if (ruta.creadoPor === adminUid) return true;
  if (!ruta.choferAsignado) return false;

  const choferDoc = await db.collection("users").doc(ruta.choferAsignado).get();
  return choferDoc.exists && choferDoc.data().adminAsignado === adminUid;
}

async function getScopedRoutes(adminUid, tiUser) {
  if (tiUser) {
    const routesSnapshot = await db.collection("routes").get();
    return routesSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => getTimeValue(b.fechaProgramada) - getTimeValue(a.fechaProgramada));
  }

  const [choferesSnapshot, creadasSnapshot] = await Promise.all([
    db.collection("users").where("role", "==", "CHOFER").where("adminAsignado", "==", adminUid).get(),
    db.collection("routes").where("creadoPor", "==", adminUid).get(),
  ]);

  const choferIds = choferesSnapshot.docs.map((doc) => doc.id);
  const routesSnapshots = await Promise.all(
    choferIds.map((choferUid) =>
      db.collection("routes").where("choferAsignado", "==", choferUid).get()
    )
  );

  const routesById = new Map();

  [creadasSnapshot, ...routesSnapshots].forEach((snapshot) => {
    snapshot.docs.forEach((doc) => {
      routesById.set(doc.id, { id: doc.id, ...doc.data() });
    });
  });

  return Array.from(routesById.values()).sort(
    (a, b) => getTimeValue(b.fechaProgramada) - getTimeValue(a.fechaProgramada)
  );
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

// GET /api/admin/rutas - Ver rutas creadas o asignadas al equipo del admin
async function getMisRutas(req, res) {
  try {
    const adminUid = req.user.uid;
    const tiUser = isTIUser(req);
    const rutas = await getScopedRoutes(adminUid, tiUser);
    res.json({ rutas });
  } catch (error) {
    console.error("admin error:", error);
    res.status(500).json({ error: "Error al obtener las rutas" });
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
    const {
      codigo,
      fechaProgramada,
      entregas,
      riesgos,
      origen = "",
      destino = "",
    } = req.body;

    if (!String(codigo || "").trim() || !fechaProgramada) {
      return res.status(400).json({ error: "Código y fecha programada son requeridos" });
    }

    const nuevaRuta = {
      codigo: String(codigo).trim(),
      fechaProgramada: new Date(fechaProgramada),
      estado: "pendiente",
      origen: String(origen || "").trim(),
      destino: String(destino || "").trim(),
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

// PUT /api/admin/rutas/:id - Actualizar datos editables de una ruta
async function actualizarRuta(req, res) {
  try {
    const adminUid = req.user.uid;
    const rutaId = req.params.id;
    const tiUser = isTIUser(req);
    const { codigo, origen, destino } = req.body;

    const rutaDoc = await db.collection("routes").doc(rutaId).get();
    if (!rutaDoc.exists) {
      return res.status(404).json({ error: "Ruta no encontrada" });
    }

    if (!(await canAccessRoute(rutaDoc.data(), adminUid, tiUser))) {
      return res.status(403).json({ error: "No tienes acceso a esta ruta" });
    }

    const updates = { updatedAt: new Date() };

    if (codigo !== undefined) {
      if (!String(codigo).trim()) {
        return res.status(400).json({ error: "Código inválido" });
      }
      updates.codigo = String(codigo).trim();
    }

    if (origen !== undefined) {
      updates.origen = String(origen || "").trim();
    }

    if (destino !== undefined) {
      updates.destino = String(destino || "").trim();
    }

    if (Object.keys(updates).length === 1) {
      return res.status(400).json({ error: "No hay cambios válidos para actualizar" });
    }

    await rutaDoc.ref.update(updates);
    res.json({ message: "Ruta actualizada correctamente" });
  } catch (error) {
    console.error("admin error:", error);
    res.status(500).json({ error: "Error al actualizar la ruta" });
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

    if (!(await canAccessRoute(rutaDoc.data(), adminUid, tiUser))) {
      return res.status(403).json({ error: "No tienes acceso a esta ruta" });
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
    const adminUid = req.user.uid;
    const rutaId = req.params.id;
    const { estado } = req.body;
    const tiUser = isTIUser(req);

    const estadosValidos = ["pendiente", "activa", "completada", "cancelada"];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: "Estado inválido" });
    }

    const rutaDoc = await db.collection("routes").doc(rutaId).get();
    if (!rutaDoc.exists) {
      return res.status(404).json({ error: "Ruta no encontrada" });
    }

    if (!(await canAccessRoute(rutaDoc.data(), adminUid, tiUser))) {
      return res.status(403).json({ error: "No tienes acceso a esta ruta" });
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
  getMisRutas,
  getRutaActualChofer,
  getHistorialChofer,
  getKpisChofer,
  getReporteEquipo,
  crearRuta,
  actualizarRuta,
  asignarChoferRuta,
  cambiarEstadoRuta,
};
