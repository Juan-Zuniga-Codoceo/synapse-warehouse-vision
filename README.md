# Warehouse Vision 3D

Sistema de Mapeo de Bodega 3D y Gestión de Ubicaciones - Stand-alone y listo para integración con BiocareTask.

## 🚀 Características

- **Visualización 3D Interactiva**: Renderizado de bodega en tiempo real con Three.js
- **Gestión de Ubicaciones**: Sistema completo de SKU y posiciones
- **Búsqueda Inteligente**: Auto-zoom a ubicaciones específicas
- **Estadísticas en Tiempo Real**: Ocupación por zona y actividad reciente
- **Performance Optimizado**: InstancedMesh para miles de ubicaciones
- **Arquitectura Modular**: Fácil integración con sistemas existentes

## 📋 Requisitos

- Node.js 18+ 
- npm o yarn

## 🛠️ Instalación

### 1. Instalar dependencias del backend

```bash
npm install
```

### 2. Inicializar la base de datos

```bash
npm run init-db
```

Esto creará `warehouse.db` con datos de prueba realistas.

### 3. Instalar dependencias del frontend

```bash
cd frontend
npm install
```

## 🎯 Uso

### Iniciar el servidor backend

```bash
npm start
```

El servidor estará disponible en `http://localhost:3001`

### Iniciar el frontend (en otra terminal)

```bash
cd frontend
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## 📡 API Endpoints

### Locations

- `GET /api/locations` - Obtener todas las ubicaciones
  - Query params: `zona`, `occupied` (true/false)
- `GET /api/locations/:id` - Obtener ubicación específica
- `PUT /api/locations/:id` - Actualizar ubicación (asignar SKU)
  - Body: `{ "sku": "SKU-A-001" }`
- `GET /api/locations/search/:sku` - Buscar por SKU
- `GET /api/locations/stats/occupancy` - Estadísticas de ocupación
- `GET /api/locations/activity/recent` - Actividad reciente

### Health Check

- `GET /health` - Estado del servidor

## 🏗️ Estructura del Proyecto

```
bodega/
├── config.js                 # Configuración centralizada
├── server.js                 # Servidor Express principal
├── src/
│   ├── database/
│   │   ├── db.js            # Wrapper de SQLite
│   │   └── init_db.js       # Script de inicialización
│   ├── middleware/
│   │   └── auth.js          # Autenticación (mock, reemplazable)
│   ├── services/
│   │   └── locationService.js
│   ├── controllers/
│   │   └── locationController.js
│   └── routes/
│       └── locations.js
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Warehouse3D.vue    # Visualización 3D
    │   │   └── SidePanel.vue      # Panel de control
    │   ├── App.vue
    │   ├── main.js
    │   └── style.css
    └── vite.config.js
```

## 🔧 Configuración

Edita `config.js` para personalizar:

- `MAIN_WAREHOUSE_ID`: ID de la bodega principal
- `database.path`: Ruta de la base de datos
- `server.port`: Puerto del servidor
- `server.corsOrigin`: Origen permitido para CORS

## 🔐 Integración con BiocareTask

### Reemplazar Autenticación

1. Edita `src/middleware/auth.js`
2. Reemplaza la lógica mock con tu sistema de autenticación:

```javascript
export const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  try {
    const user = await validateBiocareToken(token);
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};
```

### Conectar Base de Datos

Si deseas usar la base de datos de BiocareTask en lugar de SQLite:

1. Instala el driver correspondiente (MySQL, PostgreSQL, etc.)
2. Actualiza `src/database/db.js` con tu conexión
3. Ajusta las queries en `src/services/locationService.js`

## 🎨 Personalización de UI

El tema se define en `frontend/src/style.css`:

- `--primary`: Color principal (#049DD9)
- `--bg-dark`: Fondo oscuro
- `--bg-card`: Fondo de tarjetas

## 📊 Base de Datos

### Tabla: locations

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER | ID único |
| warehouse_id | INTEGER | ID de bodega/sucursal |
| sku | TEXT | SKU asignado (nullable) |
| zona | TEXT | Zona (A, B, C...) |
| pasillo | TEXT | Pasillo |
| rack | TEXT | Rack |
| nivel | INTEGER | Nivel vertical |
| posicion | INTEGER | Posición horizontal |
| x, y, z | REAL | Coordenadas 3D |

### Tabla: inventory_log

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER | ID único |
| location_id | INTEGER | FK a locations |
| sku | TEXT | SKU involucrado |
| action | TEXT | ASSIGN o REMOVE |
| user_id | INTEGER | ID del usuario |
| timestamp | DATETIME | Fecha/hora |

## 🚀 Funcionalidades Destacadas

### 1. Click-to-Assign
Haz clic en cualquier ubicación vacía (gris) para asignar un SKU mediante un modal.

### 2. Auto-Zoom
Busca un SKU y la cámara se animará automáticamente hacia su ubicación.

### 3. InstancedMesh
Renderizado eficiente de miles de ubicaciones usando instancias de geometría.

### 4. Filtros Dinámicos
Filtra por zona y estado de ocupación en tiempo real.

## 📝 Scripts Disponibles

- `npm start` - Iniciar servidor en producción
- `npm run dev` - Iniciar servidor con nodemon (auto-reload)
- `npm run init-db` - Inicializar/resetear base de datos

## 🤝 Contribución

Este módulo está diseñado para ser independiente pero fácilmente integrable. Para contribuir:

1. Mantén la separación de responsabilidades (routes → controllers → services)
2. Documenta cambios en la API
3. Actualiza el schema de base de datos si es necesario

## 📄 Licencia

MIT

---

**Desarrollado para BiocareTask Ecosystem** 🚀
# synapse-warehouse-vision
