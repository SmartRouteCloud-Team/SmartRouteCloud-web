import { apiFetch, getProfileOrRedirect } from "./pageAuth.js";

const MAX_RUTAS = 3;
let currentRoute = null;
let editId = null;
let choferes = [];
let rutas = [];
let marker = null;

const selChofer = document.getElementById("chofer");
const filterChofer = document.getElementById("filterChofer");
const map = L.map("map").setView([19.4326, -99.1332], 6);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap",
}).addTo(map);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function encodeId(id) {
  return encodeURIComponent(String(id ?? ""));
}

function uiStateFromBackend(estado) {
  if (estado === "activa") return "activa";
  if (estado === "pendiente") return "pendiente";
  return "inactiva";
}

function backendStateFromUi(estado) {
  if (estado === "activa") return "activa";
  if (estado === "pendiente") return "pendiente";
  return "cancelada";
}

function mapEntregaState(estado) {
  if (estado === "completada") return "completed";
  if (estado === "fallida") return "failed";
  if (estado === "en_proceso") return "process";
  return "waiting";
}

function getChoferName(uid) {
  const chofer = choferes.find((c) => c.id === uid);
  return chofer ? (chofer.nombre || chofer.email || chofer.id) : "Sin asignar";
}

function normalizeRoute(route) {
  return {
    id: route.id,
    nombre: route.codigo || route.nombre || `Ruta-${route.id}`,
    origen: route.origen || "N/A",
    destino: route.destino || "N/A",
    choferUid: route.choferAsignado || null,
    chofer: getChoferName(route.choferAsignado),
    estado: uiStateFromBackend(route.estado),
    lat: route.lat ?? route.ubicacionActual?.lat ?? 19.4326,
    lng: route.lng ?? route.ubicacionActual?.lng ?? -99.1332,
    entregas: (route.entregas || []).map((e, idx) => ({
      pedido: e.id || e.pedido || `#${idx + 1}`,
      cliente: e.cliente || e.destinatario || "Cliente",
      direccion: e.direccion || "Sin dirección",
      estado: mapEntregaState(e.estado),
    })),
  };
}

async function loadChoferes() {
  try {
    const data = await apiFetch("/api/ti/todos-choferes");
    choferes = data.choferes || [];
  } catch {
    const data = await apiFetch("/api/admin/mis-choferes");
    choferes = data.choferes || [];
  }
}

async function loadRutas() {
  try {
    const data = await apiFetch("/api/ti/todas-rutas");
    rutas = (data.rutas || []).map(normalizeRoute);
  } catch {
    rutas = [];
  }
}

function initSelects() {
  selChofer.innerHTML = "";
  filterChofer.innerHTML = '<option value="all">Todos los choferes</option>';

  choferes.forEach((c) => {
    const choferName = c.nombre || c.email || c.id;
    selChofer.innerHTML += `<option value="${escapeHtml(c.id)}">${escapeHtml(choferName)}</option>`;
    filterChofer.innerHTML += `<option value="${escapeHtml(c.id)}">${escapeHtml(choferName)}</option>`;
  });
}

function countRoutes(choferUid) {
  return rutas.filter((r) => r.choferUid === choferUid).length;
}

function renderDrivers() {
  const box = document.getElementById("drivers");
  box.innerHTML = "";

  choferes.forEach((c) => {
    const count = countRoutes(c.id);
    const percent = (count / MAX_RUTAS) * 100;
    let color = "low";
    if (percent >= 70) color = "high";
    else if (percent >= 40) color = "medium";

    box.innerHTML += `
      <div class="driver">
        <h4>${escapeHtml(c.nombre || c.email || c.id)}</h4>
        <div>${count}/${MAX_RUTAS} rutas</div>
        <div class="capacity"><div class="capacity-fill ${color}" style="width:${Math.min(percent, 100)}%"></div></div>
      </div>
    `;
  });
}

function renderMapForRoute(route) {
  if (marker) {
    map.removeLayer(marker);
    marker = null;
  }

  const lat = Number(route.lat);
  const lng = Number(route.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return;

  marker = L.marker([lat, lng]).addTo(map).bindPopup(`${escapeHtml(route.nombre)} - ${escapeHtml(route.chofer)}`);
  map.setView([lat, lng], 7);
}

function renderDeliveries() {
  const box = document.getElementById("deliveries");
  if (!currentRoute) {
    box.innerHTML = "";
    return;
  }

  const filter = document.getElementById("deliveryFilter").value;
  const filtered = currentRoute.entregas.filter((d) => filter === "all" || d.estado === filter);

  box.innerHTML = filtered
    .map((d, index) => `
      <div class="delivery-card">
        <div class="delivery-header" onclick="toggleAccordion(${index})">
          <div><strong>${escapeHtml(d.pedido)}</strong> - ${escapeHtml(d.cliente)}</div>
          <span class="delivery-badge ${escapeHtml(d.estado)}">${escapeHtml(d.estado)}</span>
        </div>
        <div id="accordion-${index}" style="display:none; margin-top:10px;">
          <small>${escapeHtml(d.direccion)}</small>
        </div>
      </div>
    `)
    .join("");
}

function render() {
  const fEstado = document.getElementById("filterEstado").value;
  const fChofer = document.getElementById("filterChofer").value;
  const rows = document.getElementById("rows");
  rows.innerHTML = "";

  let act = 0;
  let inact = 0;
  let pend = 0;

  rutas.forEach((r) => {
    if (fEstado !== "all" && r.estado !== fEstado) return;
    if (fChofer !== "all" && r.choferUid !== fChofer) return;

    if (r.estado === "activa") act += 1;
    if (r.estado === "inactiva") inact += 1;
    if (r.estado === "pendiente") pend += 1;

    const editing = editId === r.id;
    const uso = r.choferUid ? countRoutes(r.choferUid) : 0;

    const encodedId = encodeId(r.id);

    rows.innerHTML += `
      <div class="row ${editing ? "editing" : ""}" onclick="showDetailByEncoded('${encodedId}')">
        <div>${escapeHtml(r.nombre)}</div>
        <div>${escapeHtml(r.origen)}</div>
        <div>${escapeHtml(r.destino)}</div>
        <div>${escapeHtml(r.chofer)}</div>
        <div><span class="badge ${escapeHtml(r.estado)}">${escapeHtml(r.estado)}</span></div>
        <div>
          <button class="icon-btn edit" onclick="event.stopPropagation();editByEncoded('${encodedId}')">✏️</button>
          <button class="icon-btn delete" onclick="event.stopPropagation();delByEncoded('${encodedId}')">✖</button>
        </div>
        <div>${uso}/${MAX_RUTAS}</div>
      </div>
    `;
  });

  document.getElementById("total").innerText = rutas.length;
  document.getElementById("act").innerText = act;
  document.getElementById("inact").innerText = inact;
  document.getElementById("pend").innerText = pend;

  renderDrivers();
}

function showDetail(id) {
  currentRoute = rutas.find((r) => r.id === id) || null;
  const title = document.getElementById("detailTitle");

  if (!currentRoute) {
    title.textContent = "Selecciona una ruta";
    document.getElementById("deliveries").innerHTML = "";
    return;
  }

  title.textContent = `${currentRoute.nombre} - ${currentRoute.chofer}`;
  renderDeliveries();
  renderMapForRoute(currentRoute);
}

function showDetailByEncoded(encodedId) {
  showDetail(decodeURIComponent(encodedId));
}

async function add() {
  const nombre = document.getElementById("nombre").value.trim();
  const estadoUi = document.getElementById("estado").value;
  const choferUid = document.getElementById("chofer").value;

  if (!nombre) {
    alert("Ingresa un nombre/código de ruta");
    return;
  }

  if (editId) {
    if (choferUid) {
      await apiFetch(`/api/admin/rutas/${editId}/asignar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choferUid }),
      });
    }

    await apiFetch(`/api/admin/rutas/${editId}/estado`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: backendStateFromUi(estadoUi) }),
    });
  } else {
    const created = await apiFetch("/api/admin/rutas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        codigo: nombre,
        fechaProgramada: new Date().toISOString(),
        entregas: [],
      }),
    });

    if (choferUid) {
      await apiFetch(`/api/admin/rutas/${created.id}/asignar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choferUid }),
      });
    }

    if (estadoUi !== "pendiente") {
      await apiFetch(`/api/admin/rutas/${created.id}/estado`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: backendStateFromUi(estadoUi) }),
      });
    }
  }

  editId = null;
  await loadRutas();
  render();
}

function edit(id) {
  const r = rutas.find((x) => x.id === id);
  if (!r) return;

  document.getElementById("nombre").value = r.nombre;
  document.getElementById("origen").value = r.origen;
  document.getElementById("destino").value = r.destino;
  document.getElementById("chofer").value = r.choferUid || "";
  document.getElementById("estado").value = r.estado;

  editId = id;
  render();
}

function del(id) {
  alert(`No existe endpoint para eliminar la ruta ${id} en backend actualmente.`);
}

function editByEncoded(encodedId) {
  edit(decodeURIComponent(encodedId));
}

function delByEncoded(encodedId) {
  del(decodeURIComponent(encodedId));
}

function filterDeliveries() {
  renderDeliveries();
}

function toggleAccordion(index) {
  const el = document.getElementById(`accordion-${index}`);
  if (!el) return;
  el.style.display = el.style.display === "none" ? "block" : "none";
}

window.render = render;
window.add = () => add().catch((error) => alert(`Error: ${error.message}`));
window.showDetail = showDetail;
window.showDetailByEncoded = showDetailByEncoded;
window.edit = edit;
window.editByEncoded = editByEncoded;
window.del = del;
window.delByEncoded = delByEncoded;
window.filterDeliveries = filterDeliveries;
window.toggleAccordion = toggleAccordion;

async function init() {
  await getProfileOrRedirect();
  await loadChoferes();
  await loadRutas();
  initSelects();
  render();
}

init().catch((error) => {
  console.error("Error en gestión de rutas:", error);
  alert(`No se pudo cargar la vista: ${error.message}`);
});
