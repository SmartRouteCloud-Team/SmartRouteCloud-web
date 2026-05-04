# 🔐 SmartRouteCloud — Roles y Permisos (RBAC)

Este documento describe el sistema de **Control de Acceso Basado en Roles (RBAC)** implementado en el backend de SmartRouteCloud.

---

## 📌 Modelo de datos

### Colección `roles`

Cada documento usa el `roleId` como ID de documento en Firestore.

```json
{
  "roleId": "ADMIN",
  "nombre": "Administrador",
  "permisos": [
    "rutas:crear",
    "rutas:asignar",
    "rutas:cargar_masivo",
    "rutas:actualizar",
    "rutas:ver",
    "choferes:crear",
    "choferes:eliminar",
    "choferes:ver",
    "reportes:ver_equipo",
    "entregas:ver",
    "entregas:actualizar"
  ],
  "createdAt": "<timestamp>",
  "updatedAt": "<timestamp>"
}
```

### Colección `users` (sin cambios)

El campo `role` sigue siendo el `roleId` que apunta al documento en la colección `roles`.

```json
{
  "nombre": "Juan Pérez",
  "email": "juan@empresa.com",
  "role": "ADMIN",
  "estado": "activo",
  "adminAsignado": null,
  "choferesAsignados": ["uid1", "uid2"],
  "createdAt": "<timestamp>",
  "updatedAt": "<timestamp>"
}
```

---

## 👥 Roles disponibles

### ADMIN — Administrador

| Permiso | Descripción |
|---------|-------------|
| `rutas:crear` | Crear rutas en el sistema |
| `rutas:asignar` | Asignar choferes a rutas |
| `rutas:cargar_masivo` | Subir rutas vía archivo CSV |
| `rutas:actualizar` | Cambiar estado de rutas |
| `rutas:ver` | Ver rutas |
| `choferes:crear` | Crear usuarios con rol CHOFER |
| `choferes:eliminar` | Eliminar choferes |
| `choferes:ver` | Ver choferes y sus datos |
| `reportes:ver_equipo` | Ver reportes de su propio equipo |
| `entregas:ver` | Ver entregas |
| `entregas:actualizar` | Actualizar estado de entregas |

### TI — Técnico de Tecnologías de la Información

Incluye todos los permisos de ADMIN más:

| Permiso | Descripción |
|---------|-------------|
| `reportes:ver_global` | Ver reportes de todo el sistema |
| `usuarios:crear` | Crear cualquier usuario |
| `usuarios:actualizar` | Cambiar el rol de un usuario |
| `usuarios:eliminar` | Eliminar usuarios |
| `usuarios:desactivar` | Activar o desactivar usuarios |
| `sistema:seed` | Ejecutar el seed de la base de datos |
| `roles:ver` | Ver todos los roles y sus permisos |
| `roles:crear` | Crear nuevos roles |
| `roles:actualizar` | Editar permisos de roles existentes |

### CHOFER

| Permiso | Descripción |
|---------|-------------|
| `rutas:ver` | Ver su ruta activa |
| `entregas:ver` | Ver sus entregas |
| `entregas:actualizar` | Actualizar el estado de una entrega |

---

## ⚙️ Middleware de autorización

### `requirePermission(permission)`

Ubicación: `functions/servidor/middleware/permissions.js`

**Flujo:**
1. Carga el documento del usuario desde `users/{uid}`.
2. Usa `users.role` para buscar el documento en `roles/{roleId}`.
3. Verifica que el `permission` solicitado esté en el array `permisos`.
4. Si falta, devuelve `403 Acceso denegado: permiso insuficiente`.

**Uso en rutas:**
```js
const { requirePermission } = require("../middleware/permissions");

router.post("/rutas", requirePermission("rutas:crear"), crearRuta);
```

### `requireRole(...roles)` *(legado — deprecado)*

Ubicación: `functions/servidor/middleware/roles.js`

Middleware anterior que valida directamente el campo `users.role`. Se mantiene para compatibilidad hacia atrás pero **no se usa en ninguna ruta activa**. Usar `requirePermission` en su lugar. Este middleware será eliminado en una versión futura una vez que todos los clientes hayan migrado al modelo RBAC.

---

## 🗺️ Mapa de endpoints y permisos

### `/api/admin/*`

| Método | Endpoint | Permiso requerido |
|--------|----------|-------------------|
| GET | `/mis-choferes` | `choferes:ver` |
| GET | `/choferes/:id/ruta-actual` | `choferes:ver` |
| GET | `/choferes/:id/historial` | `choferes:ver` |
| GET | `/choferes/:id/kpis` | `choferes:ver` |
| GET | `/reportes/mi-equipo` | `reportes:ver_equipo` |
| POST | `/rutas` | `rutas:crear` |
| PUT | `/rutas/:id/asignar` | `rutas:asignar` |
| PUT | `/rutas/:id/estado` | `rutas:actualizar` |

### `/api/chofer/*`

| Método | Endpoint | Permiso requerido |
|--------|----------|-------------------|
| GET | `/mi-ruta` | `rutas:ver` |
| GET | `/mi-ruta/entregas` | `entregas:ver` |
| GET | `/mis-rutas-futuras` | `rutas:ver` |
| PUT | `/entregas/:id` | `entregas:actualizar` |

### `/api/rutas/*`

| Método | Endpoint | Permiso requerido |
|--------|----------|-------------------|
| POST | `/cargar-masivo` | `rutas:cargar_masivo` |

### `/api/ti/*`

| Método | Endpoint | Permiso requerido |
|--------|----------|-------------------|
| GET | `/todos-choferes` | `choferes:ver` |
| GET | `/todas-rutas` | `rutas:ver` |
| GET | `/reportes/sistema` | `reportes:ver_global` |
| POST | `/users` | `usuarios:crear` |
| PUT | `/users/:id/role` | `usuarios:actualizar` |
| PUT | `/users/:id/estado` | `usuarios:desactivar` |
| DELETE | `/users/:id` | `usuarios:eliminar` |
| POST | `/seed` | `sistema:seed` |
| GET | `/roles` | `roles:ver` |
| POST | `/roles` | `roles:crear` |
| PUT | `/roles/:id` | `roles:actualizar` |

---

## 🚀 Seed inicial

El endpoint `POST /api/ti/seed` crea automáticamente los tres roles base en Firestore (`ADMIN`, `TI`, `CHOFER`) además de los usuarios y datos de demostración.

---

## 🔄 Cómo agregar un nuevo permiso

1. Definir el permiso con el formato `recurso:accion` (p. ej. `facturas:generar`).
2. Agregar el permiso al array `permisos` del rol correspondiente en Firestore (o vía `PUT /api/ti/roles/:id`).
3. Proteger el nuevo endpoint en el archivo de rutas:
   ```js
   router.post("/facturas", requirePermission("facturas:generar"), generarFactura);
   ```
