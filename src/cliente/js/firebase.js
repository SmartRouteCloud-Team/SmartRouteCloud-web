import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCwYKTKq_hmGzdLgBxB8m1xdXTISJ6N5yE",
  authDomain: "smartroute-60190.firebaseapp.com",
  projectId: "smartroute-60190"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };