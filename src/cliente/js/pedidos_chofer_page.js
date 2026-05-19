import { apiFetch, getProfileOrRedirect } from "./pageAuth.js";

const DEFAULT_MAP_CENTER = { lat: 19.4, lng: -99.1 };
let selected = null;
let markers = [];
let line;
let currentProfile = null;

const driverData = {
  nombre: "Chofer",
  ruta: [],
  incidencias: [],
};

const map = L.map("map").setView([DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng], 6);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap",
}).addTo(map);

function uiState(estado) {
  if (estado === "completada") return "completed";
  if (estado === "fallida") return "failed";
  if (estado === "en_proceso") return "process";
  return "pending";
}

function apiState(estado) {
  if (estado === "completed") return "completada";
  if (estado === "failed") return "fallida";
  if (estado === "process") return "en_proceso";
  return "en_proceso";
}

function renderRoute() {
  const box = document.getElementById("route");
  box.innerHTML = "";

  driverData.ruta.forEach((p, i) => {
    box.innerHTML += `
      <div class="point point-item" data-index="${i}">
        <div class="num">${i + 1}</div>
        <div class="dot ${p.estado}"></div>
        <div>
          <strong>${p.pedido}</strong><br>
          <small>${p.cliente} - $${p.valor}</small>
        </div>
      </div>
    `;
  });

  box.querySelectorAll(".point-item").forEach((item) => {
    item.addEventListener("click", () => {
      const index = Number(item.dataset.index);
      if (!Number.isNaN(index)) select(index);
    });
  });
}

function renderDetail() {
  if (selected === null) {
    document.getElementById("detail").innerHTML = "Selecciona un pedido";
    return;
  }

  const p = driverData.ruta[selected];
  document.getElementById("detail").innerHTML = `
    <div class="status-box">
      <div>
        <strong>${p.pedido}</strong><br>
        <small>${p.cliente} - $${p.valor}</small>
      </div>
      <span class="badge ${p.estado}">${p.estado}</span>
    </div>
    <div class="actions">
      <button class="blue status-action" data-status="process">Proceso</button>
      <button class="green status-action" data-status="completed">Entregada</button>
      <button class="red status-action" data-status="failed">Fallida</button>
    </div>
  `;

  document.querySelectorAll(".status-action").forEach((button) => {
    button.addEventListener("click", () => {
      const status = button.dataset.status;
      if (!status) return;
      applyStatus(status).catch((error) => alert(`Error: ${error.message}`));
    });
  });
}

async function applyStatus(status) {
  if (selected === null) return;
  const pedido = driverData.ruta[selected];

  await apiFetch(`/api/chofer/entregas/${pedido.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estado: apiState(status) }),
  });

  driverData.ruta[selected].estado = status;
  render();
  renderDetail();
}

function updateIncSelect() {
  const sel = document.getElementById("incTarget");
  sel.innerHTML = `<option value="general">Incidencia general</option>`;

  driverData.ruta.forEach((p, i) => {
    sel.innerHTML += `<option value="${i}">Pedido ${p.pedido}</option>`;
  });
}

function addInc() {
  const txt = document.getElementById("incText").value;
  const target = document.getElementById("incTarget").value;
  if (!txt.trim()) return;

  let label = "General";
  if (target !== "general") {
    const idx = Number(target);
    if (Number.isNaN(idx) || idx < 0 || idx >= driverData.ruta.length) {
      alert("No se pudo asociar la incidencia al pedido seleccionado.");
      return;
    }
    label = `Pedido ${driverData.ruta[idx].pedido}`;
  }

  driverData.incidencias.push({ text: txt, target: label });
  document.getElementById("incText").value = "";
  renderInc();
}

function renderInc() {
  const box = document.getElementById("incList");
  box.innerHTML = "";

  driverData.incidencias.forEach((i) => {
    box.innerHTML += `<div class="inc"><strong>${i.target}</strong><br>${i.text}</div>`;
  });
}

function renderMap() {
  markers.forEach((m) => map.removeLayer(m));
  markers = [];
  if (line) map.removeLayer(line);

  const coords = driverData.ruta
    .filter((p) => typeof p.lat === "number" && typeof p.lng === "number")
    .map((p) => [p.lat, p.lng]);

  if (coords.length === 0) return;

  line = L.polyline(coords, { color: "#2563eb" }).addTo(map);

  coords.forEach((point, i) => {
    const m = L.marker(point).addTo(map).bindPopup(driverData.ruta[i].pedido);
    markers.push(m);
  });

  map.fitBounds(line.getBounds());
}

function select(index) {
  selected = index;
  renderDetail();
}

function render() {
  renderRoute();
  renderDetail();
  renderInc();
  updateIncSelect();
  renderMap();
}

async function init() {
  currentProfile = await getProfileOrRedirect();
  if (!currentProfile) return;

  document.getElementById("driverName").innerText = currentProfile.nombre || currentProfile.email || "Chofer";
  driverData.nombre = document.getElementById("driverName").innerText;

  const data = await apiFetch("/api/chofer/mi-ruta/entregas");
  driverData.ruta = (data.entregas || []).map((p, idx) => ({
    id: p.id,
    pedido: p.id || `#${idx + 1}`,
    cliente: p.cliente || p.destinatario || "Cliente",
    dir: p.direccion || "Sin dirección",
    valor: Number(p.valor || p.monto || 0),
    estado: uiState(p.estado),
    lat: p.lat ?? p.latitud,
    lng: p.lng ?? p.longitud,
  }));

  render();
}

window.select = select;
window.addInc = addInc;

init().catch((error) => {
  console.error("Error en pedidos chofer:", error);
  alert(`No se pudo cargar la vista: ${error.message}`);
});
