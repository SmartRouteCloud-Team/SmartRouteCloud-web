const express = require("express");
const cors = require("cors");
const db = require("./firebase");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// 🔹 RUTA: GUARDAR PRODUCTO
app.post("/producto", async (req, res) => {
  try {
    const { nombre, precio } = req.body;

    if (!nombre || !precio) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const docRef = await db.collection("productos").add({
      nombre,
      precio
    });

    res.json({ id: docRef.id, mensaje: "Producto guardado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔹 RUTA: OBTENER PRODUCTOS
app.get("/productos", async (req, res) => {
  try {
    const snapshot = await db.collection("productos").get();
    const productos = [];

    snapshot.forEach(doc => {
      productos.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Servidor
app.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000");
});