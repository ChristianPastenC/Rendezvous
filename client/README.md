# Rendezvous Client

React 19 + TypeScript + Vite + Tailwind CSS v4 frontend for Rendezvous.

## Environment Variables

Copy `client/.env.example` to `client/.env` and configure:

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_SERVER_URL` | Yes | Backend API and Socket.IO URL (e.g. `http://localhost:3000`) |
| `VITE_FIREBASE_API_KEY` | Yes | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Firebase Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase Web app ID |
| `VITE_TURN_URL` | No | Optional TURN relay URL for WebRTC calls |
| `VITE_TURN_USERNAME` | No | Optional TURN username |
| `VITE_TURN_CREDENTIAL` | No | Optional TURN credential |

## Scripts

```bash
npm run dev --workspace=client        # Start Vite dev server
npm run build --workspace=client      # Typecheck and bundle for production
npm run typecheck --workspace=client  # Run tsc --noEmit
npm run lint --workspace=client       # Run ESLint
npm run test --workspace=client       # Run Vitest unit tests (jsdom)
```

## Key Modules

- `src/lib/cryptoService.ts`: Native Web Crypto API E2EE (`RSA-OAEP`, `AES-GCM`, `PBKDF2`).
- `src/lib/webrtcService.ts`: `RTCPeerConnection` lifecycle, ICE handling, and media streams.
- `src/hooks/useConversationsData.ts`: Cursor-based message pagination and real-time updates.
- `src/context/NotificationContext.tsx`: Non-blocking toast and confirmation modal UI.
- `src/locales/en.json` & `src/locales/es.json`: i18next translation bundles.
