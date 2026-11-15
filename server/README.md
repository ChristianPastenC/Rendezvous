# Rendezvous Server

Express 5 + Socket.IO + TypeScript backend for Rendezvous, backed by Firebase Admin SDK and Zod request validation.

## Environment Variables

Copy `server/.env.example` to `server/.env` and configure:

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | No | HTTP server port (defaults to `3000`) |
| `CORS_ORIGIN` | Yes | Comma-separated list of allowed frontend origins |
| `FIREBASE_SERVICE_ACCOUNT` | Conditional | JSON string of Firebase service account (production) |
| `FIREBASE_PROJECT_ID` | Conditional | Individual credential fallback for local dev |
| `FIREBASE_CLIENT_EMAIL` | Conditional | Individual credential fallback for local dev |
| `FIREBASE_PRIVATE_KEY` | Conditional | Individual credential fallback for local dev |

## Scripts

```bash
npm run dev --workspace=server        # Start server with tsx watch
npm run build --workspace=server      # Compile TypeScript to dist/
npm run typecheck --workspace=server  # Run tsc --noEmit
npm run test --workspace=server       # Run Vitest & Supertest suites
npm run start --workspace=server      # Run compiled dist/index.js
```

## API Overview

- `GET /health` — Health check endpoint (`200 { "status": "ok" }`).
- `POST /api/auth/sync` — Sync authenticated Firebase user profile.
- `GET/PUT /api/users/*` — User profile, search, and E2EE public/wrapped key storage.
- `GET/POST/DELETE /api/contacts/*` — Contact list management.
- `GET/POST /api/groups/*` — Group and channel management.
- `GET /api/groups/:groupId/channels/:channelId/messages` — Cursor-paginated channel messages (`limit`, `before`, `X-Has-More`).
- `GET /api/dms/:conversationId/messages` — Cursor-paginated direct messages (`limit`, `before`, `X-Has-More`).
