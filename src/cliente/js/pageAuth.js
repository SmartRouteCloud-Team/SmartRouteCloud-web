import { auth } from "./firebase.js";
import { getUserProfile, logout } from "./auth.js";
import { config } from "./config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export async function waitForUser() {
  if (auth.currentUser) return auth.currentUser;

  return await new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user || null);
    });
  });
}

export async function getProfileOrRedirect() {
  const user = await waitForUser();
  if (!user) {
    window.location.href = "/index.html";
    return null;
  }

  try {
    const profile = await getUserProfile();
    return profile;
  } catch (error) {
    console.error("No se pudo cargar el perfil:", error);
    await logout();
    return null;
  }
}

export async function apiFetch(path, options = {}) {
  const user = await waitForUser();
  if (!user) {
    throw new Error("Sesión no válida");
  }

  const token = await user.getIdToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    ...(options.headers || {}),
  };

  const response = await fetch(`${config.backendURL}${path}`, {
    ...options,
    headers,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Error de API");
  }

  return payload;
}
