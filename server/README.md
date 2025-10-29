# Rendezvous - Servidor Backend

Este directorio contiene todo el código fuente del servidor backend para la aplicación Rendezvous. Está construido con Node.js y Express, y utiliza Socket.IO para la comunicación en tiempo real.

## Funcionalidades

- **API RESTful:** Provee endpoints para la gestión de usuarios, grupos, claves de cifrado y perfiles.
- **Servidor WebSocket:** Maneja la mensajería en tiempo real, notificaciones de presencia (online/offline) y la sincronización de estado entre clientes.
- **Servidor de Señalización WebRTC:** Facilita el intercambio de metadatos (SDP, candidatos ICE) necesario para establecer llamadas de audio/video P2P.
- **Integración con Firebase:** Utiliza el SDK de Admin de Firebase para interactuar de forma segura con Authentication, Firestore y Storage.

## Prerrequisitos

- Node.js (v18 o superior)
- Un proyecto de Firebase y su **clave de cuenta de servicio (service account key)**.

## Instalación y Configuración

1.  **Clona el repositorio y navega a este directorio:**
    ```bash
    git clone https://github.com/ChristianPastenC/Rendezvous.git
    cd Rendezvous/server
    ```

2.  **Instala las dependencias:**
    ```bash
    npm install
    ```

3.  **Configura las variables de entorno:**
    Crea un archivo `.env` en el directorio `server/` y añade las siguientes variables:

    ```env
    # El puerto en el que se ejecutará el servidor.
    PORT=3000

    # El origen permitido para las solicitudes CORS (la URL de tu cliente React).
    CORS_ORIGIN=http://localhost:5173

    # La ruta al archivo JSON de la clave de tu cuenta de servicio de Firebase.
    GOOGLE_APPLICATION_CREDENTIALS=./path/to/your/serviceAccountKey.json
    ```
    *Asegúrate de descargar tu `serviceAccountKey.json` desde la consola de Firebase y colocarlo en la ruta especificada.*

## Ejecutar el Servidor

Para iniciar el servidor en modo de desarrollo con reinicio automático (usando `nodemon`):

```bash
npm run dev
```

Para iniciar el servidor en modo de producción:

```bash
npm start
```

El servidor se ejecutará en el puerto especificado en tu archivo `.env` (por defecto, `3000`).

## Endpoints Principales de la API

- `POST /api/auth/sync`: Sincroniza un usuario de Firebase Auth con la base de datos de Firestore.
- `PUT /api/users/profile`: Actualiza el perfil de un usuario.
- `DELETE /api/users/me`: Elimina la cuenta de un usuario y sus datos asociados.
- `GET /api/users/search`: Busca usuarios por email o nombre.
- `GET /api/groups`: Obtiene los grupos de un usuario.
- `POST /api/groups`: Crea un nuevo grupo.
- `POST /api/groups/:groupId/members`: Añade un miembro a un grupo.

## Eventos de WebSocket

- `sendMessage`: Envía un mensaje cifrado a una conversación.
- `joinChannel` / `leaveChannel`: Gestiona la suscripción a salas de chat.
- `call-user`, `call-accepted`, `ice-candidate`, `hang-up`: Eventos de señalización para llamadas WebRTC.


