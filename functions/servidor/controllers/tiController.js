const { db, admin } = require("../config/firebaseAdmin");

// GET /api/ti/todos-choferes - Ver todos los choferes del sistema
async function getTodosChoferes(req, res) {
  try {
    const choferesSnapshot = await db
      .collection("users")
      .where("role", "==", "CHOFER")
      .get();

    const choferes = choferesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ choferes });
  } catch (error) {
    console.error("ti error:", error);
    res.status(500).json({ error: "Error al obtener los choferes" });
  }
}

// GET /api/ti/todas-rutas - Ver todas las rutas del sistema
async function getTodasRutas(req, res) {
  try {
    const routesSnapshot = await db
      .collection("routes")
      .orderBy("fechaProgramada", "desc")
      .get();

    const rutas = routesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ rutas });
  } catch (error) {
    console.error("ti error:", error);
    res.status(500).json({ error: "Error al obtener las rutas" });
  }
}

// GET /api/ti/reportes/sistema - KPIs del sistema completo
async function getReportesSistema(req, res) {
  try {
    const [usersSnapshot, routesSnapshot] = await Promise.all([
      db.collection("users").get(),
      db.collection("routes").get(),
    ]);

    let totalChoferes = 0;
    let totalAdmins = 0;
    let totalTI = 0;
    let usuariosActivos = 0;

    usersSnapshot.docs.forEach((doc) => {
      const user = doc.data();
      if (user.role === "CHOFER") totalChoferes++;
      if (user.role === "ADMIN") totalAdmins++;
      if (user.role === "TI") totalTI++;
      if (user.estado === "activo") usuariosActivos++;
    });

    let totalRutas = routesSnapshot.size;
    let rutasActivas = 0;
    let totalEntregas = 0;
    let entregasCompletadas = 0;
    let entregasFallidas = 0;

    routesSnapshot.docs.forEach((doc) => {
      const ruta = doc.data();
      if (ruta.estado === "activa") rutasActivas++;
      if (ruta.entregas && Array.isArray(ruta.entregas)) {
        ruta.entregas.forEach((entrega) => {
          totalEntregas++;
          if (entrega.estado === "completada") entregasCompletadas++;
          if (entrega.estado === "fallida") entregasFallidas++;
        });
      }
    });

    res.json({
      usuarios: {
        total: usersSnapshot.size,
        activos: usuariosActivos,
        choferes: totalChoferes,
        admins: totalAdmins,
        ti: totalTI,
      },
      rutas: {
        total: totalRutas,
        activas: rutasActivas,
      },
      entregas: {
        total: totalEntregas,
        completadas: entregasCompletadas,
        fallidas: entregasFallidas,
        tasaExito:
          totalEntregas > 0 ? Math.round((entregasCompletadas / totalEntregas) * 100) : 0,
      },
    });
  } catch (error) {
    console.error("ti error:", error);
    res.status(500).json({ error: "Error al obtener reportes del sistema" });
  }
}

// POST /api/ti/users - Crear usuario
async function crearUsuario(req, res) {
  try {
    const { email, password, nombre, role, adminAsignado } = req.body;

    if (!email || !password || !nombre || !role) {
      return res.status(400).json({ error: "email, password, nombre y role son requeridos" });
    }

    const rolesValidos = ["CHOFER", "ADMIN", "TI"];
    if (!rolesValidos.includes(role)) {
      return res.status(400).json({ error: "Rol inválido" });
    }

    const userRecord = await admin.auth().createUser({ email, password, displayName: nombre });

    const nuevoUsuario = {
      nombre,
      email,
      role,
      estado: "activo",
      adminAsignado: role === "CHOFER" ? adminAsignado || null : null,
      choferesAsignados: role === "ADMIN" ? [] : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("users").doc(userRecord.uid).set(nuevoUsuario);

    res.status(201).json({ id: userRecord.uid, ...nuevoUsuario });
  } catch (error) {
    console.error("ti error:", error);
    if (error.code === "auth/email-already-exists") {
      return res.status(409).json({ error: "El email ya está registrado" });
    }
    res.status(500).json({ error: "Error al crear el usuario" });
  }
}

// PUT /api/ti/users/:id/role - Cambiar rol de usuario
async function cambiarRolUsuario(req, res) {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    const rolesValidos = ["CHOFER", "ADMIN", "TI"];
    if (!rolesValidos.includes(role)) {
      return res.status(400).json({ error: "Rol inválido" });
    }

    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    await userDoc.ref.update({ role, updatedAt: new Date() });
    res.json({ message: "Rol actualizado correctamente" });
  } catch (error) {
    console.error("ti error:", error);
    res.status(500).json({ error: "Error al cambiar el rol del usuario" });
  }
}

// DELETE /api/ti/users/:id - Eliminar usuario
async function eliminarUsuario(req, res) {
  try {
    const userId = req.params.id;

    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    await admin.auth().deleteUser(userId);
    await userDoc.ref.delete();

    res.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    console.error("ti error:", error);
    if (error.code === "auth/user-not-found") {
      return res.status(404).json({ error: "Usuario no encontrado en Auth" });
    }
    res.status(500).json({ error: "Error al eliminar el usuario" });
  }
}

// POST /api/ti/seed - Crear colecciones/documentos base de demostración
async function seedDatabase(req, res) {
  try {
    const now = new Date();

    const adminData = req.body.admin || {};
    const choferData = req.body.chofer || {};

    const adminEmail = adminData.email || "admin@demo.com";
    const adminPassword = adminData.password || "Admin123!";
    const adminNombre = adminData.nombre || "Admin Demo";

    const choferEmail = choferData.email || "chofer@demo.com";
    const choferPassword = choferData.password || "Chofer123!";
    const choferNombre = choferData.nombre || "Chofer Demo";

    // Create Auth users (ignore if already exists and retrieve uid)
    let adminUid, choferUid;

    try {
      const adminRecord = await admin.auth().createUser({
        email: adminEmail,
        password: adminPassword,
        displayName: adminNombre,
      });
      adminUid = adminRecord.uid;
    } catch (err) {
      if (err.code === "auth/email-already-exists") {
        const existing = await admin.auth().getUserByEmail(adminEmail);
        adminUid = existing.uid;
      } else {
        throw err;
      }
    }

    try {
      const choferRecord = await admin.auth().createUser({
        email: choferEmail,
        password: choferPassword,
        displayName: choferNombre,
      });
      choferUid = choferRecord.uid;
    } catch (err) {
      if (err.code === "auth/email-already-exists") {
        const existing = await admin.auth().getUserByEmail(choferEmail);
        choferUid = existing.uid;
      } else {
        throw err;
      }
    }

    // Pre-generate document refs so IDs are available for cross-references
    const unidadRef = db.collection("unidades").doc();
    const conductorRef = db.collection("conductores").doc(choferUid);
    const rutaRef = db.collection("rutas").doc();
    const entregaRef = db.collection("entregas").doc();
    const routeRef = db.collection("routes").doc();

    // Role document refs (fixed IDs for idempotency)
    const roleAdminRef = db.collection("roles").doc("ADMIN");
    const roleChoferRef = db.collection("roles").doc("CHOFER");
    const roleTiRef = db.collection("roles").doc("TI");

    const demoEntrega = {
      id: entregaRef.id,
      estado: "pendiente",
      lat: 19.432608,
      lng: -99.133209,
      direccion: "Calle Demo 123",
    };

    const batch = db.batch();

    // roles
    batch.set(roleAdminRef, {
      nombre: "Administrador",
      descripcion: "Gestiona choferes, rutas y reportes de su equipo",
      createdAt: now,
      updatedAt: now,
    });

    batch.set(roleChoferRef, {
      nombre: "Chofer",
      descripcion: "Visualiza y actualiza sus rutas y entregas asignadas",
      createdAt: now,
      updatedAt: now,
    });

    batch.set(roleTiRef, {
      nombre: "TI",
      descripcion: "Acceso completo al sistema para administración técnica",
      createdAt: now,
      updatedAt: now,
    });

    // users
    batch.set(db.collection("users").doc(adminUid), {
      nombre: adminNombre,
      email: adminEmail,
      role: "ADMIN",
      roleRef: roleAdminRef,
      estado: "activo",
      adminAsignado: null,
      choferesAsignados: [choferUid],
      createdAt: now,
      updatedAt: now,
    });

    batch.set(db.collection("users").doc(choferUid), {
      nombre: choferNombre,
      email: choferEmail,
      role: "CHOFER",
      roleRef: roleChoferRef,
      estado: "activo",
      adminAsignado: adminUid,
      choferesAsignados: null,
      createdAt: now,
      updatedAt: now,
    });

    // unidades
    batch.set(unidadRef, {
      unidadId: unidadRef.id,
      tipo: "Camión",
      placa: "ABC-1234",
      conductorAsignado: choferUid,
      estado: "activo",
      capacidad: 1000,
      createdAt: now,
      updatedAt: now,
    });

    // conductores
    batch.set(conductorRef, {
      conductorId: choferUid,
      nombre: choferNombre,
      telefono: "555-0000",
      licencia: "LIC-DEMO-001",
      estado: "activo",
      unidadAsignada: unidadRef.id,
      rutas: [rutaRef.id],
      createdAt: now,
      updatedAt: now,
    });

    // rutas (includes linked entrega ID)
    batch.set(rutaRef, {
      rutaId: rutaRef.id,
      conductorId: choferUid,
      unidadId: unidadRef.id,
      estado: "pendiente",
      origen: "Bodega Central",
      destino: "Zona Norte",
      entregas: [entregaRef.id],
      horario: "08:00",
      createdAt: now,
      updatedAt: now,
    });

    // entregas
    batch.set(entregaRef, {
      entregaId: entregaRef.id,
      rutaId: rutaRef.id,
      estado: "pendiente",
      destinatario: "Cliente Demo",
      direccion: "Calle Demo 123",
      latitud: 19.432608,
      longitud: -99.133209,
      peso: 10,
      volumen: 0.05,
      ordenEntrega: 1,
      createdAt: now,
      updatedAt: now,
    });

    // routes (dashboard)
    batch.set(routeRef, {
      codigo: "RUTA-DEMO-001",
      creadoPor: adminUid,
      choferAsignado: choferUid,
      fechaProgramada: now,
      estado: "pendiente",
      entregas: [demoEntrega],
      createdAt: now,
      updatedAt: now,
    });

    await batch.commit();

    res.status(201).json({
      message: "Seed completado correctamente",
      adminUid,
      choferUid,
    });
  } catch (error) {
    console.error("ti seed error:", error);
    res.status(500).json({ error: "Error al ejecutar el seed" });
  }
}

module.exports = {
  getTodosChoferes,
  getTodasRutas,
  getReportesSistema,
  crearUsuario,
  cambiarRolUsuario,
  eliminarUsuario,
  seedDatabase,
};
