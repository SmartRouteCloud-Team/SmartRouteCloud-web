import { logout, observarUsuario } from "./auth.js";

// PROTEGER RUTA
observarUsuario((user) => {
  if (!user) {
    window.location.href = "/";
  }
});

// LOGOUT
document.getElementById("logout").addEventListener("click", () => {
  logout();
  window.location.href = "/";
});

// DATOS DEMO (tipo Mercado Libre)
const envios = [
  { id: "ML1001", estado: "En tránsito" },
  { id: "ML1002", estado: "Entregado" },
  { id: "ML1003", estado: "Retrasado" },
  { id: "ML1004", estado: "En tránsito" }
];

let transito = 0, entregados = 0, retrasados = 0;

const lista = document.getElementById("listaEnvios");

envios.forEach(e => {
  const li = document.createElement("li");
  li.textContent = `${e.id} - ${e.estado}`;
  lista.appendChild(li);

  if (e.estado === "En tránsito") transito++;
  if (e.estado === "Entregado") entregados++;
  if (e.estado === "Retrasado") retrasados++;
});

document.getElementById("transito").textContent = transito;
document.getElementById("entregados").textContent = entregados;
document.getElementById("retrasados").textContent = retrasados;