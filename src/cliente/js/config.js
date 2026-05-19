// se modificó para que esto salga desde endpoint - patch
export const firebaseConfig = {
  apiKey: "AIzaSyBoLRMJPwWAs_srKz6Tuv_iGTOVjSEsO5I",
  authDomain: "smartroute-60190.firebaseapp.com",
  projectId: "smartroute-60190",
  storageBucket: "smartroute-60190.firebasestorage.app",
  messagingSenderId: "753434349807",
  appId: "1:753434349807:web:aec9431784e4cbedde4b1a",
  measurementId: "G-7Y2ZHNS1DV"
};

export const config = {
  backendURL: "https://us-central1-smartroute-60190.cloudfunctions.net",
  tomtomKey: ""
};

export function buildBackendUrl(path = "") {
  const base = String(config.backendURL || "").replace(/\/+$/, "");
  const normalizedPath = `/${String(path || "").replace(/^\/+/, "")}`;
  return `${base}${normalizedPath}`;
}
