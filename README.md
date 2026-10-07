# Habit Tracker — Rastreo de hábitos y gestión de tiempo personal

Aplicación web **full-stack** para agendar actividades académicas y personales y darles seguimiento diario, con un dashboard oscuro estilo panel de control.

## 🧰 Stack técnico

| Capa | Tecnología |
|------|------------|
| Backend | Node.js + Express 5 |
| Base de datos | MongoDB local (`mongodb://localhost:27017/habit-tracker`) |
| ODM | Mongoose 9 |
| Frontend | React 19 + Vite + Recharts |
| Estilo | Oscuro, minimalista, responsive (desktop + móvil) |

---

## ✅ Requisitos previos

- **Node.js** ≥ 18 (probado con v24)
- **npm** (viene con Node)
- **MongoDB Community local** corriendo como servicio (probado con v8). Verificar con:
  ```powershell
  mongod --version
  Get-Service MongoDB   # o "mongodb" → debe estar en estado Running
  ```

---

## 1. Instalar dependencias

Desde la **raíz** del proyecto, ejecuta:

```powershell
npm run install:all
```

Que equivale a instalar cada parte por separado:

```powershell
npm install --prefix backend
npm install --prefix frontend
```

> Los archivos `.env` y `node_modules/` están ignorados por git. El backend ya incluye `.env.example` para referencia.

---

## 2. Levantar MongoDB local y crear la base `habit-tracker`

MongoDB Community se instala como servicio de Windows y arranca solo. La base **`habit-tracker` no hay que crearla a mano**: MongoDB la crea automáticamente al primer `connect()`/escritura.

Para confirmar que está accesible, cualquiera de estas opciones vale:
- Abrir **MongoDB Compass** y conectar a `mongodb://localhost:27017` (verá las bases existentes).
- O simplemente lanzar el backend / el seed, que conectan y crean la base por sí solos.

Si tuvieras Mongo instalado sin servicio y prefieres lanzarlo a mano:
```powershell
mongod --dbpath C:\data\db
```

---

## 3. Sembrar datos de ejemplo (opcional pero recomendado)

Desde la **raíz** del proyecto:

```powershell
npm run seed          # siembra 7 hábitos y registros del MES ACTUAL
npm run seed:prev     # además siembra el mes anterior (para ver la comparación del dashboard)
```

También puedes ejecutarlo directo:
```powershell
node seeds/seed.js --include-prev
```

> El seed es **reproducible**: primero limpia `habits`, `entries` y `dailysummaries`, y vuelve a insertar.

---

## 4. Levantar el proyecto (dos terminales)

**Terminal 1 — Backend** (puerto **4000**):
```powershell
npm run dev:backend
# o: cd backend && npm run dev
```

Ves el mensaje `🚀 API escuchando en http://localhost:4000` y `✅ MongoDB conectado`.

**Terminal 2 — Frontend** (puerto **5173**):
```powershell
npm run dev:frontend
# o: cd frontend && npm run dev
```

Abre en el navegador: **<http://localhost:5173>**

El frontend usa un proxy de Vite (`/api → http://localhost:4000`), así que no hay necesidad de configurar CORS en desarrollo.

---

## 5. Conectar MongoDB Compass

1. Abre **MongoDB Compass**.
2. En la pantalla de inicio, pega la URI y pulsa **Connect**:
   ```
   mongodb://localhost:27017/habit-tracker
   ```
3. Verás la base **`habit-tracker`** con estas **colecciones**:

| Colección | Contenido |
|-----------|-----------|
| `habits` | Los hábitos/actividades: `name`, `category`, `goalPerMonth`, `active`, `timeSlots[]` (ventanas de tiempo diarias `{start,end}`), `createdAt`. |
| `entries` | Registro diario de cumplimiento: `habitId` (ref), `date`, `completed`, `notes`. Índice único compuesto `{habitId, date}`. |
| `dailysummaries` | Caché diaria del dashboard: `date`, `totalHabits`, `completedHabits`, `percentage`. |

> Los nombres de colección que veas en Compass estarán en plural (Mongoose lo forma así a partir de los modelos). En la pestaña *Indexes* de `entries` podrás ver el índice único `habitId_1_date_1`.

---

## 🎛️ Uso de la aplicación

- **Calendario mensual**: cada fila es un hábito y cada columna un día (con el **día de la semana** en la cabecera). Toca una casilla para **marcar (✅)** o **desmarcar (❌)**. Cada casilla tiene un **tooltip** con el horario del hábito ese día (`⏰ 18:00–20:00`). Los días con **«—»** no están programados para ese hábito y los futuros del mes en curso están bloqueados.
- **Navegación de mes**: usa las flechas `‹ ›` de la barra superior para ver meses anteriores/futuros.
- **Gestionar hábitos** (botón `＋ Gestionar hábitos`): modal para
  - **crear** un hábito nuevo (nombre, categoría, meta mensual),
  - **editar** nombre, categoría o meta,
  - **definir el horario del día**: una o varias **ventanas de tiempo** `inicio–fin` (ej. `07:00–07:30`, `18:00–20:00`) en que puede realizarse la tarea; se añaden o quitan con `＋ Añadir ventana de tiempo`,
  - **elegir los días de la semana** en que aplica (chips `L M X J V S D`), p. ej. ejercicio solo **lun–vie**,
  - **pausar/reactivar** (`active`) — un hábito pausado sale del dashboard pero se conserva su historial y sigue visible en el gestor,
  - **eliminar** (borra también sus registros `entries` asociados).
  Tras cada cambio el dashboard se refresca automáticamente. El horario de cada hábito se muestra con ⏰ y sus días con 📅 junto a su porcentaje.
- **Alertas inteligentes** en el dashboard:
  - ⚠ **Conflicto de horario**: avisa si dos hábitos comparten día de la semana y sus ventanas se solapan (p. ej. `Leer vs Ejercicio (Lunes 07:00–07:30)`).
  - 📌 **Sin horario definido**: recuerda los hábitos activos que aún no tienen ventanas de tiempo.

---

## 🔌 API REST (resumen)

Base URL: `http://localhost:4000/api`

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/habits` | Crear hábito |
| GET | `/habits` | Listar hábitos activos |
| PATCH | `/habits/:id` | Editar/pausar (`active:false`) |
| POST | `/entries` | Marcar cumplido/no cumplido (**upsert**, no duplica) |
| GET | `/entries?month=&year=` | Registros del mes |
| GET | `/dashboard?month=&year=` | Estadísticas agregadas (`aggregate()`) |
| GET | `/health` | Comprobación de estado |

Ejemplo de marcado rápido:
```powershell
# marcar como cumplido el día 12 de agosto
curl -X POST http://localhost:4000/api/entries -H "Content-Type: application/json" -d '{"habitId":"<id>","date":"2026-08-12","completed":true}'
```

---

## 🗂️ Estructura del proyecto

```
backend/                     → API Express + Mongoose
  config/db.js               → conexión a MongoDB
  models/                    → Habit, Entry, DailySummary (esquemas + índices)
  controllers/               → lógica de cada recurso (dashboard usa aggregate())
  routes/                    → definición de rutas
  middleware/errorHandler.js → manejo centralizado de errores
  utils/dates.js             → normalización de fechas (medianoche UTC)
  server.js                  → arranque del backend
frontend/                    → React + Vite
  src/api/client.js          → llamadas al backend
  src/hooks/useDashboard.js  → carga de datos y acción de marcado
  src/components/            → Dashboard, Calendar, RingChart, HabitProgress, DailyBarChart
  src/styles/global.css      → tema oscuro responsive
seeds/seed.js                → datos de ejemplo (hábitos + entries aleatorios)
package.json                 → scripts de conveniencia (install, seed, dev)
```

---

## 🧠 Notas de diseño

- **Fechas a medianoche UTC**: todos los registros se guardan como `Date` a medianoche UTC para evitar corrimientos de zona horaria entre Mongo, backend y el dashboard.
- **Upsert anti-duplicado**: `POST /entries` busca `{habitId, date}` y crea o actualiza gracias al índice único compuesto; puedes cambiar de opinión sin duplicar.
- **Racha actual**: cuenta días consecutivos cumplidos hacia atrás desde *hoy* (mes en curso) o desde el *último día* (mes pasado).
- **Comparación mensual**: si el mes está en curso, la comparación con el mes completo anterior es *parcial* (el panel lo indica en `comparison.note`).
- **Ventanas de tiempo**: cada hábito puede tener varias ventanas diarias `{start, end}` en formato `HH:MM` (24 h). Se normalizan (cero a la izquierda) y se ordenan al guardar; el backend rechaza ventanas inválidas o con fin ≤ inicio (HTTP 400).
- **Días de la semana (`daysOfWeek`)**: 1=Lunes … 7=Domingo. Un hábito puede aplicar solo ciertos días (p. ej. ejercicio `Lun–Vie`). El dashboard calcula los **porcentajes y la racha solo sobre los días programados** de cada hábito y no cuenta los no programados (fines de semana libres no rompen la racha). El seed y el calendario respetan esos días (las celdas `—` están bloqueadas).
- **`dailysummaries`** es una caché: se recalculan al hacer upsert de una entry (el seed también las reconstruye).
- **Detección de conflictos**: el dashboard compara los hábitos activos por día de la semana y detecta si dos ventanas se solapan (`startA < endB && startB < endA`), avisando en el panel con la pareja y el día implicado.