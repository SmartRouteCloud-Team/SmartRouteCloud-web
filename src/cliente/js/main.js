import { login, getUserProfile } from "./auth.js";

const btn = document.getElementById("btnLogin");
const email = document.getElementById("email");
const password = document.getElementById("password");
const error = document.getElementById("error");

btn.addEventListener("click", async () => {
  error.textContent = "";

  try {
    await login(email.value, password.value);
    const profile = await getUserProfile();
    if (profile) {
      sessionStorage.setItem("src_profile", JSON.stringify(profile));
    }

    //  REDIRECCIÓN
    window.location.href = "/html/dashboard.html";

  } catch (e) {
    error.textContent = "Correo o contraseña incorrectos";
    console.error(e);
  }
});
