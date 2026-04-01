# 🚚 SmartRouteCloud Web

![Status](https://img.shields.io/badge/status-en%20desarrollo-yellow)
![Firebase](https://img.shields.io/badge/Firebase-Hosting-orange)
![Node](https://img.shields.io/badge/Node.js-18+-green)
![License](https://img.shields.io/badge/license-Academic-blue)

---

## 📌 Descripción

**SmartRouteCloud Web** es una aplicación web de logística que permite gestionar envíos, visualizar su estado y monitorear ubicaciones en un mapa interactivo.

Está diseñada como una solución para pequeñas y medianas empresas que necesitan control sobre sus entregas.

---

## ✨ Características principales

* 🔐 Autenticación de usuarios con Firebase
* 📦 Gestión de envíos
* 📊 Dashboard con indicadores logísticos
* 🗺️ Mapa interactivo de ubicaciones
* 🚪 Cierre de sesión seguro

---

## 🛠️ Tecnologías utilizadas

* Node.js
* JavaScript (ES Modules)
* HTML5 + CSS3
* Firebase (Authentication & Hosting)
* Leaflet

---

## 📁 Estructura del proyecto

```bash id="struct01"
SmartRouteCloud-web/
│
├── src/
│   ├── cliente/        # Frontend (HTML, CSS, JS)
│   │   ├── html/
│   │   ├── js/
│   │   └── css/
│   │
│   └── servidor/       # Backend (uso local con Node.js)
│
├── firebase.json       # Configuración de Firebase Hosting
├── package.json        # Dependencias
└── README.md
```

---

## 🚀 Instalación

### 1️⃣ Clonar repositorio

```bash id="clone01"
git clone https://github.com/tu-usuario/SmartRouteCloud-web.git
cd SmartRouteCloud-web
```

---

### 2️⃣ Instalar dependencias

```bash id="install01"
npm install
```

---

## ▶️ Ejecución en local

```bash id="run01"
node index.js
```

Abrir en navegador:

```bash id="run02"
http://localhost:3000
```

---

## 🔥 Configuración de Firebase

### 1️⃣ Instalar CLI

```bash id="fb01"
npm install -g firebase-tools
```

---

### 2️⃣ Iniciar sesión

```bash id="fb02"
firebase login
```

---

### 3️⃣ Inicializar Hosting

```bash id="fb03"
firebase init hosting
```

Configurar:

* 📁 Public directory:

```bash id="fb04"
src/cliente
```

* ❌ Single Page App: NO
* ❌ Overwrite index.html: NO

---

## 🌐 Despliegue

```bash id="deploy01"
firebase deploy
```

🔗 Resultado:

```bash id="deploy02"
https://tu-proyecto.web.app
```

---

## 📊 Funcionalidades del sistema

| Módulo    | Descripción                       |
| --------- | --------------------------------- |
| Login     | Autenticación con Firebase        |
| Dashboard | Visualización de datos            |
| Mapa      | Ubicación de envíos               |
| Estados   | En tránsito, entregado, retrasado |

---

## ⚠️ Consideraciones

* Firebase Hosting solo sirve archivos estáticos
* El backend en Node.js es solo para desarrollo local
* El archivo principal debe estar en:

```bash id="important01"
src/cliente/index.html
```

---

## 🧠 Problemas comunes

| Error                          | Solución                |
| ------------------------------ | ----------------------- |
| Página de Firebase por defecto | Revisar `firebase.json` |
| Error de rutas                 | Verificar `./js/...`    |
| Login no funciona              | Revisar Firebase Auth   |

---

## 🚀 Futuras mejoras

* 📡 Integración con Firestore (tiempo real)
* 🚚 Seguimiento de rutas dinámicas
* 👤 Roles de usuario
* 📱 Diseño responsive avanzado

---

## 👨‍💻 Autor

**Alejandro Martinez**

---

## 📄 Licencia

Proyecto de uso académico y educativo.

---

## ⭐ Contribuciones

Si deseas mejorar este proyecto:

1. Haz un fork
2. Crea una rama (`git checkout -b feature/nueva-funcion`)
3. Haz commit (`git commit -m "Nueva funcionalidad"`)
4. Haz push (`git push origin feature/nueva-funcion`)
5. Abre un Pull Request

---
