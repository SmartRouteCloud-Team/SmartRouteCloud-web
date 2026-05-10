import {
  iniciarMapa,
  obtenerUbicacion,
  calcularRuta,
  dibujarRutaColoreada,
  eliminarRuta,
  marcadorCarrito,
  agregarMarcadorEstado
} from "./tomtomAPI.js";
import { logout, getUserProfile } from "./auth.js";
import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { config } from "./config.js";

document.getElementById("btnLogout").addEventListener("click", logout);

const roleViews = {
  ADMIN: document.getElementById("view-admin"),
  CHOFER: document.getElementById("view-chofer"),
  TI: document.getElementById("view-ti"),
  END_USER: document.getElementById("view-end-user")
};

function normalizeRole(role) {
  const normalized = (role || "").toUpperCase();
  if (normalized === "ADMIN" || normalized === "CHOFER" || normalized === "TI") return normalized;
  if (normalized === "USUARIO" || normalized === "USER" || normalized === "END_USER") return "END_USER";
  return "END_USER";
}

function setActiveRoleView(role) {
  Object.values(roleViews).forEach((el) => el.classList.add("d-none"));
  roleViews[role].classList.remove("d-none");
}

async function apiFetch(path) {
  const token = await auth.currentUser.getIdToken();
  const response = await fetch(`${config.backendURL}${path}`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Error de API");
  }

  return await response.json();
}

function card(title, value) {
  const safeTitle = escapeHtml(title);
  const safeValue = escapeHtml(value ?? 0);
  return `
    <div class="col-md-3 mb-3">
      <div class="card p-3">
        <small class="text-muted">${safeTitle}</small>
        <strong>${safeValue}</strong>
      </div>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

async function initAdminView() {
  const choferesData = await apiFetch("/api/admin/mis-choferes");
  const choferes = choferesData.choferes || [];
  const select = document.getElementById("admin-choferes-select");
  const kpisEl = document.getElementById("admin-kpis");

  if (choferes.length === 0) {
    select.innerHTML = "<option>No tienes choferes asignados</option>";
    kpisEl.innerHTML = `<div class="col-12"><div class="alert alert-secondary">No hay KPIs para mostrar.</div></div>`;
    return;
  }

  select.innerHTML = choferes
    .map((chofer) => {
      const choferId = escapeHtml(chofer.id);
      const choferName = escapeHtml(chofer.nombre || chofer.email || chofer.id);
      return `<option value="${choferId}">${choferName}</option>`;
    })
    .join("");

  const renderChoferKpis = async (choferUid) => {
    const [kpis, reporte] = await Promise.all([
      apiFetch(`/api/admin/choferes/${choferUid}/kpis`),
      apiFetch("/api/admin/reportes/mi-equipo")
    ]);

    kpisEl.innerHTML = [
      card("Rutas del chofer", kpis.totalRutas),
      card("Entregas del chofer", kpis.totalEntregas),
      card("Tasa éxito chofer", `${kpis.tasaExito || 0}%`),
      card("Tasa éxito equipo", `${reporte.tasaExitoEquipo || 0}%`)
    ].join("");
  };

  select.addEventListener("change", () => renderChoferKpis(select.value));
  await renderChoferKpis(select.value);
}

async function initTiView() {
  const [choferesData, reporte] = await Promise.all([
    apiFetch("/api/ti/todos-choferes"),
    apiFetch("/api/ti/reportes/sistema")
  ]);

  document.getElementById("ti-total-choferes").textContent = (choferesData.choferes || []).length;
  document.getElementById("ti-rutas-activas").textContent = reporte.rutas?.activas || 0;
  document.getElementById("ti-usuarios-activos").textContent = reporte.usuarios?.activos || 0;
}

async function initChoferView() {
  const map = iniciarMapa();
  let envios = [];
  const marcadores = {};
  let origenStr = null;

  const coloresRuta = {
    "RETRASADO": "#ef4444",
    "EN TRÁNSITO": "#FFA500"
  };

  const estadoAPIMap = {
    "EN TRÁNSITO": "en_proceso",
    "ENTREGADO": "completada",
    "RETRASADO": "fallida"
  };

  const estadoUIMap = {
    "en_proceso": "EN TRÁNSITO",
    "completada": "ENTREGADO",
    "fallida": "RETRASADO"
  };

  function aplicarColorSelect(select, estado) {
    const clases = {
      "EN TRÁNSITO": "text-warning border-warning",
      "ENTREGADO": "text-success border-success",
      "RETRASADO": "text-danger border-danger"
    };
    select.className = "select-estado form-select form-select-sm bg-light";
    select.classList.add(...clases[estado].split(" "));
  }

  function actualizarResumen() {
    document.getElementById("transito").textContent = envios.filter((e) => e.estado === "EN TRÁNSITO").length;
    document.getElementById("entregados").textContent = envios.filter((e) => e.estado === "ENTREGADO").length;
    document.getElementById("retrasados").textContent = envios.filter((e) => e.estado === "RETRASADO").length;
  }

  async function cambiarEstado(id, nuevoEstado) {
    const envio = envios.find((e) => e.id === id);
    if (!envio) return;

    envio.estado = nuevoEstado;
    actualizarResumen();

    try {
      await fetch(`${config.backendURL}/api/chofer/entregas/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${await auth.currentUser.getIdToken()}`
        },
        body: JSON.stringify({ estado: estadoAPIMap[nuevoEstado] || nuevoEstado })
      });
    } catch (err) {
      console.error("Error al actualizar entrega en backend:", err);
    }

    if (marcadores[id]) marcadores[id].remove();
    marcadores[id] = agregarMarcadorEstado(map, envio.lng, envio.lat, `${envio.id}`, nuevoEstado);

    if (nuevoEstado === "ENTREGADO") {
      eliminarRuta(map, id);
      return;
    }

    if (!origenStr) return;
    const destino = `${envio.lat},${envio.lng}`;
    const puntos = await calcularRuta(origenStr, destino);
    if (puntos) dibujarRutaColoreada(map, puntos, id, coloresRuta[nuevoEstado]);
  }

  function renderTabla() {
    const tbody = document.getElementById("tabla-envios");
    tbody.innerHTML = "";

    envios.forEach((envio) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${envio.id}</td>
        <td>
          <select class="select-estado form-select form-select-sm" data-id="${envio.id}">
            <option value="EN TRÁNSITO" ${envio.estado === "EN TRÁNSITO" ? "selected" : ""}>EN TRÁNSITO</option>
            <option value="ENTREGADO" ${envio.estado === "ENTREGADO" ? "selected" : ""}>ENTREGADO</option>
            <option value="RETRASADO" ${envio.estado === "RETRASADO" ? "selected" : ""}>RETRASADO</option>
          </select>
        </td>
      `;

      const select = tr.querySelector("select");
      aplicarColorSelect(select, envio.estado);
      select.addEventListener("change", (e) => {
        const nuevoEstado = e.target.value;
        cambiarEstado(e.target.dataset.id, nuevoEstado);
        aplicarColorSelect(e.target, nuevoEstado);
      });
      tbody.appendChild(tr);
    });

    actualizarResumen();
  }

  async function trazarRutasIniciales() {
    for (const estado of ["RETRASADO", "EN TRÁNSITO"]) {
      const filtrados = envios.filter((e) => e.estado === estado);
      for (const envio of filtrados) {
        const puntos = await calcularRuta(origenStr, `${envio.lat},${envio.lng}`);
        if (puntos) dibujarRutaColoreada(map, puntos, envio.id, coloresRuta[estado]);
      }
    }
  }

  async function iniciarSistemaChofer() {
    const ubicacion = await obtenerUbicacion();
    origenStr = ubicacion;
    const [lat, lng] = ubicacion.split(",").map((v) => parseFloat(v));
    map.setCenter([lng, lat]);
    map.setZoom(13);
    marcadorCarrito(map, lng, lat, "Mi ubicación");

    const data = await apiFetch("/api/chofer/mi-ruta/entregas");
    envios = (data.entregas || []).reduce((acc, e) => {
      const latEntrega = e.lat ?? e.latitud;
      const lngEntrega = e.lng ?? e.longitud;
      if (latEntrega == null || lngEntrega == null) return acc;
      acc.push({
        id: e.id,
        lat: latEntrega,
        lng: lngEntrega,
        estado: estadoUIMap[e.estado] ?? "EN TRÁNSITO"
      });
      return acc;
    }, []);

    envios.forEach((envio) => {
      marcadores[envio.id] = agregarMarcadorEstado(map, envio.lng, envio.lat, envio.id, envio.estado);
    });
    await trazarRutasIniciales();
    renderTabla();
  }

  map.on("load", () => iniciarSistemaChofer().catch((error) => console.error("Error chofer:", error)));
}

function showLoading(done) {
  document.getElementById("estado-carga").classList.toggle("d-none", done);
}

function showError(message) {
  const el = document.getElementById("estado-error");
  el.textContent = message;
  el.classList.remove("d-none");
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/index.html";
    return;
  }

  try {
    let cached = null;
    try {
      cached = JSON.parse(sessionStorage.getItem("src_profile") || "null");
    } catch (error) {
      console.warn("Perfil en cache inválido, se limpiará sessionStorage:", error);
      sessionStorage.removeItem("src_profile");
    }
    const profile = cached && cached.uid === user.uid ? cached : await getUserProfile();
    sessionStorage.setItem("src_profile", JSON.stringify(profile));

    const role = normalizeRole(profile?.role);
    const roleLabels = { ADMIN: "ADMIN", CHOFER: "CHOFER", TI: "TI", END_USER: "END_USER" };
    const safeRoleLabel = roleLabels[role] || "END_USER";
    document.getElementById("perfil-usuario").textContent = `${profile?.nombre || profile?.email || user.email} · ${safeRoleLabel}`;
    setActiveRoleView(role);
    showLoading(true);

    if (role === "ADMIN") await initAdminView();
    else if (role === "TI") await initTiView();
    else if (role === "CHOFER") await initChoferView();
  } catch (error) {
    showLoading(true);
    showError(`No fue posible cargar el dashboard: ${error.message}`);
    console.error(error);
  }
});
