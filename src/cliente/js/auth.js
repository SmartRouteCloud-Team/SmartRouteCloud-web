import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// LOGIN
export async function login(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}

// LOGOUT
export async function logout() {
  await signOut(auth);
}

// OBSERVAR SESIÓN
export function observarUsuario(callback) {
  onAuthStateChanged(auth, callback);
}