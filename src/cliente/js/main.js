import { login } from "./auth.js";

const btn = document.getElementById("btnLogin");
const email = document.getElementById("email");
const password = document.getElementById("password");
const error = document.getElementById("error");

btn.addEventListener("click", async () => {
  error.textContent = "";

  try {
    await login(email.value, password.value);

    // 🔥 REDIRECCIÓN
    window.location.href = "/dashboard";

  } catch (e) {
    error.textContent = "Correo o contraseña incorrectos";
    console.error(e);
  }
});