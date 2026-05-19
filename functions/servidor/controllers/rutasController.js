const { db, admin } = require("../config/firebaseAdmin");

// POST /api/rutas/cargar-masivo - Carga masiva de rutas desde JSON (CSV convertido)
async function cargarMasivo(req, res) {
  try {
    const { rutas } = req.body;

    if (!rutas || !Array.isArray(rutas) || rutas.length === 0) {
      return res
        .status(400)
        .json({ error: "Se requiere un array 'rutas' con datos de entregas" });
    }

    // Agrupar filas por unidad (ID de Unidad)
    const unidadesMap = new Map();

    for (const fila of rutas) {
      const unidadId = fila["ID de Unidad"] || fila.unidadId;
      if (!unidadId) continue;

      if (!unidadesMap.has(unidadId)) {
        unidadesMap.set(unidadId, {
          unidadId,
          nombre: fila.Unidad || fila.unidad || unidadId,
          tipo: fila.Tipo || fila.tipo || "Moto",
          entregas: [],
        });
      }

      unidadesMap.get(unidadId).entregas.push({
        idPedido: fila.ID_Pedido || fila.idPedido || null,
        ordenEntrega: parseInt(fila.Orden_Entrega || fila.ordenEntrega, 10) || 0,
        latitud: parseFloat(fila.Latitud || fila.latitud) || 0,
        longitud: parseFloat(fila.Longitud || fila.longitud) || 0,
        peso: parseFloat(fila.Peso || fila.peso) || 0,
        volumen: parseFloat(fila.Volumen || fila.volumen) || 0,
        calle: fila.Calle || fila.calle || "",
        numero: fila["Número"] || fila.numero || "",
        ciudad: fila.Ciudad || fila.ciudad || "",
      });
    }

    const resumen = {
      unidades: { creadas: 0, actualizadas: 0 },
      conductores: { creados: 0, actualizados: 0 },
      rutas: { creadas: 0, actualizadas: 0 },
      entregas: { creadas: 0, actualizadas: 0 },
    };

    const horario = new Date().toISOString();

    for (const [unidadId, datos] of unidadesMap) {
      const conductorId = `COND-${unidadId}`;
      const rutaId = `RUTA-${unidadId}`;

      const batch = db.batch();

      // ── Unidad ──────────────────────────────────────────────────────────────
      const unidadRef = db.collection("unidades").doc(unidadId);
      const unidadDoc = await unidadRef.get();

      const unidadData = {
        unidadId,
        tipo: datos.tipo,
        placa: datos.nombre,
        conductorAsignado: conductorId,
        estado: "en-ruta",
        capacidad: datos.tipo === "Camion" ? 5000 : 500,
        updatedAt: new Date(),
      };

      if (unidadDoc.exists) {
        batch.update(unidadRef, unidadData);
        resumen.unidades.actualizadas++;
      } else {
        batch.set(unidadRef, { ...unidadData, createdAt: new Date() });
        resumen.unidades.creadas++;
      }

      // ── Conductor ────────────────────────────────────────────────────────────
      const conductorRef = db.collection("conductores").doc(conductorId);
      const conductorDoc = await conductorRef.get();

      const conductorBase = {
        conductorId,
        nombre: `Conductor ${datos.nombre}`,
        telefono: "",
        licencia: "",
        estado: "activo",
        unidadAsignada: unidadId,
        updatedAt: new Date(),
      };

      if (conductorDoc.exists) {
        batch.update(conductorRef, {
          ...conductorBase,
          rutas: admin.firestore.FieldValue.arrayUnion(rutaId),
        });
        resumen.conductores.actualizados++;
      } else {
        batch.set(conductorRef, {
          ...conductorBase,
          rutas: [rutaId],
          createdAt: new Date(),
        });
        resumen.conductores.creados++;
      }

      // ── Entregas ─────────────────────────────────────────────────────────────
      const entregaIds = [];

      for (const entrega of datos.entregas) {
        const entregaId =
          entrega.idPedido || `ENT-${unidadId}-${entrega.ordenEntrega}`;
        entregaIds.push(entregaId);

        const entregaRef = db.collection("entregas").doc(entregaId);
        const entregaDoc = await entregaRef.get();

        const entregaData = {
          entregaId,
          rutaId,
          estado: "en-transito",
          destinatario: `Destinatario ${entregaId}`,
          direccion: `${entrega.calle} ${entrega.numero}, ${entrega.ciudad}`,
          latitud: entrega.latitud,
          longitud: entrega.longitud,
          peso: entrega.peso,
          volumen: entrega.volumen,
          ordenEntrega: entrega.ordenEntrega,
          updatedAt: new Date(),
        };

        if (entregaDoc.exists) {
          batch.update(entregaRef, entregaData);
          resumen.entregas.actualizadas++;
        } else {
          batch.set(entregaRef, { ...entregaData, createdAt: new Date() });
          resumen.entregas.creadas++;
        }
      }

      // ── Ruta ─────────────────────────────────────────────────────────────────
      const rutaRef = db.collection("rutas").doc(rutaId);
      const rutaDoc = await rutaRef.get();

      const primerEntrega = datos.entregas[0];
      const ultimaEntrega = datos.entregas[datos.entregas.length - 1];

      const rutaData = {
        rutaId,
        conductorId,
        unidadId,
        estado: "en-progreso",
        origen: primerEntrega
          ? `${primerEntrega.calle} ${primerEntrega.numero}, ${primerEntrega.ciudad}`
          : "",
        destino: ultimaEntrega
          ? `${ultimaEntrega.calle} ${ultimaEntrega.numero}, ${ultimaEntrega.ciudad}`
          : "",
        entregas: entregaIds,
        horario,
        updatedAt: new Date(),
      };

      if (rutaDoc.exists) {
        batch.update(rutaRef, rutaData);
        resumen.rutas.actualizadas++;
      } else {
        batch.set(rutaRef, { ...rutaData, createdAt: new Date() });
        resumen.rutas.creadas++;
      }

      await batch.commit();
    }

    res.status(201).json({
      message: "Carga masiva completada exitosamente",
      resumen,
    });
  } catch (error) {
    console.error("rutasController error:", error);
    res.status(500).json({ error: "Error al procesar la carga masiva de rutas" });
  }
}

module.exports = { cargarMasivo };
