# Rendezvous - Cliente Frontend

Este directorio contiene el código fuente para el cliente frontend de la aplicación Rendezvous, construido con React y Vite.

## Funcionalidades

- **Interfaz de Usuario Moderna:** Construida con React y estilizada con Tailwind CSS para un diseño limpio y responsivo.
- **Cifrado en el Cliente:** Todas las operaciones criptográficas (generación de claves, cifrado y descifrado de mensajes) se realizan localmente en el navegador para garantizar la seguridad de extremo a extremo.
- **Comunicación en Tiempo Real:** Utiliza Socket.IO para recibir mensajes, actualizaciones de estado y notificaciones de llamadas al instante.
- **Llamadas P2P:** Implementa la lógica de WebRTC para establecer y gestionar llamadas de audio y video directamente desde el navegador.
- **Gestión de Estado:** Manejo eficiente del estado de la aplicación a través de hooks de React y Context API.

## Prerrequisitos

- Node.js (v18 o superior)
- Un proyecto de Firebase configurado.

## Instalación y Configuración

1.  **Clona el repositorio y navega a este directorio:**
    ```bash
    git clone https://github.com/ChristianPastenC/Rendezvous.git
    cd Rendezvous/client
    ```

2.  **Instala las dependencias:**
    ```bash
    npm install
    ```

3.  **Configura las variables de entorno:**
    Crea un archivo `.env.local` en el directorio `client/` y añade las credenciales de tu aplicación web de Firebase. Estas claves son seguras para exponer en el lado del cliente.

    ```env
    # La URL donde se ejecuta tu servidor backend.
    VITE_SERVER_URL=http://localhost:3000

    # --- Credenciales de Firebase ---
    VITE_FIREBASE_API_KEY="AIza..."
    VITE_FIREBASE_AUTH_DOMAIN="tu-proyecto.firebaseapp.com"
    VITE_FIREBASE_PROJECT_ID="tu-proyecto"
    VITE_FIREBASE_STORAGE_BUCKET="tu-proyecto.appspot.com"
    VITE_FIREBASE_MESSAGING_SENDER_ID="..."
    VITE_FIREBASE_APP_ID="1:..."
    ```
    *Puedes encontrar estas claves en la configuración de tu proyecto en la consola de Firebase, en la sección "Tus apps" -> "App web".*

## Ejecutar el Cliente

Para iniciar el servidor de desarrollo de Vite con Hot-Reload:

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173` (o el puerto que Vite asigne si el 5173 está ocupado).

## Compilar para Producción

Para crear una versión optimizada y minificada de la aplicación para despliegue:

```bash
npm run build
```

Los archivos compilados se generarán en el directorio `dist/`.