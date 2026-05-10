import { auth } from "./firebase.js";
import { config } from "./config.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// LOGIN
export async function login(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function getUserProfile() {
  if (!auth.currentUser) return null;
  const token = await auth.currentUser.getIdToken();
  const response = await fetch(`${config.backendURL}/api/me/profile`, {
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("No se pudo obtener el perfil de usuario");
  }

  return await response.json();
}

// LOGOUT
export function logout() {
  signOut(auth)
    .then(() => {
      console.log("Sesión cerrada");
      window.location.href = "/index.html";
    })
    .catch((error) => {
      console.error("Error al cerrar sesión:", error);
    });
}

// OBSERVAR SESIÓN
export function observarUsuario(callback) {
  onAuthStateChanged(auth, callback);
}

// RECUPERAR CONTRASEÑA
export async function recuperarPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    alert("Se envió un correo para recuperar tu contraseña");
  } catch (error) {
    console.error("Error:", error);

    if (error.code === "auth/user-not-found") {
      alert(" El correo no está registrado");
    } else if (error.code === "auth/invalid-email") {
      alert("Correo inválido");
    } else {
      alert("Error al enviar el correo");
    }
  }
}
