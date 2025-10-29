# Rendezvous - Aplicación de Chat Seguro con Cifrado E2EE

Rendezvous es una aplicación de chat full-stack en tiempo real que ofrece mensajería segura con cifrado de extremo a extremo (E2EE), chats grupales, y llamadas de audio y video basadas en WebRTC.

## Características Principales

- **Cifrado de Extremo a Extremo (E2EE):** Todos los mensajes directos y grupales están protegidos con un esquema de cifrado híbrido (RSA-2048 + AES-256), asegurando que solo el emisor y los receptores puedan leer el contenido.
- **Comunicación en Tiempo Real:**
  - Mensajería instantánea en chats directos y grupales.
  - Indicadores de estado de presencia (en línea / última vez).
- **Llamadas de Audio y Video:** Conexiones directas Peer-to-Peer (P2P) utilizando WebRTC para llamadas privadas y eficientes.
- **Autenticación Segura:** Inicio de sesión con Email/Contraseña y proveedores OAuth como Google, gestionado a través de Firebase Authentication.
- **Gestión de Grupos:** Crea grupos, añade o elimina miembros y gestiona conversaciones grupales.
- **Gestión de Perfil:** Los usuarios pueden actualizar su nombre, foto de perfil y eliminar su cuenta de forma segura.
- **Búsqueda de Usuarios:** Encuentra y comienza conversaciones con otros usuarios registrados en la plataforma.

## Stack Tecnológico

| Área                | Tecnologías                                                              |
| ------------------- | ------------------------------------------------------------------------ |
| **Frontend (Cliente)** | React, Vite, Tailwind CSS, Socket.IO Client, JSEncrypt, CryptoJS         |
| **Backend (Servidor)** | Node.js, Express, Socket.IO, Firebase Admin SDK                          |
| **Base de Datos y Servicios** | Firebase (Authentication, Firestore, Cloud Storage)                      |

## Guía de Inicio Rápido

Sigue estos pasos para poner en marcha tanto el cliente como el servidor en tu entorno local.

### Prerrequisitos

- [Node.js](https://nodejs.org/) (v18 o superior)
- [npm](https://www.npmjs.com/) o [yarn](https://yarnpkg.com/)
- Un proyecto de **Firebase** configurado con:
  - Authentication (Email/Password y Google habilitados).
  - Firestore Database.
  - Cloud Storage.

### 1. Configuración del Servidor

```bash
# Navega al directorio del servidor
cd server

# Instala las dependencias
npm install

# Crea un archivo .env y configúralo (ver el README del servidor para más detalles)
touch .env

# Inicia el servidor (por defecto en el puerto 3000)
npm start
```

### 2. Configuración del Cliente

```bash
# Desde la raíz, navega al directorio del cliente
cd client

# Instala las dependencias
npm install

# Crea un archivo .env.local y configúralo con las claves de tu proyecto de Firebase
# (ver el README del cliente para más detalles)
touch .env.local

# Inicia la aplicación de React (por defecto en el puerto 5173)
npm run dev
```

### 3. ¡Listo!

- Abre tu navegador y ve a `http://localhost:5173` para usar la aplicación.
- El cliente se conectará al servidor que se ejecuta en `http://localhost:3000`.

## Estructura del Repositorio

```
Rendezvous/
├── client/         # Código fuente del frontend (React)
│   ├── public/
│   └── src/
├── server/         # Código fuente del backend (Node.js/Express)
│   └── src/
└── README.md       # Este archivo
```

