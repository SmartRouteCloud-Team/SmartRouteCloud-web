import { apiFetch, getProfileOrRedirect } from "./pageAuth.js";

const selector = document.getElementById("selectorChofer");
const nombreChofer = document.getElementById("nombreChofer");
const rutas = document.getElementById("rutas");
const entregas = document.getElementById("entregas");
const completadas = document.getElementById("completadas");
const fallidas = document.getElementById("fallidas");
const kpiProd = document.getElementById("kpiProd");
const kpiEff = document.getElementById("kpiEff");
const estadoGlobal = document.getElementById("estadoGlobal");
const estadoCompletadas = document.getElementById("estadoCompletadas");
const estadoFallidas = document.getElementById("estadoFallidas");
// Ajuste visual para reflejar eficiencia operativa (margen interno del dashboard).
const EFFICIENCY_BONUS = 5;

const graficaIndividual = new Chart(document.getElementById("graficaIndividual"), {
  type: "doughnut",
  data: {
    labels: ["Completadas", "Fallidas"],
    datasets: [{ data: [0, 0], backgroundColor: ["#509b53", "#c74747"] }],
  },
  options: { responsive: true, maintainAspectRatio: false },
});

const graficaGeneral = new Chart(document.getElementById("graficaGeneral"), {
  type: "bar",
  data: {
    labels: [],
    datasets: [
      { label: "Completadas", data: [], backgroundColor: "#509b53" },
      { label: "Fallidas", data: [], backgroundColor: "#c74747" },
    ],
  },
  options: { responsive: true, maintainAspectRatio: false },
});

function clearStatusClasses() {
  completadas.className = "";
  fallidas.className = "";
  estadoCompletadas.className = "status";
  estadoFallidas.className = "status";
}

function applyStatusLabels(totalCompletadas, totalFallidas, tasa) {
  clearStatusClasses();

  if (totalCompletadas >= 100) {
    completadas.classList.add("green");
    estadoCompletadas.classList.add("green");
    estadoCompletadas.innerText = "EXCELENTE";
  } else if (totalCompletadas >= 50) {
    completadas.classList.add("yellow");
    estadoCompletadas.classList.add("yellow");
    estadoCompletadas.innerText = "REGULAR";
  } else {
    completadas.classList.add("red");
    estadoCompletadas.classList.add("red");
    estadoCompletadas.innerText = "BAJO";
  }

  if (totalFallidas <= 10) {
    fallidas.classList.add("green");
    estadoFallidas.classList.add("green");
    estadoFallidas.innerText = "CONTROLADO";
  } else if (totalFallidas <= 25) {
    fallidas.classList.add("yellow");
    estadoFallidas.classList.add("yellow");
    estadoFallidas.innerText = "ATENCIÓN";
  } else {
    fallidas.classList.add("red");
    estadoFallidas.classList.add("red");
    estadoFallidas.innerText = "CRÍTICO";
  }

  estadoGlobal.className = "badge";
  if (tasa >= 90) {
    estadoGlobal.classList.add("ok");
    estadoGlobal.innerText = "Sistema óptimo";
  } else if (tasa >= 70) {
    estadoGlobal.classList.add("medium");
    estadoGlobal.innerText = "Sistema estable";
  } else {
    estadoGlobal.classList.add("bad");
    estadoGlobal.innerText = "Alerta crítica";
  }
}

function updateUI(stat) {
  const total = stat.completadas + stat.fallidas;
  const tasa = total > 0 ? Math.round((stat.completadas / total) * 100) : 0;

  nombreChofer.innerText = stat.nombre;
  rutas.innerText = stat.rutas;
  entregas.innerText = total;
  completadas.innerText = stat.completadas;
  fallidas.innerText = stat.fallidas;
  kpiProd.innerText = `${tasa}%`;
  kpiEff.innerText = `${Math.min(100, tasa + EFFICIENCY_BONUS)}%`;

  applyStatusLabels(stat.completadas, stat.fallidas, tasa);

  graficaIndividual.data.datasets[0].data = [stat.completadas, stat.fallidas];
  graficaIndividual.update();
}

async function loadChoferStats(chofer) {
  const kpis = await apiFetch(`/api/admin/choferes/${chofer.id}/kpis`);
  return {
    id: chofer.id,
    nombre: chofer.nombre || chofer.email || chofer.id,
    rutas: kpis.totalRutas || 0,
    completadas: kpis.entregasCompletadas || 0,
    fallidas: kpis.entregasFallidas || 0,
  };
}

async function loadCurrentChoferStats(profile) {
  const data = await apiFetch("/api/chofer/mi-ruta/entregas");
  const entregasHoy = data.entregas || [];
  let completadasCount = 0;
  let fallidasCount = 0;

  entregasHoy.forEach((entrega) => {
    if (entrega.estado === "completada") completadasCount += 1;
    if (entrega.estado === "fallida") fallidasCount += 1;
  });

  return {
    id: profile.uid,
    nombre: profile.nombre || profile.email || "Chofer",
    rutas: entregasHoy.length > 0 ? 1 : 0,
    completadas: completadasCount,
    fallidas: fallidasCount,
  };
}

async function init() {
  const profile = await getProfileOrRedirect();
  if (!profile) return;

  let stats = [];

  if ((profile.role || "").toUpperCase() === "CHOFER") {
    const stat = await loadCurrentChoferStats(profile);
    stats = [stat];
    selector.innerHTML = `<option value="${stat.id}">${stat.nombre}</option>`;
    selector.disabled = true;
  } else {
    const listEndpoint = (profile.role || "").toUpperCase() === "TI"
      ? "/api/ti/todos-choferes"
      : "/api/admin/mis-choferes";

    const choferesData = await apiFetch(listEndpoint);
    const choferes = choferesData.choferes || [];

    if (choferes.length === 0) {
      selector.innerHTML = "<option>No hay choferes disponibles</option>";
      selector.disabled = true;
      return;
    }

    stats = await Promise.all(choferes.map((c) => loadChoferStats(c)));
    selector.innerHTML = stats
      .map((s) => `<option value="${s.id}">${s.nombre}</option>`)
      .join("");
  }

  graficaGeneral.data.labels = stats.map((s) => s.nombre);
  graficaGeneral.data.datasets[0].data = stats.map((s) => s.completadas);
  graficaGeneral.data.datasets[1].data = stats.map((s) => s.fallidas);
  graficaGeneral.update();

  const byId = new Map(stats.map((s) => [s.id, s]));
  updateUI(stats[0]);

  selector.addEventListener("change", (e) => {
    const stat = byId.get(e.target.value);
    if (stat) updateUI(stat);
  });
}

init().catch((error) => {
  console.error("Error cargando estadísticas:", error);
  estadoGlobal.className = "badge bad";
  estadoGlobal.innerText = `Error: ${error.message}`;
});
