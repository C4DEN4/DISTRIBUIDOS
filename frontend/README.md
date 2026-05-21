# Classroom Hub — Frontend (Expo)

Cliente móvil reactivo para el hub distribuido.

## Funcionalidades

- **Autenticación** con nombre + grupo (5 grupos predefinidos)
- **Validación de identidad** — error amigable si el nombre ya existe en el grupo
- **Hub en tiempo real** — WebSocket nativo al BFF (no Socket.IO)
- **Botón de señal** — envía al grupo; funciona también **offline** (cola local)
- **Sincronización offline** — señales pendientes se envían al reconectar (idempotencia con mismo `event_id` UUID)
- **Historial por grupo** en AsyncStorage
- **Restauración de sesión** al abrir la app

## Inicio

```bash
cd frontend
npm install
cp .env.example .env
# Edita .env y pon la IP requerida
npm run start
```

Importante para Expo Go en celular:

1. Usa **`--lan`**, no tunnel (`npm run start`).
2. PC y telefono en la **misma red Wi-Fi**.
3. Define `EXPO_PUBLIC_BFF_HOST` en `.env` con la IP local de tu PC.
4. Verifica desde el celular: abre en el navegador `http://TU_IP:8000/health`.

## Estructura

```
frontend/
├── App.jsx
├── index.js
└── src/
    ├── config/api.js           # URL del BFF
    ├── context/ContextoAplicacion.jsx
    ├── navegacion/Navegacion.jsx # Restaura sesión guardada
    ├── screens/
    ├── components/
    ├── services/
    │   ├── conexionServidor.js   # REST + WebSocket nativo
    │   ├── almacenamientoLocal.js
    │   └── sincronizacionOffline.js
    └── utils/validaciones.js     # UUID para event_id
```

## Backend requerido

```bash
cd ../backend && docker-compose up
```
